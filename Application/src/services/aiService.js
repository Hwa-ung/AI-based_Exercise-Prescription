// AIService — 서버리스 함수(/api/generate-workout)를 호출하는 얇은 클라이언트
// Claude API 키는 서버에만 있으므로 브라우저 코드에는 키가 전혀 없음
import StorageService from './storageService';

const AIService = {
  async generateWorkout(userData, completedHistory = null) {
    // 24시간 캐시: 같은 유저·목표·날짜면 호출 생략
    const today    = new Date().toISOString().split('T')[0];
    const cacheKey = `wefit_ai_cache_${userData.userId || 'guest'}_${userData.goal}_${userData.availableDays}_${today}`;
    const cached   = StorageService.get(cacheKey);
    if (cached) return cached;

    const res = await fetch('/api/generate-workout', {
      method:  'POST',
      headers: { 'content-type': 'application/json' },
      body:    JSON.stringify({ userData, completedHistory }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || `요청 실패 (HTTP ${res.status})`);
    }

    const result = await res.json();
    // 폴백(예시) 처방은 캐시하지 않음 — 다음 시도 때 실제 호출이 다시 일어나도록
    if (!result._isFallback) StorageService.set(cacheKey, result);
    return result;
  },
};

export default AIService;
