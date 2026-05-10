import { Query, Resolver } from '@nestjs/graphql';
import { LikeService } from './like.service';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { ObjectId } from 'mongoose';
import { Package } from '../../libs/dto/package/package';

@Resolver()
export class LikeResolver {
  constructor(private readonly likeService: LikeService) {}

  @UseGuards(AuthGuard)
  @Query(() => [Package])
  public async getFavoritePackages(
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Package[]> {
    console.log('Query: getFavoritePackages');
    return this.likeService.getFavoritePackages(memberId);
  }
}
