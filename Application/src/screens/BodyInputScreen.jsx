import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService    from '../services/authService';
import StorageService from '../services/storageService';
import SyncService    from '../services/syncService';
import BodyAnalyzer   from '../services/bodyAnalyzer';
import BottomNav      from '../components/BottomNav';

const STATUS_CLASS = {
  정상: 'badge-normal', 저체중: 'badge-info', 부족: 'badge-info',
  경계: 'badge-warning', 과체중: 'badge-warning',
  과잉: 'badge-danger', 초과: 'badge-danger', 우수: 'badge-normal',
};

function limitDecimals(val) {
  if (!val) return val;
  const parts = String(val).split('.');
  if (parts.length > 1 && parts[1].length > 2) {
    return parts[0] + '.' + parts[1].slice(0, 2);
  }
  return val;
}

const BMI_RANGES = [
  { range: '< 18.5', label: '저체중' },
  { range: '18.5–23', label: '정상' },
  { range: '23–25', label: '과체중' },
  { range: '≥ 25', label: '비만' },
];

export default function BodyInputScreen() {
  const navigate = useNavigate();
  const [form,   setForm]   = useState({ height: '', weight: '', bodyFat: '', muscleMass: '' });
  const [result, setResult] = useState(null);
  const [error,  setError]  = useState('');
  const [saved,  setSaved]  = useState(false);
  const [gender, setGender] = useState('MALE');

  useEffect(() => {
    const u = AuthService.getCurrentUser();
    if (!u) { navigate('/login'); return; }
    const users = StorageService.get('wefit_users') || {};
    setGender(users[u.userId]?.gender || 'MALE');
  }, [navigate]);

  const update = (k) => (e) => {
    let v = e.target.value;
    if (k === 'height' || k === 'weight') v = limitDecimals(v);
    setForm(p => ({ ...p, [k]: v }));
    setResult(null);
    setSaved(false);
  };

  const handleAnalyze = () => {
    setError('');
    const h = parseFloat(form.height);
    const w = parseFloat(form.weight);
    if (!form.height || !form.weight)       { setError('신장과 체중은 필수 입력 항목입니다.'); return; }
    if (isNaN(h) || h < 100 || h > 250)    { setError('신장을 올바르게 입력하세요 (100~250 cm).'); return; }
    if (isNaN(w) || w < 20  || w > 300)    { setError('체중을 올바르게 입력하세요 (20~300 kg).'); return; }

    const analysis = BodyAnalyzer.analyze({
      height:     h,
      weight:     w,
      bodyFat:    form.bodyFat    ? parseFloat(form.bodyFat)    : null,
      muscleMass: form.muscleMass ? parseFloat(form.muscleMass) : null,
    }, gender);
    setResult(analysis);
    setSaved(false);
  };

  const handleSave = () => {
    const u = AuthService.getCurrentUser();
    if (!result || !u) return;
    const record = {
      recordId:          Date.now().toString(),
      height:            parseFloat(form.height),
      weight:            parseFloat(form.weight),
      bodyFat:           form.bodyFat    ? parseFloat(form.bodyFat)    : null,
      muscleMass:        form.muscleMass ? parseFloat(form.muscleMass) : null,
      bmi:               result.bmi,
      bmiStatus:         result.bmiStatus,
      bodyFatStatus:     result.bodyFatStatus,
      muscleMassStatus:  result.muscleMassStatus,
      analysisResult:    result.analysisResult,
      recordDate:        new Date().toISOString().split('T')[0],
    };
    const list = StorageService.get(`wefit_body_${u.userId}`) || [];
    list.push(record);
    StorageService.set(`wefit_body_${u.userId}`, list);
    SyncService.save(u.userId);
    setSaved(true);
    setTimeout(() => navigate('/'), 800);
  };

  return (
    <div className="screen">
      {/* 헤더 */}
      <div style={{ padding: '14px 22px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #eaecf2', background: '#fff', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: '#2f54ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: '#fff' }}>W</span>
        </div>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 17, letterSpacing: -0.5, color: '#0e1525' }}>WeFitAI</span>
        <span style={{ fontSize: 13, color: '#9aa1b2', marginLeft: 'auto' }}>신체정보 입력</span>
      </div>

      <div style={{ padding: '18px 22px 0' }}>
        {error && <div className="error-msg">{error}</div>}

        {/* 필수 입력 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>신장 (cm) <span style={{ color: '#2f54ff' }}>*</span></label>
            <input type="number" step="0.01" placeholder="예: 175" value={form.height} onChange={update('height')} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>체중 (kg) <span style={{ color: '#2f54ff' }}>*</span></label>
            <input type="number" step="0.01" placeholder="예: 70" value={form.weight} onChange={update('weight')} />
          </div>
        </div>

        {/* 선택 입력 */}
        <div style={{ fontSize: 12, color: '#9aa1b2', marginBottom: 9 }}>
          선택 입력 — 더 정밀한 분석 및 AI 처방에 활용됩니다
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>체지방률 %</label>
            <input type="number" step="0.1" placeholder="예: 20" value={form.bodyFat} onChange={update('bodyFat')} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>근력량 kg</label>
            <input type="number" step="0.1" placeholder="예: 30" value={form.muscleMass} onChange={update('muscleMass')} />
          </div>
        </div>

        <button className="btn-primary" onClick={handleAnalyze}>BMI 분석하기</button>
      </div>

      {/* 분석 결과 */}
      {result && (
        <div style={{ margin: '18px 16px 0', border: '1px solid #eaecf2', borderRadius: 14, padding: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 36, fontWeight: 700, letterSpacing: -1.5, color: '#0e1525', lineHeight: 0.9 }}>{result.bmi}</span>
              <span style={{ fontSize: 12, color: '#6b7385' }}>BMI</span>
            </div>
            {result.bmiStatus && (
              <span className={`badge ${STATUS_CLASS[result.bmiStatus] || 'badge-grey'}`}>{result.bmiStatus}</span>
            )}
          </div>

          {/* BMI 범위 탭 */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {BMI_RANGES.map(r => {
              const isActive = r.label === result.bmiStatus;
              return (
                <div key={r.label} style={{
                  flex: 1, fontSize: 10, textAlign: 'center', padding: '5px 0',
                  borderRadius: 7,
                  background: isActive ? '#2f54ff' : '#f7f8fb',
                  color: isActive ? '#fff' : '#9aa1b2',
                  fontWeight: isActive ? 700 : 400,
                }}>
                  {r.label}
                </div>
              );
            })}
          </div>

          {/* 체지방/근력량 */}
          {(result.bodyFatStatus || result.muscleMassStatus) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginBottom: 14 }}>
              {result.bodyFatStatus && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f7f8fb', borderRadius: 10 }}>
                  <span style={{ fontSize: 13, color: '#6b7385' }}>체지방</span>
                  <span className={`badge ${STATUS_CLASS[result.bodyFatStatus] || 'badge-grey'}`}>{result.bodyFatStatus}</span>
                </div>
              )}
              {result.muscleMassStatus && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f7f8fb', borderRadius: 10 }}>
                  <span style={{ fontSize: 13, color: '#6b7385' }}>근력량</span>
                  <span className={`badge ${STATUS_CLASS[result.muscleMassStatus] || 'badge-grey'}`}>{result.muscleMassStatus}</span>
                </div>
              )}
            </div>
          )}

          <div style={{ background: '#f7f8fb', borderRadius: 11, padding: '12px 14px', fontSize: 13, color: '#4a5163', lineHeight: 1.6, marginBottom: 14 }}>
            {result.analysisResult}
          </div>

          {saved
            ? <div className="success-msg">✅ 신체정보가 저장되었습니다!</div>
            : <button className="btn-primary" onClick={handleSave}>기록 저장하기</button>
          }
        </div>
      )}

      <BottomNav active="body" />
    </div>
  );
}
