import express from 'express';
import request from 'supertest';
import { createRequestLimiters } from './request-safety';

describe('GraphQL request throttling', () => {
  it('throttles repeated authentication attempts without blocking ordinary browsing', async () => {
    const app = express();
    app.use(express.json(), ...createRequestLimiters());
    app.post('/graphql', (_request, response) => {
      response.json({ data: { ok: true } });
    });
    try {
      for (let i = 0; i < 15; i++)
        await request(app)
          .post('/graphql')
          .send({ query: 'mutation { login }' })
          .expect(200);
      await request(app)
        .post('/graphql')
        .send({ query: 'mutation { login }' })
        .expect(429);
      await request(app)
        .post('/graphql')
        .send({ query: '{ getPackages }' })
        .expect(200);
    } finally {
      // express-rate-limit stores use unref'ed timers and close with the process.
    }
  });
});
