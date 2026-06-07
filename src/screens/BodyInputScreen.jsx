import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService    from '../services/authService';
import StorageService from '../services/storageService';
import BodyAnalyzer   from '../services/bodyAnalyzer';
import BottomNav      from '../components/BottomNav';

const STATUS_CLASS = {
  정상: 'badge-normal', 저체중: 'badge-info',
  경계: 'badge-warning', 과체중: 'badge-warning',
  과잉: 'badge-danger', 초과: 'badge-danger',
};

export default function BodyInputScreen() {
  const navigate = useNavigate();
  const [form,   setForm]   = useState({ height: '', weight: '', bodyFat: '', waist: '', grip: '' });
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
    setForm(p => ({ ...p, [k]: e.target.value }));
    setResult(null);
    setSaved(false);
  };

  const handleAnalyze = () => {
    setError('');
    const h = parseFloat(form.height);
    const w = parseFloat(form.weight);
    if (!form.height || !form.weight)        { setError('신장과 체중은 필수 입력 항목입니다.'); return; }
    if (isNaN(h) || h < 100 || h > 250)     { setError('신장을 올바르게 입력하세요 (100~250 cm).'); return; }
    if (isNaN(w) || w < 20  || w > 300)     { setError('체중을 올바르게 입력하세요 (20~300 kg).'); return; }

    const analysis = BodyAnalyzer.analyze({
      height:  h,
      weight:  w,
      bodyFat: form.bodyFat ? parseFloat(form.bodyFat) : null,
      waist:   form.waist   ? parseFloat(form.waist)   : null,
      grip:    form.grip    ? parseFloat(form.grip)     : null,
    }, gender);
    setResult(analysis);
    setSaved(false);
  };

  const handleSave = () => {
    const u = AuthService.getCurrentUser();
    if (!result || !u) return;
    const record = {
      recordId:      Date.now().toString(),
      height:        parseFloat(form.height),
      weight:        parseFloat(form.weight),
      bodyFat:       form.bodyFat ? parseFloat(form.bodyFat) : null,
      waist:         form.waist   ? parseFloat(form.waist)   : null,
      grip:          form.grip    ? parseFloat(form.grip)    : null,
      bmi:           result.bmi,
      bmiStatus:     result.bmiStatus,
      bodyFatStatus: result.bodyFatStatus,
      waistStatus:   result.waistStatus,
      gripStatus:    result.gripStatus,
      analysisResult: result.analysisResult,
      recordDate:    new Date().toISOString().split('T')[0],
    };
    const list = StorageService.get(`wefit_body_${u.userId}`) || [];
    list.push(record);
    StorageService.set(`wefit_body_${u.userId}`, list);
    setSaved(true);
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
            <input type="number" step="0.1" placeholder="예: 175" value={form.height} onChange={update('height')} style={{ padding: '10px 12px', fontSize: 14 }} />
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: 12 }}>체중 (kg) <span style={{ color: '#e53935' }}>*</span></label>
            <input type="number" step="0.1" placeholder="예: 70" value={form.weight} onChange={update('weight')} style={{ padding: '10px 12px', fontSize: 14 }} />
          </div>
        </div>

        {/* 선택 입력 */}
        <div style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 12, color: '#9e9e9e', marginBottom: 8 }}>선택 입력 — 더 정밀한 분석에 활용됩니다</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 12 }}>체지방률 (%)</label>
              <input type="number" step="0.1" placeholder="예: 20" value={form.bodyFat} onChange={update('bodyFat')} style={{ padding: '10px 12px', fontSize: 14 }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 12 }}>허리둘레 (cm)</label>
              <input type="number" step="0.1" placeholder="예: 80" value={form.waist} onChange={update('waist')} style={{ padding: '10px 12px', fontSize: 14 }} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: 12 }}>악력 (kg)</label>
              <input type="number" step="0.1" placeholder="예: 35" value={form.grip} onChange={update('grip')} style={{ padding: '10px 12px', fontSize: 14 }} />
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

          {/* BMI 대형 표시 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div style={{ background: '#f9f9f9', borderRadius: 14, padding: '18px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 700, color: '#43a047', letterSpacing: -1 }}>{result.bmi}</div>
              <div style={{ fontSize: 13, color: '#9e9e9e', marginTop: 2 }}>BMI</div>
              <span className={`badge ${STATUS_CLASS[result.bmiStatus] || 'badge-grey'}`} style={{ marginTop: 6, display: 'inline-block' }}>
                {result.bmiStatus}
              </span>
            </div>

            {/* 세부 지표 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                { label: '체지방', status: result.bodyFatStatus },
                { label: '허리둘레', status: result.waistStatus },
                { label: '악력',   status: result.gripStatus },
              ].map(({ label, status }) => status && (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f9f9f9', borderRadius: 10 }}>
                  <span style={{ fontSize: 13, color: '#555' }}>{label}</span>
                  <span className={`badge ${STATUS_CLASS[status] || 'badge-grey'}`}>{status}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 분석 메시지 */}
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
            ? <div className="success-msg">✅ 신체정보가 저장되었습니다! 히스토리에서 변화를 확인하세요.</div>
            : <button className="btn-primary" onClick={handleSave}>기록 저장하기</button>
          }
        </div>
      )}

      <BottomNav active="body" />
    </div>
  );
}
