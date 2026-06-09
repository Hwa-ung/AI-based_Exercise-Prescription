import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import AuthService    from '../services/authService';
import StorageService from '../services/storageService';
import BodyAnalyzer   from '../services/bodyAnalyzer';
import BottomNav      from '../components/BottomNav';

const BMI_MIN = 15, BMI_MAX = 35;

function BMIGauge({ bmi }) {
  const pct   = Math.min(100, Math.max(0, ((bmi - BMI_MIN) / (BMI_MAX - BMI_MIN)) * 100));
  const color = bmi < 18.5 ? '#42a5f5' : bmi < 23 ? '#66bb6a' : bmi < 25 ? '#ffa726' : '#ef5350';
  const zones = [
    { label: '저체중', from: 15,   to: 18.5, color: '#42a5f580' },
    { label: '정상',   from: 18.5, to: 23,   color: '#66bb6a80' },
    { label: '과체중', from: 23,   to: 25,   color: '#ffa72680' },
    { label: '비만',   from: 25,   to: 35,   color: '#ef535080' },
  ];
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ position: 'relative', height: 10, borderRadius: 5, overflow: 'hidden', display: 'flex' }}>
        {zones.map(z => (
          <div key={z.label} style={{ width: `${((z.to - z.from) / (BMI_MAX - BMI_MIN)) * 100}%`, background: z.color }} />
        ))}
        <div style={{ position: 'absolute', top: -3, left: `${pct}%`, transform: 'translateX(-50%)', width: 16, height: 16, borderRadius: '50%', background: color, border: '2.5px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }} />
      </div>
      <div style={{ display: 'flex', marginTop: 6 }}>
        {zones.map(z => (
          <div key={z.label} style={{ width: `${((z.to - z.from) / (BMI_MAX - BMI_MIN)) * 100}%`, textAlign: 'center', fontSize: 9, color: z.color.slice(0, 7), fontWeight: 600 }}>
            {z.label}
          </div>
        ))}
      </div>
    </div>
  );
}

const LineTooltip = ({ active, payload, label, unit }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'white', border: '1px solid #e0e0e0', borderRadius: 10, padding: '8px 12px', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
      <div style={{ color: '#9e9e9e', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, color: payload[0]?.color }}>{payload[0]?.value}{unit}</div>
    </div>
  );
};

const BODY_CHARTS = [
  { key: 'bmi',     label: 'BMI',     unit: '',   color: '#43a047', ref: [18.5, 23, 25] },
  { key: 'weight',  label: '체중',    unit: 'kg', color: '#1976d2', ref: [] },
  { key: 'bodyFat', label: '체지방률', unit: '%', color: '#e53935', ref: [] },
];

const BMI_CLASS = { 정상: 'badge-normal', 저체중: 'badge-info', 과체중: 'badge-warning', 비만: 'badge-danger' };
const STATUS_CLASS = {
  정상: 'badge-normal', 저체중: 'badge-info', 부족: 'badge-info',
  경계: 'badge-warning', 과체중: 'badge-warning',
  과잉: 'badge-danger', 우수: 'badge-normal',
};

