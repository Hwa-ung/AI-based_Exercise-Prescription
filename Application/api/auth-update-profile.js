import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId, name, birthDate, gender } = req.body || {};

  if (!userId) return res.status(400).json({ error: '사용자 ID가 필요합니다.' });

  const { error } = await supabase
    .from('users')
    .update({ name, birth_date: birthDate || null, gender })
    .eq('user_id', userId);

  if (error) return res.status(500).json({ error: '프로필 업데이트 실패' });

  return res.status(200).json({ success: true });
}
