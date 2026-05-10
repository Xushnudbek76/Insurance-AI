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
import { T } from './types/common';

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

export const lookupAuthMemberLiked = (
  memberId: T | null,
  targetRefId: string = '$_id',
) => {
  return {
    $lookup: {
      from: 'likes',
      let: {
        localLikeRefId: targetRefId,
        localMemberId: memberId,
        localMyFavorite: true,
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$likeRefId', '$$localLikeRefId'] },
                { $eq: ['$memberId', '$$localMemberId'] },
              ],
            },
          },
        },
        {
          $project: {
            _id: 1,
            memberId: 1,
            likeRefId: 1,
            myFavorite: '$$localMyFavorite',
          },
        },
      ],
      as: 'meLiked',
    },
  };
};

export const lookupMember = {
  $lookup: {
    from: 'members',
    localField: 'memberId',
    foreignField: '_id',
    as: 'memberData',
  },
};

export const lookupFollowingData = {
  $lookup: {
    from: 'members',
    localField: 'followingId',
    foreignField: '_id',
    as: 'followingData',
  },
};

export const lookupFollowerData = {
  $lookup: {
    from: 'members',
    localField: 'followerId',
    foreignField: '_id',
    as: 'followerData',
  },
};

interface LookupAuthMemberFollowed {
  followerId: T;
  followingId: string;
}
export const lookupAuthMemberFollowed = (input: LookupAuthMemberFollowed) => {
  const { followerId, followingId } = input;
  return {
    $lookup: {
      from: 'follows',
      let: {
        localFollowerId: followerId,
        localFollowingId: followingId,
        localMyFavorite: true,
      },
      pipeline: [
        {
          $match: {
            $expr: {
              $and: [
                { $eq: ['$followerId', '$$localFollowerId'] },
                { $eq: ['$followingId', '$$localFollowingId'] },
              ],
            },
          },
        },
        {
          $project: {
            _id: 0,
            followerId: 1,
            followingId: 1,
            myFollowing: '$$localMyFavorite',
          },
        },
      ],
      as: 'meFollowed',
    },
  };
};
