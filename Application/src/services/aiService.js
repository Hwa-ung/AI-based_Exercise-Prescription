// AIService — wefit_ai_pipeline.py 로직을 JS로 포팅
import exerciseDb from '../data/exerciseDb.json';
import StorageService from './storageService';

const PART_ORDER = ['가슴', '어깨', '등', '하체', '팔', '복근'];

function buildPromptSnippet(goal, bmi) {
  const lines = [`[운동 데이터베이스 — ${goal.replace('_', ' ')} 목적별 추천 (상위 5개/부위)]`];
  const partMap = {};
  PART_ORDER.forEach(p => { partMap[p] = []; });

  for (const [name, info] of Object.entries(exerciseDb)) {
    const g = info[goal];
    if (!g || !g['추천']) continue;
    const bmiNote = info['BMI_제한'];
    if (bmi >= 30 && bmiNote && bmiNote.includes('주의')) continue;
    const part = info['부위'];
    if (partMap[part] !== undefined) partMap[part].push({ name, info, g });
  }

  for (const part of PART_ORDER) {
    const items = (partMap[part] || [])
      .sort((a, b) => a.g['우선순위'] - b.g['우선순위'])
      .slice(0, 5);
    if (!items.length) continue;
    lines.push(`\n[${part}]`);
    for (const { name, info, g } of items) {
      lines.push(
        `  ${name}: ${g['권장_세트']}, 휴식 ${g['권장_휴식']} (${info['세부_부위'].join(', ')})`
      );
    }
  }
  return lines.join('\n');
}

const STRENGTH_RULES = `[근력 상승 규칙]
프로그램: PPL (Push/Pull/Legs) 또는 3분할
- 복합 다관절 운동(스쿼트·데드리프트·벤치·바벨로우) 메인
- 세트: 3~5 / 횟수: 4~8회 (저반복 고중량) / 휴식: 90~180초
- 유산소: 주 0~1회 이하
- BMI 25 이상 고강도 점프 동작 제외`;

const DIET_RULES = `[다이어트 규칙]
프로그램: 전신 또는 상하체 2분할 + 유산소 병행
- 대근육 복합 운동 위주 (칼로리 소모 극대화)
- 세트: 3~4 / 횟수: 12~20회 (고반복 중저중량) / 휴식: 30~60초
- 유산소: 주 3~4회 30~40분 필수
- 복근 운동 매 세션 1~2개 포함
- BMI 27 이상 관절 충격 높은 동작 제외`;

// ─── Few-shot 예시 ────────────────────────────────────────────────
const FEWSHOT_STRENGTH_INPUT = {
  name: '김민준', age: 24, gender: '남', height: 178, weight: 78,
  muscleMass: 30, bodyFat: null, bmi: 24.63, goal: '근력_상승', availableDays: 5,
};
const FEWSHOT_STRENGTH_OUTPUT = {
  weeklyRoutine: {
    monday: { part: '가슴 + 삼두', focus: 'Push Day', exercises: [
      { name: '벤치 프레스',            sets: 4, reps: 6,  rest: '180초', note: '메인 복합' },
      { name: '인클라인 벤치 프레스',   sets: 3, reps: 8,  rest: '120초', note: '상부 가슴' },
      { name: '체스트 딥',              sets: 3, reps: 8,  rest: '90초',  note: '하부 가슴' },
      { name: '클로즈 그립 벤치 프레스',sets: 3, reps: 8,  rest: '90초',  note: '삼두 복합' },
      { name: '로프 푸시다운',           sets: 3, reps: 12, rest: '60초',  note: '삼두 고립' },
    ]},
    tuesday: { part: '등 + 이두', focus: 'Pull Day', exercises: [
      { name: '바벨 벤트오버 로우',  sets: 4, reps: 6,  rest: '180초', note: '등 두께' },
      { name: '풀업',                sets: 4, reps: 8,  rest: '120초', note: '광배근' },
      { name: '케이블 시티드 로우',  sets: 3, reps: 10, rest: '90초',  note: '등 중부' },
      { name: '바 랫 풀다운',        sets: 3, reps: 10, rest: '90초',  note: '광배근 보조' },
      { name: '바벨 컬',             sets: 3, reps: 8,  rest: '90초',  note: '이두 복합' },
      { name: '해머 컬',             sets: 3, reps: 10, rest: '60초',  note: '전완 포함' },
    ]},
    wednesday: { part: '하체 (대퇴사두)', focus: 'Leg Day A', exercises: [
      { name: '바벨 스쿼트',            sets: 5, reps: 5,  rest: '180초', note: '메인' },
      { name: '레그 프레스',            sets: 4, reps: 8,  rest: '120초', note: '대퇴사두' },
      { name: '불가리안 스플릿 스쿼트', sets: 3, reps: 8,  rest: '90초',  note: '단다리' },
      { name: '스탠딩 카프 레이즈',     sets: 4, reps: 20, rest: '60초',  note: '종아리' },
    ]},
    thursday: { part: '어깨 + 복근', focus: 'Shoulder Day', exercises: [
      { name: '바벨 밀리터리 프레스', sets: 4, reps: 6,  rest: '180초', note: '어깨 핵심' },
      { name: '덤벨 숄더 프레스',     sets: 3, reps: 8,  rest: '90초',  note: '어깨 전면' },
      { name: '덤벨 래터럴 레이즈',   sets: 4, reps: 12, rest: '60초',  note: '어깨 너비' },
      { name: '케이블 페이스 풀',     sets: 3, reps: 15, rest: '60초',  note: '후면+회전근개' },
      { name: '행잉 레그 레이즈',     sets: 4, reps: 12, rest: '60초',  note: '복근' },
      { name: '프론트 플랭크',        sets: 3, reps: 0,  rest: '60초',  duration: '60초', note: '코어' },
    ]},
    friday: { part: '하체 (햄스트링 + 힙)', focus: 'Leg Day B', exercises: [
      { name: '데드리프트',          sets: 4, reps: 5,  rest: '180초', note: '전신 복합' },
      { name: '루마니안 데드리프트', sets: 4, reps: 8,  rest: '120초', note: '햄스트링' },
      { name: '바벨 힙 쓰러스트',   sets: 4, reps: 10, rest: '90초',  note: '둔근' },
      { name: '시티드 카프 레이즈', sets: 4, reps: 20, rest: '60초',  note: '종아리' },
    ]},
    saturday: { part: '휴식', focus: 'Rest', exercises: [] },
    sunday:   { part: '휴식', focus: 'Rest', exercises: [] },
  },
};

