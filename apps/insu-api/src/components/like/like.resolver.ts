import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { LikeService } from './like.service';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { ObjectId } from 'mongoose';
import { shapeIntoMongoObjectId } from '../../libs/config';
import { Package } from '../../libs/dto/package/package';

@Resolver()
export class LikeResolver {
  constructor(private readonly likeService: LikeService) {}

  @UseGuards(AuthGuard)
  @Mutation(() => Package)
  public async likeTargetPackage(
    @Args('packageId') packageId: string,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Package> {
    console.log('Mutation: likeTargetPackage');
    return this.likeService.likeTargetPackage(
      memberId,
      shapeIntoMongoObjectId(packageId),
    );
  }

  @UseGuards(AuthGuard)
  @Mutation(() => Boolean)
  public async likeTargetBoardArticle(
    @Args('articleId') articleId: string,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<boolean> {
    console.log('Mutation: likeTargetBoardArticle');
    await this.likeService.likeTargetBoardArticle(
      memberId,
      shapeIntoMongoObjectId(articleId),
    );
    return true;
  }

  @UseGuards(AuthGuard)
  @Mutation(() => Boolean)
  public async likeTargetMember(
    @Args('memberId') targetMemberId: string,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<boolean> {
    console.log('Mutation: likeTargetMember');
    await this.likeService.likeTargetMember(
      memberId,
      shapeIntoMongoObjectId(targetMemberId),
    );
    return true;
  }

  @UseGuards(AuthGuard)
  @Query(() => [Package])
  public async getFavoritePackages(
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Package[]> {
    console.log('Query: getFavoritePackages');
    return this.likeService.getFavoritePackages(memberId);
  }
}
