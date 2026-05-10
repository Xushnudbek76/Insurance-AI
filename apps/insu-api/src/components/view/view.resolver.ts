import { Args, Query, Resolver } from '@nestjs/graphql';
import { ViewService } from './view.service';
import { UseGuards } from '@nestjs/common';
import { AuthGuard } from '../auth/guards/auth.guard';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { ObjectId } from 'mongoose';
import { Packages } from '../../libs/dto/package/package';
import { OrdinaryInquiry } from '../../libs/dto/like/like.input';

@Resolver()
export class ViewResolver {
  constructor(private readonly viewService: ViewService) {}

  @UseGuards(AuthGuard)
  @Query(() => Packages)
  public async getVisitedPackages(
    @Args('input') input: OrdinaryInquiry,
    @AuthMember('_id') memberId: ObjectId,
  ): Promise<Packages> {
    console.log('Query: getVisitedPackages');
    return this.viewService.getVisitedPackages(memberId, input);
  }
}
