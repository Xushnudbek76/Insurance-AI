import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { T } from '../../libs/types/common';
import { View } from '../../libs/dto/view/view';
import { ViewInput } from '../../libs/dto/view/view.input';

@Injectable()
export class ViewService {
  constructor(@InjectModel('View') private readonly viewModel: Model<View>) {}

  public async recordView(input: ViewInput): Promise<View | null> {
    console.log('input:', input);

    const viewExistence = await this.checkViewExistence(input);
    console.log('viewExist:', viewExistence);
    if (!viewExistence) {
      console.log('new view');
      return await this.viewModel.create(input);
    }
    return null;
  }

  private async checkViewExistence(input: ViewInput): Promise<View | null> {
    const { memberId, viewRefId } = input;
    const search: T = { memberId: memberId, viewRefId: viewRefId };
    return await this.viewModel.findOne(search).exec();
  }
}
