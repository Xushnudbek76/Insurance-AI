import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ObjectId } from 'mongoose';
import { Faq, Faqs } from '../../libs/dto/faq/faq';
import { AllFaqsInquiry, FaqInput, FaqsInquiry } from '../../libs/dto/faq/faq.input';
import { FaqUpdate } from '../../libs/dto/faq/faq.update';
import { FaqService } from './faq.service';
import { AuthMember } from '../auth/decorators/authMember.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { MemberType } from '../../libs/enums/member.enum';
import { shapeIntoMongoObjectId } from '../../libs/config';

@Resolver()
export class FaqResolver {
  constructor(private readonly faqService: FaqService) {}

  @Query(() => Faqs)
  public async getFaqs(@Args('input') input: FaqsInquiry): Promise<Faqs> {
    return await this.faqService.getFaqs(input);
  }

  @Roles(MemberType.ADMIN)
  @UseGuards(RolesGuard)
  @Query(() => Faqs)
  public async getAllFaqsByAdmin(@Args('input') input: AllFaqsInquiry): Promise<Faqs> {
    return await this.faqService.getAllFaqsByAdmin(input);
  }

  @Roles(MemberType.ADMIN)
  @UseGuards(RolesGuard)
  @Mutation(() => Faq)
  public async createFaqByAdmin(@Args('input') input: FaqInput, @AuthMember('_id') memberId: string): Promise<Faq> {
    return await this.faqService.createFaqByAdmin(memberId, input);
  }

  @Roles(MemberType.ADMIN)
  @UseGuards(RolesGuard)
  @Mutation(() => Faq)
  public async updateFaqByAdmin(@Args('input') input: FaqUpdate): Promise<Faq> {
    input._id = shapeIntoMongoObjectId(input._id) as ObjectId;
    return await this.faqService.updateFaqByAdmin(input);
  }

  @Roles(MemberType.ADMIN)
  @UseGuards(RolesGuard)
  @Mutation(() => Faq)
  public async removeFaqByAdmin(@Args('faqId') faqId: string): Promise<Faq> {
    return await this.faqService.removeFaqByAdmin(faqId);
  }
}
