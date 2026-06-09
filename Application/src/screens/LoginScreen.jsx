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
      background: 'linear-gradient(160deg, #1b5e20 0%, #43a047 45%, #e8f5e9 100%)',
    }}>
      {/* Logo */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 20px 24px' }}>
        <div style={{
          width: 88, height: 88,
          background: 'rgba(255,255,255,0.18)',
          borderRadius: 28,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 48,
          marginBottom: 16,
          backdropFilter: 'blur(4px)',
          border: '1.5px solid rgba(255,255,255,0.3)',
        }}>🏋️</div>
        <h1 style={{ fontSize: 36, fontWeight: 700, color: 'white', letterSpacing: -1 }}>WeFitAI</h1>
        <p style={{ color: 'rgba(255,255,255,0.82)', fontSize: 15, marginTop: 6 }}>
          AI 기반 맞춤형 운동처방 서비스
        </p>
      </div>

      {/* Card */}
      <div style={{
        background: 'white',
        borderRadius: '28px 28px 0 0',
        padding: '32px 24px 40px',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.12)',
      }}>
        <h2 style={{ fontSize: 22, fontWeight: 700, color: '#212121', marginBottom: 24 }}>로그인</h2>

        {error && <div className="error-msg">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>아이디</label>
            <input type="text" placeholder="아이디를 입력하세요" value={form.userId} onChange={update('userId')} />
          </div>
          <div className="form-group">
            <label>비밀번호</label>
            <input type="password" placeholder="비밀번호를 입력하세요" value={form.password} onChange={update('password')} />
          </div>
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, color: '#9e9e9e', fontSize: 14 }}>
          계정이 없으신가요?{' '}
          <Link to="/signup" style={{ color: '#43a047', fontWeight: 600, textDecoration: 'none' }}>
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
