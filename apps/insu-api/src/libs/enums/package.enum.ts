import { registerEnumType } from '@nestjs/graphql';

export enum PackageCategory {
  HEALTH = 'HEALTH',
  LIFE = 'LIFE',
  AUTO = 'AUTO',
  HOME = 'HOME',
  TRAVEL = 'TRAVEL',
}
registerEnumType(PackageCategory, {
  name: 'PackageCategory',
});

export enum PackageStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED',
}
registerEnumType(PackageStatus, {
  name: 'PackageStatus',
});
