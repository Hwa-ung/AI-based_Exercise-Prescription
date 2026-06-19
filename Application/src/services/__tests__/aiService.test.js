jest.mock('../storageService');

import AIService from '../aiService';
import StorageService from '../storageService';

describe('AIService.generateWorkout', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn();
  });

  test('캐시된 결과가 있으면 fetch를 호출하지 않고 캐시를 반환한다', async () => {
    const cached = { plan: '캐시된 운동 계획' };
    StorageService.get.mockReturnValue(cached);

    const result = await AIService.generateWorkout({ userId: 'u1', goal: '근력_상승', availableDays: 3 });

    expect(result).toBe(cached);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test('캐시가 없으면 /api/generate-workout을 호출하고 결과를 캐시에 저장한다', async () => {
    StorageService.get.mockReturnValue(null);
    const apiResult = { plan: '새로운 운동 계획' };
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => apiResult,
    });

    const result = await AIService.generateWorkout({ userId: 'u1', goal: '근력_상승', availableDays: 3 });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/generate-workout',
      expect.objectContaining({ method: 'POST' })
    );
    expect(result).toEqual(apiResult);
    expect(StorageService.set).toHaveBeenCalledTimes(1);
  });

  test('응답이 fallback(_isFallback)이면 캐시에 저장하지 않는다', async () => {
    StorageService.get.mockReturnValue(null);
    const fallbackResult = { plan: '예시 처방', _isFallback: true };
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => fallbackResult,
    });

    const result = await AIService.generateWorkout({ userId: 'u1', goal: '체중_감량', availableDays: 5 });

    expect(result).toEqual(fallbackResult);
    expect(StorageService.set).not.toHaveBeenCalled();
  });

  test('응답이 실패(ok:false)면 서버가 보낸 에러 메시지로 예외를 던진다', async () => {
    StorageService.get.mockReturnValue(null);
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: '서버 내부 오류' }),
    });

    await expect(
      AIService.generateWorkout({ userId: 'u1', goal: '근력_상승', availableDays: 3 })
    ).rejects.toThrow('서버 내부 오류');
  });

  test('에러 응답 본문이 JSON이 아니어도 HTTP 상태코드로 예외 메시지를 만든다', async () => {
    StorageService.get.mockReturnValue(null);
    global.fetch.mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => { throw new Error('not json'); },
    });

    await expect(
      AIService.generateWorkout({ userId: 'u1', goal: '근력_상승', availableDays: 3 })
    ).rejects.toThrow('요청 실패 (HTTP 503)');
  });

  test('userId가 없으면 guest로 캐시 키를 구성한다 (호출 자체가 에러 없이 진행된다)', async () => {
    StorageService.get.mockReturnValue(null);
    global.fetch.mockResolvedValue({ ok: true, json: async () => ({ plan: 'p' }) });

    await AIService.generateWorkout({ goal: '체중_감량', availableDays: 2 });

    expect(StorageService.get).toHaveBeenCalledWith(
      expect.stringContaining('wefit_ai_cache_guest_')
    );
  });
});
