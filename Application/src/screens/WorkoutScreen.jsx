import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService    from '../services/authService';
import StorageService from '../services/storageService';
import AIService      from '../services/aiService';
import BottomNav      from '../components/BottomNav';
import { getLyftaMedia } from '../data/lyftaCodes';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

// 1일차/2일차 매핑 계산
function buildDayNumberMap(routine) {
  if (!routine) return {};
  const map = {};
  let n = 1;
  DAYS.forEach(d => {
    if (routine[d]?.exercises?.length > 0 || routine[d]?.cardio) {
      map[d] = n++;
    }
  });
  return map;
}

function ExerciseRow({ ex, index }) {
  const [open,     setOpen]     = useState(false);
  const [vidError, setVidError] = useState(false);
  const repText = ex.reps > 0
    ? `${ex.sets}세트 × ${ex.reps}회`
    : `${ex.sets}세트 × ${ex.duration || '시간 측정'}`;

  const media = getLyftaMedia(ex.name);
  const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' 운동 방법')}`;

  return (
    <div style={{ borderBottom: '1px solid #f5f5f5', cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
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

          {media && !vidError ? (
            <div style={{ borderRadius: 14, overflow: 'hidden', background: '#000', marginBottom: 6 }}>
              <video
                src={media.videoUrl}
                poster={media.thumbUrl}
                autoPlay muted controls loop playsInline
                style={{ width: '100%', maxHeight: 220, display: 'block', objectFit: 'cover' }}
                onError={() => setVidError(true)}
              />
            </div>
          ) : (
            <a href={ytUrl} target="_blank" rel="noopener noreferrer"
              style={{ textDecoration: 'none', display: 'block', marginLeft: 40 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff8f8', border: '1px solid #ffcdd2', borderRadius: 12, padding: '10px 14px' }}>
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
  const [warn,        setWarn]        = useState('');
  const [selectedDay, setSelectedDay] = useState('monday');
  const [cooldown,    setCooldown]    = useState(0);   // 연타 방지(초)

  const user = AuthService.getCurrentUser();

  // 쿨다운 카운트다운
  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

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

  // 1일차/2일차 매핑
  const dayToNum = buildDayNumberMap(routine);

  // 완료한 운동 기록 수집
  const getCompletedHistory = () => {
    const calData = StorageService.get(`wefit_calendar_${user.userId}`) || {};
    const today   = new Date().toISOString().split('T')[0];
    const history = [];
    Object.entries(calData).forEach(([date, exercises]) => {
      if (date < today) {
        const done = exercises.filter(e => e.done).map(e => e.name);
        if (done.length > 0) history.push({ date, exercises: done });
      }
    });
    history.sort((a, b) => b.date.localeCompare(a.date));
    return history.slice(0, 14);
  };

  const handleGenerate = async () => {
    if (loading || cooldown > 0) return;   // 연타 방지
    setError('');
    setWarn('');
    const bodyList = StorageService.get(`wefit_body_${user.userId}`) || [];
    if (!bodyList.length) { setError('먼저 신체정보를 입력해주세요.'); return; }

    const lb      = bodyList[bodyList.length - 1];
    const users   = StorageService.get('wefit_users') || {};
    const profile = users[user.userId] || {};
    const birthYear = profile.birthDate ? new Date(profile.birthDate).getFullYear() : null;
    const age = birthYear ? new Date().getFullYear() - birthYear : 30;

    const completedHistory = getCompletedHistory();

    setLoading(true);
    try {
      const result = await AIService.generateWorkout({
        userId:        user.userId,
        name:          user.name || user.userId,
        age,
        gender:        profile.gender === 'FEMALE' ? '여' : '남',
        height:        lb.height,
        weight:        lb.weight,
        bodyFat:       lb.bodyFat   ?? null,
        muscleMass:    lb.muscleMass ?? null,
        bmi:           lb.bmi,
        goal,
        availableDays: days,
      }, completedHistory.length > 0 ? completedHistory : null);

      if (result._isQuotaFallback) {
        setWarn('Gemini API 무료 할당량 초과 — 예시 처방을 표시합니다. 유료 플랜으로 업그레이드하거나 내일 다시 시도해주세요.');
      }

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

      const firstActive = DAYS.find(d => wr[d]?.exercises?.length > 0 || wr[d]?.cardio);
      if (firstActive) setSelectedDay(firstActive);
    } catch (err) {
      setError('운동 처방 생성 실패: ' + err.message);
    } finally {
      setLoading(false);
      setCooldown(5);   // 생성 후 5초간 재요청 차단 (15 RPM 방어)
    }
  };

  const dayData   = routine?.[selectedDay];
  const hasContent = dayData && (dayData.exercises?.length > 0 || dayData.cardio);
  const dayLabel  = (day) => {
    if (dayToNum[day]) return { top: dayToNum[day], bot: '일차' };
    return { top: '휴', bot: '식' };
  };

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

        {warn  && <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#795548', marginBottom: 10 }}>⚠️ {warn}</div>}
        {error && <div className="error-msg">{error}</div>}

        <button className="btn-primary" onClick={handleGenerate} disabled={loading || cooldown > 0}>
          {loading
            ? <><span className="spinner" style={{ display: 'inline-block', width: 18, height: 18, verticalAlign: 'middle', marginRight: 8, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white' }} /> AI 생성 중...</>
            : cooldown > 0
              ? `⏳ 잠시 후 다시 시도 (${cooldown}초)`
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
          {/* 요일 탭 — 1일차/2일차 표시 */}
          <div style={{ display: 'flex', gap: 7, padding: '4px 16px 4px', overflowX: 'auto' }}>
            {DAYS.map(day => {
              const d      = routine[day];
              const active = selectedDay === day;
              const hasCt  = d?.exercises?.length > 0 || d?.cardio;
              const lbl    = dayLabel(day);
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  style={{
                    flexShrink: 0, width: 44, height: 52, borderRadius: 12,
                    border: active ? 'none' : '1.5px solid #e8e8e8',
                    cursor: 'pointer', fontFamily: 'inherit',
                    background: active ? '#43a047' : (hasCt ? '#e8f5e9' : 'white'),
                    color: active ? 'white' : (hasCt ? '#2e7d32' : '#9e9e9e'),
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1,
                  }}
                >
                  <span style={{ fontSize: 15, fontWeight: 700, lineHeight: 1 }}>{lbl.top}</span>
                  <span style={{ fontSize: 9, lineHeight: 1, opacity: active ? 0.9 : 0.7 }}>{lbl.bot}</span>
                  {hasCt && !active && (
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#43a047', marginTop: 2 }} />
                  )}
                </button>
              );
            })}
          </div>

          {/* 운동 상세 */}
          <div className="card" style={{ marginTop: 4 }}>
            <div style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>
                {dayToNum[selectedDay] ? `${dayToNum[selectedDay]}일차` : '휴식일'} — {dayData?.part || ''}
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
                  {' · '}각 운동을 탭하면 상세를 확인할 수 있습니다
                </div>
              </>
            )}
          </div>

          {/* 주간 요약 */}
          <div className="card" style={{ marginTop: 0 }}>
            <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>주간 요약</h3>
            <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
              {DAYS.map(day => {
                const d     = routine[day];
                const hasCt = d?.exercises?.length > 0 || d?.cardio;
                const num   = dayToNum[day];
                return (
                  <div key={day} style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ width: 36, height: 36, margin: '0 auto 4px', borderRadius: 10, background: hasCt ? '#e8f5e9' : '#f5f5f5', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      {hasCt
                        ? <><span style={{ fontSize: 11, fontWeight: 700, color: '#2e7d32', lineHeight: 1 }}>{num}</span><span style={{ fontSize: 7, color: '#66bb6a' }}>일차</span></>
                        : <span style={{ fontSize: 18 }}>😴</span>
                      }
                    </div>
                    <div style={{ fontSize: 9, color: hasCt ? '#43a047' : '#bdbdbd', fontWeight: hasCt ? 600 : 400 }}>
                      {hasCt ? '운동' : '휴식'}
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
