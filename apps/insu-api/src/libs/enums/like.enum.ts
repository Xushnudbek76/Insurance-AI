import { registerEnumType } from '@nestjs/graphql';

export enum LikeGroup {
  MEMBER = 'MEMBER',
  PACKAGE = 'PACKAGE',
  ARTICLE = 'ARTICLE',
}
registerEnumType(LikeGroup, {
  name: 'LikeGroup',
});
