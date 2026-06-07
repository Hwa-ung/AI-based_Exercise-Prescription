import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService   from '../services/authService';
import StorageService from '../services/storageService';
import BottomNav     from '../components/BottomNav';

function BMIGauge({ bmi }) {
  const MIN = 15, MAX = 35;
  const pct = Math.min(100, Math.max(0, ((bmi - MIN) / (MAX - MIN)) * 100));
  const color = bmi < 18.5 ? '#42a5f5' : bmi < 23 ? '#66bb6a' : bmi < 25 ? '#ffa726' : '#ef5350';
  return (
    <div style={{ position: 'relative', height: 8, background: '#f0f0f0', borderRadius: 4, marginTop: 8 }}>
      <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${pct}%`, background: color, borderRadius: 4, transition: 'width 0.5s ease' }} />
      <div style={{ position: 'absolute', top: -4, left: `${pct}%`, transform: 'translateX(-50%)', width: 16, height: 16, background: color, borderRadius: '50%', border: '2px solid white', boxShadow: '0 1px 4px rgba(0,0,0,0.2)' }} />
    </div>
  );
}

export default function HomeScreen() {
  const navigate = useNavigate();
  const [user,          setUser]          = useState(null);
  const [latestBody,    setLatestBody]    = useState(null);
  const [latestWorkout, setLatestWorkout] = useState(null);
  const [showSettings,  setShowSettings]  = useState(false);
  const [apiKey,        setApiKey]        = useState('');
  const [goal,          setGoal]          = useState('근력_상승');
  const [profileForm,   setProfileForm]   = useState({ name: '', birthDate: '', gender: 'MALE' });

  const loadData = () => {
    const u = AuthService.getCurrentUser();
    if (!u) { navigate('/login'); return; }
    setUser(u);
    setProfileForm({ name: u.name || '', birthDate: u.birthDate || '', gender: u.gender || 'MALE' });

    const bodyList = StorageService.get(`wefit_body_${u.userId}`) || [];
    if (bodyList.length) setLatestBody(bodyList[bodyList.length - 1]);

    const workoutList = StorageService.get(`wefit_workout_${u.userId}`) || [];
    if (workoutList.length) setLatestWorkout(workoutList[workoutList.length - 1]);

    const savedKey  = StorageService.get('gemini_api_key');
    const savedGoal = StorageService.get(`wefit_goal_${u.userId}`);
    if (savedKey)  setApiKey(savedKey);
    if (savedGoal) setGoal(savedGoal);
  };

  useEffect(() => { loadData(); }, []);

  const saveSettings = () => {
    StorageService.set('gemini_api_key', apiKey.trim());
    StorageService.set(`wefit_goal_${user.userId}`, goal);
    try { AuthService.updateProfile({ userId: user.userId, ...profileForm }); }
    catch { /* ignore */ }
    setShowSettings(false);
    loadData();
  };

  const getBMIClass = (s) => {
    if (s === '정상') return 'badge-normal';
    if (s === '저체중') return 'badge-info';
    if (s === '과체중') return 'badge-warning';
    return 'badge-danger';
  };

  const workoutDays = latestWorkout
    ? Object.values(latestWorkout.weeklyRoutine || {}).filter(d => d.exercises?.length > 0 || d.cardio).length
    : 0;

  return (
    <div className="screen" style={{ background: '#f5f7fa' }}>
      {/* Header */}
      <div className="header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>WeFitAI 🏋️</h1>
          <p>안녕하세요, {user?.name || user?.userId}님!</p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 20, padding: '7px 13px', color: 'white', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
        >
          ⚙️ 설정
        </button>
      </div>

      {/* BMI Card */}
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
          <div style={{ marginTop: 14, fontSize: 13, color: '#557, lineHeight: 1.6' }}>
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

      {/* Quick Action Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, margin: '0 16px' }}>
        {[
          { icon: '📏', title: '신체정보 입력', sub: 'BMI · 체지방 분석', path: '/body',    bg: 'linear-gradient(135deg, #43a047, #2e7d32)' },
          { icon: '🤖', title: 'AI 운동 처방', sub: '맞춤형 주간 루틴',  path: '/workout', bg: 'linear-gradient(135deg, #1976d2, #0d47a1)' },
        ].map(btn => (
          <button
            key={btn.path}
            onClick={() => navigate(btn.path)}
            style={{ background: btn.bg, color: 'white', border: 'none', borderRadius: 16, padding: '20px 14px', cursor: 'pointer', textAlign: 'center', fontFamily: 'inherit' }}
          >
            <div style={{ fontSize: 30, marginBottom: 6 }}>{btn.icon}</div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>{btn.title}</div>
            <div style={{ fontSize: 11, opacity: 0.82, marginTop: 3 }}>{btn.sub}</div>
          </button>
        ))}
      </div>

      {/* Latest Workout Preview */}
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
            onClick={() => navigate('/workout')}
            style={{ marginTop: 12, width: '100%', padding: '11px', background: '#e8f5e9', color: '#2e7d32', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit' }}
          >
            오늘의 루틴 보기 →
          </button>
        </div>
      )}

      {/* Stats row */}
      {latestBody && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, margin: '0 16px 8px' }}>
          {[
            { label: '체지방', value: latestBody.bodyFat ? `${latestBody.bodyFat}%` : '-', status: latestBody.bodyFatStatus },
            { label: '허리둘레', value: latestBody.waist ? `${latestBody.waist}cm` : '-', status: latestBody.waistStatus },
            { label: '악력', value: latestBody.grip ? `${latestBody.grip}kg` : '-', status: latestBody.gripStatus },
          ].map(({ label, value, status }) => (
            <div key={label} style={{ background: 'white', borderRadius: 12, padding: '12px 8px', textAlign: 'center', boxShadow: '0 1px 6px rgba(0,0,0,0.06)' }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{value}</div>
              <div style={{ fontSize: 11, color: '#9e9e9e', marginTop: 2 }}>{label}</div>
              {status && <span className={`badge ${status === '정상' ? 'badge-normal' : status === '경계' || status === '초과' ? 'badge-warning' : 'badge-grey'}`} style={{ marginTop: 4, fontSize: 10 }}>{status}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Settings Modal */}
      {showSettings && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
          onClick={() => setShowSettings(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: 'white', borderRadius: '24px 24px 0 0', padding: 24, width: '100%', maxWidth: 480, maxHeight: '80vh', overflowY: 'auto' }}
          >
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>⚙️ 설정</h3>

            <div className="form-group">
              <label>이름</label>
              <input type="text" value={profileForm.name} onChange={e => setProfileForm(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>생년월일</label>
                <input type="date" value={profileForm.birthDate} onChange={e => setProfileForm(p => ({ ...p, birthDate: e.target.value }))} />
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

            <div className="form-group">
              <label>
                Google Gemini API Key{' '}
                <span style={{ fontSize: 11, color: '#9e9e9e', fontWeight: 400 }}>(없으면 예시 처방 사용)</span>
              </label>
              {import.meta.env.VITE_GEMINI_API_KEY?.trim() ? (
                <p style={{ fontSize: 12, color: '#2e7d32', margin: '6px 0 0', padding: '10px 12px', background: '#f1f8e9', borderRadius: 8 }}>
                  🔑 .env 파일의 키가 적용 중입니다. 아래 입력란은 사용되지 않습니다.
                </p>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="AIza..."
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    style={{ fontFamily: 'monospace', fontSize: 13 }}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  {apiKey && !apiKey.trim().startsWith('AIza') && (
                    <p style={{ fontSize: 12, color: '#e65100', marginTop: 4 }}>
                      ⚠️ Gemini API 키는 <b>AIza</b>로 시작해야 합니다. <b>aistudio.google.com</b>에서 무료 발급하세요.
                    </p>
                  )}
                  {apiKey && apiKey.trim().startsWith('AIza') && (
                    <p style={{ fontSize: 12, color: '#2e7d32', marginTop: 4 }}>
                      ✅ 형식 확인 완료 — 저장 후 AI 처방이 활성화됩니다.
                    </p>
                  )}
                  {!apiKey && (
                    <p style={{ fontSize: 11, color: '#bdbdbd', marginTop: 4 }}>
                      aistudio.google.com → Get API key → 무료 발급 · 키는 브라우저 로컬에만 저장됩니다.
                    </p>
                  )}
                </>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10 }}>
              <button className="btn-primary" onClick={saveSettings}>저장</button>
              <button
                onClick={() => { AuthService.logout(); navigate('/login'); }}
                style={{ padding: '14px 20px', background: '#ffebee', color: '#c62828', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 14, fontWeight: 600, fontFamily: 'inherit', whiteSpace: 'nowrap' }}
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav active="home" />
    </div>
  );
}
