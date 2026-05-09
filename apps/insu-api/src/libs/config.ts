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

export const shapeIntoMongoObjectId = (target: any) => {
  return typeof target === 'string' ? new ObjectId(target) : target;
};
