import { registerEnumType } from '@nestjs/graphql';

export enum ViewGroup {
  MEMBER = 'MEMBER',
  AGENT = 'AGENT',
  ARTICLE = 'ARTICLE',
  NOTICE = 'NOTICE',
}

registerEnumType(ViewGroup, {
  name: 'ViewGroup',
});
