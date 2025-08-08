process.env.OPENAI_MOCK = '1';
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('SSE /api/chat/stream', () => {
  it('streams token and done events', async () => {
    const res = await request(app)
      .post('/api/chat/stream')
      .send({ question: 'اختبر البث' })
      .buffer(true)
      .parse((res, cb) => {
        let data = '';
        res.on('data', chunk => { data += chunk.toString('utf8'); });
        res.on('end', () => cb(null, data));
      });
    expect(res.headers['content-type']).toContain('text/event-stream');
    expect(res.text).toContain('data:'); // has at least one event
    expect(res.text).toContain('"type":"token"');
    expect(res.text).toContain('"type":"done"');
  });
});
