import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthService   from '../services/authService';
import exerciseDb    from '../data/exerciseDb.json';
import { getLyftaMedia } from '../data/lyftaCodes';
import BottomNav     from '../components/BottomNav';

const PART_META = {
  '가슴': { img: '/img_body/chest.png',    color: '#2f54ff', bg: '#ecf0ff' },
  '등':   { img: '/img_body/back.png',     color: '#2e7d32', bg: '#e8f5e9' },
  '하체': { img: '/img_body/training.png', color: '#e65100', bg: '#fff3e0' },
  '어깨': { img: '/img_body/shoulder.png', color: '#6a1b9a', bg: '#f3e5f5' },
  '팔':   { img: '/img_body/biceps.png',   color: '#00838f', bg: '#e0f7fa' },
  '복근': { img: '/img_body/human.png',    color: '#c62828', bg: '#ffebee' },
};
const CATEGORIES = ['전체', ...Object.keys(PART_META)];

const LEVEL_COLOR = {
  '초급':      { color: '#2f54ff', bg: '#ecf0ff' },
  '초급~중급': { color: '#2f54ff', bg: '#ecf0ff' },
  '중급':      { color: '#1565c0', bg: '#e3f2fd' },
  '중급~고급': { color: '#e65100', bg: '#fff3e0' },
  '고급':      { color: '#c62828', bg: '#ffebee' },
};

const EQUIP_LABEL = {
  '바벨': '바벨', '덤벨': '덤벨', '머신': '머신',
  '케이블': '케이블', '맨몸': '맨몸', '케틀벨': '케틀벨',
  '바벨/맨몸': '바벨+맨몸',
};

