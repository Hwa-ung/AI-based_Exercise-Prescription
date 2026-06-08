import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import AuthService    from '../services/authService';
import StorageService from '../services/storageService';
import BottomNav      from '../components/BottomNav';

// ─── 날짜 헬퍼 ───────────────────────────────────────────────────
const WEEKDAYS  = ['일','월','화','수','목','금','토'];
const MONTHS_KR = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
const DAY_ORDER = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const DAY_KR    = { monday:'월요일', tuesday:'화요일', wednesday:'수요일', thursday:'목요일', friday:'금요일', saturday:'토요일', sunday:'일요일' };

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
}
function todayStr() {
  const t = new Date();
  return toDateStr(t.getFullYear(), t.getMonth(), t.getDate());
}
function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y, m)    { return new Date(y, m, 1).getDay(); }       // 0=일
function uid() { return `${Date.now()}_${Math.random().toString(36).slice(2,7)}`; }

// ─── 신체기록 차트 설정 (허리둘레 제거) ─────────────────────────
const LINE_CHARTS = [
  { key:'BMI',     label:'BMI',     unit:'',   color:'#43a047', ref:[18.5,23,25] },
  { key:'체중',    label:'체중',    unit:'kg', color:'#1976d2', ref:[] },
  { key:'체지방률', label:'체지방률', unit:'%', color:'#e53935', ref:[] },
];
const BMI_CLASS = { 정상:'badge-normal', 저체중:'badge-info', 과체중:'badge-warning', 비만:'badge-danger' };

const LineTooltip = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'white', border:'1px solid #e0e0e0', borderRadius:10, padding:'8px 12px', fontSize:13, boxShadow:'0 4px 12px rgba(0,0,0,0.1)' }}>
      <div style={{ color:'#9e9e9e', marginBottom:4 }}>{label}</div>
      <div style={{ fontWeight:700, color:payload[0]?.color }}>{payload[0]?.value}{unit}</div>
    </div>
  );
};

