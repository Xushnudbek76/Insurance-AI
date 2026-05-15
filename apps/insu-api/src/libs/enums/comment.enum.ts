import { registerEnumType } from '@nestjs/graphql';

export enum CommentGroup {
  MEMBER = 'MEMBER',
  ARTICLE = 'ARTICLE',
  NOTICE = 'NOTICE',
  PACKAGE = 'PACKAGE',
}

export enum CommentStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DELETED = 'DELETED',
}

registerEnumType(CommentGroup, { name: 'CommentGroup' });
registerEnumType(CommentStatus, { name: 'CommentStatus' });
