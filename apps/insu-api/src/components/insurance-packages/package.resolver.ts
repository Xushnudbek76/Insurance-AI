import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { ObjectId } from 'mongoose';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { AuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { WithoutGuard } from '../auth/guards/without.guard';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { MemberType } from '../../libs/enums/member.enum';
import {
  AgentPackagesInquiry,
  PackageInput,
  PackagesInquiry,
} from '../../libs/dto/package/package.input';
import {
  AllPackagesInquiry,
  PackageUpdate,
} from '../../libs/dto/package/package.update';
import { Package, Packages } from '../../libs/dto/package/package';
import { PackageService } from './package.service';

@Resolver()
export class PackageResolver {
  constructor(private readonly packageService: PackageService) {}

  @Roles(MemberType.AGENT)
  @UseGuards(RolesGuard)
  @Mutation(() => Package)
  public async createPackage(
    @Args('input') input: PackageInput,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Package> {
    console.log('Mutation: createPackage');
    return this.packageService.createPackage(memberId, input);
  }

  @UseGuards(WithoutGuard)
  @Query(() => Package)
  public async getPackage(
    @Args('packageId') input: string,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Package> {
    console.log('Query: getPackage');
    const packageId = shapeIntoMongoObjectId(input);
    return this.packageService.getPackage(memberId, packageId);
  }

  @Roles(MemberType.AGENT)
  @UseGuards(RolesGuard)
  @Mutation(() => Package)
  public async updatePackage(
    @Args('input') input: PackageUpdate,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Package> {
    console.log('Mutation: updatePackage');
    input._id = shapeIntoMongoObjectId(input._id);
    return this.packageService.updatePackage(memberId, input);
  }

  @UseGuards(WithoutGuard)
  @Query(() => Packages)
  public async getPackages(
    @Args('input') input: PackagesInquiry,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Packages> {
    console.log('Query: getPackages');
    return this.packageService.getPackages(memberId, input);
  }

  @Roles(MemberType.AGENT)
  @UseGuards(RolesGuard)
  @Query(() => Packages)
  public async getAgentPackages(
    @Args('input') input: AgentPackagesInquiry,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Packages> {
    console.log('Query: getAgentPackages');
    return this.packageService.getAgentPackages(memberId, input);
  }

  @Roles(MemberType.ADMIN)
  @UseGuards(RolesGuard)
  @Query(() => Packages)
  public async getAllPackagesByAdmin(
    @Args('input') input: AllPackagesInquiry,
  ): Promise<Packages> {
    console.log('Query: getAllPackagesByAdmin');
    return this.packageService.getAllPackagesByAdmin(input);
  }

  @Roles(MemberType.ADMIN)
  @UseGuards(RolesGuard)
  @Mutation(() => Package)
  public async updatePackageByAdmin(
    @Args('input') input: PackageUpdate,
  ): Promise<Package> {
    console.log('Mutation: updatePackageByAdmin');
    input._id = shapeIntoMongoObjectId(input._id);
    return this.packageService.updatePackageByAdmin(input);
  }

  @Roles(MemberType.ADMIN)
  @UseGuards(RolesGuard)
  @Mutation(() => Package)
  public async removePackageByAdmin(
    @Args('packageId') input: string,
  ): Promise<Package> {
    console.log('Mutation: removePackageByAdmin');
    const packageId = shapeIntoMongoObjectId(input);
    return this.packageService.removePackageByAdmin(packageId);
  }
}
