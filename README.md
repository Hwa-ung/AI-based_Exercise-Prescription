# WeFitAI

Claude AI 기반 개인 맞춤 운동 처방 웹 애플리케이션.
신체 정보와 목표를 입력하면 AI가 주간 운동 루틴을 생성하고, Supabase를 통해 크로스 디바이스 동기화를 지원합니다.

## 주요 기능

- **AI 운동 처방** — 신체 정보(키, 체중, 나이, 성별)와 목표(근력 상승 / 다이어트)를 기반으로 Claude AI가 주간 루틴 생성
- **BMI 분석** — 체중 추이 그래프 및 BMI 구간별 시각화
- **운동 기록** — 날짜별 운동 완료 이력 저장 및 조회
- **운동 라이브러리** — 부위별 운동 목록 및 상세 정보 제공
- **크로스 디바이스 동기화** — Supabase DB 기반으로 기기 간 데이터 동기화
- **24시간 AI 캐시** — 동일 조건 재요청 시 API 호출 생략

## 기술 스택

| 분류 | 기술 |
|---|---|
| Frontend | React 18, React Router v6, Recharts |
| Build | Vite |
| AI | Claude API (Anthropic) |
| Backend | Vercel Serverless Functions |
| Database | Supabase (PostgreSQL) |
| Auth | 자체 구현 (Supabase 기반) |

## 프로젝트 구조

```
Application/
├── api/                  # Vercel 서버리스 함수 (Claude API, Supabase 연동)
├── public/img_body/      # 신체 부위 이미지
├── src/
│   ├── components/       # BottomNav 등 공통 컴포넌트
│   ├── screens/          # 화면 단위 컴포넌트
│   │   ├── LoginScreen.jsx
│   │   ├── SignupScreen.jsx
│   │   ├── HomeScreen.jsx       # BMI 게이지, 체중 그래프
│   │   ├── BodyInputScreen.jsx  # 신체 정보 입력
│   │   ├── WorkoutScreen.jsx    # AI 운동 처방 결과
│   │   ├── HistoryScreen.jsx    # 운동 기록
│   │   └── LibraryScreen.jsx    # 운동 라이브러리
│   ├── services/
│   │   ├── aiService.js         # Claude API 호출 클라이언트
│   │   ├── authService.js       # 인증 로직
│   │   ├── syncService.js       # Supabase 동기화
│   │   ├── storageService.js    # 로컬 스토리지 관리
│   │   └── bodyAnalyzer.js      # BMI 계산 및 분석
│   └── data/exerciseDb.json     # 운동 데이터베이스
├── api-dev.mjs           # 로컬 개발용 API 서버
├── .env                  # 환경변수 (git 제외)
└── package.json
```

## 시작하기

### 1. 환경변수 설정

```bash
cd Application
cp .env.example .env
```

`.env` 파일에 아래 키를 입력합니다.

```env
ANTHROPIC_API_KEY=sk-ant-...
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

### 2. 의존성 설치

```bash
cd Application
npm install
```

### 3. 개발 서버 실행

```bash
npm run dev
```

Vite 개발 서버(포트 3000)와 로컬 API 서버(포트 3001)가 동시에 실행됩니다.

### 4. 프로덕션 빌드

```bash
npm run build
```

## 배포

Vercel에 연결된 저장소에 push하면 자동 배포됩니다.
환경변수는 Vercel 프로젝트 설정에서 별도로 등록해야 합니다.
