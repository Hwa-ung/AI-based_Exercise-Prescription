import React from 'react';
import { useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
  { id: 'home',    icon: '🏠', label: '홈',      path: '/' },
  { id: 'body',    icon: '📏', label: '신체정보', path: '/body' },
  { id: 'workout', icon: '🤖', label: '운동처방', path: '/workout' },
  { id: 'library', icon: '📚', label: '도감',     path: '/library' },
  { id: 'history', icon: '📈', label: '히스토리', path: '/history' },
];

export default function BottomNav({ active }) {
  const navigate = useNavigate();

  return (
    <nav style={{
      position: 'fixed',
      bottom: 0,
      left: '50%',
      transform: 'translateX(-50%)',
      width: '100%',
      maxWidth: 480,
      background: 'white',
      borderTop: '1px solid #e8e8e8',
      display: 'flex',
      zIndex: 100,
      boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
    }}>
      {NAV_ITEMS.map(item => {
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            style={{
              flex: 1,
              border: 'none',
              background: 'none',
              padding: '10px 4px 14px',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              position: 'relative',
              transition: 'opacity 0.15s',
            }}
          >
            {isActive && (
              <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 32, height: 3, background: '#43a047', borderRadius: '0 0 3px 3px',
              }} />
            )}
            <span style={{ fontSize: 20, lineHeight: 1 }}>{item.icon}</span>
            <span style={{
              fontSize: 9,
              fontFamily: 'Noto Sans KR, sans-serif',
              color: isActive ? '#43a047' : '#9e9e9e',
              fontWeight: isActive ? 700 : 400,
              letterSpacing: -0.3,
            }}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