function ExerciseCard({ name, data }) {
  const [open,     setOpen]     = useState(false);
  const [vidError, setVidError] = useState(false);
  const media  = getLyftaMedia(name);
  const ytUrl  = `https://www.youtube.com/results?search_query=${encodeURIComponent(name + ' 운동 방법')}`;
  const meta   = PART_META[data.부위] || { color: '#2f54ff', bg: '#ecf0ff' };
  const lv     = LEVEL_COLOR[data.난이도] || { color: '#9aa1b2', bg: '#f7f8fb' };

  return (
    <div style={{ border: '1px solid #eaecf2', borderRadius: 14, marginBottom: 10, overflow: 'hidden', background: '#fff' }}>
      {/* 카드 헤더 */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{ display: 'flex', alignItems: 'center', gap: 13, padding: '15px 16px', cursor: 'pointer' }}
      >
        <div style={{
          width: 42, height: 42, borderRadius: 11, flexShrink: 0,
          background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        }}>
          {meta.img
            ? <img src={meta.img} alt={data.부위} style={{ width: 26, height: 26, objectFit: 'contain' }} />
            : <div style={{ width: 16, height: 16, borderRadius: 5, background: meta.color }} />
          }
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0e1525', marginBottom: 6 }}>{name}</div>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 7, background: '#ecf0ff', color: '#2f54ff' }}>
              {data.부위}
            </span>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 7, background: '#f7f8fb', color: '#6b7385' }}>
              {EQUIP_LABEL[data.장비] || data.장비}
            </span>
            <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 7, background: lv.bg, color: lv.color }}>
              {data.난이도}
            </span>
            {media && (
              <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 7, background: '#ecf0ff', color: '#2f54ff' }}>
                ▶ 영상
              </span>
            )}
          </div>
        </div>

        <span style={{ fontSize: 13, color: '#c2c7d2', flexShrink: 0 }}>›</span>
      </div>

      {/* 펼쳐진 상세 */}
      {open && (
        <div style={{ borderTop: '1px solid #f1f3f8', padding: '14px 16px 16px' }}
          onClick={e => e.stopPropagation()}>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
            {data.세부_부위?.map(m => (
              <span key={m} style={{ fontSize: 11, padding: '3px 10px', background: meta.bg, color: meta.color, borderRadius: 10, fontWeight: 500 }}>
                {m}
              </span>
            ))}
          </div>

          {media && !vidError ? (
            <div style={{ borderRadius: 14, overflow: 'hidden', background: '#111', marginBottom: 10 }}>
              <video
                src={media.videoUrl}
                poster={media.thumbUrl}
                autoPlay muted controls loop playsInline
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
                  <span style={{ color: '#fff', fontSize: 15 }}>▶</span>
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0e1525' }}>{name} 운동 방법</div>
                  <div style={{ fontSize: 11, color: '#9aa1b2', marginTop: 1 }}>YouTube에서 검색 →</div>
                </div>
              </div>
            </a>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            {data.근력_상승?.추천 && (
              <div style={{ background: '#ecf0ff', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: '#2f54ff', fontWeight: 700, marginBottom: 4 }}>💪 근력 상승</div>
                <div style={{ fontSize: 12, color: '#1d3fc0' }}>{data.근력_상승.권장_세트}</div>
                <div style={{ fontSize: 11, color: '#9aa1b2', marginTop: 2 }}>휴식 {data.근력_상승.권장_휴식}</div>
              </div>
            )}
            {data.다이어트?.추천 && (
              <div style={{ background: '#fff8e1', borderRadius: 10, padding: '10px 12px' }}>
                <div style={{ fontSize: 11, color: '#e65100', fontWeight: 700, marginBottom: 4 }}>🔥 다이어트</div>
                <div style={{ fontSize: 12, color: '#bf360c' }}>{data.다이어트.권장_세트}</div>
                <div style={{ fontSize: 11, color: '#9aa1b2', marginTop: 2 }}>휴식 {data.다이어트.권장_휴식}</div>
              </div>
            )}
          </div>

          {data.주의사항 && (
            <div style={{ background: '#fff8e1', borderRadius: 10, padding: '10px 12px', fontSize: 12, color: '#e65100', lineHeight: 1.6 }}>
              ⚠️ {data.주의사항}
            </div>
          )}

          {media && !vidError && (
            <div style={{ fontSize: 10, color: '#c2c7d2', textAlign: 'right', marginTop: 6 }}>
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

  const counts = useMemo(() => {
    const c = { '전체': 0 };
    Object.values(exerciseDb).forEach(d => {
      c['전체']++;
      c[d.부위] = (c[d.부위] || 0) + 1;
    });
    return c;
  }, []);

  const exercises = useMemo(() => {
    const q = search.trim();
    return Object.entries(exerciseDb).filter(([name, data]) => {
      const matchCat  = category === '전체' || data.부위 === category;
      const matchText = !q || name.includes(q) || data.세부_부위?.some(m => m.includes(q));
      return matchCat && matchText;
    });
  }, [category, search]);

  return (
    <div className="screen">
      {/* 헤더 */}
      <div style={{ padding: '14px 22px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #eaecf2', background: '#fff', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ width: 26, height: 26, borderRadius: 8, background: '#2f54ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: '#fff' }}>W</span>
        </div>
        <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 17, letterSpacing: -0.5, color: '#0e1525' }}>WeFitAI</span>
        <span style={{ fontSize: 13, color: '#9aa1b2', marginLeft: 'auto' }}>운동 도감</span>
      </div>

      {/* 검색창 */}
      <div style={{ padding: '14px 16px 2px' }}>
        <div style={{ height: 46, border: '1px solid #eaecf2', borderRadius: 11, display: 'flex', alignItems: 'center', gap: 10, padding: '0 15px' }}>
          <div style={{ width: 14, height: 14, border: '1.8px solid #c2c7d2', borderRadius: '50%', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="운동 이름 또는 근육 검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, fontFamily: 'inherit', color: '#0e1525', background: 'transparent' }}
          />
        </div>
      </div>

      {/* 카테고리 필 */}
      <div style={{ display: 'flex', gap: 7, padding: '12px 16px 8px', overflowX: 'auto' }}>
        {CATEGORIES.map(cat => {
          const active = category === cat;
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                flexShrink: 0, padding: '7px 14px', borderRadius: 20,
                border: active ? 'none' : '1px solid #eaecf2',
                cursor: 'pointer', fontFamily: 'inherit', fontSize: 13,
                fontWeight: active ? 700 : 400,
                background: active ? '#2f54ff' : '#fff',
                color: active ? '#fff' : '#6b7385',
              }}
            >
              {cat}
              <span style={{ marginLeft: 4, fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, opacity: 0.75 }}>
                {counts[cat] || 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* 운동 목록 */}
      <div style={{ padding: '2px 16px 80px' }}>
        {exercises.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '56px 0', color: '#c2c7d2' }}>
            <div style={{ fontSize: 44, marginBottom: 10 }}>🔍</div>
            <div style={{ fontSize: 15 }}>검색 결과가 없습니다</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 12, color: '#9aa1b2', marginBottom: 10 }}>
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
