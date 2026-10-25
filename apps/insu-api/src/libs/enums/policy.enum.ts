import { registerEnumType } from '@nestjs/graphql';

export enum PolicyStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  PENDING = 'PENDING',
}
registerEnumType(PolicyStatus, {
  name: 'PolicyStatus',
});

export enum PurchaseStage {
  OFFERED = 'OFFERED',
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
  CONFIRMED = 'CONFIRMED',
  DECLINED = 'DECLINED',
  WITHDRAWN = 'WITHDRAWN',
}
registerEnumType(PurchaseStage, { name: 'PurchaseStage' });
