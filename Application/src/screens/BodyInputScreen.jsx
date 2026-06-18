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

// 소수점 2자리 이하 입력 방지
function limitDecimals(val) {
  if (!val) return val;
  const parts = String(val).split('.');
  if (parts.length > 1 && parts[1].length > 2) {
    return parts[0] + '.' + parts[1].slice(0, 2);
  }
  return val;
}

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
      <div className="header">
        <h1>신체정보 입력 📏</h1>
        <p>정확한 신체정보로 맞춤 분석을 받으세요</p>
      </div>

      <div className="card">
        {error && <div className="error-msg">{error}</div>}

        {/* 필수 입력 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 12 }}>신장 (cm) <span style={{ color: '#e53935' }}>*</span></label>
            <input
              type="number" step="0.01" placeholder="예: 175.00"
              value={form.height} onChange={update('height')}
              style={{ padding: '10px 12px', fontSize: 14 }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 12 }}>체중 (kg) <span style={{ color: '#e53935' }}>*</span></label>
            <input
              type="number" step="0.01" placeholder="예: 70.00"
              value={form.weight} onChange={update('weight')}
              style={{ padding: '10px 12px', fontSize: 14 }}
            />
          </div>
        </div>

        {/* 선택 입력 */}
        <div style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 12, color: '#9e9e9e', marginBottom: 8 }}>선택 입력 — 더 정밀한 분석 및 AI 처방에 활용됩니다</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 12 }}>체지방률 (%)</label>
              <input type="number" step="0.1" placeholder="예: 20" value={form.bodyFat} onChange={update('bodyFat')} style={{ padding: '10px 12px', fontSize: 14 }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 12 }}>근력량 (kg)</label>
              <input type="number" step="0.1" placeholder="예: 30" value={form.muscleMass} onChange={update('muscleMass')} style={{ padding: '10px 12px', fontSize: 14 }} />
            </div>
          </div>
        </div>

        <div style={{ height: 16 }} />
        <button className="btn-primary" onClick={handleAnalyze}>BMI 분석하기</button>
      </div>

      {/* 분석 결과 */}
      {result && (
        <div className="card" style={{ borderLeft: '4px solid #43a047' }}>
          <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>📊 신체 분석 결과</h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ background: '#f9f9f9', borderRadius: 14, padding: '18px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#43a047', letterSpacing: -1 }}>{result.bmi}</div>
              <div style={{ fontSize: 13, color: '#9e9e9e', marginTop: 2 }}>BMI</div>
              <span className={`badge ${STATUS_CLASS[result.bmiStatus] || 'badge-grey'}`} style={{ marginTop: 6, display: 'inline-block' }}>
                {result.bmiStatus}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                { label: '체지방', status: result.bodyFatStatus },
                { label: '근력량', status: result.muscleMassStatus },
              ].map(({ label, status }) => status && (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f9f9f9', borderRadius: 10 }}>
                  <span style={{ fontSize: 13, color: '#555' }}>{label}</span>
                  <span className={`badge ${STATUS_CLASS[status] || 'badge-grey'}`}>{status}</span>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#f1f8e9', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 14, color: '#33691e', lineHeight: 1.65 }}>
            💡 {result.analysisResult}
          </div>

          {/* BMI 기준 안내 */}
          <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
            {[['< 18.5', '저체중', '#42a5f5'], ['18.5–23', '정상', '#66bb6a'], ['23–25', '과체중', '#ffa726'], ['≥ 25', '비만', '#ef5350']].map(([range, label, color]) => (
              <div key={label} style={{ fontSize: 10, background: `${color}22`, color, padding: '3px 8px', borderRadius: 10, fontWeight: 500 }}>
                {range} {label}
              </div>
            ))}
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
