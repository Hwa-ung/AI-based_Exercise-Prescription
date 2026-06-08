import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService    from '../services/authService';
import StorageService from '../services/storageService';
import exerciseDb     from '../data/exerciseDb.json';
import { getLyftaMedia } from '../data/lyftaCodes';
import BottomNav      from '../components/BottomNav';

// ─── 날짜 헬퍼 ───────────────────────────────────────────────────
const WEEKDAYS  = ['일','월','화','수','목','금','토'];
const MONTHS_KR = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const DAY_ORDER = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
function todayStr() {
  const t = new Date();
  return toDateStr(t.getFullYear(), t.getMonth(), t.getDate());
}
function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y, m)    { return new Date(y, m, 1).getDay(); }
function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2,7)}`; }

// 1일차/2일차 매핑
function buildRoutineDayLabels(routine) {
  if (!routine) return {};
  const map = {};
  let n = 1;
  DAY_ORDER.forEach(d => {
    if (routine[d]?.exercises?.length > 0 || routine[d]?.cardio) map[d] = `${n++}일차`;
  });
  return map;
}

// ─── 운동 행 컴포넌트 ────────────────────────────────────────────
function ExerciseRow({ ex, onToggle, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const media  = getLyftaMedia(ex.name);
  const ytUrl  = `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' 운동 방법')}`;

  return (
    <div style={{ borderBottom: '1px solid #f5f5f5' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0', opacity: ex.done ? 0.55 : 1 }}>
        {/* 완료 체크 */}
        <div onClick={onToggle}
          style={{ width: 24, height: 24, borderRadius: 7, flexShrink: 0, border: ex.done ? 'none' : '2px solid #d0d0d0', background: ex.done ? '#43a047' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          {ex.done && <span style={{ color: 'white', fontSize: 14 }}>✓</span>}
        </div>

        {/* 정보 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15, textDecoration: ex.done ? 'line-through' : 'none', color: ex.done ? '#9e9e9e' : '#212121' }}>
            {ex.name}
          </div>
          <div style={{ fontSize: 12, color: '#9e9e9e', marginTop: 2 }}>
            {ex.sets}세트 × {ex.reps > 0 ? `${ex.reps}회` : (ex.duration || '시간 측정')}
            {ex.weight ? ` · ${ex.weight}kg` : ''}
            {` · 휴식 ${ex.rest}`}
          </div>
        </div>

        {/* 영상 토글 */}
        <button onClick={() => setExpanded(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, padding: '4px', color: media ? '#2e7d32' : '#FF0000', flexShrink: 0 }}>
          {media ? (expanded ? '▼' : '▶') : '📺'}
        </button>

        {/* 삭제 */}
        <button onClick={onDelete}
          style={{ background: 'none', border: 'none', color: '#e0e0e0', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '4px', flexShrink: 0 }}>
          ×
        </button>
      </div>

      {/* 영상 패널 */}
      {expanded && (
        <div style={{ paddingLeft: 34, paddingBottom: 10 }}>
          {media ? (
            <div style={{ borderRadius: 12, overflow: 'hidden', background: '#000', marginBottom: 4 }}>
              <video src={media.videoUrl} poster={media.thumbUrl}
                autoPlay muted controls loop playsInline
                style={{ width: '100%', maxHeight: 200, display: 'block', objectFit: 'cover' }} />
            </div>
          ) : (
            <a href={ytUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff8f8', border: '1px solid #ffcdd2', borderRadius: 12, padding: '10px 14px' }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FF0000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: 'white', fontSize: 13 }}>▶</span>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#212121' }}>{ex.name} 운동 방법</div>
                  <div style={{ fontSize: 11, color: '#9e9e9e' }}>YouTube에서 검색 →</div>
                </div>
              </div>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────
export default function HistoryScreen() {
  const navigate = useNavigate();
  const today    = todayStr();

  const [workouts,  setWorkouts]  = useState([]);
  const [calYear,   setCalYear]   = useState(new Date().getFullYear());
  const [calMonth,  setCalMonth]  = useState(new Date().getMonth());
  const [selDate,   setSelDate]   = useState(today);
  const [calData,   setCalData]   = useState({});

  // 운동 추가 모달
  const [showModal,   setShowModal]   = useState(false);
  const [modalTab,    setModalTab]    = useState('ai');    // 'ai' | 'library'
  const [modalDayKey, setModalDayKey] = useState(null);
  const [checkedExs,  setCheckedExs]  = useState({});

  // 도감에서 추가 상태
  const [libSearch,   setLibSearch]   = useState('');
  const [libSelected, setLibSelected] = useState(null);
  const [libForm,     setLibForm]     = useState({ sets: '3', reps: '12', weight: '', rest: '60초' });

  // 중복 확인 다이얼로그
  const [dupConfirm,  setDupConfirm]  = useState(null);

  const user    = AuthService.getCurrentUser();
  const CAL_KEY = `wefit_calendar_${user?.userId}`;

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    setWorkouts(StorageService.get(`wefit_workout_${user.userId}`) || []);
    setCalData(StorageService.get(CAL_KEY) || {});
  }, [user?.userId]);

  // ── 캘린더 계산 ─────────────────────────────────────────────────
  const firstDay    = getFirstDay(calYear, calMonth);
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  // ── 캘린더 데이터 조작 ──────────────────────────────────────────
  const saveCalData = (updated) => {
    setCalData(updated);
    StorageService.set(CAL_KEY, updated);
  };

  const toggleDone = (id) => {
    saveCalData({
      ...calData,
      [selDate]: (calData[selDate] || []).map(e => e.id === id ? { ...e, done: !e.done } : e),
    });
  };

  const deleteExercise = (id) => {
    saveCalData({ ...calData, [selDate]: (calData[selDate] || []).filter(e => e.id !== id) });
  };

  // 중복 체크 후 추가
  const tryAddExercises = (exercises) => {
    const existing      = calData[selDate] || [];
    const existingNames = new Set(existing.map(e => e.name));
    const duplicates    = exercises.filter(ex => existingNames.has(ex.name));
    if (duplicates.length > 0) {
      setDupConfirm({ exercises, duplicates });
    } else {
      doAddExercises(exercises);
    }
  };

  const doAddExercises = (exercises) => {
    const existing = calData[selDate] || [];
    const newItems = exercises.map(ex => ({ ...ex, id: uid(), done: false, weight: ex.weight ?? '' }));
    saveCalData({ ...calData, [selDate]: [...existing, ...newItems] });
    closeModal();
  };

  const closeModal = () => {
    setShowModal(false);
    setModalDayKey(null);
    setModalTab('ai');
    setCheckedExs({});
    setLibSearch('');
    setLibSelected(null);
    setLibForm({ sets: '3', reps: '12', weight: '', rest: '60초' });
    setDupConfirm(null);
  };

  // AI 처방 → 선택 추가
  const handleAiAdd = () => {
    const exs      = latestRoutine?.[modalDayKey]?.exercises || [];
    const selected = exs.filter((_, i) => checkedExs[i] !== false);
    if (selected.length === 0) return;
    tryAddExercises(selected);
  };

  // 도감에서 직접 추가
  const handleLibAdd = () => {
    if (!libSelected) return;
    tryAddExercises([{
      name:   libSelected,
      sets:   parseInt(libForm.sets)  || 3,
      reps:   parseInt(libForm.reps)  || 12,
      weight: libForm.weight ? parseFloat(libForm.weight) : null,
      rest:   libForm.rest || '60초',
      note:   '',
    }]);
  };

  // ── 선택 날짜 데이터 ─────────────────────────────────────────────
  const dayExercises = calData[selDate] || [];
  const doneCount    = dayExercises.filter(e => e.done).length;
  const pct          = dayExercises.length ? Math.round((doneCount / dayExercises.length) * 100) : 0;

  const latestRoutine    = workouts.length ? workouts[workouts.length - 1]?.weeklyRoutine : null;
  const activeDays       = latestRoutine ? DAY_ORDER.filter(d => latestRoutine[d]?.exercises?.length > 0) : [];
  const routineDayLabels = buildRoutineDayLabels(latestRoutine);

  // ── 도감 목록 ────────────────────────────────────────────────────
  const libExercises = useMemo(() => {
    const q = libSearch.trim();
    return Object.keys(exerciseDb).filter(name =>
      !q || name.includes(q) || exerciseDb[name].세부_부위?.some(m => m.includes(q))
    );
  }, [libSearch]);

  return (
    <div className="screen">
      <div className="header">
        <h1>운동 캘린더 📅</h1>
        <p>날짜별 운동 일정을 관리하세요</p>
      </div>

      {/* ══ 캘린더 ══ */}
      <div style={{ background: 'white', marginBottom: 8, display: 'flex', flexDirection: 'column', height: '50vh' }}>
        {/* 월 네비 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 20px 8px', flexShrink: 0 }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#555', padding: '0 8px' }}>‹</button>
          <span style={{ fontWeight: 700, fontSize: 17 }}>{calYear}년 {MONTHS_KR[calMonth]}</span>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#555', padding: '0 8px' }}>›</button>
        </div>

        <div style={{ flex: 1, padding: '0 12px 8px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          {/* 요일 헤더 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4, flexShrink: 0 }}>
            {WEEKDAYS.map((d, i) => (
              <div key={d} style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, padding: '4px 0',
                color: i === 0 ? '#e53935' : i === 6 ? '#1976d2' : '#9e9e9e' }}>{d}</div>
            ))}
          </div>

          {/* 날짜 셀 */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(7,1fr)',
            gridTemplateRows: `repeat(${Math.ceil(cells.length / 7)},1fr)`,
            flex: 1, minHeight: 0, gap: 2,
          }}>
            {cells.map((day, idx) => {
              if (!day) return <div key={`e-${idx}`} />;
              const dateStr  = toDateStr(calYear, calMonth, day);
              const exList   = calData[dateStr] || [];
              const hasEx    = exList.length > 0;
              const allDone  = hasEx && exList.every(e => e.done);
              const someDone = hasEx && exList.some(e => e.done) && !allDone;
              const isToday  = dateStr === today;
              const isSel    = dateStr === selDate;
              const dow      = (firstDay + day - 1) % 7;
              return (
                <div key={dateStr} onClick={() => setSelDate(dateStr)}
                  style={{
                    borderRadius: 10, textAlign: 'center', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    background: isSel ? '#43a047' : isToday ? '#e8f5e9' : 'transparent',
                    border: isToday && !isSel ? '1.5px solid #43a047' : '1.5px solid transparent',
                  }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: allDone && !isSel ? '#ffcdd2' : 'transparent', flexShrink: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: isToday || isSel ? 700 : 400, lineHeight: 1,
                      color: isSel ? 'white' : dow === 0 ? '#e53935' : dow === 6 ? '#1976d2' : '#424242' }}>
                      {day}
                    </span>
                  </div>
                  {hasEx && !allDone && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 2, marginTop: 2 }}>
                      {someDone
                        ? <><div style={{ width: 4, height: 4, borderRadius: '50%', background: isSel ? 'rgba(255,255,255,0.9)' : '#43a047' }} />
                            <div style={{ width: 4, height: 4, borderRadius: '50%', background: isSel ? 'rgba(255,255,255,0.4)' : '#bdbdbd' }} /></>
                        : <div style={{ width: 4, height: 4, borderRadius: '50%', background: isSel ? 'rgba(255,255,255,0.5)' : '#bdbdbd' }} />
                      }
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ══ 선택 날짜 운동 목록 ══ */}
      <div className="card" style={{ marginTop: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: 16 }}>
              {selDate === today ? `오늘 (${selDate})` : selDate}
            </span>
            {dayExercises.length > 0 && (
              <div style={{ fontSize: 12, color: '#9e9e9e', marginTop: 2 }}>{doneCount}/{dayExercises.length} 완료</div>
            )}
          </div>
          <button onClick={() => { setShowModal(true); setDupConfirm(null); }}
            style={{ background: '#43a047', color: 'white', border: 'none', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
            + 운동 추가
          </button>
        </div>

        {dayExercises.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#43a047' : '#66bb6a', borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
            <div style={{ textAlign: 'right', fontSize: 11, color: pct === 100 ? '#43a047' : '#9e9e9e', marginTop: 4, fontWeight: pct === 100 ? 700 : 400 }}>
              {pct === 100 ? '🎉 오늘 운동 완료!' : `${pct}%`}
            </div>
          </div>
        )}

        {dayExercises.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 0', color: '#bdbdbd' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🏋️</div>
            <div style={{ fontSize: 14 }}>운동이 없습니다.<br />+ 운동 추가로 시작하세요!</div>
          </div>
        ) : (
          <div>
            {dayExercises.map(ex => (
              <ExerciseRow
                key={ex.id}
                ex={ex}
                onToggle={() => toggleDone(ex.id)}
                onDelete={() => deleteExercise(ex.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ══ 운동 추가 모달 ══ */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={closeModal}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, maxHeight: '82vh', display: 'flex', flexDirection: 'column' }}>

            {/* 모달 헤더 */}
            <div style={{ padding: '20px 20px 0', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <h3 style={{ fontSize: 17, fontWeight: 700 }}>운동 추가</h3>
                <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: 22, color: '#bdbdbd', cursor: 'pointer', lineHeight: 1 }}>×</button>
              </div>

              {/* 중복 경고 */}
              {dupConfirm && (
                <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, color: '#795548', marginBottom: 8 }}>
                    ⚠️ 중복된 운동이 있습니다:<br />
                    <b>{dupConfirm.duplicates.map(d => d.name).join(', ')}</b>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => doAddExercises(dupConfirm.exercises)}
                      style={{ flex: 1, background: '#43a047', color: 'white', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
                      추가
                    </button>
                    <button onClick={() => setDupConfirm(null)}
                      style={{ flex: 1, background: 'none', border: '1.5px solid #e0e0e0', borderRadius: 8, padding: '8px', cursor: 'pointer', fontSize: 13, color: '#757575', fontFamily: 'inherit' }}>
                      취소
                    </button>
                  </div>
                </div>
              )}

              {/* 탭 */}
              {!dupConfirm && (
                <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', marginBottom: 4 }}>
                  {[{ id: 'ai', label: '🤖 AI 처방' }, { id: 'library', label: '📚 도감에서 선택' }].map(t => (
                    <button key={t.id} onClick={() => { setModalTab(t.id); setModalDayKey(null); setLibSelected(null); }}
                      style={{ flex: 1, padding: '10px 0', border: 'none', background: 'none', fontFamily: 'inherit', fontSize: 13, cursor: 'pointer', fontWeight: modalTab === t.id ? 700 : 400, color: modalTab === t.id ? '#43a047' : '#9e9e9e', borderBottom: modalTab === t.id ? '2.5px solid #43a047' : '2.5px solid transparent' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 모달 바디 */}
            {!dupConfirm && (
              <div style={{ overflowY: 'auto', flex: 1, padding: '8px 20px 24px' }}>

                {/* ── AI 처방 탭 ── */}
                {modalTab === 'ai' && (
                  !latestRoutine ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: '#9e9e9e' }}>
                      <div style={{ fontSize: 40, marginBottom: 8 }}>🤖</div>
                      <p>먼저 AI 운동 처방을 생성해주세요.</p>
                    </div>
                  ) : !modalDayKey ? (
                    <>
                      <p style={{ fontSize: 12, color: '#9e9e9e', marginBottom: 12 }}>최근 AI 처방에서 날짜를 선택하세요</p>
                      {activeDays.length === 0
                        ? <p style={{ color: '#bdbdbd', textAlign: 'center', padding: 16 }}>활성 루틴이 없습니다.</p>
                        : activeDays.map(dayKey => {
                            const dayData  = latestRoutine[dayKey];
                            const dayLabel = routineDayLabels[dayKey] || dayKey;
                            return (
                              <div key={dayKey}
                                onClick={() => {
                                  setModalDayKey(dayKey);
                                  const init = {};
                                  (dayData.exercises || []).forEach((_, i) => { init[i] = true; });
                                  setCheckedExs(init);
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', marginBottom: 8, background: '#f9f9f9', borderRadius: 12, cursor: 'pointer', border: '1.5px solid transparent', transition: 'border-color 0.15s' }}
                                onMouseEnter={e => e.currentTarget.style.borderColor = '#43a047'}
                                onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#e8f5e9', color: '#2e7d32', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                                  {dayLabel.replace('일차', '')}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600, fontSize: 14 }}>{dayLabel}</div>
                                  <div style={{ fontSize: 12, color: '#9e9e9e', marginTop: 2 }}>{dayData.part} · {dayData.exercises.length}종목</div>
                                </div>
                                <span style={{ color: '#bdbdbd', fontSize: 16 }}>›</span>
                              </div>
                            );
                          })
                      }
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <button onClick={() => setModalDayKey(null)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#555', padding: 0 }}>←</button>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>
                          {routineDayLabels[modalDayKey]} — {latestRoutine[modalDayKey]?.part}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: '#9e9e9e', marginBottom: 10 }}>추가할 운동을 선택하세요</p>

                      {(latestRoutine[modalDayKey]?.exercises || []).map((ex, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: '1px solid #f5f5f5' }}>
                          <div onClick={() => setCheckedExs(c => ({ ...c, [i]: !(c[i] ?? true) }))}
                            style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, border: (checkedExs[i] ?? true) ? 'none' : '2px solid #d0d0d0', background: (checkedExs[i] ?? true) ? '#43a047' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            {(checkedExs[i] ?? true) && <span style={{ color: 'white', fontSize: 13 }}>✓</span>}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{ex.name}</div>
                            <div style={{ fontSize: 12, color: '#9e9e9e', marginTop: 1 }}>
                              {ex.reps > 0 ? `${ex.sets}세트 × ${ex.reps}회` : `${ex.sets}세트 × ${ex.duration || '시간'}`}
                              {' · 휴식 '}{ex.rest}
                            </div>
                          </div>
                        </div>
                      ))}

                      <button className="btn-primary" style={{ marginTop: 16 }} onClick={handleAiAdd}>
                        {(latestRoutine[modalDayKey]?.exercises || []).filter((_, i) => checkedExs[i] !== false).length}개 운동 추가하기
                      </button>
                      <button onClick={() => setModalDayKey(null)}
                        style={{ width: '100%', marginTop: 8, padding: '12px', background: 'none', border: '1.5px solid #e0e0e0', borderRadius: 12, color: '#757575', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
                        다른 날 선택
                      </button>
                    </>
                  )
                )}

                {/* ── 도감에서 선택 탭 ── */}
                {modalTab === 'library' && (
                  !libSelected ? (
                    <>
                      <input type="text" placeholder="운동 이름 검색..." value={libSearch}
                        onChange={e => setLibSearch(e.target.value)}
                        style={{ width: '100%', padding: '10px 12px', borderRadius: 12, border: '1.5px solid #e0e0e0', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 10 }} />
                      <div>
                        {libExercises.slice(0, 60).map(name => (
                          <div key={name} onClick={() => setLibSelected(name)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 12px', marginBottom: 4, background: '#f9f9f9', borderRadius: 10, cursor: 'pointer' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
                              <div style={{ fontSize: 11, color: '#9e9e9e', marginTop: 1 }}>
                                {exerciseDb[name]?.부위} · {exerciseDb[name]?.난이도}
                              </div>
                            </div>
                            <span style={{ color: '#bdbdbd', fontSize: 16 }}>›</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <button onClick={() => setLibSelected(null)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#555', padding: 0 }}>←</button>
                        <span style={{ fontWeight: 700, fontSize: 15 }}>{libSelected}</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                        {[
                          { label: '세트 수',   key: 'sets',   type: 'number', placeholder: '3' },
                          { label: '횟수 (회)', key: 'reps',   type: 'number', placeholder: '12' },
                          { label: '무게 (kg)', key: 'weight', type: 'number', placeholder: '선택' },
                          { label: '휴식 시간', key: 'rest',   type: 'text',   placeholder: '60초' },
                        ].map(f => (
                          <div key={f.key} className="form-group" style={{ marginBottom: 0 }}>
                            <label style={{ fontSize: 12 }}>{f.label}</label>
                            <input type={f.type} placeholder={f.placeholder} value={libForm[f.key]}
                              onChange={e => setLibForm(v => ({ ...v, [f.key]: e.target.value }))}
                              style={{ padding: '9px 12px', fontSize: 14 }} />
                          </div>
                        ))}
                      </div>

                      <button className="btn-primary" onClick={handleLibAdd}>
                        캘린더에 추가하기
                      </button>
                    </>
                  )
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav active="history" />
    </div>
  );
}
