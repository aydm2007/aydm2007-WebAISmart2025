process.env.OPENAI_MOCK = '1';
import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

function extractEvents(streamText: string) {
  // Split Server-Sent Events stream into array of parsed JSON objects after 'data:'
  const events: any[] = [];
  for (const chunk of streamText.split('\n\n')) {
    const line = chunk.trim();
    if (!line.startsWith('data:')) continue;
    const json = line.slice(5).trim();
    try { events.push(JSON.parse(json)); } catch {}
  }
  return events;
}

describe('Full E2E Flow via SSE → Analysis → Export', () => {
  it('streams, resolves id, fetches analysis, and exports Excel/PDF', async () => {
    // 1) SSE: stream tokens and done with {id}
    const sse = await request(app)
      .post('/api/chat/stream')
      .send({ question: 'اعرض أصناف المبيعات' })
      .buffer(true)
      .parse((res, cb) => {
        let data = '';
        res.on('data', (chunk) => { data += chunk.toString('utf8'); });
        res.on('end', () => cb(null, data));
      })
      .expect(200);

    expect(sse.headers['content-type']).toContain('text/event-stream');
    const events = extractEvents(sse.text);
    expect(events.some(e => e?.type === 'token')).toBe(true);
    const done = events.find(e => e?.type === 'done');
    expect(done).toBeDefined();
    const id = done?.data?.id;
    expect(id).toBeDefined();

    // 2) Fetch analysis by id
    const analysis = await request(app).get(`/api/analysis/${id}`).expect(200);
    expect(analysis.body).toHaveProperty('summary');
    expect(analysis.body).toHaveProperty('sql');
    expect(Array.isArray(analysis.body?.data)).toBe(true);

    // 3) Export Excel with the returned data
    const rows = analysis.body?.data || [];
    const excel = await request(app).post('/export/table-excel').send({ rows }).expect(200);
    expect(excel.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

    // 4) Export PDF with the same data
    const pdf = await request(app).post('/export/table-pdf').send({ rows }).expect(200);
    expect(pdf.headers['content-type']).toContain('application/pdf');
  });
});
