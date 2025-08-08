import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('Export table excel', () => {
  it('returns xlsx for rows', async () => {
    const res = await request(app)
      .post('/export/export/table-excel')
      .send({ rows: [{a:1,b:'x'},{a:2,b:'y'}] })
      .expect(200);
    expect(res.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  });
});
