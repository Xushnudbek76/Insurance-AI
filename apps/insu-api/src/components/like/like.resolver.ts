import { Args, Query, Resolver } from '@nestjs/graphql';
import { LikeService } from './like.service';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { ObjectId } from 'mongoose';
import { Packages } from '../../libs/dto/package/package';
import { OrdinaryInquiry } from '../../libs/dto/like/like.input';

@Resolver()
export class LikeResolver {
  constructor(private readonly likeService: LikeService) {}

  @UseGuards(AuthGuard)
  @Query(() => Packages)
  public async getFavoritePackages(
    @Args('input') input: OrdinaryInquiry,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Packages> {
    console.log('Query: getFavoritePackages');
    return this.likeService.getFavoritePackages(memberId, input);
  }
}
