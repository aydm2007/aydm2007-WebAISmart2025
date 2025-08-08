process.env.OPENAI_MOCK = '1';
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('Chat MOCK', () => {
  it('returns mock analysis result structure', async () => {
    const res = await request(app).post('/api/chat').send({ question: 'ما هي أفضل 10 أصناف؟' }).expect(200);
    expect(res.body).toHaveProperty('summary');
    expect(res.body).toHaveProperty('patterns');
    expect(res.body).toHaveProperty('recommendations');
    expect(res.body).toHaveProperty('sql');
    expect(res.body).toHaveProperty('data');
  });
});
