import mongoose from 'mongoose';
import { ConfigModule } from '@nestjs/config';
export async function migratePurchaseOpen(collection: any, apply: boolean) {
  const candidate = {
    $or: [
      { policyStatus: 'ACTIVE' },
      {
        policyStatus: 'PENDING',
        purchaseStage: { $in: ['OFFERED', 'AWAITING_PAYMENT'] },
      },
    ],
  };
  const conflicts = await collection
    .aggregate([
      { $match: candidate },
      {
        $group: {
          _id: { memberId: '$memberId', packageId: '$packageId' },
          ids: { $push: '$_id' },
          total: { $sum: 1 },
        },
      },
      { $match: { total: { $gt: 1 } } },
    ])
    .toArray();
  if (conflicts.length)
    throw new Error(
      `Duplicate open purchases need manual resolution: ${JSON.stringify(conflicts)}`,
    );
  if (!apply) return { conflicts: 0, applied: false };
  await collection.updateMany({}, [
    {
      $set: {
        purchaseOpen: {
          $or: [
            { $eq: ['$policyStatus', 'ACTIVE'] },
            {
              $and: [
                { $eq: ['$policyStatus', 'PENDING'] },
                { $in: ['$purchaseStage', ['OFFERED', 'AWAITING_PAYMENT']] },
              ],
            },
          ],
        },
      },
    },
  ]);
  await collection.createIndex(
    { memberId: 1, packageId: 1 },
    {
      name: 'one_open_purchase',
      unique: true,
      partialFilterExpression: { purchaseOpen: true },
    },
  );
  return { conflicts: 0, applied: true };
}
if (require.main === module) {
  ConfigModule.forRoot();
  const apply = process.argv.includes('--apply');
  if (!apply && !process.argv.includes('--check'))
    throw new Error('Specify --check or --apply');
  const uri =
    process.env.NODE_ENV === 'production'
      ? process.env.MONGO_PROD
      : process.env.MONGO_DEV;
  if (!uri) throw new Error('Database not configured');
  mongoose
    .connect(uri)
    .then(async () =>
      console.log(
        await migratePurchaseOpen(
          mongoose.connection.collection('policies'),
          apply,
        ),
      ),
    )
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    })
    .finally(() => mongoose.disconnect());
}