const FEWSHOT_DIET_INPUT = {
  name: '이지은', age: 29, gender: '여', height: 163, weight: 60,
  muscleMass: 15, bodyFat: 25, bmi: 22.58, goal: '다이어트', availableDays: 5,
};
const FEWSHOT_DIET_OUTPUT = {
  weeklyRoutine: {
    monday: { part: '상체 (가슴 + 등) + 유산소', focus: 'Upper Body A', exercises: [
      { name: '레버 체스트 프레스',   sets: 3, reps: 15, rest: '60초' },
      { name: '케이블 스탠딩 플라이', sets: 3, reps: 15, rest: '45초' },
      { name: '어시스티드 풀업',      sets: 3, reps: 12, rest: '60초' },
      { name: '바 랫 풀다운',         sets: 3, reps: 15, rest: '60초' },
      { name: '크런치',               sets: 3, reps: 25, rest: '30초' },
    ], cardio: { name: '트레드밀 빠른 걷기/조깅', duration: '20분', intensity: '중강도' }},
    tuesday: { part: '하체 + 복근', focus: 'Lower Body A', exercises: [
      { name: '스쿼트',              sets: 4, reps: 15, rest: '60초' },
      { name: '워킹 런지',           sets: 4, reps: 20, rest: '60초' },
      { name: '바벨 힙 쓰러스트',   sets: 4, reps: 15, rest: '60초' },
      { name: '루마니안 데드리프트', sets: 3, reps: 15, rest: '60초' },
      { name: '레그 레이즈',         sets: 3, reps: 20, rest: '30초' },
      { name: '러시안 트위스트',     sets: 3, reps: 20, rest: '30초' },
    ]},
    wednesday: { part: '유산소', focus: 'Cardio Day', exercises: [],
      cardio: { name: '사이클 또는 트레드밀', duration: '40분', intensity: '중강도 지속' }},
    thursday: { part: '어깨 + 팔 + 복근', focus: 'Upper Body B', exercises: [
      { name: '덤벨 숄더 프레스',    sets: 3, reps: 15, rest: '60초' },
      { name: '덤벨 래터럴 레이즈',  sets: 4, reps: 20, rest: '30초' },
      { name: '케이블 페이스 풀',    sets: 3, reps: 15, rest: '45초' },
      { name: '트라이셉스 딥',       sets: 3, reps: 15, rest: '45초' },
      { name: '프론트 플랭크',       sets: 3, reps: 0,  rest: '30초', duration: '45초' },
      { name: '행잉 레그 레이즈',    sets: 3, reps: 15, rest: '45초' },
    ]},
    friday: { part: '하체 + 유산소', focus: 'Lower Body B', exercises: [
      { name: '케틀벨 스윙',              sets: 4, reps: 20, rest: '45초' },
      { name: '불가리안 스플릿 스쿼트',   sets: 3, reps: 12, rest: '60초' },
      { name: '힙 쓰러스트',              sets: 4, reps: 20, rest: '60초' },
      { name: '레그 프레스',              sets: 3, reps: 20, rest: '45초' },
      { name: '크런치',                   sets: 3, reps: 25, rest: '30초' },
    ], cardio: { name: '트레드밀 조깅', duration: '20분', intensity: '중강도' }},
    saturday: { part: '휴식', focus: 'Rest', exercises: [] },
    sunday:   { part: '휴식', focus: 'Rest', exercises: [] },
  },
};

