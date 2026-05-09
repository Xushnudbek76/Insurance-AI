import { Field, ObjectType } from '@nestjs/graphql';
import { ObjectId } from 'mongoose';
import { ViewGroup } from '../../enums/view.enum';

@ObjectType()
export class View {
  @Field(() => String)
  _id: ObjectId | undefined;

  @Field(() => ViewGroup)
  viewGroup: ViewGroup | undefined;

  @Field(() => String)
  viewRefId: ObjectId | undefined;

  @Field(() => String)
  memberId: ObjectId | undefined;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
