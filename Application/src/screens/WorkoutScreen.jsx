import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService    from '../services/authService';
import StorageService from '../services/storageService';
import SyncService    from '../services/syncService';
import AIService      from '../services/aiService';
import BottomNav      from '../components/BottomNav';
import { getLyftaMedia } from '../data/lyftaCodes';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_KR = { monday: '월', tuesday: '화', wednesday: '수', thursday: '목', friday: '금', saturday: '토', sunday: '일' };

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
    <div style={{ borderBottom: '1px solid #f1f3f8', cursor: 'pointer' }} onClick={() => setOpen(o => !o)}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '13px 0', gap: 14 }}>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, fontWeight: 600, color: '#c2c7d2', width: 18, flexShrink: 0 }}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: '#0e1525' }}>{ex.name}</div>
          <div style={{ fontSize: 13, color: '#6b7385', marginTop: 2 }}>{repText}</div>
        </div>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: '#6b7385' }}>
          {ex.sets}×{ex.reps > 0 ? ex.reps : ex.duration}
        </span>
      </div>

      {open && (
        <div style={{ paddingBottom: 14, paddingLeft: 32 }} onClick={e => e.stopPropagation()}>
          {ex.note && (
            <div style={{ fontSize: 13, color: '#2f54ff', marginBottom: 10 }}>💡 {ex.note}</div>
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
              style={{ textDecoration: 'none', display: 'block' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff8f8', border: '1px solid #ffcdd2', borderRadius: 12, padding: '10px 14px' }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: '#FF0000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: 'white', fontSize: 15 }}>▶</span>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0e1525' }}>{ex.name} 운동 방법</div>
                  <div style={{ fontSize: 11, color: '#9aa1b2', marginTop: 1 }}>YouTube에서 검색 →</div>
                </div>
              </div>
            </a>
          )}

          {media && !vidError && (
            <div style={{ fontSize: 10, color: '#c2c7d2', textAlign: 'right', marginTop: 2 }}>
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
  const [cooldown,    setCooldown]    = useState(0);

  const user = AuthService.getCurrentUser();

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

  const dayToNum = buildDayNumberMap(routine);

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
    if (loading || cooldown > 0) return;
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

      if (result._isFallback) {
        setWarn('AI 서버 일시 오류 — 예시 처방을 표시합니다. 잠시 후 다시 시도해주세요.');
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
      SyncService.save(user.userId);

      const firstActive = DAYS.find(d => wr[d]?.exercises?.length > 0 || wr[d]?.cardio);
      if (firstActive) setSelectedDay(firstActive);
    } catch (err) {
      setError('운동 처방 생성 실패: ' + err.message);
    } finally {
      setLoading(false);
      setCooldown(5);
    }
  };

  const dayData   = routine?.[selectedDay];
  const hasContent = dayData && (dayData.exercises?.length > 0 || dayData.cardio);

  return (
    <div className="screen">
      {/* 헤더 */}
      <div style={{ padding: '14px 22px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #eaecf2', background: '#fff', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: '#2f54ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: '#fff' }}>W</span>
        </div>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 17, letterSpacing: -0.5, color: '#0e1525' }}>WeFitAI</span>
      </div>

      {/* 컨트롤 영역 */}
      <div style={{ padding: '18px 22px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: -0.4, color: '#0e1525' }}>운동 처방</div>
          <div style={{ display: 'flex', gap: 6 }}>
            <select value={goal} onChange={e => setGoal(e.target.value)}
              style={{ fontSize: 11, fontWeight: 700, border: '1.5px solid #2f54ff', color: '#2f54ff', background: '#ecf0ff', padding: '6px 10px', borderRadius: 9, fontFamily: 'inherit', cursor: 'pointer', appearance: 'none' }}>
              <option value="근력_상승">근력 강화</option>
              <option value="다이어트">다이어트</option>
            </select>
            <select value={days} onChange={e => setDays(parseInt(e.target.value))}
              style={{ fontSize: 11, fontWeight: 500, border: '1px solid #eaecf2', color: '#9aa1b2', background: '#fff', padding: '6px 10px', borderRadius: 9, fontFamily: 'inherit', cursor: 'pointer', appearance: 'none' }}>
              {[3, 4, 5, 6].map(d => <option key={d} value={d}>{d}일</option>)}
            </select>
          </div>
        </div>

        {warn  && <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: '#795548', marginBottom: 10 }}>⚠️ {warn}</div>}
        {error && <div className="error-msg">{error}</div>}

        <button className="btn-primary" onClick={handleGenerate} disabled={loading || cooldown > 0}>
          {loading
            ? <><span className="spinner" />AI 생성 중...</>
            : cooldown > 0
              ? `잠시 후 다시 시도 (${cooldown}초)`
              : 'AI 운동 처방 생성'
          }
        </button>
        <div style={{ fontSize: 11, color: '#c2c7d2', marginTop: 8, textAlign: 'center' }}>
          AI가 신체정보 기반으로 맞춤 루틴을 생성합니다
        </div>
      </div>

      {routine && (
        <>
          {/* 요일 탭 */}
          <div style={{ display: 'flex', gap: 5, padding: '20px 22px 0', borderBottom: '1px solid #eaecf2', marginTop: 4 }}>
            {DAYS.filter(day => routine[day]?.exercises?.length > 0 || routine[day]?.cardio).map(day => {
              const active = selectedDay === day;
              const num    = dayToNum[day];
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  style={{
                    flex: 1, padding: '8px 0', border: 'none', background: 'none',
                    cursor: 'pointer', fontFamily: 'inherit', fontSize: 14,
                    fontWeight: active ? 700 : 400,
                    color: active ? '#2f54ff' : '#6b7385',
                    borderBottom: active ? '2px solid #2f54ff' : '2px solid transparent',
                    marginBottom: -1,
                  }}
                >
                  {num ? `${num}일` : DAY_KR[day]}
                </button>
              );
            })}
          </div>

          {/* 운동 상세 */}
          <div style={{ padding: '18px 22px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#0e1525', letterSpacing: -0.4 }}>
                {dayToNum[selectedDay] ? `${dayToNum[selectedDay]}일차` : '휴식일'}
                {dayData?.part && <span style={{ color: '#c2c7d2', fontWeight: 400 }}> / {dayData.part}</span>}
              </span>
              {dayData?.exercises?.length > 0 && (
                <span style={{ fontSize: 12, color: '#9aa1b2' }}>
                  {dayData.exercises.length}종목
                </span>
              )}
            </div>

            {!hasContent ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#c2c7d2' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>😴</div>
                <div style={{ fontSize: 14 }}>휴식일입니다. 충분히 쉬어주세요!</div>
              </div>
            ) : (
              <>
                {dayData.exercises?.map((ex, i) => <ExerciseRow key={i} ex={ex} index={i} />)}

                {dayData.cardio && (
                  <div style={{ display: 'flex', alignItems: 'center', padding: '13px 0', borderBottom: '1px solid #f1f3f8' }}>
                    <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 15, fontWeight: 600, color: '#2f54ff', width: 18, flexShrink: 0 }}>+</span>
                    <div style={{ flex: 1, marginLeft: 14 }}>
                      <div style={{ fontWeight: 600, fontSize: 15, color: '#0e1525' }}>유산소 — {dayData.cardio.name}</div>
                      <div style={{ fontSize: 13, color: '#6b7385', marginTop: 2 }}>{dayData.cardio.duration} · {dayData.cardio.intensity}</div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      <BottomNav active="workout" />
    </div>
  );
}
