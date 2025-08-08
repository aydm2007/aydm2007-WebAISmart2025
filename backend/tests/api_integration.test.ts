import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('API meta', () => {
  it('returns tables with counts', async () => {
    const res = await request(app).get('/api/meta/tables').expect(200);
    expect(Array.isArray(res.body.tables)).toBe(true);
    expect(res.headers['x-request-id']).toBeDefined();
  });
});

describe('SQL safe', () => {
  it('executes SELECT safely', async () => {
    const res = await request(app)
      .post('/api/sql/safe')
      .send({ sql: 'SELECT * FROM vewInv_ItemsMain LIMIT 1' })
      .expect(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
  it('blocks CREATE TABLE', async () => {
    const res = await request(app)
      .post('/api/sql/safe')
      .send({ sql: 'CREATE TABLE x(a int)' })
      .expect(400);
    expect(res.body?.error?.code || res.text).toBeDefined();
  });
});
