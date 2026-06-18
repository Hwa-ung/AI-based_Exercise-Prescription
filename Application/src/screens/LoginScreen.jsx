import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import AuthService from '../services/authService';

export default function LoginScreen() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ userId: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const update = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.userId || !form.password) { setError('아이디와 비밀번호를 입력하세요.'); return; }
    setLoading(true);
    try {
      await AuthService.login(form);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      background: '#fff',
      padding: '0 28px',
    }}>
      {/* Logo area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 64 }}>
        <div style={{
          width: 60, height: 60, borderRadius: 16,
          background: '#2f54ff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 10px 24px rgba(47,84,255,0.30)',
        }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 30, color: '#fff', lineHeight: 1 }}>W</span>
        </div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 32, fontWeight: 700, letterSpacing: -1, color: '#0e1525', marginTop: 24 }}>
          WeFitAI
        </div>
        <div style={{ fontSize: 15, color: '#6b7385', marginTop: 8, lineHeight: 1.55 }}>
          데이터로 만들어지는<br />맞춤형 운동 처방.
        </div>
      </div>

      {/* Form area */}
      <div style={{ paddingBottom: 48 }}>
        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>아이디</label>
            <input type="text" placeholder="아이디를 입력하세요" value={form.userId} onChange={update('userId')} autoComplete="username" />
          </div>
          <div className="form-group" style={{ marginBottom: 22 }}>
            <label>비밀번호</label>
            <input type="password" placeholder="비밀번호를 입력하세요" value={form.password} onChange={update('password')} autoComplete="current-password" />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: '#9aa1b2' }}>
          계정이 없으신가요?{' '}
          <Link to="/signup" style={{ color: '#2f54ff', fontWeight: 700, textDecoration: 'none' }}>회원가입</Link>
        </div>
      </div>
    </div>
  );
}
