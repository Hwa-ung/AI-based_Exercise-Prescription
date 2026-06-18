import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService    from '../services/authService';
import StorageService from '../services/storageService';
import SyncService    from '../services/syncService';
import exerciseDb     from '../data/exerciseDb.json';
import { getLyftaMedia } from '../data/lyftaCodes';
import BottomNav      from '../components/BottomNav';

const WEEKDAYS  = ['일','월','화','수','목','금','토'];
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

function buildRoutineDayLabels(routine) {
  if (!routine) return {};
  const map = {};
  let n = 1;
  DAY_ORDER.forEach(d => {
    if (routine[d]?.exercises?.length > 0 || routine[d]?.cardio) map[d] = `${n++}일차`;
  });
  return map;
}

function ExerciseRow({ ex, onToggle, onDelete, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const media  = getLyftaMedia(ex.name);
  const ytUrl  = `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' 운동 방법')}`;

  return (
    <div style={{ borderBottom: '1px solid #f1f3f8' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 0' }}>
        {/* 완료 체크 */}
        <div onClick={onToggle}
          style={{ width: 22, height: 22, borderRadius: 7, flexShrink: 0, border: ex.done ? 'none' : '2px solid #d7dae3', background: ex.done ? '#2f54ff' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          {ex.done && <span style={{ color: '#fff', fontSize: 13 }}>✓</span>}
        </div>

        {/* 정보 */}
        <div style={{ flex: 1, minWidth: 0, opacity: ex.done ? 0.5 : 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14, textDecoration: ex.done ? 'line-through' : 'none', color: ex.done ? '#9aa1b2' : '#0e1525' }}>
            {ex.name}
          </div>
          <div style={{ fontSize: 12, color: '#9aa1b2', marginTop: 2 }}>
            {ex.sets}세트 × {ex.reps > 0 ? `${ex.reps}회` : (ex.duration || '시간 측정')}
            {ex.weight ? ` · ${ex.weight}kg` : ''}
            {ex.rest ? ` · ${ex.rest}` : ''}
          </div>
        </div>

        {/* 수정 */}
        <button onClick={onEdit}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '4px', color: '#c2c7d2', flexShrink: 0 }}>✏️</button>

        {/* 영상 토글 */}
        <button onClick={() => setExpanded(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: '4px', color: media ? '#2f54ff' : '#FF0000', flexShrink: 0 }}>
          {media ? (expanded ? '⏸' : '▶') : '📺'}
        </button>

        {/* 삭제 */}
        <button onClick={onDelete}
          style={{ background: 'none', border: 'none', color: '#d7dae3', cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: '4px', flexShrink: 0 }}>×</button>
      </div>

      {/* 영상 패널 */}
      {expanded && (
        <div style={{ paddingLeft: 32, paddingBottom: 10 }}>
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
                  <span style={{ color: '#fff', fontSize: 13 }}>▶</span>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0e1525' }}>{ex.name} 운동 방법</div>
                  <div style={{ fontSize: 11, color: '#9aa1b2' }}>YouTube에서 검색 →</div>
                </div>
              </div>
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function HistoryScreen() {
  const navigate = useNavigate();
  const today    = todayStr();

  const [workouts,  setWorkouts]  = useState([]);
  const [calYear,   setCalYear]   = useState(new Date().getFullYear());
  const [calMonth,  setCalMonth]  = useState(new Date().getMonth());
  const [selDate,   setSelDate]   = useState(today);
  const [calData,   setCalData]   = useState({});

  const [showModal,   setShowModal]   = useState(false);
  const [modalTab,    setModalTab]    = useState('ai');
  const [modalDayKey, setModalDayKey] = useState(null);
  const [checkedExs,  setCheckedExs]  = useState({});

  const [libSearch,    setLibSearch]    = useState('');
  const [libSelected,  setLibSelected]  = useState(null);
  const [libCategory,  setLibCategory]  = useState('전체');

  const [dupConfirm,   setDupConfirm]   = useState(null);

  const [editingEx,  setEditingEx]  = useState(null);
  const [editForm,   setEditForm]   = useState({ sets: '', reps: '', weight: '', rest: '' });

  const user    = AuthService.getCurrentUser();
  const CAL_KEY = `wefit_calendar_${user?.userId}`;

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    setWorkouts(StorageService.get(`wefit_workout_${user.userId}`) || []);
    setCalData(StorageService.get(CAL_KEY) || {});
  }, [user?.userId]);

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

  const saveCalData = (updated) => {
    setCalData(updated);
    StorageService.set(CAL_KEY, updated);
    if (user) SyncService.save(user.userId);
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
    setLibCategory('전체');
    setDupConfirm(null);
  };

  const openEditEx = (ex) => {
    setEditingEx(ex);
    setEditForm({
      sets:   String(ex.sets || 3),
      reps:   String(ex.reps || 12),
      weight: ex.weight != null ? String(ex.weight) : '',
      rest:   ex.rest || '60초',
    });
  };

  const saveEditEx = () => {
    if (!editingEx) return;
    const updated = {
      ...editingEx,
      sets:   parseInt(editForm.sets)   || editingEx.sets,
      reps:   parseInt(editForm.reps)   || editingEx.reps,
      weight: editForm.weight ? parseFloat(editForm.weight) : null,
      rest:   editForm.rest || editingEx.rest,
    };
    saveCalData({
      ...calData,
      [selDate]: (calData[selDate] || []).map(e => e.id === editingEx.id ? updated : e),
    });
    setEditingEx(null);
  };

  const handleAiAdd = () => {
    const exs      = latestRoutine?.[modalDayKey]?.exercises || [];
    const selected = exs.filter((_, i) => checkedExs[i] !== false);
    if (selected.length === 0) return;
    tryAddExercises(selected);
  };

  const handleLibAdd = () => {
    if (!libSelected) return;
    const db = exerciseDb[libSelected];
    const preset = db?.근력_상승?.권장_세트 || '3세트 × 12회';
    const setsMatch = preset.match(/(\d+)[~\-]?(\d+)?세트/);
    const repsMatch = preset.match(/(\d+)[~\-]?(\d+)?회/);
    const sets = setsMatch ? parseInt(setsMatch[1]) : 3;
    const reps = repsMatch ? parseInt(repsMatch[1]) : 12;
    tryAddExercises([{
      name:   libSelected,
      sets,
      reps,
      weight: null,
      rest:   db?.근력_상승?.권장_휴식 || '60초',
      note:   '',
    }]);
  };

  const dayExercises = calData[selDate] || [];
  const doneCount    = dayExercises.filter(e => e.done).length;
  const pct          = dayExercises.length ? Math.round((doneCount / dayExercises.length) * 100) : 0;

  const latestRoutine    = workouts.length ? workouts[workouts.length - 1]?.weeklyRoutine : null;
  const activeDays       = latestRoutine ? DAY_ORDER.filter(d => latestRoutine[d]?.exercises?.length > 0) : [];
  const routineDayLabels = buildRoutineDayLabels(latestRoutine);

  const LIB_PARTS = ['전체', '가슴', '등', '하체', '어깨', '팔', '복근'];

  const libExercises = useMemo(() => {
    const q = libSearch.trim();
    return Object.keys(exerciseDb).filter(name => {
      const d = exerciseDb[name];
      const matchCat  = libCategory === '전체' || d.부위 === libCategory;
      const matchText = !q || name.includes(q) || d.세부_부위?.some(m => m.includes(q));
      return matchCat && matchText;
    });
  }, [libSearch, libCategory]);

  return (
    <div className="screen">
      {/* 헤더 */}
      <div style={{ padding: '14px 22px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #eaecf2', background: '#fff', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: '#2f54ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: '#fff' }}>W</span>
        </div>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 17, letterSpacing: -0.5, color: '#0e1525' }}>WeFitAI</span>
        <span style={{ fontSize: 13, color: '#9aa1b2', marginLeft: 'auto' }}>캘린더</span>
      </div>

      {/* 캘린더 */}
      <div style={{ background: '#fff', paddingBottom: 8 }}>
        {/* 월 네비 */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 22px 10px' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9aa1b2', padding: '0 8px' }}>‹</button>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: '#0e1525' }}>
            {calYear}년 {calMonth + 1}월
          </span>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9aa1b2', padding: '0 8px' }}>›</button>
        </div>

        <div style={{ padding: '0 14px 6px' }}>
          {/* 요일 헤더 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', marginBottom: 4 }}>
            {WEEKDAYS.map((d, i) => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 600, padding: '4px 0',
                color: i === 0 ? '#e5484d' : i === 6 ? '#2f54ff' : '#9aa1b2' }}>{d}</div>
            ))}
          </div>

          {/* 날짜 셀 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
            {cells.map((day, idx) => {
              if (!day) return <div key={`e-${idx}`} style={{ height: 38 }} />;
              const dateStr  = toDateStr(calYear, calMonth, day);
              const exList   = calData[dateStr] || [];
              const hasEx    = exList.length > 0;
              const isToday  = dateStr === today;
              const isSel    = dateStr === selDate;
              const dow      = (firstDay + day - 1) % 7;
              return (
                <div key={dateStr} onClick={() => setSelDate(dateStr)}
                  style={{
                    height: 38, borderRadius: 10, cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isSel ? '#2f54ff' : 'transparent',
                  }}>
                    <span style={{ fontSize: 13, lineHeight: 1,
                      fontWeight: isSel || isToday ? 700 : 400,
                      color: isSel ? '#fff' : dow === 0 ? '#e5484d' : dow === 6 ? '#2f54ff' : '#0e1525' }}>
                      {day}
                    </span>
                  </div>
                  {hasEx && (
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: isSel ? 'rgba(255,255,255,0.7)' : '#2f54ff', marginTop: 2 }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 선택 날짜 운동 목록 */}
      <div style={{ borderTop: '1px solid #eaecf2', padding: '16px 22px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#0e1525' }}>
              {selDate === today ? `오늘 · ${selDate.slice(5)}` : selDate.slice(5)}
            </span>
            {dayExercises.length > 0 && (
              <div style={{ fontSize: 12, color: '#9aa1b2', marginTop: 2 }}>{doneCount} / {dayExercises.length} 완료</div>
            )}
          </div>
          <button onClick={() => { setShowModal(true); setDupConfirm(null); }}
            style={{ fontSize: 12, fontWeight: 700, color: '#2f54ff', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
            + 운동 추가
          </button>
        </div>

        {dayExercises.length > 0 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ height: 5, background: '#f1f3f8', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: '#2f54ff', borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}

        {dayExercises.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '28px 0', color: '#c2c7d2' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>🏋️</div>
            <div style={{ fontSize: 14 }}>운동이 없습니다. + 운동 추가로 시작하세요!</div>
          </div>
        ) : (
          <div>
            {dayExercises.map(ex => (
              <ExerciseRow
                key={ex.id}
                ex={ex}
                onToggle={() => toggleDone(ex.id)}
                onDelete={() => deleteExercise(ex.id)}
                onEdit={() => openEditEx(ex)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 운동 추가 모달 */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(14,21,37,0.45)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={closeModal}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 480, maxHeight: '82vh', display: 'flex', flexDirection: 'column' }}>

            <div style={{ padding: '20px 22px 0', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#0e1525' }}>운동 추가</div>
                <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: 22, color: '#c2c7d2', cursor: 'pointer', lineHeight: 1 }}>×</button>
              </div>

              {dupConfirm && (
                <div style={{ background: '#fff8e1', border: '1px solid #ffe082', borderRadius: 10, padding: '10px 14px', marginBottom: 10 }}>
                  <div style={{ fontSize: 13, color: '#795548', marginBottom: 8 }}>
                    ⚠️ 중복된 운동이 있습니다:<br />
                    <b>{dupConfirm.duplicates.map(d => d.name).join(', ')}</b>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => doAddExercises(dupConfirm.exercises)}
                      style={{ flex: 1, background: '#2f54ff', color: '#fff', border: 'none', borderRadius: 8, padding: '8px', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
                      추가
                    </button>
                    <button onClick={() => setDupConfirm(null)}
                      style={{ flex: 1, background: 'none', border: '1px solid #eaecf2', borderRadius: 8, padding: '8px', cursor: 'pointer', fontSize: 13, color: '#6b7385', fontFamily: 'inherit' }}>
                      취소
                    </button>
                  </div>
                </div>
              )}

              {!dupConfirm && (
                <div style={{ display: 'flex', background: '#f7f8fb', borderRadius: 11, padding: 4, marginBottom: 4 }}>
                  {[{ id: 'ai', label: 'AI 처방' }, { id: 'library', label: '도감에서 선택' }].map(t => (
                    <button key={t.id} onClick={() => { setModalTab(t.id); setModalDayKey(null); setLibSelected(null); }}
                      style={{ flex: 1, padding: '8px 0', border: 'none', borderRadius: 8, fontFamily: 'inherit', fontSize: 13, cursor: 'pointer', fontWeight: modalTab === t.id ? 700 : 400, color: modalTab === t.id ? '#0e1525' : '#6b7385', background: modalTab === t.id ? '#fff' : 'transparent', boxShadow: modalTab === t.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!dupConfirm && (
              <div style={{ overflowY: 'auto', flex: 1, padding: '10px 22px 28px' }}>

                {/* AI 처방 탭 */}
                {modalTab === 'ai' && (
                  !latestRoutine ? (
                    <div style={{ textAlign: 'center', padding: '32px 0', color: '#9aa1b2' }}>
                      <div style={{ fontSize: 40, marginBottom: 8 }}>🤖</div>
                      <p>먼저 AI 운동 처방을 생성해주세요.</p>
                    </div>
                  ) : !modalDayKey ? (
                    <>
                      <p style={{ fontSize: 12, color: '#9aa1b2', marginBottom: 12 }}>최근 AI 처방에서 날짜를 선택하세요</p>
                      {activeDays.length === 0
                        ? <p style={{ color: '#c2c7d2', textAlign: 'center', padding: 16 }}>활성 루틴이 없습니다.</p>
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
                                style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', marginBottom: 8, background: '#f7f8fb', borderRadius: 12, cursor: 'pointer' }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ecf0ff', color: '#2f54ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                                  {dayLabel.replace('일차', '')}
                                </div>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 600, fontSize: 14, color: '#0e1525' }}>{dayLabel}</div>
                                  <div style={{ fontSize: 12, color: '#9aa1b2', marginTop: 2 }}>{dayData.part} · {dayData.exercises.length}종목</div>
                                </div>
                                <span style={{ color: '#c2c7d2', fontSize: 16 }}>›</span>
                              </div>
                            );
                          })
                      }
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <button onClick={() => setModalDayKey(null)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7385', padding: 0 }}>←</button>
                        <span style={{ fontWeight: 700, fontSize: 15, color: '#0e1525' }}>
                          {routineDayLabels[modalDayKey]} — {latestRoutine[modalDayKey]?.part}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: '#9aa1b2', marginBottom: 10 }}>추가할 운동을 선택하세요</p>

                      {(latestRoutine[modalDayKey]?.exercises || []).map((ex, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 0', borderBottom: '1px solid #f1f3f8' }}>
                          <div onClick={() => setCheckedExs(c => ({ ...c, [i]: !(c[i] ?? true) }))}
                            style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, border: (checkedExs[i] ?? true) ? 'none' : '2px solid #d7dae3', background: (checkedExs[i] ?? true) ? '#2f54ff' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            {(checkedExs[i] ?? true) && <span style={{ color: '#fff', fontSize: 13 }}>✓</span>}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 600, fontSize: 14, color: '#0e1525' }}>{ex.name}</div>
                            <div style={{ fontSize: 12, color: '#9aa1b2', marginTop: 1 }}>
                              {ex.reps > 0 ? `${ex.sets}세트 × ${ex.reps}회` : `${ex.sets}세트 × ${ex.duration || '시간'}`}
                              {' · '}{ex.rest}
                            </div>
                          </div>
                        </div>
                      ))}

                      <button className="btn-primary" style={{ marginTop: 16 }} onClick={handleAiAdd}>
                        {(latestRoutine[modalDayKey]?.exercises || []).filter((_, i) => checkedExs[i] !== false).length}개 운동 추가하기
                      </button>
                      <button onClick={() => setModalDayKey(null)}
                        style={{ width: '100%', marginTop: 8, padding: '12px', background: 'none', border: '1px solid #eaecf2', borderRadius: 11, color: '#6b7385', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
                        다른 날 선택
                      </button>
                    </>
                  )
                )}

                {/* 도감에서 선택 탭 */}
                {modalTab === 'library' && (
                  !libSelected ? (
                    <>
                      <input type="text" placeholder="운동 이름 검색..." value={libSearch}
                        onChange={e => setLibSearch(e.target.value)}
                        style={{ width: '100%', height: 44, padding: '0 14px', borderRadius: 11, border: '1px solid #eaecf2', fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 10, outline: 'none', color: '#0e1525' }} />
                      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 10, paddingBottom: 2 }}>
                        {LIB_PARTS.map(part => (
                          <button key={part} onClick={() => setLibCategory(part)}
                            style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 20, border: libCategory === part ? 'none' : '1px solid #eaecf2', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: libCategory === part ? 700 : 400, background: libCategory === part ? '#2f54ff' : '#fff', color: libCategory === part ? '#fff' : '#6b7385' }}>
                            {part}
                          </button>
                        ))}
                      </div>
                      <div>
                        {libExercises.slice(0, 60).map(name => (
                          <div key={name} onClick={() => setLibSelected(name)}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', marginBottom: 6, background: '#f7f8fb', borderRadius: 11, cursor: 'pointer' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 14, color: '#0e1525' }}>{name}</div>
                              <div style={{ fontSize: 11, color: '#9aa1b2', marginTop: 1 }}>
                                {exerciseDb[name]?.부위} · {exerciseDb[name]?.난이도}
                              </div>
                            </div>
                            <span style={{ color: '#c2c7d2', fontSize: 16 }}>›</span>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                        <button onClick={() => setLibSelected(null)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 18, color: '#6b7385', padding: 0 }}>←</button>
                        <span style={{ fontWeight: 700, fontSize: 15, color: '#0e1525' }}>{libSelected}</span>
                      </div>

                      {(() => {
                        const db = exerciseDb[libSelected];
                        const preset = db?.근력_상승?.권장_세트 || '';
                        return db ? (
                          <div style={{ background: '#f7f8fb', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
                            <div style={{ fontSize: 12, color: '#9aa1b2', marginBottom: 6 }}>{db.부위} · {db.난이도}</div>
                            {preset && <div style={{ fontSize: 13, color: '#2f54ff', fontWeight: 600 }}>{preset}</div>}
                            {db.근력_상승?.권장_휴식 && <div style={{ fontSize: 12, color: '#6b7385', marginTop: 4 }}>휴식: {db.근력_상승.권장_휴식}</div>}
                          </div>
                        ) : null;
                      })()}

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

      {/* 운동 수정 모달 */}
      {editingEx && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(14,21,37,0.45)', zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setEditingEx(null)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#0e1525' }}>운동 수정</div>
              <button onClick={() => setEditingEx(null)} style={{ background: 'none', border: 'none', fontSize: 22, color: '#c2c7d2', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#2f54ff', marginBottom: 14 }}>{editingEx.name}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { label: '세트 수',   key: 'sets',   type: 'number', placeholder: '3' },
                { label: '횟수 (회)', key: 'reps',   type: 'number', placeholder: '12' },
                { label: '무게 (kg)', key: 'weight', type: 'number', placeholder: '선택' },
                { label: '휴식 시간', key: 'rest',   type: 'text',   placeholder: '60초' },
              ].map(f => (
                <div key={f.key} className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 12 }}>{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={editForm[f.key]}
                    onChange={e => setEditForm(v => ({ ...v, [f.key]: e.target.value }))}
                    style={{ padding: '9px 12px', fontSize: 14 }} />
                </div>
              ))}
            </div>
            <button className="btn-primary" onClick={saveEditEx}>저장</button>
          </div>
        </div>
      )}

      <BottomNav active="history" />
    </div>
  );
}
