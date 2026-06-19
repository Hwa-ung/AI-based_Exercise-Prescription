jest.mock('@supabase/supabase-js', () => {
  const mockEq     = jest.fn();
  const mockUpdate = jest.fn(() => ({ eq: mockEq }));
  const mockFrom   = jest.fn(() => ({ update: mockUpdate }));
  return {
    createClient: jest.fn(() => ({ from: mockFrom })),
    __mockEq:     mockEq,
    __mockUpdate: mockUpdate,
  };
});

import handler from '../auth-update-profile.js';
import { __mockEq, __mockUpdate } from '@supabase/supabase-js';

function createRes() {
  const r = {};
  r.status = jest.fn(() => r);
  r.json   = jest.fn(() => r);
  r.end    = jest.fn(() => r);
  return r;
}

const validBody = { userId: 'user01', name: '홍길동', birthDate: '2000-01-01', gender: 'FEMALE' };

describe('auth-update-profile handler', () => {
  beforeEach(() => jest.clearAllMocks());

  test('POST 외 메서드 → 405', async () => {
    const res = createRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.end).toHaveBeenCalled();
  });

  test('userId 누락 → 400', async () => {
    const res = createRes();
    await handler({ method: 'POST', body: { name: '홍길동' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
  });

  test('Supabase update 실패 → 500', async () => {
    __mockEq.mockResolvedValue({ error: new Error('update fail') });
    const res = createRes();
    await handler({ method: 'POST', body: validBody }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('정상 업데이트 → 200 with success', async () => {
    __mockEq.mockResolvedValue({ error: null });
    const res = createRes();
    await handler({ method: 'POST', body: validBody }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  test('birthDate 누락 시 null로 update 호출', async () => {
    __mockEq.mockResolvedValue({ error: null });
    const res = createRes();
    await handler({ method: 'POST', body: { userId: 'user01', name: '홍길동', gender: 'MALE' } }, res);
    expect(__mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ birth_date: null })
    );
  });
});
