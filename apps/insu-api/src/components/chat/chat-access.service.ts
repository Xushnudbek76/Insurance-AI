import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
export function chatId(value: any): Types.ObjectId {
  if (!Types.ObjectId.isValid(String(value)))
    throw new BadRequestException('Invalid ID');
  return new Types.ObjectId(String(value));
}
@Injectable()
export class ChatAccessService {
  constructor(
    @InjectModel('Member') public readonly members: Model<any>,
    @InjectModel('Conversation') private readonly conversations: Model<any>,
    @InjectModel('Package') public readonly packages: Model<any>,
  ) {}
  async requireActiveMember(memberId: any): Promise<any> {
    const member = await this.members.findById(chatId(memberId)).lean().exec();
    if (!member || member.memberStatus !== 'ACTIVE')
      throw new ForbiddenException('Account unavailable');
    return member;
  }
  async requireParticipant(conversationId: any, memberId: any): Promise<any> {
    await this.requireActiveMember(memberId);
    const c = await this.conversations
      .findById(chatId(conversationId))
      .lean()
      .exec();
    if (
      !c ||
      ![String(c.clientId), String(c.agentId)].includes(String(memberId))
    )
      throw new NotFoundException('Conversation unavailable');
    return c;
  }
  async getAvailability(
    c: any,
  ): Promise<{ writable: boolean; unavailableReason: string | null }> {
    const [pkg, client, agent] = await Promise.all([
      this.packages.findById(c.packageId).lean().exec(),
      this.members.findById(c.clientId).lean().exec(),
      this.members.findById(c.agentId).lean().exec(),
    ]);
    const writable =
      !!pkg &&
      pkg.packageStatus === 'ACTIVE' &&
      String(pkg.memberId) === String(c.agentId) &&
      client?.memberStatus === 'ACTIVE' &&
      agent?.memberStatus === 'ACTIVE' &&
      agent?.memberType === 'AGENT';
    return {
      writable,
      unavailableReason: writable
        ? null
        : 'This conversation is read-only. The package or agent is unavailable.',
    };
  }
  async requireWritableConversation(
    conversationId: any,
    memberId: any,
  ): Promise<any> {
    const c = await this.requireParticipant(conversationId, memberId);
    if (!(await this.getAvailability(c)).writable)
      throw new ForbiddenException(
        'This conversation is read-only. The package or agent is unavailable.',
      );
    return c;
  }
}
