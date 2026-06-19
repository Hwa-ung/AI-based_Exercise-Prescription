jest.mock('../../../src/data/exerciseDb.json', () => ({
  '벤치 프레스': {
    '부위': '가슴', '세부_부위': ['대흉근'],
    '근력_상승': { '추천': true, '우선순위': 1, '권장_세트': '4×6~8',   '권장_휴식': '2~3분'   },
    '다이어트':  { '추천': true, '우선순위': 2, '권장_세트': '3×12~15', '권장_휴식': '60~90초' },
    'BMI_제한': null,
  },
  '바벨 스쿼트': {
    '부위': '하체', '세부_부위': ['대퇴사두', '둔근'],
    '근력_상승': { '추천': true, '우선순위': 1, '권장_세트': '5×5',     '권장_휴식': '3분'     },
    '다이어트':  { '추천': true, '우선순위': 1, '권장_세트': '4×15',    '권장_휴식': '60초'    },
    'BMI_제한': null,
  },
  '고강도점프': {
    '부위': '하체', '세부_부위': ['대퇴사두'],
    '근력_상승': { '추천': true, '우선순위': 2, '권장_세트': '3×8',     '권장_휴식': '90초'    },
    '다이어트':  { '추천': true, '우선순위': 2, '권장_세트': '3×15',    '권장_휴식': '45초'    },
    'BMI_제한': 'BMI 30 이상 주의',
  },
}));

import { buildSystemPrompt, formatUserMessage, FALLBACK_STRENGTH, FALLBACK_DIET } from '../workoutPrompt.js';

const baseUser = { goal: '근력_상승', bmi: 22, name: '홍길동', age: 25, gender: 'MALE', height: 175, weight: 70, availableDays: 4 };

describe('buildSystemPrompt', () => {
  test('근력_상승 목적의 프롬프트 반환', () => {
    const prompt = buildSystemPrompt(baseUser);
    expect(typeof prompt).toBe('string');
    expect(prompt).toContain('근력 상승');
    expect(prompt).toContain('weeklyRoutine');
  });

  test('다이어트 목적의 프롬프트 반환', () => {
    const prompt = buildSystemPrompt({ ...baseUser, goal: '다이어트' });
    expect(prompt).toContain('다이어트');
  });

  test('운동 DB 스니펫이 포함됨', () => {
    const prompt = buildSystemPrompt(baseUser);
    expect(prompt).toContain('벤치 프레스');
  });

  test('BMI 30 이상이면 BMI_제한 있는 운동 제외', () => {
    const prompt = buildSystemPrompt({ ...baseUser, bmi: 31 });
    expect(prompt).not.toContain('고강도점프');
  });

  test('BMI 30 미만이면 BMI_제한 운동 포함', () => {
    const prompt = buildSystemPrompt({ ...baseUser, bmi: 29 });
    expect(prompt).toContain('고강도점프');
  });

  test('출력 규칙 섹션 포함', () => {
    const prompt = buildSystemPrompt(baseUser);
    expect(prompt).toContain('출력 규칙');
    expect(prompt).toContain('reps');
  });
});

describe('formatUserMessage', () => {
  test('기본 신체 정보 포함', () => {
    const msg = formatUserMessage(baseUser);
    expect(msg).toContain('홍길동');
    expect(msg).toContain('175cm');
    expect(msg).toContain('70kg');
    expect(msg).toContain('근력 상승');
  });

  test('체지방률 있으면 포함', () => {
    const msg = formatUserMessage({ ...baseUser, bodyFat: 18.5 });
    expect(msg).toContain('18.5%');
  });

  test('근력량 있으면 포함', () => {
    const msg = formatUserMessage({ ...baseUser, muscleMass: 35.2 });
    expect(msg).toContain('35.2kg');
  });

  test('completedHistory 있으면 운동 기록 포함', () => {
    const history = [{ date: '2026-06-01', exercises: ['벤치 프레스', '스쿼트'] }];
    const msg = formatUserMessage(baseUser, history);
    expect(msg).toContain('2026-06-01');
    expect(msg).toContain('벤치 프레스');
    expect(msg).toContain('점진적 과부하');
  });

  test('completedHistory 없으면 기록 섹션 없음', () => {
    const msg = formatUserMessage(baseUser, null);
    expect(msg).not.toContain('최근 완료 운동');
  });

  test('빈 history 배열이면 기록 섹션 없음', () => {
    const msg = formatUserMessage(baseUser, []);
    expect(msg).not.toContain('최근 완료 운동');
  });
});

describe('FALLBACK_STRENGTH', () => {
  test('weeklyRoutine 포함', () => {
    expect(FALLBACK_STRENGTH).toHaveProperty('weeklyRoutine');
  });

  test('월~일 7일 루틴 포함', () => {
    const days = Object.keys(FALLBACK_STRENGTH.weeklyRoutine);
    expect(days).toEqual(expect.arrayContaining(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']));
  });

  test('토/일은 휴식일', () => {
    expect(FALLBACK_STRENGTH.weeklyRoutine.saturday.part).toBe('휴식');
    expect(FALLBACK_STRENGTH.weeklyRoutine.sunday.part).toBe('휴식');
  });
});

describe('FALLBACK_DIET', () => {
  test('weeklyRoutine 포함', () => {
    expect(FALLBACK_DIET).toHaveProperty('weeklyRoutine');
  });

  test('월~일 7일 루틴 포함', () => {
    const days = Object.keys(FALLBACK_DIET.weeklyRoutine);
    expect(days).toEqual(expect.arrayContaining(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']));
  });

  test('유산소 날에 cardio 필드 포함', () => {
    const { weeklyRoutine } = FALLBACK_DIET;
    const cardioDay = Object.values(weeklyRoutine).find(d => d.cardio);
    expect(cardioDay).toBeDefined();
    expect(cardioDay.cardio).toHaveProperty('name');
    expect(cardioDay.cardio).toHaveProperty('duration');
  });
});