function formatUserMessage(u, completedHistory = null) {
  const goalLabel = u.goal === '근력_상승' ? '근력 상승' : '다이어트';
  let msg =
    `이름: ${u.name} / 나이: ${u.age}세 / 성별: ${u.gender}\n` +
    `키: ${u.height}cm / 몸무게: ${u.weight}kg / BMI: ${u.bmi}\n` +
    `목적: ${goalLabel} / 운동 가능 요일: ${u.availableDays}일\n`;

  if (u.bodyFat  != null) msg += `체지방률: ${u.bodyFat}%\n`;
  if (u.muscleMass != null) msg += `근력량: ${u.muscleMass}kg\n`;

  if (completedHistory && completedHistory.length > 0) {
    msg += `\n[최근 완료 운동 기록 (최근 ${completedHistory.length}회)]\n`;
    completedHistory.forEach(h => {
      msg += `${h.date}: ${h.exercises.join(', ')}\n`;
    });
    msg += '위 기록을 참고해 점진적 과부하를 고려한 새로운 루틴을 처방해주세요.\n';
  }

  msg += '\n위 정보를 바탕으로 1주일 운동 루틴을 JSON으로 추천해주세요.';
  return msg;
}

// ─── 메인 API 함수 (Gemini Flash) ────────────────────────────────
const AIService = {
  async generateWorkout(userData, completedHistory = null) {
    const envKey = import.meta.env.VITE_GEMINI_API_KEY ?? '';
    const rawKey = envKey.trim() || StorageService.get('gemini_api_key');
    const apiKey = typeof rawKey === 'string' ? rawKey.trim() : '';

    if (!apiKey) {
      await new Promise(r => setTimeout(r, 800));
      return userData.goal === '근력_상승' ? FEWSHOT_STRENGTH_OUTPUT : FEWSHOT_DIET_OUTPUT;
    }

    const { goal, bmi } = userData;
    const goalLabel = goal === '근력_상승' ? '근력 상승' : '다이어트';
    const goalRules = goal === '근력_상승' ? STRENGTH_RULES : DIET_RULES;
    const snippet   = buildPromptSnippet(goal, bmi);

    const systemPrompt = `당신은 헬스장 전문 트레이너 AI입니다.
사용자 신체 정보를 바탕으로 1주일 운동 루틴을 JSON 형식으로만 출력하세요.
마크다운 코드블록, 설명 텍스트 없이 순수 JSON만 출력하세요.

[운동 목적: ${goalLabel}]
${goalRules}

${snippet}

[출력 규칙]
- 위 운동 목록에 있는 종목만 사용할 것
- 홈트 동작(맨몸 버피, 점프 스쿼트 등) 제외
- 휴식일에는 exercises를 빈 배열로
- 모든 요일 포함 (monday ~ sunday)
- 유산소는 cardio 필드에 별도 작성
- duration은 플랭크/유산소에만 포함`.trim();

    const fsInput  = goal === '근력_상승' ? FEWSHOT_STRENGTH_INPUT  : FEWSHOT_DIET_INPUT;
    const fsOutput = goal === '근력_상승' ? FEWSHOT_STRENGTH_OUTPUT : FEWSHOT_DIET_OUTPUT;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [
          { role: 'user',  parts: [{ text: formatUserMessage(fsInput) }] },
          { role: 'model', parts: [{ text: JSON.stringify(fsOutput, null, 2) }] },
          { role: 'user',  parts: [{ text: formatUserMessage(userData, completedHistory) }] },
        ],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4000,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      const msg = err?.error?.message || `HTTP ${response.status}`;
      if (response.status === 429 || /quota/i.test(msg)) {
        const fallback = userData.goal === '근력_상승' ? FEWSHOT_STRENGTH_OUTPUT : FEWSHOT_DIET_OUTPUT;
        return { ...fallback, _isQuotaFallback: true };
      }
      throw new Error(msg);
    }

    const data = await response.json();
    let text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    text = text.trim();
    if (text.startsWith('```')) text = text.split('\n').slice(1).join('\n');
    if (text.endsWith('```'))   text = text.split('\n').slice(0, -1).join('\n');
    return JSON.parse(text);
  },
};

export default AIService;
