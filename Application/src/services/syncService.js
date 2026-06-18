import StorageService from './storageService';

const SyncService = {
  // DB → localStorage (로그인/앱 로드 시)
  async load(userId) {
    try {
      const res = await fetch(`/api/data-sync?userId=${encodeURIComponent(userId)}`);
      if (!res.ok) return;
      const data = await res.json();

      if (data.bodyRecords?.length)
        StorageService.set(`wefit_body_${userId}`, data.bodyRecords);
      if (data.workoutRecords?.length)
        StorageService.set(`wefit_workout_${userId}`, data.workoutRecords);
      if (data.calendarData && Object.keys(data.calendarData).length)
        StorageService.set(`wefit_calendar_${userId}`, data.calendarData);
      if (data.goal)
        StorageService.set(`wefit_goal_${userId}`, data.goal);
    } catch {}
  },

  // localStorage → DB (데이터 저장 시)
  async save(userId) {
    try {
      await fetch('/api/data-sync', {
        method:  'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          userId,
          bodyRecords:    StorageService.get(`wefit_body_${userId}`)     ?? [],
          workoutRecords: StorageService.get(`wefit_workout_${userId}`)  ?? [],
          calendarData:   StorageService.get(`wefit_calendar_${userId}`) ?? {},
          goal:           StorageService.get(`wefit_goal_${userId}`)     ?? '근력_상승',
        }),
      });
    } catch {}
  },
};

export default SyncService;