// ─── 메인 컴포넌트 ────────────────────────────────────────────────
export default function HistoryScreen() {
  const navigate = useNavigate();
  const today    = todayStr();

  const [tab,         setTab]         = useState('body');
  const [bodyHistory, setBodyHistory] = useState([]);
  const [activeChart, setActiveChart] = useState('BMI');
  const [workouts,    setWorkouts]    = useState([]);

  // 캘린더
  const [calYear,   setCalYear]   = useState(new Date().getFullYear());
  const [calMonth,  setCalMonth]  = useState(new Date().getMonth());
  const [selDate,   setSelDate]   = useState(today);
  const [calData,   setCalData]   = useState({}); // { 'YYYY-MM-DD': [{id,name,sets,reps,rest,note,done}] }

  // 추가 모달
  const [showModal,    setShowModal]    = useState(false);
  const [modalDayKey,  setModalDayKey]  = useState(null); // 선택된 처방 요일

  const user = AuthService.getCurrentUser();
  const CAL_KEY = `wefit_calendar_${user?.userId}`;

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    setBodyHistory(StorageService.get(`wefit_body_${user.userId}`) || []);
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
    const updated = {
      ...calData,
      [selDate]: (calData[selDate] || []).map(e => e.id === id ? { ...e, done: !e.done } : e),
    };
    saveCalData(updated);
  };

  const deleteExercise = (id) => {
    const updated = { ...calData, [selDate]: (calData[selDate] || []).filter(e => e.id !== id) };
    saveCalData(updated);
  };

  const addExercisesToDate = (exercises) => {
    const existing = calData[selDate] || [];
    const newItems = exercises.map(ex => ({ ...ex, id: uid(), done: false }));
    saveCalData({ ...calData, [selDate]: [...existing, ...newItems] });
    setShowModal(false);
    setModalDayKey(null);
  };

  // ── 선택된 날짜 운동 목록 ────────────────────────────────────────
  const dayExercises = calData[selDate] || [];
  const doneCount    = dayExercises.filter(e => e.done).length;
  const pct          = dayExercises.length ? Math.round((doneCount / dayExercises.length) * 100) : 0;

  // ── 최근 처방 ────────────────────────────────────────────────────
  const latestRoutine = workouts.length ? workouts[workouts.length - 1]?.weeklyRoutine : null;
  const activeDays = latestRoutine
    ? DAY_ORDER.filter(d => latestRoutine[d]?.exercises?.length > 0)
    : [];

  // ── 신체기록 ─────────────────────────────────────────────────────
  const cfg      = LINE_CHARTS.find(c => c.key === activeChart);
  const lineData = bodyHistory.map(h => ({
    date: h.recordDate?.slice(5),
    BMI: h.bmi, 체중: h.weight, 체지방률: h.bodyFat,
  })).filter(d => d[activeChart] != null);

  // ── 탭 버튼 ──────────────────────────────────────────────────────
  const TabBtn = ({ id, label }) => (
    <button
      onClick={() => setTab(id)}
      style={{
        flex:1, padding:'12px 0', border:'none', background:'none',
        fontFamily:'inherit', fontSize:14, cursor:'pointer',
        fontWeight: tab===id ? 700 : 400,
        color: tab===id ? '#43a047' : '#9e9e9e',
        borderBottom: tab===id ? '2.5px solid #43a047' : '2.5px solid transparent',
      }}
    >
      {label}
    </button>
  );

  return (
    <div className="screen">
      {/* 헤더 */}
      <div className="header">
        <h1>히스토리 📈</h1>
        <p>신체 기록과 운동 캘린더를 관리하세요</p>
      </div>

      {/* 탭 바 */}
      <div style={{ display:'flex', background:'white', borderBottom:'1px solid #f0f0f0', position:'sticky', top:72, zIndex:90 }}>
        <TabBtn id="body"     label="📊 신체기록" />
        <TabBtn id="calendar" label="📅 운동 캘린더" />
      </div>

      {/* ══════════════ 신체기록 탭 ══════════════ */}
      {tab === 'body' && (
        bodyHistory.length === 0 ? (
          <div className="card" style={{ textAlign:'center', padding:'48px 20px', marginTop:8 }}>
            <div style={{ fontSize:52, marginBottom:12 }}>📋</div>
            <p style={{ color:'#9e9e9e', fontSize:15, lineHeight:1.7 }}>
              아직 기록된 신체정보가 없습니다.<br />신체정보를 입력하고 변화를 추적하세요!
            </p>
          </div>
        ) : (
          <>
            {/* 차트 타입 선택 */}
            <div style={{ display:'flex', gap:8, padding:'12px 16px 4px', overflowX:'auto' }}>
              {LINE_CHARTS.map(c => (
                <button
                  key={c.key}
                  onClick={() => setActiveChart(c.key)}
                  style={{
                    flexShrink:0, padding:'7px 16px', borderRadius:20,
                    border: activeChart===c.key ? 'none' : '1.5px solid #e8e8e8',
                    cursor:'pointer', fontSize:13, fontFamily:'inherit',
                    fontWeight: activeChart===c.key ? 700 : 400,
                    background: activeChart===c.key ? c.color : 'white',
                    color: activeChart===c.key ? 'white' : '#555',
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* 꺾은선 차트 */}
            <div className="card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <h3 style={{ fontWeight:700, fontSize:15, color:cfg.color }}>{cfg.label} 추이</h3>
                <span style={{ fontSize:12, color:'#bdbdbd' }}>{lineData.length}개 기록</span>
              </div>
              {lineData.length < 2 ? (
                <div style={{ textAlign:'center', color:'#bdbdbd', padding:'24px', fontSize:14 }}>
                  그래프를 보려면 2개 이상의 기록이 필요합니다.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={210}>
                  <LineChart data={lineData} margin={{ top:5, right:8, left:-24, bottom:5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                    <XAxis dataKey="date" tick={{ fontSize:11, fill:'#9e9e9e' }} />
                    <YAxis tick={{ fontSize:11, fill:'#9e9e9e' }} />
                    <Tooltip content={<LineTooltip unit={cfg.unit} />} />
                    {cfg.ref.map(r => (
                      <ReferenceLine key={r} y={r} stroke={cfg.color} strokeDasharray="4 4" strokeOpacity={0.35} />
                    ))}
                    <Line type="monotone" dataKey={activeChart} stroke={cfg.color} strokeWidth={2.5}
                      dot={{ fill:cfg.color, r:4, strokeWidth:2, stroke:'white' }} activeDot={{ r:6 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
              {lineData.length >= 2 && (() => {
                const last = lineData[lineData.length-1][activeChart];
                const prev = lineData[lineData.length-2][activeChart];
                const diff = (last - prev).toFixed(1);
                const good = diff <= 0;
                return (
                  <div style={{ marginTop:12, display:'flex', gap:10 }}>
                    {[
                      { label:'최근 측정', val:`${last}${cfg.unit}`, color:cfg.color },
                      { label:'이전 대비', val:`${diff>0?'+':''}${diff}${cfg.unit}`, color:good?'#43a047':'#e53935' },
                    ].map(({ label, val, color }) => (
                      <div key={label} style={{ flex:1, background:'#f9f9f9', borderRadius:10, padding:'10px', textAlign:'center' }}>
                        <div style={{ fontSize:18, fontWeight:700, color }}>{val}</div>
                        <div style={{ fontSize:11, color:'#9e9e9e', marginTop:2 }}>{label}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* 기록 테이블 (허리둘레 제거) */}
            <div className="card" style={{ marginTop:0 }}>
              <h3 style={{ fontWeight:700, fontSize:15, marginBottom:14 }}>기록 목록</h3>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
                <thead>
                  <tr style={{ borderBottom:'2px solid #f0f0f0' }}>
                    {['날짜','BMI','체중','체지방'].map(h => (
                      <th key={h} style={{ padding:'8px 4px', color:'#9e9e9e', fontWeight:600, textAlign:h==='날짜'?'left':'center', fontSize:12 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...bodyHistory].reverse().map((h, i) => (
                    <tr key={h.recordId} style={{ borderBottom:'1px solid #fafafa', background:i===0?'#f9fff9':'white' }}>
                      <td style={{ padding:'10px 4px', fontWeight:i===0?600:400 }}>{h.recordDate}</td>
                      <td style={{ textAlign:'center', padding:'10px 4px' }}>
                        <span style={{ fontWeight:600, color:'#43a047' }}>{h.bmi}</span>
                        {i===0 && h.bmiStatus && (
                          <span className={`badge ${BMI_CLASS[h.bmiStatus]||'badge-grey'}`} style={{ marginLeft:4, fontSize:10 }}>{h.bmiStatus}</span>
                        )}
                      </td>
                      <td style={{ textAlign:'center', padding:'10px 4px' }}>{h.weight}kg</td>
                      <td style={{ textAlign:'center', padding:'10px 4px', color:'#757575' }}>{h.bodyFat?`${h.bodyFat}%`:'—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )
      )}

      {/* ══════════════ 운동 캘린더 탭 ══════════════ */}
      {tab === 'calendar' && (
        <>
          {/* 캘린더 — 화면 절반(50vh) 고정 높이, flex column */}
          <div style={{ background:'white', marginBottom:8, display:'flex', flexDirection:'column', height:'50vh' }}>
            {/* 월 네비게이션 */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px 8px', flexShrink:0 }}>
              <button onClick={prevMonth} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#555', padding:'0 8px' }}>‹</button>
              <span style={{ fontWeight:700, fontSize:17 }}>{calYear}년 {MONTHS_KR[calMonth]}</span>
              <button onClick={nextMonth} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'#555', padding:'0 8px' }}>›</button>
            </div>

            {/* 요일 헤더 + 날짜 그리드 (나머지 공간 채움) */}
            <div style={{ flex:1, padding:'0 12px 8px', display:'flex', flexDirection:'column', minHeight:0 }}>
              {/* 요일 헤더 */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', marginBottom:4, flexShrink:0 }}>
                {WEEKDAYS.map((d, i) => (
                  <div key={d} style={{ textAlign:'center', fontSize:12, fontWeight:600, padding:'4px 0',
                    color: i===0?'#e53935': i===6?'#1976d2':'#9e9e9e' }}>{d}</div>
                ))}
              </div>

              {/* 날짜 셀 — 행이 균등 높이로 공간 채움 */}
              <div style={{
                display:'grid',
                gridTemplateColumns:'repeat(7,1fr)',
                gridTemplateRows:`repeat(${Math.ceil(cells.length/7)},1fr)`,
                flex:1, minHeight:0, gap:2,
              }}>
                {cells.map((day, idx) => {
                  if (!day) return <div key={`e-${idx}`} />;
                  const dateStr   = toDateStr(calYear, calMonth, day);
                  const exList    = calData[dateStr] || [];
                  const hasEx     = exList.length > 0;
                  const allDone   = hasEx && exList.every(e => e.done);
                  const someDone  = hasEx && exList.some(e => e.done) && !allDone;
                  const isToday   = dateStr === today;
                  const isSel     = dateStr === selDate;
                  const dow       = (firstDay + day - 1) % 7;

                  return (
                    <div
                      key={dateStr}
                      onClick={() => setSelDate(dateStr)}
                      style={{
                        borderRadius:10,
                        textAlign:'center',
                        cursor:'pointer',
                        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
                        background: isSel ? '#43a047' : isToday ? '#e8f5e9' : 'transparent',
                        border: isToday && !isSel ? '1.5px solid #43a047' : '1.5px solid transparent',
                        transition:'background 0.1s',
                      }}
                    >
                      {/* 날짜 숫자 — 전체 완료 시 파스텔 빨간 원 */}
                      <div style={{
                        width:28, height:28, borderRadius:'50%',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        background: allDone && !isSel ? '#ffcdd2' : 'transparent',
                        flexShrink:0,
                      }}>
                        <span style={{
                          fontSize:13, fontWeight: isToday||isSel ? 700 : 400, lineHeight:1,
                          color: isSel ? 'white' : dow===0 ? '#e53935' : dow===6 ? '#1976d2' : '#424242',
                        }}>
                          {day}
                        </span>
                      </div>
                      {/* 운동 상태 점 (부분/미시작 — allDone은 원으로 표시) */}
                      {hasEx && !allDone && (
                        <div style={{ display:'flex', justifyContent:'center', gap:2, marginTop:2 }}>
                          {someDone
                            ? <>
                                <div style={{ width:4, height:4, borderRadius:'50%', background: isSel?'rgba(255,255,255,0.9)':'#43a047' }} />
                                <div style={{ width:4, height:4, borderRadius:'50%', background: isSel?'rgba(255,255,255,0.4)':'#bdbdbd' }} />
                              </>
                            : <div style={{ width:4, height:4, borderRadius:'50%', background: isSel?'rgba(255,255,255,0.5)':'#bdbdbd' }} />
                          }
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 선택된 날짜 운동 목록 */}
          <div className="card" style={{ marginTop:0 }}>
            {/* 날짜 헤더 */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
              <div>
                <span style={{ fontWeight:700, fontSize:16 }}>
                  {selDate === today ? `오늘 (${selDate})` : selDate}
                </span>
                {dayExercises.length > 0 && (
                  <div style={{ fontSize:12, color:'#9e9e9e', marginTop:2 }}>
                    {doneCount}/{dayExercises.length} 완료
                  </div>
                )}
              </div>
              <button
                onClick={() => setShowModal(true)}
                style={{
                  background:'#43a047', color:'white', border:'none', borderRadius:10,
                  padding:'8px 14px', cursor:'pointer', fontSize:13, fontWeight:600, fontFamily:'inherit',
                }}
              >
                + 운동 추가
              </button>
            </div>

            {/* 진행률 바 */}
            {dayExercises.length > 0 && (
              <div style={{ marginBottom:14 }}>
                <div style={{ height:6, background:'#f0f0f0', borderRadius:3, overflow:'hidden' }}>
                  <div style={{ height:'100%', width:`${pct}%`, background: pct===100?'#43a047':'#66bb6a', borderRadius:3, transition:'width 0.3s' }} />
                </div>
                <div style={{ textAlign:'right', fontSize:11, color: pct===100?'#43a047':'#9e9e9e', marginTop:4, fontWeight: pct===100?700:400 }}>
                  {pct===100 ? '🎉 오늘 운동 완료!' : `${pct}%`}
                </div>
              </div>
            )}

            {/* 운동 리스트 */}
            {dayExercises.length === 0 ? (
              <div style={{ textAlign:'center', padding:'28px 0', color:'#bdbdbd' }}>
                <div style={{ fontSize:36, marginBottom:8 }}>🏋️</div>
                <div style={{ fontSize:14 }}>운동이 없습니다.<br />+ 운동 추가로 시작하세요!</div>
              </div>
            ) : (
              <div>
                {dayExercises.map((ex) => (
                  <div
                    key={ex.id}
                    style={{
                      display:'flex', alignItems:'center', gap:12,
                      padding:'12px 0',
                      borderBottom:'1px solid #f5f5f5',
                      opacity: ex.done ? 0.55 : 1,
                      transition:'opacity 0.2s',
                    }}
                  >
                    {/* 체크박스 */}
                    <div
                      onClick={() => toggleDone(ex.id)}
                      style={{
                        width:24, height:24, borderRadius:7, flexShrink:0,
                        border: ex.done ? 'none' : '2px solid #d0d0d0',
                        background: ex.done ? '#43a047' : 'white',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        cursor:'pointer', transition:'all 0.15s',
                      }}
                    >
                      {ex.done && <span style={{ color:'white', fontSize:14, lineHeight:1 }}>✓</span>}
                    </div>

                    {/* 운동 정보 */}
                    <div style={{ flex:1 }}>
                      <div style={{ fontWeight:600, fontSize:15, textDecoration: ex.done?'line-through':'none', color: ex.done?'#9e9e9e':'#212121' }}>
                        {ex.name}
                      </div>
                      <div style={{ fontSize:12, color:'#9e9e9e', marginTop:2 }}>
                        {ex.reps > 0
                          ? `${ex.sets}세트 × ${ex.reps}회 · 휴식 ${ex.rest}`
                          : `${ex.sets}세트 × ${ex.duration || '시간 측정'} · 휴식 ${ex.rest}`
                        }
                      </div>
                    </div>

                    {/* 삭제 */}
                    <button
                      onClick={() => deleteExercise(ex.id)}
                      style={{ background:'none', border:'none', color:'#e0e0e0', cursor:'pointer', fontSize:18, lineHeight:1, padding:'4px', flexShrink:0 }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ══════════════ 운동 추가 모달 ══════════════ */}
      {showModal && (
        <div
          style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:300, display:'flex', alignItems:'flex-end', justifyContent:'center' }}
          onClick={() => { setShowModal(false); setModalDayKey(null); }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background:'white', borderRadius:'24px 24px 0 0', width:'100%', maxWidth:480, maxHeight:'75vh', display:'flex', flexDirection:'column' }}
          >
            {/* 모달 헤더 */}
            <div style={{ padding:'20px 20px 12px', borderBottom:'1px solid #f5f5f5', flexShrink:0 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <h3 style={{ fontSize:17, fontWeight:700 }}>
                  {modalDayKey ? `← ${DAY_KR[modalDayKey]} 운동` : '운동 추가'}
                </h3>
                <button onClick={() => { setShowModal(false); setModalDayKey(null); }}
                  style={{ background:'none', border:'none', fontSize:22, color:'#bdbdbd', cursor:'pointer', lineHeight:1 }}>×</button>
              </div>
              <p style={{ fontSize:13, color:'#9e9e9e', marginTop:4 }}>
                {modalDayKey
                  ? '추가할 운동을 확인하세요'
                  : `${selDate}에 추가할 운동을 선택하세요`
                }
              </p>
            </div>

            {/* 모달 바디 */}
            <div style={{ overflowY:'auto', flex:1, padding:'12px 20px 20px' }}>
              {!latestRoutine ? (
                <div style={{ textAlign:'center', padding:'32px 0', color:'#9e9e9e' }}>
                  <div style={{ fontSize:40, marginBottom:8 }}>🤖</div>
                  <p>먼저 AI 운동 처방을 생성해주세요.</p>
                </div>
              ) : !modalDayKey ? (
                /* 요일 선택 화면 */
                <>
                  <p style={{ fontSize:12, color:'#9e9e9e', marginBottom:12 }}>최근 AI 처방에서 요일을 선택하세요</p>
                  {activeDays.length === 0
                    ? <p style={{ color:'#bdbdbd', textAlign:'center', padding:16 }}>활성 루틴이 없습니다.</p>
                    : activeDays.map(dayKey => {
                        const dayData = latestRoutine[dayKey];
                        return (
                          <div
                            key={dayKey}
                            onClick={() => setModalDayKey(dayKey)}
                            style={{
                              display:'flex', alignItems:'center', gap:12,
                              padding:'13px 14px', marginBottom:8,
                              background:'#f9f9f9', borderRadius:12, cursor:'pointer',
                              border:'1.5px solid transparent',
                              transition:'border-color 0.15s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor='#43a047'}
                            onMouseLeave={e => e.currentTarget.style.borderColor='transparent'}
                          >
                            <div style={{ width:36, height:36, borderRadius:10, background:'#e8f5e9', color:'#2e7d32', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:700, flexShrink:0 }}>
                              {DAY_KR[dayKey].slice(0,1)}
                            </div>
                            <div style={{ flex:1 }}>
                              <div style={{ fontWeight:600, fontSize:14 }}>{DAY_KR[dayKey]}</div>
                              <div style={{ fontSize:12, color:'#9e9e9e', marginTop:2 }}>
                                {dayData.part} · {dayData.exercises.length}종목
                              </div>
                            </div>
                            <span style={{ color:'#bdbdbd', fontSize:16 }}>›</span>
                          </div>
                        );
                      })
                  }
                </>
              ) : (
                /* 운동 목록 확인 화면 */
                <>
                  {latestRoutine[modalDayKey]?.exercises.map((ex, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'11px 0', borderBottom:'1px solid #f5f5f5' }}>
                      <div style={{ width:24, height:24, borderRadius:'50%', background:'#43a047', color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:700, flexShrink:0 }}>
                        {i+1}
                      </div>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:14 }}>{ex.name}</div>
                        <div style={{ fontSize:12, color:'#9e9e9e', marginTop:1 }}>
                          {ex.reps>0 ? `${ex.sets}세트 × ${ex.reps}회` : `${ex.sets}세트 × ${ex.duration||'시간'}`}
                          {' · 휴식 '}{ex.rest}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* 추가 버튼 */}
                  <button
                    className="btn-primary"
                    style={{ marginTop:16 }}
                    onClick={() => addExercisesToDate(latestRoutine[modalDayKey]?.exercises || [])}
                  >
                    {latestRoutine[modalDayKey]?.exercises.length}개 운동 추가하기
                  </button>
                  <button
                    onClick={() => setModalDayKey(null)}
                    style={{ width:'100%', marginTop:8, padding:'12px', background:'none', border:'1.5px solid #e0e0e0', borderRadius:12, color:'#757575', cursor:'pointer', fontSize:14, fontFamily:'inherit' }}
                  >
                    다른 날 선택
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <BottomNav active="history" />
    </div>
  );
}
