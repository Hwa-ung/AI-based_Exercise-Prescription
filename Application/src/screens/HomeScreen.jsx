import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import AuthService    from '../services/authService';
import StorageService from '../services/storageService';
import SyncService    from '../services/syncService';
import BodyAnalyzer   from '../services/bodyAnalyzer';
import BottomNav      from '../components/BottomNav';

const BMI_MIN = 15, BMI_MAX = 35;

function BMIGauge({ bmi }) {
  const pct   = Math.min(100, Math.max(0, ((bmi - BMI_MIN) / (BMI_MAX - BMI_MIN)) * 100));
  const color = bmi < 18.5 ? '#42a5f5' : bmi < 23 ? '#2f54ff' : bmi < 25 ? '#ffa726' : '#ef5350';
  const zones = [
    { label: '저체중', from: 15,   to: 18.5, color: '#42a5f580' },
    { label: '정상',   from: 18.5, to: 23,   color: '#2f54ff80' },
    { label: '과체중', from: 23,   to: 25,   color: '#ffa72680' },
    { label: '비만',   from: 25,   to: 35,   color: '#ef535080' },
  ];
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ position: 'relative', height: 8, borderRadius: 4, overflow: 'hidden', display: 'flex' }}>
        {zones.map(z => (
          <div key={z.label} style={{ width: `${((z.to - z.from) / (BMI_MAX - BMI_MIN)) * 100}%`, background: z.color }} />
        ))}
        <div style={{ position: 'absolute', top: -4, left: `${pct}%`, transform: 'translateX(-50%)', width: 16, height: 16, borderRadius: '50%', background: color, border: '2.5px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.25)' }} />
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
    <div style={{ background: '#fff', border: '1px solid #eaecf2', borderRadius: 10, padding: '8px 12px', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}>
      <div style={{ color: '#9aa1b2', marginBottom: 4 }}>{label}</div>
      <div style={{ fontWeight: 700, color: payload[0]?.color }}>{payload[0]?.value}{unit}</div>
    </div>
  );
};

