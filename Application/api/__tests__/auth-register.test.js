jest.mock('@supabase/supabase-js', () => {
  const mockMaybeSingle = jest.fn();
  const mockInsert = jest.fn();
  const mockEq     = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
  const mockSelect = jest.fn(() => ({ eq: mockEq }));
  const mockFrom   = jest.fn(() => ({ select: mockSelect, insert: mockInsert }));
  return {
    createClient: jest.fn(() => ({ from: mockFrom })),
    __mockMaybeSingle: mockMaybeSingle,
    __mockInsert: mockInsert,
  };
});
jest.mock('bcryptjs', () => ({ hash: jest.fn() }));

import handler from '../auth-register.js';
import { __mockMaybeSingle, __mockInsert } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

function createRes() {
  const r = {};
  r.status = jest.fn(() => r);
  r.json   = jest.fn(() => r);
  r.end    = jest.fn(() => r);
  return r;
}

const validBody = { userId: 'user01', password: 'pass12', name: '홍길동', birthDate: '2000-01-01', gender: 'MALE' };

describe('auth-register handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    bcrypt.hash.mockResolvedValue('$hashed');
  });

  test('POST 외 메서드 → 405', async () => {
    const res = createRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.end).toHaveBeenCalled();
  });

  test('userId 4자 미만 → 400', async () => {
    const res = createRes();
    await handler({ method: 'POST', body: { ...validBody, userId: 'abc' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('4자') }));
  });

  test('password 6자 미만 → 400', async () => {
    const res = createRes();
    await handler({ method: 'POST', body: { ...validBody, password: '12345' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('6자') }));
  });

  test('name 누락 → 400', async () => {
    const res = createRes();
    await handler({ method: 'POST', body: { ...validBody, name: '' } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('이미 존재하는 userId → 409', async () => {
    __mockMaybeSingle.mockResolvedValue({ data: { user_id: 'user01' }, error: null });
    const res = createRes();
    await handler({ method: 'POST', body: validBody }, res);
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('아이디') }));
  });

  test('Supabase insert 실패 → 500', async () => {
    __mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    __mockInsert.mockResolvedValue({ error: new Error('insert fail') });
    const res = createRes();
    await handler({ method: 'POST', body: validBody }, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  test('정상 회원가입 → 200 with userId', async () => {
    __mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    __mockInsert.mockResolvedValue({ error: null });
    const res = createRes();
    await handler({ method: 'POST', body: validBody }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ userId: 'user01' });
  });

  test('gender 누락 시 기본값 MALE로 insert 호출', async () => {
    __mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    __mockInsert.mockResolvedValue({ error: null });
    const res = createRes();
    await handler({ method: 'POST', body: { ...validBody, gender: undefined } }, res);
    expect(__mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ gender: 'MALE' })
    );
  });
});
