# WeFitAI — 개발 변경 내역

> 프로젝트 기간: 2026-06-08 ~ 2026-06-19  
> 배포 URL: https://wefitai.vercel.app  
> 스택: React 18 + Vite 5 · Vercel Serverless · Supabase · Claude API

---

## v1.0 — 초기 구축 (2026-06-08)

### 앱 기본 구조 셋업
- React 18 + Vite 5 SPA 프로젝트 생성 (`Application/` 폴더)
- React Router v6 기반 7개 화면 라우팅 구성
- 화면 구성
  - `/login` — 로그인
  - `/signup` — 회원가입
  - `/` — 홈 (BMI 대시보드)
  - `/body` — 신체정보 입력
  - `/workout` — AI 운동처방
  - `/history` — 운동 캘린더
  - `/library` — 운동 도감
- 하단 네비게이션 (`BottomNav`) 공통 컴포넌트
- `localStorage` 기반 데이터 저장 (`storageService.js`)
- BMI / 체지방률 / 근력량 분석 로직 (`bodyAnalyzer.js`)
- 운동 DB 48개 종목 (`exerciseDb.json`) — 부위·난이도·장비·처방 세트 수록
- Lyfta 운동 영상 연동 (`lyftaCodes.js`)

### Vercel 배포 기반 셋업
- `Application/vercel.json` — SPA 라우팅용 rewrites 설정
- `Application/public/_redirects` — SPA 404 폴백
- `Application` 폴더를 git submodule → 일반 폴더로 전환 (Vercel Root Directory 호환)

---

## v1.1 — AI 운동처방 기능 (2026-06-08)

### Gemini API 연동 (초기)
- `aiService.js` — Google Gemini API로 주간 운동 루틴 JSON 생성
- Gemini 모델 변경 이력: `2.0-flash` → `1.5-flash` → `2.0-flash` (안정성 탐색)
- API 인증 방식: URL 파라미터 → **헤더 방식** (`x-goog-api-key`) 변경
- 토큰 최적화: few-shot 대화 제거, 운동 DB 스니펫 부위당 5 → 3개, `maxOutputTokens` 4000 → 2500 (~50% 절감)
- AI 처방 결과 **24시간 localStorage 캐싱** 추가 (API 반복 호출 방지)

---

## v1.2 — AI API 보안 강화 (2026-06-09)

### Gemini → Claude API 전환 + 서버리스 프록시
- **문제**: Gemini API 키가 브라우저에 노출되는 보안 취약점
- **해결**: Vercel Serverless Function을 프록시로 사용, 키를 서버 환경변수에서만 읽도록 전환

| 파일 | 역할 |
|------|------|
| `api/generate-workout.js` | Claude Haiku 4.5 호출 서버리스 함수 |
| `api/_lib/workoutPrompt.js` | 프롬프트 빌드 / 폴백 루틴 로직 |
| `src/services/aiService.js` | `/api` 호출 경량 클라이언트 (캐시 유지) |

- AI 처방 캐시 키에 `userId` 적용 (기존: 항상 `guest`로 고정되던 버그 수정)
- 처방 생성 후 **5초 쿨다운** 추가 (15 RPM 방어)
- 429 할당량 초과 시 폴백 루틴도 캐시하여 반복 호출 차단

---

## v1.3 — 크로스 디바이스 인증 (2026-06-09)

### Supabase DB 기반 인증 시스템
- **문제**: localStorage 기반 인증 → 다른 기기에서 로그인 불가
- **해결**: Supabase `users` 테이블 + Serverless 인증 API

| 파일 | 역할 |
|------|------|
| `api/auth-register.js` | 회원가입 — bcryptjs 해싱 후 Supabase 저장 |
| `api/auth-login.js` | 로그인 — DB 조회 + 비밀번호 검증 |
| `api/auth-update-profile.js` | 프로필 업데이트 (이름·생년월일·성별) |
| `src/services/authService.js` | localStorage 의존성 제거, API 호출 방식으로 전환 |

- 세션: `localStorage` → `sessionStorage` (탭 종료 시 자동 로그아웃)
- Supabase `users` 테이블 스키마

