jest.mock('../syncService');

import AuthService from '../authService';
import SyncService from '../syncService';

describe('AuthService.register', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn();
  });

  test('성공하면 응답 데이터를 그대로 반환한다', async () => {
    const data = { userId: 'u1', name: '홍길동' };
    global.fetch.mockResolvedValue({ ok: true, json: async () => data });

    const result = await AuthService.register({
      userId: 'u1', password: 'pw', name: '홍길동', birthDate: '2000-01-01', gender: 'MALE',
    });

    expect(result).toEqual(data);
    expect(global.fetch).toHaveBeenCalledWith('/api/auth-register', expect.objectContaining({ method: 'POST' }));
  });

  test('실패하면 서버 에러 메시지로 예외를 던진다', async () => {
    global.fetch.mockResolvedValue({ ok: false, json: async () => ({ error: '이미 존재하는 아이디' }) });

    await expect(
      AuthService.register({ userId: 'dup', password: 'pw', name: 'a', birthDate: '2000-01-01', gender: 'MALE' })
    ).rejects.toThrow('이미 존재하는 아이디');
  });
});

describe('AuthService.login', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn();
    sessionStorage.clear();
  });

  test('로그인 성공 시 세션을 저장하고 SyncService.load를 호출한다', async () => {
    const data = { userId: 'u1', name: '홍길동' };
    global.fetch.mockResolvedValue({ ok: true, json: async () => data });

    const result = await AuthService.login({ userId: 'u1', password: 'pw' });

    expect(result).toEqual(data);
    expect(JSON.parse(sessionStorage.getItem('wefit_session'))).toEqual(data);
    expect(SyncService.load).toHaveBeenCalledWith('u1');
  });

  test('로그인 실패 시 세션을 저장하지 않고 예외를 던진다', async () => {
    global.fetch.mockResolvedValue({ ok: false, json: async () => ({ error: '비밀번호 불일치' }) });

    await expect(AuthService.login({ userId: 'u1', password: 'wrong' })).rejects.toThrow('비밀번호 불일치');
    expect(sessionStorage.getItem('wefit_session')).toBeNull();
    expect(SyncService.load).not.toHaveBeenCalled();
  });
});

describe('AuthService.logout / getCurrentUser', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  test('로그인 상태에서 logout하면 getCurrentUser가 null을 반환한다', () => {
    sessionStorage.setItem('wefit_session', JSON.stringify({ userId: 'u1' }));
    AuthService.logout();
    expect(AuthService.getCurrentUser()).toBeNull();
  });

  test('세션이 있으면 getCurrentUser가 해당 객체를 반환한다', () => {
    sessionStorage.setItem('wefit_session', JSON.stringify({ userId: 'u1', name: '홍길동' }));
    expect(AuthService.getCurrentUser()).toEqual({ userId: 'u1', name: '홍길동' });
  });
});

describe('AuthService.updateProfile', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn();
    sessionStorage.clear();
  });

  test('성공 시 세션에 저장된 프로필 정보를 갱신한다', async () => {
    sessionStorage.setItem('wefit_session', JSON.stringify({ userId: 'u1', name: 'old', birthDate: '1999-01-01', gender: 'MALE' }));
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });

    await AuthService.updateProfile({ userId: 'u1', name: 'new', birthDate: '2000-02-02', gender: 'FEMALE' });

    const session = JSON.parse(sessionStorage.getItem('wefit_session'));
    expect(session).toEqual({ userId: 'u1', name: 'new', birthDate: '2000-02-02', gender: 'FEMALE' });
  });

  test('세션이 없으면 SessionStore에 쓰지 않고 정상 종료한다', async () => {
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ success: true }) });

    await expect(
      AuthService.updateProfile({ userId: 'u1', name: 'new', birthDate: '2000-02-02', gender: 'FEMALE' })
    ).resolves.toBeUndefined();
    expect(sessionStorage.getItem('wefit_session')).toBeNull();
  });

  test('실패하면 에러 메시지로 예외를 던진다', async () => {
    global.fetch.mockResolvedValue({ ok: false, json: async () => ({ error: '업데이트 실패' }) });

    await expect(
      AuthService.updateProfile({ userId: 'u1', name: 'new', birthDate: '2000-02-02', gender: 'FEMALE' })
    ).rejects.toThrow('업데이트 실패');
  });
});
