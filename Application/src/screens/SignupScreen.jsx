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
    <div style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      {/* Header */}
      <div className="header" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link to="/login" style={{ color: 'white', textDecoration: 'none', fontSize: 22, lineHeight: 1 }}>←</Link>
        <div>
          <h1>회원가입</h1>
          <p>WeFitAI와 함께 건강을 시작하세요</p>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>이름 <span style={{ color: '#e53935' }}>*</span></label>
            <input type="text" placeholder="이름을 입력하세요" value={form.name} onChange={update('name')} />
          </div>

          <div className="form-group">
            <label>아이디 <span style={{ color: '#e53935' }}>*</span></label>
            <input type="text" placeholder="영문+숫자, 4자 이상" value={form.userId} onChange={update('userId')} />
          </div>

          <div className="form-group">
            <label>비밀번호 <span style={{ color: '#e53935' }}>*</span></label>
            <input type="password" placeholder="6자 이상" value={form.password} onChange={update('password')} />
          </div>

          <div className="form-group">
            <label>비밀번호 확인 <span style={{ color: '#e53935' }}>*</span></label>
            <input type="password" placeholder="비밀번호를 다시 입력하세요" value={form.confirmPw} onChange={update('confirmPw')} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>생년월일</label>
              <input type="date" value={form.birthDate} max={new Date().toISOString().split('T')[0]} onChange={update('birthDate')} />
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>성별</label>
              <select value={form.gender} onChange={update('gender')}>
                <option value="MALE">남성</option>
                <option value="FEMALE">여성</option>
              </select>
            </div>
          </div>

          <div style={{ height: 20 }} />
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? '처리 중...' : '회원가입 완료'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16, color: '#9e9e9e', fontSize: 14 }}>
          이미 계정이 있으신가요?{' '}
          <Link to="/login" style={{ color: '#43a047', fontWeight: 600, textDecoration: 'none' }}>로그인</Link>
        </p>
      </div>
    </div>
  );
}
