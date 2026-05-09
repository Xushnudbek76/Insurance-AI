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
