import React from 'react';
import { useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
  { id: 'home',    label: '홈',     path: '/' },
  { id: 'body',    label: '신체',   path: '/body' },
  { id: 'workout', label: '처방',   path: '/workout' },
  { id: 'history', label: '캘린더', path: '/history' },
  { id: 'library', label: '도감',   path: '/library' },
];

export default function BottomNav({ active }) {
  const navigate = useNavigate();

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 480, background: '#fff',
      borderTop: '1px solid #eaecf2', display: 'flex',
      zIndex: 100,
    }}>
      {NAV_ITEMS.map(item => {
        const isActive = active === item.id;
        return (
          <button
            key={item.id}
            onClick={() => navigate(item.path)}
            style={{
              flex: 1, border: 'none', background: 'none',
              padding: '10px 4px 13px',
              cursor: 'pointer',
              fontFamily: "'Pretendard Variable', Pretendard, sans-serif",
              fontSize: 11,
              fontWeight: isActive ? 700 : 500,
              color: isActive ? '#2f54ff' : '#9aa1b2',
              letterSpacing: -0.3,
            }}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
