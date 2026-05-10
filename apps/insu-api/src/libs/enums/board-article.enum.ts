import { registerEnumType } from '@nestjs/graphql';

export enum BoardArticleCategory {
  NOTICE = 'NOTICE',
  FREE = 'FREE',
  NEWS = 'NEWS',
  REVIEW = 'REVIEW',
}
registerEnumType(BoardArticleCategory, {
  name: 'BoardArticleCategory',
});

export enum BoardArticleStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DELETED = 'DELETED',
}
registerEnumType(BoardArticleStatus, {
  name: 'BoardArticleStatus',
});
