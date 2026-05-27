import { registerEnumType } from '@nestjs/graphql';

export enum NoticeCategory {
  EVENT = 'EVENT',
  UPDATE = 'UPDATE',
  PROMOTION = 'PROMOTION',
  SYSTEM = 'SYSTEM',
}
registerEnumType(NoticeCategory, { name: 'NoticeCategory' });

export enum NoticeStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}
registerEnumType(NoticeStatus, { name: 'NoticeStatus' });
