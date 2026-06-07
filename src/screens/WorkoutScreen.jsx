import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService    from '../services/authService';
import StorageService from '../services/storageService';
import AIService      from '../services/aiService';
import BottomNav      from '../components/BottomNav';
import { getLyftaMedia } from '../data/lyftaCodes';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_KR = { monday:'월',tuesday:'화',wednesday:'수',thursday:'목',friday:'금',saturday:'토',sunday:'일' };


function ExerciseRow({ ex, index }) {
  const [open,     setOpen]     = useState(false);
  const [vidError, setVidError] = useState(false);
  const repText = ex.reps > 0
    ? `${ex.sets}세트 × ${ex.reps}회`
    : `${ex.sets}세트 × ${ex.duration || '시간 측정'}`;

  const media = getLyftaMedia(ex.name);
  const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' 운동 방법')}`;

  return (
    <div
      style={{ borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }}
      onClick={() => setOpen(o => !o)}
    >
      <div style={{ display: 'flex', alignItems: 'center', padding: '13px 0', gap: 12 }}>
        <div style={{ width: 28, height: 28, background: '#43a047', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
          {index + 1}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{ex.name}</div>
          <div style={{ fontSize: 13, color: '#757575', marginTop: 2 }}>{repText} · 휴식 {ex.rest}</div>
        </div>
        <span style={{ fontSize: 13, color: '#bdbdbd' }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{ paddingBottom: 14 }} onClick={e => e.stopPropagation()}>
          {ex.note && (
            <div style={{ paddingLeft: 40, fontSize: 13, color: '#43a047', marginBottom: 10 }}>💡 {ex.note}</div>
          )}

          {/* 동작 영상 */}
          {media && !vidError ? (
            <div style={{ borderRadius: 14, overflow: 'hidden', background: '#000', marginBottom: 6 }}>
              <video
                src={media.videoUrl}
                poster={media.thumbUrl}
                controls
                loop
                playsInline
                style={{ width: '100%', maxHeight: 220, display: 'block', objectFit: 'cover' }}
                onError={() => setVidError(true)}
              />
            </div>
          ) : (
            /* 영상 없는 운동 → YouTube 검색 링크 */
            <a
              href={ytUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none', display: 'block', marginLeft: 40 }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#fff8f8', border: '1px solid #ffcdd2', borderRadius: 12, padding: '10px 14px',
              }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: '#FF0000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: 'white', fontSize: 15 }}>▶</span>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#212121' }}>{ex.name} 운동 방법</div>
                  <div style={{ fontSize: 11, color: '#9e9e9e', marginTop: 1 }}>YouTube에서 검색 →</div>
                </div>
              </div>
            </a>
          )}

          {media && !vidError && (
            <div style={{ paddingLeft: 4, fontSize: 10, color: '#bdbdbd', textAlign: 'right', marginTop: 2 }}>
              영상 출처: lyfta.app
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function WorkoutScreen() {
  const navigate = useNavigate();
  const [loading,     setLoading]     = useState(false);
  const [routine,     setRoutine]     = useState(null);
  const [goal,        setGoal]        = useState('근력_상승');
  const [days,        setDays]        = useState(5);
  const [error,       setError]       = useState('');
  const [selectedDay, setSelectedDay] = useState('monday');

  const user = AuthService.getCurrentUser();

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    const savedGoal = StorageService.get(`wefit_goal_${user.userId}`);
    if (savedGoal) setGoal(savedGoal);

    const workouts = StorageService.get(`wefit_workout_${user.userId}`) || [];
    if (workouts.length) {
      const latest = workouts[workouts.length - 1];
      setRoutine(latest.weeklyRoutine);
      setGoal(latest.goal);
    }
  }, [user?.userId]);

  const handleGenerate = async () => {
    setError('');
    const bodyList = StorageService.get(`wefit_body_${user.userId}`) || [];
    if (!bodyList.length) { setError('먼저 신체정보를 입력해주세요.'); return; }

    const lb = bodyList[bodyList.length - 1];
    const users = StorageService.get('wefit_users') || {};
    const profile = users[user.userId] || {};
    const birthYear = profile.birthDate ? new Date(profile.birthDate).getFullYear() : null;
    const age = birthYear ? new Date().getFullYear() - birthYear : 30;

    setLoading(true);
    try {
      const result = await AIService.generateWorkout({
        name:          user.name || user.userId,
        age,
        gender:        profile.gender === 'FEMALE' ? '여' : '남',
        height:        lb.height,
        weight:        lb.weight,
        muscleMass:    null,
        bmi:           lb.bmi,
        goal,
        availableDays: days,
      });

      const wr = result.weeklyRoutine;
      setRoutine(wr);

      const workoutRecord = {
        prescriptionId: Date.now().toString(),
        goal,
        prescribedAt: new Date().toISOString(),
        weeklyRoutine: wr,
      };
      const workouts = StorageService.get(`wefit_workout_${user.userId}`) || [];
      workouts.push(workoutRecord);
      StorageService.set(`wefit_workout_${user.userId}`, workouts);
      StorageService.set(`wefit_goal_${user.userId}`, goal);

      // 첫 번째 운동 있는 날로 이동
      const firstActive = DAYS.find(d => wr[d]?.exercises?.length > 0 || wr[d]?.cardio);
      if (firstActive) setSelectedDay(firstActive);
    } catch (err) {
      setError('운동 처방 생성 실패: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const dayData = routine?.[selectedDay];
  const hasContent = dayData && (dayData.exercises?.length > 0 || dayData.cardio);

  return (
    <div className="screen">
      <div className="header">
        <h1>운동 처방 🤖</h1>
        <p>AI가 생성한 맞춤형 주간 루틴</p>
      </div>

      {/* 컨트롤 */}
      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 12 }}>운동 목표</label>
            <select value={goal} onChange={e => setGoal(e.target.value)} style={{ padding: '10px 12px', fontSize: 14 }}>
              <option value="근력_상승">💪 근력 상승</option>
              <option value="다이어트">🔥 다이어트</option>
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 12 }}>주간 운동 일수</label>
            <select value={days} onChange={e => setDays(parseInt(e.target.value))} style={{ padding: '10px 12px', fontSize: 14 }}>
              {[3, 4, 5, 6].map(d => <option key={d} value={d}>{d}일/주</option>)}
            </select>
          </div>
        </div>

        {error && <div className="error-msg">{error}</div>}

        <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
          {loading
            ? <><span className="spinner" style={{ display: 'inline-block', width: 18, height: 18, verticalAlign: 'middle', marginRight: 8, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white' }} /> AI 생성 중...</>
            : '🤖 AI 운동 처방 생성'
          }
        </button>

        {!StorageService.get('gemini_api_key') && (
          <p style={{ fontSize: 11, color: '#bdbdbd', marginTop: 8, textAlign: 'center' }}>
            API 키 없이 예시 처방이 제공됩니다 · 홈 → 설정에서 Gemini 키 입력
          </p>
        )}
      </div>

      {routine && (
        <>
          {/* 요일 탭 */}
          <div style={{ display: 'flex', gap: 7, padding: '4px 16px 4px', overflowX: 'auto' }}>
            {DAYS.map(day => {
              const d = routine[day];
              const active = selectedDay === day;
              const hasCt = d?.exercises?.length > 0 || d?.cardio;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  style={{
                    flexShrink: 0,
                    width: 40, height: 48,
                    borderRadius: 12,
                    border: active ? 'none' : '1.5px solid #e8e8e8',
                    cursor: 'pointer',
                    fontSize: 13,
                    fontWeight: active ? 700 : 400,
                    fontFamily: 'inherit',
                    background: active ? '#43a047' : (hasCt ? '#e8f5e9' : 'white'),
                    color: active ? 'white' : (hasCt ? '#2e7d32' : '#9e9e9e'),
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                  }}
                >
                  <span>{DAY_KR[day]}</span>
                  {hasCt && <div style={{ width: 4, height: 4, borderRadius: '50%', background: active ? 'rgba(255,255,255,0.8)' : '#43a047' }} />}
                </button>
              );
            })}
          </div>

          {/* 운동 상세 */}
          <div className="card" style={{ marginTop: 4 }}>
            <div style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>
                {DAY_KR[selectedDay]}요일 — {dayData?.part || ''}
              </h3>
              {dayData?.focus && dayData.focus !== 'Rest' && (
                <span className="badge badge-info" style={{ marginTop: 6, display: 'inline-block' }}>{dayData.focus}</span>
              )}
            </div>

            {!hasContent ? (
              <div style={{ textAlign: 'center', padding: '28px 0', color: '#bdbdbd' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>😴</div>
                <div>휴식일입니다. 충분히 쉬어주세요!</div>
              </div>
            ) : (
              <>
                {dayData.exercises?.map((ex, i) => <ExerciseRow key={i} ex={ex} index={i} />)}

                {dayData.cardio && (
                  <div style={{ marginTop: 14, background: '#e3f2fd', borderRadius: 14, padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1565c0', marginBottom: 6 }}>🏃 유산소 운동</div>
                    <div style={{ fontSize: 14, color: '#1976d2' }}>{dayData.cardio.name}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                      <span className="badge badge-info">{dayData.cardio.duration}</span>
                      <span className="badge badge-info">{dayData.cardio.intensity}</span>
                    </div>
                  </div>
                )}

                <div style={{ marginTop: 14, background: '#f9f9f9', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#9e9e9e' }}>
                  총 {dayData.exercises?.length || 0}개 종목
                  {dayData.cardio ? ' + 유산소' : ''}
                  {' · '}
                  각 운동을 탭하면 메모를 확인할 수 있습니다
                </div>
              </>
            )}
          </div>

          {/* 주간 요약 */}
          <div className="card" style={{ marginTop: 0 }}>
            <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>주간 요약</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
              {DAYS.map(day => {
                const d = routine[day];
                const hasCt = d?.exercises?.length > 0 || d?.cardio;
                return (
                  <div key={day} style={{ textAlign: 'center' }}>
                    <div style={{ width: 32, height: 32, margin: '0 auto 4px', borderRadius: 10, background: hasCt ? '#e8f5e9' : '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                      {hasCt ? '💪' : '😴'}
                    </div>
                    <div style={{ fontSize: 10, color: hasCt ? '#43a047' : '#bdbdbd', fontWeight: hasCt ? 600 : 400 }}>
                      {DAY_KR[day]}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <BottomNav active="workout" />
    </div>
  );
}
