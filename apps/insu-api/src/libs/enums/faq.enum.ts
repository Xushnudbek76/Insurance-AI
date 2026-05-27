import { registerEnumType } from '@nestjs/graphql';

export enum FaqCategory {
  POLICY = 'POLICY',
  CLAIMS = 'CLAIMS',
  PAYMENT = 'PAYMENT',
  AGENTS = 'AGENTS',
  ACCOUNT = 'ACCOUNT',
  COMMUNITY = 'COMMUNITY',
  OTHER = 'OTHER',
}
registerEnumType(FaqCategory, { name: 'FaqCategory' });

export enum FaqStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DELETED = 'DELETED',
}
registerEnumType(FaqStatus, { name: 'FaqStatus' });
