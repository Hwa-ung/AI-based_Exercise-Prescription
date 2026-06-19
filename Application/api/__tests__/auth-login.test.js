jest.mock('@supabase/supabase-js', () => {
  const mockMaybeSingle = jest.fn();
  const mockEq     = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
  const mockSelect = jest.fn(() => ({ eq: mockEq }));
  const mockFrom   = jest.fn(() => ({ select: mockSelect }));
  return {
    createClient: jest.fn(() => ({ from: mockFrom })),
    __mockMaybeSingle: mockMaybeSingle,
  };
});
jest.mock('bcryptjs', () => ({ compare: jest.fn() }));

import handler from '../auth-login.js';
import { __mockMaybeSingle } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

function createRes() {
  const r = {};
  r.status = jest.fn(() => r);
  r.json   = jest.fn(() => r);
  r.end    = jest.fn(() => r);
  return r;
}

const validUser = {
  user_id: 'user01', password_hash: '$hashed',
  name: '홍길동', gender: 'MALE', birth_date: '2000-01-01',
};

describe('auth-login handler', () => {
  beforeEach(() => jest.clearAllMocks());

  test('POST 외 메서드 → 405', async () => {
    const res = createRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.end).toHaveBeenCalled();
  });

  test('userId 누락 → 400', async () => {
    const res = createRes();
    await handler({ method: 'POST', body: { password: 'pw1234' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
  });

  test('password 누락 → 400', async () => {
    const res = createRes();
    await handler({ method: 'POST', body: { userId: 'user01' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('유저 미존재 → 401', async () => {
    __mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    const res = createRes();
    await handler({ method: 'POST', body: { userId: 'nouser', password: 'pw' } }, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('Supabase 에러 → 401', async () => {
    __mockMaybeSingle.mockResolvedValue({ data: null, error: new Error('db error') });
    const res = createRes();
    await handler({ method: 'POST', body: { userId: 'user01', password: 'pw' } }, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('비밀번호 불일치 → 401', async () => {
    __mockMaybeSingle.mockResolvedValue({ data: validUser, error: null });
    bcrypt.compare.mockResolvedValue(false);
    const res = createRes();
    await handler({ method: 'POST', body: { userId: 'user01', password: 'wrong' } }, res);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('정상 로그인 → 200 with userId/name/token', async () => {
    __mockMaybeSingle.mockResolvedValue({ data: validUser, error: null });
    bcrypt.compare.mockResolvedValue(true);
    const res = createRes();
    await handler({ method: 'POST', body: { userId: 'user01', password: 'correct' } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'user01',
      name: '홍길동',
      gender: 'MALE',
      birthDate: '2000-01-01',
      token: expect.any(String),
    }));
  });
});
