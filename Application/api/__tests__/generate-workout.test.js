jest.mock('@anthropic-ai/sdk', () => {
  const mockCreate = jest.fn();
  const MockAnthropic = jest.fn(() => ({ messages: { create: mockCreate } }));
  MockAnthropic.__mockCreate = mockCreate;
  return { __esModule: true, default: MockAnthropic };
});

jest.mock('../_lib/workoutPrompt.js', () => ({
  buildSystemPrompt: jest.fn(() => 'system prompt'),
  formatUserMessage: jest.fn(() => 'user message'),
  FALLBACK_STRENGTH: { weeklyRoutine: { monday: { exercises: [] } }, _isFallback: true, _type: 'strength' },
  FALLBACK_DIET:     { weeklyRoutine: { monday: { exercises: [] } }, _isFallback: true, _type: 'diet'     },
}));

import handler from '../generate-workout.js';
import Anthropic from '@anthropic-ai/sdk';
import { formatUserMessage } from '../_lib/workoutPrompt.js';

const mockCreate = Anthropic.__mockCreate;

function createRes() {
  const r = {};
  r.status = jest.fn(() => r);
  r.json   = jest.fn(() => r);
  r.end    = jest.fn(() => r);
  return r;
}

const validUserData = {
  goal: '근력_상승', bmi: 22, name: '홍길동',
  age: 25, gender: 'MALE', height: 175, weight: 70, availableDays: 4,
};

function makeTextBlock(text) {
  return { content: [{ type: 'text', text }] };
}

describe('generate-workout handler', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...OLD_ENV, ANTHROPIC_API_KEY: 'sk-ant-test' };
  });

  afterAll(() => {
    process.env = OLD_ENV;
  });

  test('POST 외 메서드 → 405', async () => {
    const res = createRes();
    await handler({ method: 'GET', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  test('userData 누락 → 400', async () => {
    const res = createRes();
    await handler({ method: 'POST', body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('goal 누락 → 400', async () => {
    const res = createRes();
    await handler({ method: 'POST', body: { userData: { bmi: 22 } } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('bmi 누락 → 400', async () => {
    const res = createRes();
    await handler({ method: 'POST', body: { userData: { goal: '근력_상승' } } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  test('허용되지 않은 goal 값 → 400', async () => {
    const res = createRes();
    await handler({ method: 'POST', body: { userData: { goal: '무한체력', bmi: 22 } } }, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringContaining('goal') }));
  });

  test('ANTHROPIC_API_KEY 미설정 → 폴백 반환 (API 호출 없음)', async () => {
    process.env.ANTHROPIC_API_KEY = '';
    const res = createRes();
    await handler({ method: 'POST', body: { userData: validUserData } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ _isFallback: true }));
    expect(mockCreate).not.toHaveBeenCalled();
  });

  test('ANTHROPIC_API_KEY 미설정 + 다이어트 → 다이어트 폴백', async () => {
    process.env.ANTHROPIC_API_KEY = '';
    const res = createRes();
    await handler({ method: 'POST', body: { userData: { ...validUserData, goal: '다이어트' } } }, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ _type: 'diet' }));
  });

  test('정상 Claude API 응답 → weeklyRoutine 반환', async () => {
    const routine = { weeklyRoutine: { monday: { exercises: [{ name: '벤치 프레스', sets: 4, reps: 8, rest: '90초' }] } } };
    mockCreate.mockResolvedValue(makeTextBlock(JSON.stringify(routine)));
    const res = createRes();
    await handler({ method: 'POST', body: { userData: validUserData } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ weeklyRoutine: expect.any(Object) }));
  });

  test('응답에 코드블록 있으면 제거하고 파싱', async () => {
    const routine = { weeklyRoutine: { monday: { exercises: [] } } };
    const wrapped = `\`\`\`json\n${JSON.stringify(routine)}\n\`\`\``;
    mockCreate.mockResolvedValue(makeTextBlock(wrapped));
    const res = createRes();
    await handler({ method: 'POST', body: { userData: validUserData } }, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ weeklyRoutine: expect.any(Object) }));
  });

  test('JSON 파싱 실패 → 폴백 반환', async () => {
    mockCreate.mockResolvedValue(makeTextBlock('잘못된 JSON{{{'));
    const res = createRes();
    await handler({ method: 'POST', body: { userData: validUserData } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ _isFallback: true }));
  });

  test('weeklyRoutine 누락 시 폴백 반환', async () => {
    mockCreate.mockResolvedValue(makeTextBlock(JSON.stringify({ other: true })));
    const res = createRes();
    await handler({ method: 'POST', body: { userData: validUserData } }, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ _isFallback: true }));
  });

  test('Claude API 호출 실패 → 폴백 반환', async () => {
    mockCreate.mockRejectedValue(new Error('rate limit'));
    const res = createRes();
    await handler({ method: 'POST', body: { userData: validUserData } }, res);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ _isFallback: true }));
  });

  test('req.body가 문자열이면 JSON 파싱 후 처리', async () => {
    const routine = { weeklyRoutine: { monday: { exercises: [] } } };
    mockCreate.mockResolvedValue(makeTextBlock(JSON.stringify(routine)));
    const res = createRes();
    await handler({ method: 'POST', body: JSON.stringify({ userData: validUserData }) }, res);
    expect(mockCreate).toHaveBeenCalled();
  });

  test('completedHistory 있으면 formatUserMessage에 전달', async () => {
    const routine = { weeklyRoutine: { monday: { exercises: [] } } };
    mockCreate.mockResolvedValue(makeTextBlock(JSON.stringify(routine)));
    const history = [{ date: '2026-06-01', exercises: ['벤치 프레스'] }];
    const res = createRes();
    await handler({ method: 'POST', body: { userData: validUserData, completedHistory: history } }, res);
    expect(formatUserMessage).toHaveBeenCalledWith(validUserData, history);
  });
});
