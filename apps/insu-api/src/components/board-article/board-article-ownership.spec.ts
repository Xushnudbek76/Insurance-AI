import { Types } from 'mongoose';
import { BoardArticleService } from './board-article.service';
import { BoardArticleStatus } from '../../libs/enums/board-article.enum';

describe('Article author updates', () => {
  const owner = new Types.ObjectId();
  const other = new Types.ObjectId();
  const id = new Types.ObjectId();
  let article: any;
  let count: number;
  let service: BoardArticleService;
  beforeEach(() => {
    count = 1;
    article = {
      _id: id,
      memberId: owner,
      articleStatus: BoardArticleStatus.ACTIVE,
      articleTitle: 'Original',
    };
    const query = (filter: any, update: any) => ({
      exec: async () => {
        if (filter.memberId && String(filter.memberId) !== String(owner))
          return null;
        if (
          filter.articleStatus &&
          filter.articleStatus !== article.articleStatus
        )
          return null;
        Object.assign(article, update.$set ?? update);
        return { ...article };
      },
    });
    service = new BoardArticleService(
      { findOneAndUpdate: query, findByIdAndUpdate: query } as any,
      {
        memberStatsEditor: async () => {
          count--;
        },
      } as any,
      {} as any,
      {} as any,
    );
  });
  it('rejects another author without editing the record or counter', async () => {
    await expect(
      service.updateBoardArticle(other as any, {
        _id: id as any,
        articleTitle: 'Changed',
      }),
    ).rejects.toThrow();
    expect(article.articleTitle).toBe('Original');
    expect(count).toBe(1);
  });
  it('allows the owner to edit without accepting injected counters', async () => {
    const result = await service.updateBoardArticle(
      owner as any,
      { _id: id, articleTitle: 'Updated title', articleLikes: 999 } as any,
    );
    expect(result.articleTitle).toBe('Updated title');
    expect((result as any).articleLikes).toBeUndefined();
  });
  it('only decrements the counter on the first authorized deletion', async () => {
    await service.updateBoardArticle(owner as any, {
      _id: id as any,
      articleStatus: BoardArticleStatus.DELETED,
    });
    await expect(
      service.updateBoardArticle(owner as any, {
        _id: id as any,
        articleStatus: BoardArticleStatus.DELETED,
      }),
    ).rejects.toThrow();
    expect(count).toBe(0);
  });
});