```sql
CREATE TABLE users (
  user_id    TEXT PRIMARY KEY,
  name       TEXT,
  password   TEXT NOT NULL,
  birth_date TEXT,
  gender     TEXT DEFAULT 'MALE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## v1.4 — UI 개선 10항목 + 크로스 디바이스 데이터 동기화 (2026-06-18)

### UI 개선 사항

| # | 화면 | 변경 내용 |
|---|------|-----------|
| 1 | 홈 | 신체기록 테이블에서 체지방 / 근력량 컬럼 제거, 차트는 BMI·체중만 유지 |
| 2 | 운동처방 | 운동 세트·횟수·무게·휴식 시간 — AI 처방값 고정, 사용자 임의 변경 불가 |
| 3 | 회원가입 | 올바르지 않은 생년월일 예외처리 (존재하지 않는 날짜, 120년 초과) |
| 4 | 신체정보 | 입력 저장 후 홈 화면으로 자동 이동 (800ms 딜레이) |
| 5 | 운동처방 | 휴식일 탭 숨김, 주간 요약 카드 제거 |
| 6 | 회원가입 | 미래 생년월일 입력 차단 (`max={오늘}`) |
| 7 | 운동 추가 모달 | 도감에서 추가 시 부위 필터 버튼 추가 (전체·가슴·등·하체·어깨·팔·복근) |
| 8 | 캘린더 | 운동 수정(✏️) 기능 추가 — 세트·횟수·무게·휴식 시간 변경 가능 |
| 9 | 도감 | 부위 이모지 → `img_body/` 폴더 이미지로 교체 |
| 10 | 캘린더 | 영상 토글 버튼: `▶` 재생 / `⏸` 일시정지 상태 표시 |

### 개발환경 개선
- **문제**: `npm run dev`(Vite만) 실행 시 `/api/` 서버리스 함수 미동작 → 회원가입 실패
- **해결**: `concurrently` 패키지로 Vite(3000) + 로컬 API 서버(3001) 동시 실행

```json
"dev": "concurrently \"vite\" \"node api-dev.mjs\""
```

- `api-dev.mjs` — 로컬 HTTP 서버, `.env` 로드 후 기존 API 핸들러 라우팅
- `vite.config.js` — `/api` 프록시 설정 (`http://localhost:3001`)

### Supabase 크로스 디바이스 데이터 동기화
- Supabase `user_sync` 테이블 생성

```sql
CREATE TABLE user_sync (
  user_id         TEXT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  body_records    JSONB NOT NULL DEFAULT '[]',
  workout_records JSONB NOT NULL DEFAULT '[]',
  calendar_data   JSONB NOT NULL DEFAULT '{}',
  goal            TEXT  NOT NULL DEFAULT '근력_상승',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- `api/data-sync.js` — GET(불러오기) / POST(저장) 서버리스 API
- `src/services/syncService.js` — `load()` / `save()` 클라이언트 서비스

| 트리거 | 동작 |
|--------|------|
| 로그인 성공 | DB → localStorage 동기화 |
| 앱 초기 로드 (이미 로그인) | DB → localStorage 동기화 |
| 신체정보 저장 | localStorage → DB 저장 |
| 운동처방 생성 | localStorage → DB 저장 |
| 캘린더 운동 추가/수정/삭제 | localStorage → DB 저장 |
| 홈 설정 저장 | localStorage → DB 저장 |

---

## v2.0 — UI 전면 리디자인 Style C EDGE (2026-06-19)

### 디자인 시스템 전환

| 항목 | 이전 | 이후 |
|------|------|------|
| 폰트 | Noto Sans KR | Pretendard Variable (본문) + Space Grotesk (숫자·브랜드) |
| 주요 색상 | `#43a047` (초록) | `#2f54ff` (블루) |
| 배경 | `#f5f7fa` | `#fff` (앱 내부) / `#e7e5df` (앱 외부) |
| 카드 스타일 | `box-shadow` 그림자 | `border: 1px solid #eaecf2` 테두리 |
| 버튼 | 초록 그라데이션 | `#2f54ff` 플랫 솔리드 |
| 입력 포커스 | 초록 테두리 | 파란 테두리 + 3px 외광 |
| 헤더 | 초록 그라데이션 배너 | 흰 배경 + W 로고 |
| 하단 네비 | 이모지 아이콘 | 텍스트 전용 플랫 탭 |

### 화면별 변경 상세

**로그인**
- 그라데이션 배경 제거 → 순백 화면
- 파란 W 로고 (60×60, `border-radius: 16px`, 파란 glow 그림자)
- Space Grotesk `WeFitAI` 타이포그래피
- 하단 폼 고정 레이아웃

