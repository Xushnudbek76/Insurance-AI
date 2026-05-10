import { registerEnumType } from '@nestjs/graphql';

export enum ClaimStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SETTLED = 'SETTLED',
}

registerEnumType(ClaimStatus, {
  name: 'ClaimStatus',
});
