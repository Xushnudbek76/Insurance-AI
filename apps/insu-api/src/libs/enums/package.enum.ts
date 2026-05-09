import { registerEnumType } from '@nestjs/graphql';

export enum InsuranceType {
  TERM_LIFE = 'TERM_LIFE',
  WHOLE_LIFE = 'WHOLE_LIFE',
  PET = 'PET',
  CRITICAL_ILLNESS = 'CRITICAL_ILLNESS',
  DISABILITY = 'DISABILITY',
  TRAVEL = 'TRAVEL',
  CYBER_LIABILITY = 'CYBER_LIABILITY',
  PROFESSIONAL_INDEMNITY = 'PROFESSIONAL_INDEMNITY',
  LEGAL_EXPENSE = 'LEGAL_EXPENSE',
  ACCIDENT = 'ACCIDENT',
  HEALTH = 'HEALTH',
  AUTO = 'AUTO',
  HOME = 'HOME',
}
registerEnumType(InsuranceType, {
  name: 'InsuranceType',
});

export enum PackageStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}
registerEnumType(PackageStatus, {
  name: 'PackageStatus',
});
