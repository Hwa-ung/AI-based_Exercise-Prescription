import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService   from '../services/authService';
import exerciseDb    from '../data/exerciseDb.json';
import { getLyftaMedia } from '../data/lyftaCodes';
import BottomNav     from '../components/BottomNav';

// 부위 순서 및 이모지
const PART_META = {
  '가슴': { emoji: '🫁', color: '#1976d2', bg: '#e3f2fd' },
  '등':   { emoji: '🦾', color: '#2e7d32', bg: '#e8f5e9' },
  '하체': { emoji: '🦵', color: '#e65100', bg: '#fff3e0' },
  '어깨': { emoji: '🏋️', color: '#6a1b9a', bg: '#f3e5f5' },
  '팔':   { emoji: '💪', color: '#00838f', bg: '#e0f7fa' },
  '복근': { emoji: '🔥', color: '#c62828', bg: '#ffebee' },
};
const CATEGORIES = ['전체', ...Object.keys(PART_META)];

const LEVEL_COLOR = {
  '초급':     { color: '#2e7d32', bg: '#e8f5e9' },
  '초급~중급':{ color: '#1976d2', bg: '#e3f2fd' },
  '중급':     { color: '#1565c0', bg: '#e3f2fd' },
  '중급~고급':{ color: '#e65100', bg: '#fff3e0' },
  '고급':     { color: '#c62828', bg: '#ffebee' },
};

const EQUIP_LABEL = {
  '바벨': '🏋️바벨', '덤벨': '🪃덤벨', '머신': '⚙️머신',
  '케이블': '🔗케이블', '맨몸': '🤸맨몸', '케틀벨': '🫙케틀벨',
  '바벨/맨몸': '🏋️바벨+맨몸',
};

