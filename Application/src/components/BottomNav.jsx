import React from 'react';
import { useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
  { id: 'body',    icon: '📏', label: '신체정보', path: '/body' },
  { id: 'workout', icon: '🤖', label: '운동처방', path: '/workout' },
  { id: 'home',    icon: '🏠', label: '홈',       path: '/',       highlight: true },
  { id: 'history', icon: '📅', label: '캘린더',   path: '/history' },
  { id: 'library', icon: '📚', label: '도감',     path: '/library' },
];

export default function BottomNav({ active }) {
  const navigate = useNavigate();

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480, background: 'white',
      borderTop: '1px solid #e8e8e8', display: 'flex',
      zIndex: 100, boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
    }}>
      {NAV_ITEMS.map(item => {
        const isActive = active === item.id;
        const isHome   = !!item.highlight;
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            style={{
              flex: 1, border: 'none', background: 'none',
              padding: isHome ? '4px 4px 12px' : '10px 4px 14px',
              cursor: 'pointer', display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: isHome ? 0 : 3,
              position: 'relative', transition: 'opacity 0.15s',
            }}
          >
            {!isHome && isActive && (
              <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 32, height: 3, background: '#43a047', borderRadius: '0 0 3px 3px',
              }} />
            )}

            {isHome ? (
              <div style={{
                width: 54, height: 54, borderRadius: '50%',
                background: isActive
                  ? '#2e7d32'
                  : 'linear-gradient(135deg, #43a047, #2e7d32)',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 -4px 14px rgba(67,160,71,0.45)',
                marginTop: -22, border: '3px solid white',
              }}>
                <span style={{ fontSize: 24, lineHeight: 1 }}>🏠</span>
              </div>
            ) : (
              <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
            )}

            <span style={{
              fontSize: 9, fontFamily: 'Noto Sans KR, sans-serif',
              color: isActive ? '#43a047' : (isHome ? '#43a047' : '#9e9e9e'),
              fontWeight: isActive || isHome ? 700 : 400,
              letterSpacing: -0.3, marginTop: isHome ? 3 : 0,
            }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