**회원가입**
- 뒤로가기 버튼 (34×34 둥근 사각형) + 제목 헤더
- 성별 `<select>` → 파란 테두리 토글 버튼 (`남성` / `여성`)
- 필수항목 마커: 빨강(`#e53935`) → 파랑(`#2f54ff`)

**홈**
- 고정 헤더: W 로고 + 설정 아이콘 버튼
- 날짜·인사말 섹션 (오전·오후·저녁 분기)
- AI 처방 카드: "RECENT PRESCRIPTION · AI" 라벨 + "운동 시작하기" 버튼
- 체중 관리 섹션: 2×2 그리드 카드 (BMI / 체중 / 체지방률 / 근력량)
- BMI 게이지: 초록 → 파란 정상 구간

**신체정보 입력**
- 헤더 W 로고 통일
- BMI 결과 카드: 범위 탭 (저체중·정상·과체중·비만) 시각화

**운동처방**
- 헤더 W 로고 통일
- 컨트롤: 드롭다운 버튼 스타일 (파란 테두리 / 회색 테두리)
- 요일 탭: 가로 스크롤 버튼 → 파란 언더라인 탭
- 운동 행: `00` 넘버링 + `세트×횟수` 우측 정렬

**운동 캘린더**
- 오늘 날짜: 초록 배경 → 파란 원형 (`#2f54ff`)
- 운동 있는 날: 파란 점 표시
- 체크박스: 초록 → 파란 체크
- 모달 탭: 파란 언더라인 → 세그먼트 컨트롤 스타일
- 진행 바: 초록 → 파란색

**운동 도감**
- 검색창: 독립 컴포넌트 → 내장 아이콘 포함 인라인 스타일
- 카테고리 필: 활성 = 파란 배경
- 운동 카드: 그림자 → 테두리 스타일, 화살표(›) 추가

**하단 네비게이션**
- 항목 순서: 홈 · 신체 · 처방 · 캘린더 · 도감
- 이모지 + 이름 → **텍스트만**, 활성 = `#2f54ff` bold

---

## 파일 구조 (최종)

```
wefitai/
├── Application/              # React SPA
│   ├── api/                  # Vercel Serverless Functions
│   │   ├── auth-register.js
│   │   ├── auth-login.js
│   │   ├── auth-update-profile.js
│   │   ├── generate-workout.js
│   │   ├── data-sync.js
│   │   └── _lib/workoutPrompt.js
│   ├── public/
│   │   └── img_body/         # 운동 부위 이미지 (6종)
│   ├── src/
│   │   ├── components/BottomNav.jsx
│   │   ├── data/
│   │   │   ├── exerciseDb.json   # 48종목 DB
│   │   │   └── lyftaCodes.js     # 영상 URL 매핑
│   │   ├── screens/
│   │   │   ├── LoginScreen.jsx
│   │   │   ├── SignupScreen.jsx
│   │   │   ├── HomeScreen.jsx
│   │   │   ├── BodyInputScreen.jsx
│   │   │   ├── WorkoutScreen.jsx
│   │   │   ├── HistoryScreen.jsx
│   │   │   └── LibraryScreen.jsx
│   │   └── services/
│   │       ├── authService.js
│   │       ├── aiService.js
│   │       ├── syncService.js
│   │       ├── storageService.js
│   │       └── bodyAnalyzer.js
│   ├── api-dev.mjs           # 로컬 API 서버 (npm run dev용)
│   ├── vite.config.js
│   ├── vercel.json
│   └── package.json
└── CHANGELOG.md
```

## Supabase 테이블 구조 (최종)

```sql
-- 사용자 인증
CREATE TABLE users (
  user_id    TEXT PRIMARY KEY,
  name       TEXT,
  password   TEXT NOT NULL,        -- bcryptjs 해시
  birth_date TEXT,
  gender     TEXT DEFAULT 'MALE',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 크로스 디바이스 데이터 동기화
CREATE TABLE user_sync (
  user_id         TEXT PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  body_records    JSONB NOT NULL DEFAULT '[]',
  workout_records JSONB NOT NULL DEFAULT '[]',
  calendar_data   JSONB NOT NULL DEFAULT '{}',
  goal            TEXT  NOT NULL DEFAULT '근력_상승',
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

## 환경변수

| 변수 | 용도 |
|------|------|
| `ANTHROPIC_API_KEY` | Claude API (운동처방 생성) |
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_KEY` | Supabase 서버 서비스 키 (인증·데이터 동기화) |
