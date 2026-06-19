jest.mock('@supabase/supabase-js', () => {
  const mockMaybeSingle = jest.fn();
  const mockUpsert = jest.fn();
  const mockEq     = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
  const mockSelect = jest.fn(() => ({ eq: mockEq }));
  const mockFrom   = jest.fn(() => ({ select: mockSelect, upsert: mockUpsert }));
  return {
    createClient: jest.fn(() => ({ from: mockFrom })),
    __mockMaybeSingle: mockMaybeSingle,
    __mockUpsert: mockUpsert,
  };
});

import handler from '../data-sync.js';
import { __mockMaybeSingle, __mockUpsert } from '@supabase/supabase-js';

function createRes() {
  const r = {};
  r.status = jest.fn(() => r);
  r.json   = jest.fn(() => r);
  r.end    = jest.fn(() => r);
  return r;
}

const dbRow = {
  body_records:    [{ date: '2026-01-01', weight: 70 }],
  workout_records: [{ date: '2026-01-01', name: '벤치 프레스' }],
  calendar_data:   { '2026-01-01': true },
  goal:            '근력_상승',
};

describe('data-sync handler — GET', () => {
  beforeEach(() => jest.clearAllMocks());

  test('userId 없으면 → 400', async () => {
    const res = createRes();
    await handler({ method: 'GET', query: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('Supabase 에러 → 500', async () => {
    __mockMaybeSingle.mockResolvedValue({ data: null, error: new Error('db error') });
    const res = createRes();
    await handler({ method: 'GET', query: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('데이터 없으면 → 200 빈 객체', async () => {
    __mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const res = createRes();
    await handler({ method: 'GET', query: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({});
  });

  test('데이터 있으면 → 200 with 필드 매핑', async () => {
    __mockMaybeSingle.mockResolvedValue({ data: dbRow, error: null });
    const res = createRes();
    await handler({ method: 'GET', query: { userId: 'u1' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({
      bodyRecords:    dbRow.body_records,
      workoutRecords: dbRow.workout_records,
      calendarData:   dbRow.calendar_data,
      goal:           dbRow.goal,
    });
  });

  test('누락 필드는 기본값으로 채움', async () => {
    __mockMaybeSingle.mockResolvedValue({ data: { goal: null }, error: null });
    const res = createRes();
    await handler({ method: 'GET', query: { userId: 'u1' } }, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      bodyRecords:    [],
      workoutRecords: [],
      calendarData:   {},
      goal:           '근력_상승',
    }));
  });
});

describe('data-sync handler — POST', () => {
  beforeEach(() => jest.clearAllMocks());

  test('userId 없으면 → 400', async () => {
    const res = createRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('Supabase upsert 실패 → 500', async () => {
    __mockUpsert.mockResolvedValue({ error: new Error('upsert fail') });
    const res = createRes();
    await handler({ method: 'POST', body: { userId: 'u1', ...dbRow } }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('정상 upsert → 200 with ok', async () => {
    __mockUpsert.mockResolvedValue({ error: null });
    const res = createRes();
    await handler({ method: 'POST', body: { userId: 'u1', ...dbRow } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ ok: true });
  });

  test('upsert 호출 시 onConflict user_id 옵션 포함', async () => {
    __mockUpsert.mockResolvedValue({ error: null });
    const res = createRes();
    await handler({ method: 'POST', body: { userId: 'u1' } }, res);
    expect(__mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'u1' }),
      { onConflict: 'user_id' }
    );
  });
});

describe('data-sync handler — 기타 메서드', () => {
  test('GET/POST 외 메서드 → 405', async () => {
    const res = createRes();
    await handler({ method: 'DELETE', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.end).toHaveBeenCalled();
  });
});
