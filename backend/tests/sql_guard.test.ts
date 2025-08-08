import { guardSql } from '../src/db/sql_guard';

describe('SQL Guard', () => {
  it('allows simple SELECT', () => {
    const r = guardSql('SELECT * FROM vewInv_ItemsMain LIMIT 10');
    expect(r.ok).toBe(true);
  });
  it('blocks DDL/DML', () => {
    const r = guardSql('DROP TABLE users');
    expect(r.ok).toBe(false);
  });
  it('blocks multiple statements', () => {
    const r = guardSql('SELECT 1; SELECT 2');
    expect(r.ok).toBe(false);
  });
  it('blocks unknown table', () => {
    const r = guardSql('SELECT * FROM unknown_table');
    expect(r.ok).toBe(false);
  });
});