const BODY_CHARTS = [
  { key: 'bmi',    label: 'BMI', unit: '',   color: '#2f54ff', ref: [18.5, 23, 25] },
  { key: 'weight', label: '체중', unit: 'kg', color: '#0e1525', ref: [] },
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
    SyncService.save(user.userId);
    setShowSettings(false);
    loadData();
  };

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
    SyncService.save(user.userId);
    setBodyHistory(updated);
    if (updated.length) setLatestBody(updated[updated.length - 1]);
    setEditRecord(null);
  };

  const deleteRecord = (recordId) => {
    const updated = bodyHistory.filter(r => r.recordId !== recordId);
    StorageService.set(`wefit_body_${user.userId}`, updated);
    SyncService.save(user.userId);
    setBodyHistory(updated);
    setLatestBody(updated.length ? updated[updated.length - 1] : null);
    setEditRecord(null);
  };

  const workoutDays = latestWorkout
    ? Object.values(latestWorkout.weeklyRoutine || {}).filter(d => d.exercises?.length > 0 || d.cardio).length
    : 0;

  const cfg       = BODY_CHARTS.find(c => c.key === activeChart);
  const chartData = bodyHistory
    .map(h => ({ date: h.recordDate?.slice(5), bmi: h.bmi, weight: h.weight, bodyFat: h.bodyFat }))
    .filter(d => d[activeChart] != null);

  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
  const greet = today.getHours() < 12 ? '좋은 아침이에요' : today.getHours() < 18 ? '안녕하세요' : '수고하셨어요';

  return (
    <div className="screen">
      {/* 헤더 */}
      <div style={{ padding: '14px 22px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eaecf2', background: '#fff', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 26, height: 26, borderRadius: 8, background: '#2f54ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: '#fff' }}>W</span>
          </div>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 17, letterSpacing: -0.5, color: '#0e1525' }}>WeFitAI</span>
        </div>
        <button
          onClick={() => { setSettingsError(''); setShowSettings(true); }}
          style={{ width: 38, height: 38, borderRadius: 10, border: '1px solid #eaecf2', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
        >
          <div style={{ width: 16, height: 16, border: '1.5px solid #6b7385', borderRadius: '50%' }} />
        </button>
      </div>

      {/* 날짜 + 인사 */}
      <div style={{ padding: '18px 22px 0' }}>
        <div style={{ fontSize: 13, color: '#6b7385' }}>{dateStr}</div>
        <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: -0.5, color: '#0e1525', marginTop: 2 }}>
          {greet}, {user?.name || user?.userId}님!
        </div>
      </div>

      {/* AI 처방 카드 */}
      {latestWorkout ? (
        <div style={{ margin: '18px 16px 0' }}>
          <div style={{ fontSize: 11, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, letterSpacing: 1.5, color: '#2f54ff', textTransform: 'uppercase', marginBottom: 10 }}>
            최근 처방 · AI
          </div>
          <div style={{ border: '1px solid #eaecf2', borderRadius: 14, padding: 20 }}>
            <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, color: '#0e1525' }}>
              {latestWorkout.goal === '근력_상승' ? '근력 강화 루틴' : '다이어트 루틴'}
            </div>
            <div style={{ fontSize: 13, color: '#6b7385', marginTop: 5 }}>
              주 {workoutDays}일 · {latestWorkout.prescribedAt?.split('T')[0]}
            </div>
            <button
              onClick={() => navigate('/workout')}
              style={{ marginTop: 18, width: '100%', border: 'none', background: '#2f54ff', color: '#fff', fontFamily: 'inherit', fontWeight: 700, fontSize: 15, padding: 14, borderRadius: 11, cursor: 'pointer' }}
            >
              운동 시작하기
            </button>
          </div>
        </div>
      ) : (
        <div style={{ margin: '18px 16px 0' }}>
          <div style={{ fontSize: 11, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, letterSpacing: 1.5, color: '#2f54ff', textTransform: 'uppercase', marginBottom: 10 }}>
            AI 처방
          </div>
          <div style={{ border: '1px solid #eaecf2', borderRadius: 14, padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 15, color: '#6b7385', lineHeight: 1.6, marginBottom: 14 }}>
              AI가 신체정보 기반으로<br />맞춤 운동을 처방해드립니다
            </div>
            <button
              onClick={() => navigate('/workout')}
              style={{ width: '100%', border: 'none', background: '#2f54ff', color: '#fff', fontFamily: 'inherit', fontWeight: 700, fontSize: 15, padding: 14, borderRadius: 11, cursor: 'pointer' }}
            >
              AI 운동 처방 받기
            </button>
          </div>
        </div>
      )}

      {/* 체중 관리 — 신체기록 */}
      <div style={{ padding: '24px 22px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: '#0e1525' }}>체중 관리</span>
          {bodyHistory.length > 0 && (
            <span style={{ fontSize: 12, color: '#9aa1b2' }}>{latestBody?.recordDate}</span>
          )}
        </div>

        {latestBody ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div style={{ border: '1px solid #eaecf2', borderRadius: 14, padding: 15 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, color: '#0e1525', letterSpacing: -1 }}>{latestBody.bmi}</span>
                  {latestBody.bmiStatus && (
                    <span style={{ fontSize: 11, fontWeight: 700, background: '#ecf0ff', color: '#2f54ff', padding: '2px 8px', borderRadius: 8 }}>{latestBody.bmiStatus}</span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: '#9aa1b2', marginTop: 3 }}>BMI</div>
              </div>
              <div style={{ border: '1px solid #eaecf2', borderRadius: 14, padding: 15 }}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 26, fontWeight: 700, color: '#0e1525', letterSpacing: -1 }}>
                  {latestBody.weight}
                </div>
                <div style={{ fontSize: 12, color: '#9aa1b2', marginTop: 3 }}>체중 kg</div>
              </div>
            </div>

            {(latestBody.bodyFat != null || latestBody.muscleMass != null) && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                {latestBody.bodyFat != null && (
                  <div style={{ border: '1px solid #eaecf2', borderRadius: 14, padding: '13px 10px' }}>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: '#0e1525' }}>
                      {latestBody.bodyFat}<span style={{ fontSize: 10, color: '#9aa1b2' }}>%</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#9aa1b2', marginTop: 2 }}>체지방률</div>
                  </div>
                )}
                {latestBody.muscleMass != null && (
                  <div style={{ border: '1px solid #eaecf2', borderRadius: 14, padding: '13px 10px' }}>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, fontWeight: 700, color: '#0e1525' }}>
                      {latestBody.muscleMass}<span style={{ fontSize: 10, color: '#9aa1b2' }}>kg</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#9aa1b2', marginTop: 2 }}>근력량</div>
                  </div>
                )}
              </div>
            )}

            {latestBody.bmi && <div style={{ padding: '0 0 4px' }}><BMIGauge bmi={latestBody.bmi} /></div>}

            {latestBody.analysisResult && (
              <div style={{ background: '#f7f8fb', borderRadius: 11, padding: '12px 14px', fontSize: 13, color: '#4a5163', lineHeight: 1.6, marginTop: 10 }}>
                {latestBody.analysisResult}
              </div>
            )}
          </>
        ) : (
          <div style={{ border: '1px solid #eaecf2', borderRadius: 14, padding: '28px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: '#9aa1b2', lineHeight: 1.6, marginBottom: 14 }}>
              신체정보를 입력하면<br />체중 및 BMI를 추적할 수 있어요
            </div>
            <button
              onClick={() => navigate('/body')}
              style={{ border: 'none', background: '#2f54ff', color: '#fff', fontFamily: 'inherit', fontWeight: 700, fontSize: 14, padding: '12px 24px', borderRadius: 11, cursor: 'pointer' }}
            >
              신체정보 입력하기
            </button>
          </div>
        )}
      </div>

      {/* 신체기록 차트 및 목록 */}
      {bodyHistory.length > 0 && (
        <div className="card" style={{ marginTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#0e1525' }}>신체기록</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {BODY_CHARTS.map(c => {
                const hasData = bodyHistory.some(h => h[c.key] != null);
                if (!hasData) return null;
                const active = activeChart === c.key;
                return (
                  <button key={c.key} onClick={() => setActiveChart(c.key)}
                    style={{ padding: '5px 12px', borderRadius: 16, border: active ? '1.5px solid #2f54ff' : '1px solid #eaecf2', cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', fontWeight: active ? 700 : 400, background: active ? '#ecf0ff' : '#fff', color: active ? '#2f54ff' : '#6b7385' }}>
                    {c.label}
                  </button>
                );
              })}
            </div>
          </div>

          {chartData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ top: 5, right: 8, left: -26, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f8" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9aa1b2' }} />
                <YAxis tick={{ fontSize: 10, fill: '#9aa1b2' }} />
                <Tooltip content={<LineTooltip unit={cfg.unit} />} />
                {cfg.ref.map(r => (
                  <ReferenceLine key={r} y={r} stroke={cfg.color} strokeDasharray="4 4" strokeOpacity={0.35} />
                ))}
                <Line type="monotone" dataKey={activeChart} stroke={cfg.color} strokeWidth={2.5}
                  dot={{ fill: cfg.color, r: 3, strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', color: '#c2c7d2', padding: '16px 0', fontSize: 13 }}>
              그래프를 보려면 2개 이상의 기록이 필요합니다.
            </div>
          )}

          <div style={{ marginTop: 14, borderTop: '1px solid #f1f3f8', paddingTop: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #eaecf2' }}>
                  {['날짜', 'BMI', '체중', ''].map(h => (
                    <th key={h} style={{ padding: '6px 3px', color: '#9aa1b2', fontWeight: 600, textAlign: h === '날짜' ? 'left' : 'center', fontSize: 11 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...bodyHistory].reverse().map((h, i) => (
                  <tr key={h.recordId} style={{ borderBottom: '1px solid #f7f8fb' }}>
                    <td style={{ padding: '9px 3px', fontWeight: i === 0 ? 600 : 400, fontSize: 11, color: '#0e1525' }}>{h.recordDate}</td>
                    <td style={{ textAlign: 'center', padding: '9px 3px' }}>
                      <span style={{ fontWeight: 600, color: '#2f54ff', fontFamily: "'Space Grotesk', sans-serif" }}>{h.bmi}</span>
                    </td>
                    <td style={{ textAlign: 'center', padding: '9px 3px', color: '#0e1525' }}>{h.weight}kg</td>
                    <td style={{ textAlign: 'center', padding: '6px 2px' }}>
                      <button onClick={() => openEditRecord(h)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '2px 3px', color: '#9aa1b2' }}>✏️</button>
                      <button onClick={() => { if (window.confirm('이 기록을 삭제하시겠습니까?')) deleteRecord(h.recordId); }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, padding: '2px 3px', color: '#c2c7d2' }}>🗑️</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 설정 모달 */}
      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(14,21,37,0.45)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setShowSettings(false)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: '20px 20px 0 0', padding: 24, width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#0e1525', marginBottom: 20 }}>설정</div>
            {settingsError && <div className="error-msg">{settingsError}</div>}

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

            <div className="form-group" style={{ marginTop: 14 }}>
              <label>운동 목표</label>
              <select value={goal} onChange={e => setGoal(e.target.value)}>
                <option value="근력_상승">💪 근력 상승</option>
                <option value="다이어트">🔥 다이어트</option>
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginTop: 16 }}>
              <button className="btn-primary" onClick={saveSettings}>저장</button>
              <button onClick={() => { AuthService.logout(); navigate('/login'); }}
                style={{ padding: '14px 20px', background: '#fdeced', color: '#c62828', border: 'none', borderRadius: 11, cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 신체기록 편집 모달 */}
      {editRecord && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(14,21,37,0.45)', zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setEditRecord(null)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 20, padding: 24, width: '100%', maxWidth: 400 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#0e1525' }}>기록 수정</div>
              <button onClick={() => setEditRecord(null)} style={{ background: 'none', border: 'none', fontSize: 22, color: '#c2c7d2', cursor: 'pointer' }}>×</button>
            </div>
            <div style={{ fontSize: 12, color: '#9aa1b2', marginBottom: 14 }}>{editRecord.recordDate}</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                { label: '신장 (cm)',    key: 'height',     placeholder: '175' },
                { label: '체중 (kg)',    key: 'weight',     placeholder: '70' },
                { label: '체지방률 (%)', key: 'bodyFat',    placeholder: '선택' },
                { label: '근력량 (kg)',  key: 'muscleMass', placeholder: '선택' },
              ].map(f => (
                <div key={f.key} className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: 11 }}>{f.label}</label>
                  <input type="number" step="0.1" placeholder={f.placeholder} value={editRecForm[f.key] ?? ''}
                    onChange={e => setEditRecForm(v => ({ ...v, [f.key]: e.target.value }))}
                    style={{ padding: '9px 12px', fontSize: 14 }} />
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button className="btn-primary" onClick={saveEditRecord}>저장</button>
              <button onClick={() => { if (window.confirm('이 기록을 삭제하시겠습니까?')) deleteRecord(editRecord.recordId); }}
                style={{ height: 50, background: '#fdeced', color: '#c62828', border: 'none', borderRadius: 11, cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit' }}>
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