export default function HomeScreen() {
  const navigate = useNavigate();

  const [user,          setUser]          = useState(null);
  const [latestBody,    setLatestBody]    = useState(null);
  const [latestWorkout, setLatestWorkout] = useState(null);
  const [bodyHistory,   setBodyHistory]   = useState([]);
  const [activeChart,   setActiveChart]   = useState('bmi');

  const [showSettings,  setShowSettings]  = useState(false);
  const [goal,          setGoal]          = useState('근력_상승');
  const [profileForm,   setProfileForm]   = useState({ name: '', birthDate: '', gender: 'MALE' });
  const [settingsError, setSettingsError] = useState('');

  // 신체기록 편집
  const [editRecord,    setEditRecord]    = useState(null);
  const [editRecForm,   setEditRecForm]   = useState({});
  const [editRecGender, setEditRecGender] = useState('MALE');

  const loadData = () => {
    const u = AuthService.getCurrentUser();
    if (!u) { navigate('/login'); return; }
    setUser(u);
    setProfileForm({ name: u.name || '', birthDate: u.birthDate || '', gender: u.gender || 'MALE' });

    const users = StorageService.get('wefit_users') || {};
    setEditRecGender(users[u.userId]?.gender || 'MALE');

    const bodyList = StorageService.get(`wefit_body_${u.userId}`) || [];
    if (bodyList.length) setLatestBody(bodyList[bodyList.length - 1]);
    setBodyHistory(bodyList);

    const workoutList = StorageService.get(`wefit_workout_${u.userId}`) || [];
    if (workoutList.length) setLatestWorkout(workoutList[workoutList.length - 1]);

    const savedGoal = StorageService.get(`wefit_goal_${u.userId}`);
    if (savedGoal) setGoal(savedGoal);
  };

  useEffect(() => { loadData(); }, []);

  const saveSettings = async () => {
    setSettingsError('');
    if (profileForm.birthDate) {
      const bd  = new Date(profileForm.birthDate);
      const now = new Date(); now.setHours(0, 0, 0, 0);
      if (bd > now) { setSettingsError('생년월일은 오늘 이후일 수 없습니다.'); return; }
      if (bd.getFullYear() < now.getFullYear() - 120) { setSettingsError('올바른 생년월일을 입력해주세요.'); return; }
    }
    StorageService.set(`wefit_goal_${user.userId}`, goal);
    try { await AuthService.updateProfile({ userId: user.userId, ...profileForm }); } catch { /* ignore */ }
    setShowSettings(false);
    loadData();
  };

  // 신체기록 편집
  const openEditRecord = (rec) => {
    setEditRecord(rec);
    setEditRecForm({
      height:     String(rec.height),
      weight:     String(rec.weight),
      bodyFat:    rec.bodyFat    != null ? String(rec.bodyFat)    : '',
      muscleMass: rec.muscleMass != null ? String(rec.muscleMass) : '',
    });
  };

  const saveEditRecord = () => {
    const h = parseFloat(editRecForm.height);
    const w = parseFloat(editRecForm.weight);
    if (isNaN(h) || isNaN(w)) return;
    const analysis = BodyAnalyzer.analyze({
      height:     h, weight: w,
      bodyFat:    editRecForm.bodyFat    ? parseFloat(editRecForm.bodyFat)    : null,
      muscleMass: editRecForm.muscleMass ? parseFloat(editRecForm.muscleMass) : null,
    }, editRecGender);
    const updated = bodyHistory.map(r => r.recordId === editRecord.recordId
      ? { ...r, height: h, weight: w,
          bodyFat:         editRecForm.bodyFat    ? parseFloat(editRecForm.bodyFat)    : null,
          muscleMass:      editRecForm.muscleMass ? parseFloat(editRecForm.muscleMass) : null,
          bmi: analysis.bmi, bmiStatus: analysis.bmiStatus,
          bodyFatStatus: analysis.bodyFatStatus, muscleMassStatus: analysis.muscleMassStatus,
          analysisResult: analysis.analysisResult }
      : r
    );
    StorageService.set(`wefit_body_${user.userId}`, updated);
    setBodyHistory(updated);
    if (updated.length) setLatestBody(updated[updated.length - 1]);
    setEditRecord(null);
  };

  const deleteRecord = (recordId) => {
    const updated = bodyHistory.filter(r => r.recordId !== recordId);
    StorageService.set(`wefit_body_${user.userId}`, updated);
    setBodyHistory(updated);
    setLatestBody(updated.length ? updated[updated.length - 1] : null);
    setEditRecord(null);
  };

  const workoutDays = latestWorkout
    ? Object.values(latestWorkout.weeklyRoutine || {}).filter(d => d.exercises?.length > 0 || d.cardio).length
    : 0;

  const getBMIClass = (s) => BMI_CLASS[s] || 'badge-grey';

  // 차트 데이터
  const cfg       = BODY_CHARTS.find(c => c.key === activeChart);
  const chartData = bodyHistory
    .map(h => ({ date: h.recordDate?.slice(5), bmi: h.bmi, weight: h.weight, bodyFat: h.bodyFat }))
    .filter(d => d[activeChart] != null);

  return (
    <div className="screen" style={{ background: '#f5f7fa' }}>
      {/* 헤더 */}
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>WeFitAI 🏋️</h1>
          <p>안녕하세요, {user?.name || user?.userId}님!</p>
        </div>
        <button
          onClick={() => { setSettingsError(''); setShowSettings(true); }}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 20, padding: '7px 13px', color: 'white', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
        >
          ⚙️ 설정
        </button>
      </div>

      {/* BMI 카드 */}
      {latestBody ? (
        <div className="card" style={{ borderLeft: '4px solid #43a047' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>최근 신체 분석</span>
            <span style={{ fontSize: 12, color: '#bdbdbd' }}>{latestBody.recordDate}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            {[
              { label: 'BMI', value: latestBody.bmi, status: latestBody.bmiStatus, color: '#43a047' },
              { label: '체중', value: `${latestBody.weight}kg`, status: null, color: '#1976d2' },
            ].map(({ label, value, status, color }) => (
              <div key={label} style={{ textAlign: 'center', background: '#f9f9f9', borderRadius: 12, padding: '14px 8px' }}>
                <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{label}</div>
                {status && <span className={`badge ${getBMIClass(status)}`} style={{ marginTop: 5, display: 'inline-block' }}>{status}</span>}
              </div>
            ))}
          </div>
          {latestBody.bmi && <BMIGauge bmi={latestBody.bmi} />}
          <div style={{ marginTop: 14, fontSize: 13, color: '#557', lineHeight: 1.6 }}>
            💡 {latestBody.analysisResult}
          </div>
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
          <div style={{ fontSize: 52, marginBottom: 10 }}>📊</div>
          <p style={{ color: '#9e9e9e', fontSize: 15, lineHeight: 1.6 }}>
            신체정보를 입력하면<br />AI 분석 결과를 확인할 수 있어요
          </p>
        </div>
      )}

      {/* 빠른 이동 버튼 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '0 16px' }}>
        {[
          { icon: '📏', title: '신체정보 입력', sub: 'BMI · 체지방 분석', path: '/body',    bg: 'linear-gradient(135deg, #43a047, #2e7d32)' },
          { icon: '🤖', title: 'AI 운동 처방', sub: '맞춤형 주간 루틴',  path: '/workout', bg: 'linear-gradient(135deg, #1976d2, #0d47a1)' },
        ].map(btn => (
          <button key={btn.path} onClick={() => navigate(btn.path)}
            style={{ background: btn.bg, color: 'white', border: 'none', borderRadius: 16, padding: '20px 14px', cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit' }}>
            <div style={{ fontSize: 30, marginBottom: 6 }}>{btn.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{btn.title}</div>
            <div style={{ fontSize: 11, opacity: 0.82, marginTop: 3 }}>{btn.sub}</div>
          </button>
        ))}
      </div>

      {/* 최근 운동 처방 */}
      {latestWorkout && (
        <div className="card" style={{ marginTop: 4 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 16 }}>최근 운동 처방</span>
            <span style={{ fontSize: 12, color: '#bdbdbd' }}>{latestWorkout.prescribedAt?.split('T')[0]}</span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className={`badge ${latestWorkout.goal === '근력_상승' ? 'badge-normal' : 'badge-warning'}`}>
              {latestWorkout.goal === '근력_상승' ? '💪 근력 상승' : '🔥 다이어트'}
            </span>
            <span style={{ fontSize: 13, color: '#757575' }}>주 {workoutDays}일 프로그램</span>
          </div>
          <button
            onClick={() => navigate('/history')}
            style={{ marginTop: 12, width: '100%', padding: '11px', background: '#e8f5e9', color: '#2e7d32', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit' }}
          >
            오늘의 루틴 보기 →
          </button>
        </div>
      )}

      {/* ══ 신체기록 ══ */}
      {bodyHistory.length > 0 && (
        <div className="card" style={{ marginTop: 4 }}>
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>📊 신체기록</h3>

          {/* 차트 선택 탭 */}
          <div style={{ display: 'flex', gap: 7, marginBottom: 12 }}>
            {BODY_CHARTS.map(c => {
              const hasData = bodyHistory.some(h => h[c.key] != null);
              if (!hasData) return null;
              const active = activeChart === c.key;
              return (
                <button key={c.key} onClick={() => setActiveChart(c.key)}
                  style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 18, border: active ? 'none' : '1.5px solid #e8e8e8', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', fontWeight: active ? 700 : 400, background: active ? c.color : 'white', color: active ? 'white' : '#555' }}>
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* 꺾은선 차트 */}
          {chartData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={chartData} margin={{ top: 5, right: 8, left: -26, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9e9e9e' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9e9e9e' }} />
                <Tooltip content={<LineTooltip unit={cfg.unit} />} />
                {cfg.ref.map(r => (
                  <ReferenceLine key={r} y={r} stroke={cfg.color} strokeDasharray="4 4" strokeOpacity={0.4} />
                ))}
                <Line type="monotone" dataKey={activeChart} stroke={cfg.color} strokeWidth={2.5}
                  dot={{ fill: cfg.color, r: 3, strokeWidth: 2, stroke: 'white' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', color: '#bdbdbd', padding: '16px 0', fontSize: 13 }}>
              그래프를 보려면 2개 이상의 기록이 필요합니다.
            </div>
          )}

          {/* 기록 목록 */}
          <div style={{ marginTop: 16, borderTop: '1px solid #f5f5f5', paddingTop: 14 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 10 }}>기록 목록</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                  {['날짜', 'BMI', '체중', '체지방', '근력량', ''].map(h => (
                    <th key={h} style={{ padding: '7px 3px', color: '#9e9e9e', fontWeight: 600, textAlign: h === '날짜' ? 'left' : 'center', fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...bodyHistory].reverse().map((h, i) => (
                  <tr key={h.recordId} style={{ borderBottom: '1px solid #fafafa', background: i === 0 ? '#f9fff9' : 'white' }}>
                    <td style={{ padding: '9px 3px', fontWeight: i === 0 ? 600 : 400, fontSize: 11 }}>{h.recordDate}</td>
                    <td style={{ textAlign: 'center', padding: '9px 3px' }}>
                      <span style={{ fontWeight: 600, color: '#43a047' }}>{h.bmi}</span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '9px 3px' }}>{h.weight}kg</td>
                    <td style={{ textAlign: 'center', padding: '9px 3px', color: '#757575' }}>{h.bodyFat ? `${h.bodyFat}%` : '—'}</td>
                    <td style={{ textAlign: 'center', padding: '9px 3px', color: '#757575' }}>{h.muscleMass ? `${h.muscleMass}kg` : '—'}</td>
                    <td style={{ textAlign: 'center', padding: '6px 2px' }}>
                      <button onClick={() => openEditRecord(h)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '2px 3px', color: '#43a047' }}>✏️</button>
                      <button onClick={() => { if (window.confirm('이 기록을 삭제하시겠습니까?')) deleteRecord(h.recordId); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '2px 3px', color: '#e53935' }}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ 설정 모달 ══ */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setShowSettings(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: '24px 24px 0 0', padding: 24, width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>⚙️ 설정</h3>
            {settingsError && <div className="error-msg" style={{ marginBottom: 14 }}>{settingsError}</div>}

            <div className="form-group">
              <label>이름</label>
              <input type="text" value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>생년월일</label>
                <input type="date" value={profileForm.birthDate} max={new Date().toISOString().split('T')[0]}
                  onChange={e => setProfileForm(p => ({ ...p, birthDate: e.target.value }))} />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>성별</label>
                <select value={profileForm.gender} onChange={e => setProfileForm(p => ({ ...p, gender: e.target.value }))}>
                  <option value="MALE">남성</option>
                  <option value="FEMALE">여성</option>
                </select>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: 16 }}>
              <label>운동 목표</label>
              <select value={goal} onChange={e => setGoal(e.target.value)}>
                <option value="근력_상승">💪 근력 상승</option>
                <option value="다이어트">🔥 다이어트</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginTop: 16 }}>
              <button className="btn-primary" onClick={saveSettings}>저장</button>
              <button onClick={() => { AuthService.logout(); navigate('/login'); }}
                style={{ padding: '14px 20px', background: '#ffebee', color: '#c62828', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ 신체기록 편집 모달 ══ */}
      {editRecord && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setEditRecord(null)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 17, fontWeight: 700 }}>📝 기록 수정</h3>
              <button onClick={() => setEditRecord(null)} style={{ background: 'none', border: 'none', fontSize: 22, color: '#bdbdbd', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ fontSize: 12, color: '#9e9e9e', marginBottom: 14 }}>{editRecord.recordDate}</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { label: '신장 (cm)',    key: 'height',     placeholder: '175' },
                { label: '체중 (kg)',    key: 'weight',     placeholder: '70' },
                { label: '체지방률 (%)', key: 'bodyFat',    placeholder: '선택' },
                { label: '근력량 (kg)',  key: 'muscleMass', placeholder: '선택' },
              ].map(f => (
                <div key={f.key} className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 12 }}>{f.label}</label>
                  <input type="number" step="0.1" placeholder={f.placeholder} value={editRecForm[f.key] ?? ''}
                    onChange={e => setEditRecForm(v => ({ ...v, [f.key]: e.target.value }))}
                    style={{ padding: '9px 12px', fontSize: 14 }} />
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button className="btn-primary" onClick={saveEditRecord}>저장</button>
              <button onClick={() => { if (window.confirm('이 기록을 삭제하시겠습니까?')) deleteRecord(editRecord.recordId); }}
                style={{ padding: '14px', background: '#ffebee', color: '#c62828', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit' }}>
                삭제
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="home" />
    </div>
  );
}