function ExerciseCard({ name, data }) {
  const [open,     setOpen]     = useState(false);
  const [vidError, setVidError] = useState(false);
  const media  = getLyftaMedia(name);
  const ytUrl  = `https://www.youtube.com/results?search_query=${encodeURIComponent(name + ' 운동 방법')}`;
  const meta   = PART_META[data.부위] || { emoji: '💪', color: '#43a047', bg: '#e8f5e9' };
  const lv     = LEVEL_COLOR[data.난이도] || { color: '#9e9e9e', bg: '#f5f5f5' };

  return (
    <div style={{
      background: 'white', borderRadius: 16, marginBottom: 10,
      overflow: 'hidden', boxShadow: '0 1px 8px rgba(0,0,0,0.07)',
    }}>
      {/* 카드 헤더 */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', cursor: 'pointer' }}
      >
        {/* 부위 아이콘 */}
        <div style={{
          width: 44, height: 44, borderRadius: 13, flexShrink: 0,
          background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>
          {meta.emoji}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#212121', marginBottom: 6 }}>{name}</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {/* 난이도 */}
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 8, background: lv.bg, color: lv.color }}>
              {data.난이도}
            </span>
            {/* 장비 */}
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: '#f5f5f5', color: '#555' }}>
              {EQUIP_LABEL[data.장비] || data.장비}
            </span>
            {/* 운동 유형 */}
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: '#f0f4ff', color: '#3949ab' }}>
              {data.운동_유형?.includes('복합') ? '복합' : '고립'}
            </span>
            {/* 영상 있음 표시 */}
            {media && (
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 8, background: '#e8f5e9', color: '#2e7d32' }}>
                ▶ 영상
              </span>
            )}
          </div>
        </div>

        <span style={{ fontSize: 13, color: '#bdbdbd', flexShrink: 0 }}>{open ? '▲' : '▼'}</span>
      </div>

      {/* 펼쳐진 상세 */}
      {open && (
        <div style={{ borderTop: '1px solid #f5f5f5', padding: '14px 16px 16px' }}
          onClick={e => e.stopPropagation()}>

          {/* 세부 근육 */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {data.세부_부위?.map(m => (
              <span key={m} style={{ fontSize: 11, padding: '3px 10px', background: meta.bg, color: meta.color, borderRadius: 10, fontWeight: 500 }}>
                {m}
              </span>
            ))}
          </div>

          {/* 동작 영상 */}
          {media && !vidError ? (
            <div style={{ borderRadius: 14, overflow: 'hidden', background: '#111', marginBottom: 10 }}>
              <video
                src={media.videoUrl}
                poster={media.thumbUrl}
                controls
                loop
                playsInline
                style={{ width: '100%', maxHeight: 230, display: 'block', objectFit: 'cover' }}
                onError={() => setVidError(true)}
              />
            </div>
          ) : (
            <a href={ytUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block', marginBottom: 10 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: '#fff8f8', border: '1px solid #ffcdd2', borderRadius: 12, padding: '11px 14px',
              }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FF0000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ color: 'white', fontSize: 15 }}>▶</span>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#212121' }}>{name} 운동 방법</div>
                  <div style={{ fontSize: 11, color: '#9e9e9e', marginTop: 1 }}>YouTube에서 검색 →</div>
                </div>
              </div>
            </a>
          )}

          {/* 처방 정보 행 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            {data.근력_상승?.추천 && (
              <div style={{ background: '#f1f8e9', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: '#33691e', fontWeight: 700, marginBottom: 4 }}>💪 근력 상승</div>
                <div style={{ fontSize: 12, color: '#558b2f' }}>{data.근력_상승.권장_세트}</div>
                <div style={{ fontSize: 11, color: '#9e9e9e', marginTop: 2 }}>휴식 {data.근력_상승.권장_휴식}</div>
              </div>
            )}
            {data.다이어트?.추천 && (
              <div style={{ background: '#fff8e1', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: '#e65100', fontWeight: 700, marginBottom: 4 }}>🔥 다이어트</div>
                <div style={{ fontSize: 12, color: '#bf360c' }}>{data.다이어트.권장_세트}</div>
                <div style={{ fontSize: 11, color: '#9e9e9e', marginTop: 2 }}>휴식 {data.다이어트.권장_휴식}</div>
              </div>
            )}
          </div>

          {/* 주의사항 */}
          {data.주의사항 && (
            <div style={{ background: '#fff3e0', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#e65100', lineHeight: 1.6 }}>
              ⚠️ {data.주의사항}
            </div>
          )}

          {media && !vidError && (
            <div style={{ fontSize: 10, color: '#bdbdbd', textAlign: 'right', marginTop: 6 }}>
              영상 출처: lyfta.app
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function LibraryScreen() {
  const navigate = useNavigate();
  const [category, setCategory] = useState('전체');
  const [search,   setSearch]   = useState('');

  const user = AuthService.getCurrentUser();
  if (!user) { navigate('/login'); return null; }

  // 카테고리별 운동 수
  const counts = useMemo(() => {
    const c = { '전체': 0 };
    Object.values(exerciseDb).forEach(d => {
      c['전체']++;
      c[d.부위] = (c[d.부위] || 0) + 1;
    });
    return c;
  }, []);

  // 필터링된 운동 목록
  const exercises = useMemo(() => {
    const q = search.trim();
    return Object.entries(exerciseDb).filter(([name, data]) => {
      const matchCat  = category === '전체' || data.부위 === category;
      const matchText = !q || name.includes(q) || data.세부_부위?.some(m => m.includes(q));
      return matchCat && matchText;
    });
  }, [category, search]);

  return (
    <div className="screen" style={{ background: '#f5f7fa' }}>
      {/* 헤더 */}
      <div className="header">
        <h1>운동 도감 📚</h1>
        <p>부위별 운동과 동작 영상을 확인하세요</p>
      </div>

      {/* 검색창 */}
      <div style={{ padding: '8px 16px 2px' }}>
        <input
          type="text"
          placeholder="운동 이름 또는 근육 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: '100%', padding: '11px 14px', borderRadius: 14,
            border: '1.5px solid #e0e0e0', fontSize: 14,
            fontFamily: 'Noto Sans KR, sans-serif', boxSizing: 'border-box',
            background: 'white', outline: 'none',
          }}
        />
      </div>

      {/* 카테고리 탭 */}
      <div style={{ display: 'flex', gap: 7, padding: '10px 16px 6px', overflowX: 'auto' }}>
        {CATEGORIES.map(cat => {
          const active = category === cat;
          const m = PART_META[cat];
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                flexShrink: 0, padding: '7px 14px', borderRadius: 20,
                border: active ? 'none' : '1.5px solid #e8e8e8',
                cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                fontWeight: active ? 700 : 400,
                background: active ? (m?.color || '#43a047') : 'white',
                color: active ? 'white' : '#555',
                transition: 'all 0.15s',
              }}
            >
              {m ? `${m.emoji} ` : ''}{cat}
              <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.8 }}>
                {counts[cat] || 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* 운동 목록 */}
      <div style={{ padding: '4px 16px 88px' }}>
        {exercises.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 0', color: '#bdbdbd' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🔍</div>
            <div style={{ fontSize: 15 }}>검색 결과가 없습니다</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: '#9e9e9e', marginBottom: 10 }}>
              {exercises.length}개 운동
            </div>
            {exercises.map(([name, data]) => (
              <ExerciseCard key={name} name={name} data={data} />
            ))}
          </>
        )}
      </div>

      <BottomNav active="library" />
    </div>
  );
}
