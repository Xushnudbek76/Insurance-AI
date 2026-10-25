import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatAccessService, chatId } from '../chat/chat-access.service';
import { ChatUpdatesService } from '../chat/chat-updates.service';
export type OfferAction = 'accept' | 'confirm' | 'decline' | 'withdraw';
@Injectable()
export class PolicyOfferService {
  constructor(
    @InjectModel('Policy') private readonly policies: Model<any>,
    private readonly access: ChatAccessService,
    private readonly updates: ChatUpdatesService,
  ) {}
  private checkDates(start: Date, end: Date) {
    if (
      !Number.isFinite(start?.getTime()) ||
      !Number.isFinite(end?.getTime()) ||
      start.getTime() < Date.now() ||
      end <= start
    )
      throw new BadRequestException(
        'Ask your agent for a new offer with updated dates',
      );
  }
  async sendPolicyOffer(
    conversationId: string,
    actor: any,
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const c = await this.access.requireWritableConversation(
      conversationId,
      actor,
    );
    if (String(actor) !== String(c.agentId))
      throw new ForbiddenException('Only this package agent can send an offer');
    this.checkDates(startDate, endDate);
    if (!(await this.policies.collection.indexExists('one_open_purchase')))
      throw new ServiceUnavailableException(
        'Purchases are being prepared. Please try again later.',
      );
    const pkg = await this.access.packages.findById(c.packageId).lean().exec();
    const client = await this.access.requireActiveMember(c.clientId);
    if (
      !Number.isSafeInteger(pkg.packagePrice) ||
      pkg.packagePrice < 0 ||
      (pkg.packageCoverageLimit != null &&
        (!Number.isSafeInteger(pkg.packageCoverageLimit) ||
          pkg.packageCoverageLimit < 0))
    )
      throw new BadRequestException('Invalid package pricing or coverage');
    try {
      const policy = await this.policies.create({
        conversationId: c._id,
        memberId: c.clientId,
        AgentId: String(c.agentId),
        packageId: c.packageId,
        memberNick: client.memberNick,
        packageName: pkg.packageName,
        premiumAmount: pkg.packagePrice,
        coverageLimit: pkg.packageCoverageLimit ?? null,
        startDate,
        endDate,
        offeredAt: new Date(),
        purchaseStage: 'OFFERED',
        policyStatus: 'PENDING',
        purchaseOpen: true,
      });
      this.updates.notify(c);
      return policy;
    } catch (e) {
      if (e.code !== 11000) throw e;
      const existing = await this.policies
        .findOne({
          memberId: c.clientId,
          packageId: c.packageId,
          purchaseOpen: true,
        })
        .lean()
        .exec();
      if (existing && String(existing.conversationId) === String(c._id))
        return existing;
      throw new BadRequestException(
        'An open purchase already exists for this package. Close the previous offer first.',
      );
    }
  }
  async getConversationOffers(
    conversationId: string,
    actor: any,
    page: number,
    limit: number,
  ): Promise<any> {
    const c = await this.access.requireParticipant(conversationId, actor);
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 50
    )
      throw new BadRequestException('Invalid pagination');
    const filter = { conversationId: c._id };
    const [list, total] = await Promise.all([
      this.policies
        .find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.policies.countDocuments(filter),
    ]);
    return { list, metaCounter: [{ total }] };
  }
  async transition(
    policyId: string,
    actor: any,
    action: OfferAction,
  ): Promise<any> {
    const policy = await this.policies.findById(chatId(policyId)).lean().exec();
    if (!policy?.conversationId)
      throw new NotFoundException('Offer unavailable');
    const c = await this.access.requireParticipant(
      policy.conversationId,
      actor,
    );
    const clientAction = action === 'accept' || action === 'decline';
    if (String(actor) !== String(clientAction ? c.clientId : c.agentId))
      throw new ForbiddenException('This action is not available');
    const stages = {
      accept: 'AWAITING_PAYMENT',
      confirm: 'CONFIRMED',
      decline: 'DECLINED',
      withdraw: 'WITHDRAWN',
    };
    if (policy.purchaseStage === stages[action]) return policy;
    const allowed =
      action === 'confirm'
        ? ['AWAITING_PAYMENT']
        : action === 'accept'
          ? ['OFFERED']
          : ['OFFERED', 'AWAITING_PAYMENT'];
    if (
      policy.policyStatus !== 'PENDING' ||
      !allowed.includes(policy.purchaseStage)
    )
      throw new BadRequestException(
        'Offer status changed. Refresh and try again.',
      );
    if (action === 'accept' || action === 'confirm') {
      await this.access.requireWritableConversation(
        policy.conversationId,
        actor,
      );
      this.checkDates(new Date(policy.startDate), new Date(policy.endDate));
    }
    const now = new Date();
    const changes: any = { purchaseStage: stages[action] };
    if (action === 'accept') changes.acceptedAt = now;
    if (action === 'confirm')
      Object.assign(changes, {
        policyStatus: 'ACTIVE',
        paymentConfirmedAt: now,
        paymentConfirmedBy: chatId(actor),
      });
    if (action === 'decline' || action === 'withdraw')
      Object.assign(changes, {
        policyStatus: 'INACTIVE',
        purchaseOpen: false,
        closedAt: now,
      });
    const updated = await this.policies
      .findOneAndUpdate(
        {
          _id: policy._id,
          conversationId: c._id,
          [clientAction ? 'memberId' : 'AgentId']: clientAction
            ? chatId(actor)
            : String(actor),
          policyStatus: 'PENDING',
          purchaseStage: policy.purchaseStage,
        },
        { $set: changes },
        { new: true, runValidators: true },
      )
      .lean()
      .exec();
    if (!updated) {
      const current = await this.policies.findById(policy._id).lean().exec();
      if (current?.purchaseStage === stages[action]) return current;
      throw new BadRequestException(
        'Offer status changed. Refresh and try again.',
      );
    }
    this.updates.notify(c);
    return updated;
  }
}
