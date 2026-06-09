// Vercel 서버리스 함수 — Claude(Haiku 4.5) 운동 처방 프록시
// ANTHROPIC_API_KEY 는 서버 환경변수에서만 읽음 → 브라우저에 절대 노출되지 않음
import Anthropic from '@anthropic-ai/sdk';
import {
  buildSystemPrompt,
  formatUserMessage,
  FALLBACK_STRENGTH,
  FALLBACK_DIET,
} from './_lib/workoutPrompt.js';

const MODEL = 'claude-haiku-4-5';

function fallbackFor(goal) {
  const base = goal === '근력_상승' ? FALLBACK_STRENGTH : FALLBACK_DIET;
  return { ...base, _isFallback: true };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  // Vercel은 JSON 본문을 자동 파싱하지만, 로컬/타 런타임 대비 방어적으로 처리
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const { userData, completedHistory } = body || {};

  // 입력 검증 — 운동 처방 형태만 허용 (오용 방지)
  if (!userData || !userData.goal || userData.bmi == null) {
    return res.status(400).json({ error: 'userData(goal, bmi)가 필요합니다.' });
  }
  if (userData.goal !== '근력_상승' && userData.goal !== '다이어트') {
    return res.status(400).json({ error: '지원하지 않는 goal 값입니다.' });
  }

  const apiKey = (process.env.ANTHROPIC_API_KEY || '').trim();
  if (!apiKey) {
    // 키 미설정 시 폴백 처방 반환 (앱이 깨지지 않도록)
    return res.status(200).json(fallbackFor(userData.goal));
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: buildSystemPrompt(userData),
      messages: [
        { role: 'user', content: formatUserMessage(userData, completedHistory) },
      ],
    });

    let text = message.content.find(b => b.type === 'text')?.text ?? '';
    text = text.trim();
    if (text.startsWith('```')) text = text.split('\n').slice(1).join('\n');
    if (text.endsWith('```'))   text = text.split('\n').slice(0, -1).join('\n');

    const result = JSON.parse(text);
    if (!result.weeklyRoutine) throw new Error('weeklyRoutine 누락');
    return res.status(200).json(result);
  } catch (err) {
    // 과금 소진·rate limit·파싱 실패 등 → 폴백 처방으로 graceful degrade
    console.error('[generate-workout]', err?.message || err);
    return res.status(200).json(fallbackFor(userData.goal));
  }
}
