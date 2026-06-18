import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthService from '../services/authService';

export default function SignupScreen() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    userId: '', password: '', confirmPw: '',
    name: '', birthDate: '', gender: 'MALE',
  });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name || !form.userId || !form.password) { setError('필수 항목을 모두 입력하세요.'); return; }
    if (form.userId.length < 4)                       { setError('아이디는 4자 이상이어야 합니다.'); return; }
    if (form.password.length < 6)                     { setError('비밀번호는 6자 이상이어야 합니다.'); return; }
    if (form.password !== form.confirmPw)              { setError('비밀번호가 일치하지 않습니다.'); return; }
    if (form.birthDate) {
      const bd  = new Date(form.birthDate);
      const now = new Date(); now.setHours(0, 0, 0, 0);
      if (isNaN(bd.getTime()))                         { setError('올바른 생년월일을 입력해주세요.'); return; }
      if (bd > now)                                    { setError('생년월일은 오늘 이후일 수 없습니다.'); return; }
      if (bd.getFullYear() < now.getFullYear() - 120)  { setError('올바른 생년월일을 입력해주세요.'); return; }
    }
    setLoading(true);
    try {
      await AuthService.register(form);
      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 22px 10px' }}>
        <Link to="/login" style={{
          width: 34, height: 34, borderRadius: 10,
          border: '1px solid #eaecf2', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: '#6b7385', textDecoration: 'none', fontSize: 18, lineHeight: 1,
        }}>←</Link>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, color: '#0e1525' }}>회원가입</div>
      </div>

      <div style={{ flex: 1, padding: '6px 22px 40px', overflowY: 'auto' }}>
        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>이름 <span style={{ color: '#2f54ff' }}>*</span></label>
            <input type="text" placeholder="이름을 입력하세요" value={form.name} onChange={update('name')} />
          </div>

          <div className="form-group">
            <label>아이디 <span style={{ color: '#2f54ff' }}>*</span></label>
            <input type="text" placeholder="영문+숫자, 4자 이상" value={form.userId} onChange={update('userId')} autoComplete="username" />
          </div>

          <div className="form-group">
            <label>비밀번호 <span style={{ color: '#2f54ff' }}>*</span></label>
            <input type="password" placeholder="6자 이상" value={form.password} onChange={update('password')} autoComplete="new-password" />
          </div>

          <div className="form-group">
            <label>비밀번호 확인 <span style={{ color: '#2f54ff' }}>*</span></label>
            <input type="password" placeholder="비밀번호를 다시 입력하세요" value={form.confirmPw} onChange={update('confirmPw')} autoComplete="new-password" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>생년월일</label>
              <input type="date" value={form.birthDate} max={new Date().toISOString().split('T')[0]} onChange={update('birthDate')} />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7385', marginBottom: 7 }}>성별</div>
              <div style={{ display: 'flex', gap: 6, height: 48 }}>
                {[{ val: 'MALE', label: '남성' }, { val: 'FEMALE', label: '여성' }].map(({ val, label }) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, gender: val }))}
                    style={{
                      flex: 1, border: form.gender === val ? '1.5px solid #2f54ff' : '1px solid #eaecf2',
                      borderRadius: 11, background: form.gender === val ? '#ecf0ff' : '#fff',
                      color: form.gender === val ? '#2f54ff' : '#9aa1b2',
                      fontSize: 14, fontWeight: form.gender === val ? 700 : 400,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? '처리 중...' : '회원가입 완료'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#9aa1b2' }}>
          이미 계정이 있으신가요?{' '}
          <Link to="/login" style={{ color: '#2f54ff', fontWeight: 700, textDecoration: 'none' }}>로그인</Link>
        </div>
      </div>
    </div>
  );
}
