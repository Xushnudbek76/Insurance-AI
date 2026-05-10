import { ObjectId } from 'bson';

export const availableAgentsSorts = [
  'createdAt',
  'updatedAt',
  'memberLikes',
  'memberViews',
  'memberRank',
];
export const availableMembersSorts = [
  'createdAt',
  'updatedAt',
  'memberLikes',
  'memberViews',
];
export const availableBoardArticleSorts = [
  'createdAt',
  'updatedAt',
  'articleLikes',
  'articleViews',
];

export const availableCommentSorts = ['createdAt', 'updatedAt'];

export const shapeIntoMongoObjectId = (target: any) => {
  return typeof target === 'string' ? new ObjectId(target) : target;
};

import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

export const validMimeTypes = ['image/png', 'image/jpg', 'image/jpeg'];
export const getSerialForImage = (filename: string) => {
  const ext = path.parse(filename).ext;
  return uuidv4() + ext;
};

export const lookupFavorite = (memberId: object) => ({
  $lookup: {
    from: 'likes',
    let: { localId: '$_id' },
    pipeline: [
      {
        $match: {
          $expr: {
            $and: [
              { $eq: ['$likeRefId', '$$localId'] },
              { $eq: ['$memberId', memberId] },
            ],
          },
        },
      },
    ],
    as: 'meLiked',
  },
});

export const lookupMember = {
  $lookup: {
    from: 'members',
    localField: 'memberId',
    foreignField: '_id',
    as: 'memberData',
  },
};
