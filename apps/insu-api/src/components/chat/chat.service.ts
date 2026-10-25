import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ChatAccessService, chatId } from './chat-access.service';
import { ChatUpdatesService } from './chat-updates.service';
@Injectable()
export class ChatService {
  constructor(
    @InjectModel('Conversation') private readonly conversations: Model<any>,
    @InjectModel('ChatMessage') private readonly messages: Model<any>,
    @InjectModel('Package') private readonly packages: Model<any>,
    private readonly access: ChatAccessService,
    private readonly updates: ChatUpdatesService,
  ) {}
  async startPackageConversation(
    packageId: string,
    memberId: any,
  ): Promise<any> {
    await this.access.requireActiveMember(memberId);
    const pkg = await this.packages.findById(chatId(packageId)).lean().exec();
    if (
      !pkg ||
      pkg.packageStatus !== 'ACTIVE' ||
      !pkg.memberId ||
      String(pkg.memberId) === String(memberId)
    )
      throw new BadRequestException('Package agent unavailable');
    const agent = await this.access.requireActiveMember(pkg.memberId);
    if (agent.memberType !== 'AGENT')
      throw new BadRequestException('Package agent unavailable');
    const key = {
      clientId: chatId(memberId),
      agentId: pkg.memberId,
      packageId: pkg._id,
    };
    await this.conversations.init?.();
    let c: any;
    try {
      c = await this.conversations
        .findOneAndUpdate(
          key,
          { $setOnInsert: key },
          { upsert: true, new: true },
        )
        .lean()
        .exec();
    } catch (e) {
      if (e.code !== 11000) throw e;
      c = await this.conversations.findOne(key).lean().exec();
    }
    return this.present(c, memberId);
  }
  async present(c: any, memberId: any): Promise<any> {
    const marker =
      String(c.clientId) === String(memberId)
        ? c.clientLastReadMessageId
        : c.agentLastReadMessageId;
    const readAt =
      String(c.clientId) === String(memberId)
        ? c.clientLastReadAt
        : c.agentLastReadAt;
    const [client, agent, pkg, lastMessage, unreadCount, availability] =
      await Promise.all([
        this.access.members
          .findById(c.clientId)
          .select('_id memberNick memberImage')
          .lean()
          .exec(),
        this.access.members
          .findById(c.agentId)
          .select('_id memberNick memberImage')
          .lean()
          .exec(),
        this.packages
          .findById(c.packageId)
          .select('packageName packagePrice packageCoverageLimit')
          .lean()
          .exec(),
        this.messages
          .findOne({ conversationId: c._id })
          .sort({ createdAt: -1, _id: -1 })
          .lean()
          .exec(),
        this.messages.countDocuments({
          conversationId: c._id,
          senderId: { $ne: chatId(memberId) },
          ...(marker && readAt
            ? {
                $or: [
                  { createdAt: { $gt: readAt } },
                  { createdAt: readAt, _id: { $gt: marker } },
                ],
              }
            : {}),
        }),
        this.access.getAvailability(c),
      ]);
    return {
      ...c,
      client,
      agent,
      packageName: pkg?.packageName ?? 'Insurance package',
      packagePrice: pkg?.packagePrice,
      coverageLimit: pkg?.packageCoverageLimit ?? null,
      lastMessage,
      unreadCount,
      ...availability,
    };
  }
  async getMyConversations(
    memberId: any,
    page: number,
    limit: number,
  ): Promise<any> {
    await this.access.requireActiveMember(memberId);
    this.pageBounds(page, limit);
    const filter = {
      $or: [{ clientId: chatId(memberId) }, { agentId: chatId(memberId) }],
    };
    const [list, total] = await Promise.all([
      this.conversations
        .find(filter)
        .sort({ updatedAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean()
        .exec(),
      this.conversations.countDocuments(filter),
    ]);
    return {
      list: await Promise.all(list.map((c) => this.present(c, memberId))),
      total,
    };
  }
  async getConversation(conversationId: string, memberId: any): Promise<any> {
    return this.present(
      await this.access.requireParticipant(conversationId, memberId),
      memberId,
    );
  }
  async getConversationMessages(
    conversationId: string,
    memberId: any,
    before?: string,
    limit = 30,
  ): Promise<any> {
    await this.access.requireParticipant(conversationId, memberId);
    this.pageBounds(1, limit);
    let cursor: any;
    if (before) {
      try {
        cursor = JSON.parse(Buffer.from(before, 'base64url').toString());
        if (!Number.isFinite(new Date(cursor.at).getTime())) throw new Error();
        cursor.id = chatId(cursor.id);
      } catch {
        throw new BadRequestException('Invalid message cursor');
      }
    }
    const rows = await this.messages
      .find({
        conversationId: chatId(conversationId),
        ...(cursor
          ? {
              $or: [
                { createdAt: { $lt: new Date(cursor.at) } },
                { createdAt: new Date(cursor.at), _id: { $lt: cursor.id } },
              ],
            }
          : {}),
      })
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean()
      .exec();
    const more = rows.length > limit;
    const list = rows.slice(0, limit);
    const oldest: any = list[list.length - 1];
    return {
      list: list.reverse(),
      nextCursor:
        more && oldest
          ? Buffer.from(
              JSON.stringify({ at: oldest.createdAt, id: oldest._id }),
            ).toString('base64url')
          : null,
    };
  }
  async sendConversationMessage(
    conversationId: string,
    memberId: any,
    clientMessageId: string,
    text: string,
  ): Promise<any> {
    text = text.trim();
    if (!text || text.length > 2000)
      throw new BadRequestException('Messages must contain 1–2000 characters');
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        clientMessageId,
      )
    )
      throw new BadRequestException('Invalid message request ID');
    const c = await this.access.requireWritableConversation(
      conversationId,
      memberId,
    );
    const key = {
      conversationId: c._id,
      senderId: chatId(memberId),
      clientMessageId,
    };
    await this.messages.init?.();
    let message: any;
    try {
      message = await this.messages
        .findOneAndUpdate(
          key,
          {
            $setOnInsert: {
              ...key,
              text,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          },
          { upsert: true, new: true, timestamps: false },
        )
        .lean()
        .exec();
    } catch (e) {
      if (e.code !== 11000) throw e;
      message = await this.messages.findOne(key).lean().exec();
    }
    await this.conversations.updateOne(
      { _id: c._id },
      { $set: { updatedAt: new Date() } },
    );
    this.updates.notify(c);
    return message;
  }
  async markConversationRead(
    conversationId: string,
    memberId: any,
    messageId: string,
  ): Promise<any> {
    const c = await this.access.requireParticipant(conversationId, memberId);
    const message = await this.messages
      .findOne({ _id: chatId(messageId), conversationId: c._id })
      .lean()
      .exec();
    if (!message) throw new BadRequestException('Message unavailable');
    const field =
      String(c.clientId) === String(memberId)
        ? 'clientLastReadMessageId'
        : 'agentLastReadMessageId';
    const timeField =
      String(c.clientId) === String(memberId)
        ? 'clientLastReadAt'
        : 'agentLastReadAt';
    await this.conversations.updateOne(
      {
        _id: c._id,
        $or: [
          { [timeField]: { $exists: false } },
          { [timeField]: { $lt: message.createdAt } },
          { [timeField]: message.createdAt, [field]: { $lt: message._id } },
        ],
      },
      { $set: { [field]: message._id, [timeField]: message.createdAt } },
      { timestamps: false },
    );
    this.updates.notify(c);
    return this.getConversation(conversationId, memberId);
  }
  private pageBounds(page: number, limit: number) {
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 50
    )
      throw new BadRequestException('Invalid pagination');
  }
}
