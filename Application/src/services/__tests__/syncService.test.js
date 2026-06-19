jest.mock('../storageService');

import SyncService from '../syncService';
import StorageService from '../storageService';

describe('SyncService.load', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn();
  });

  test('DB에 데이터가 있으면 각 항목을 localStorage 키에 저장한다', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        bodyRecords: [{ weight: 70 }],
        workoutRecords: [{ id: 1 }],
        calendarData: { '2026-06-19': true },
        goal: '근력_상승',
      }),
    });

    await SyncService.load('user1');

    expect(StorageService.set).toHaveBeenCalledWith('wefit_body_user1', [{ weight: 70 }]);
    expect(StorageService.set).toHaveBeenCalledWith('wefit_workout_user1', [{ id: 1 }]);
    expect(StorageService.set).toHaveBeenCalledWith('wefit_calendar_user1', { '2026-06-19': true });
    expect(StorageService.set).toHaveBeenCalledWith('wefit_goal_user1', '근력_상승');
  });

  test('빈 배열/빈 객체인 필드는 저장하지 않는다', async () => {
    global.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ bodyRecords: [], workoutRecords: [], calendarData: {}, goal: null }),
    });

    await SyncService.load('user2');

    expect(StorageService.set).not.toHaveBeenCalled();
  });

  test('응답이 실패(ok:false)면 아무것도 저장하지 않고 조용히 종료한다', async () => {
    global.fetch.mockResolvedValue({ ok: false });

    await expect(SyncService.load('user3')).resolves.toBeUndefined();
    expect(StorageService.set).not.toHaveBeenCalled();
  });

  test('fetch가 네트워크 에러를 던져도 예외를 전파하지 않는다', async () => {
    global.fetch.mockRejectedValue(new Error('network down'));

    await expect(SyncService.load('user4')).resolves.toBeUndefined();
  });
});

describe('SyncService.save', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    global.fetch = jest.fn().mockResolvedValue({ ok: true });
  });

  test('localStorage 값을 모아 /api/data-sync로 POST 요청을 보낸다', async () => {
    StorageService.get.mockImplementation((key) => {
      if (key === 'wefit_body_user1') return [{ weight: 65 }];
      if (key === 'wefit_workout_user1') return [{ id: 9 }];
      if (key === 'wefit_calendar_user1') return { '2026-01-01': true };
      if (key === 'wefit_goal_user1') return '체중_감량';
      return null;
    });

    await SyncService.save('user1');

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/data-sync',
      expect.objectContaining({ method: 'POST' })
    );
    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body).toEqual({
      userId: 'user1',
      bodyRecords: [{ weight: 65 }],
      workoutRecords: [{ id: 9 }],
      calendarData: { '2026-01-01': true },
      goal: '체중_감량',
    });
  });

  test('저장된 값이 없으면 기본값(빈 배열/객체/기본 goal)으로 채운다', async () => {
    StorageService.get.mockReturnValue(null);

    await SyncService.save('user2');

    const body = JSON.parse(global.fetch.mock.calls[0][1].body);
    expect(body.bodyRecords).toEqual([]);
    expect(body.workoutRecords).toEqual([]);
    expect(body.calendarData).toEqual({});
    expect(body.goal).toBe('근력_상승');
  });

  test('fetch 실패 시에도 예외를 던지지 않는다', async () => {
    global.fetch.mockRejectedValue(new Error('network error'));
    StorageService.get.mockReturnValue(null);

    await expect(SyncService.save('user3')).resolves.toBeUndefined();
  });
});
