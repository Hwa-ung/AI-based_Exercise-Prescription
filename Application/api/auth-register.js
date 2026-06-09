import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId, password, name, birthDate, gender } = req.body || {};

  if (!userId || userId.length < 4)
    return res.status(400).json({ error: '아이디는 4자 이상이어야 합니다.' });
  if (!password || password.length < 6)
    return res.status(400).json({ error: '비밀번호는 6자 이상이어야 합니다.' });
  if (!name)
    return res.status(400).json({ error: '이름을 입력하세요.' });

  const { data: existing } = await supabase
    .from('users')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing)
    return res.status(409).json({ error: '이미 사용 중인 아이디입니다.' });

  const passwordHash = await bcrypt.hash(password, 10);

  const { error } = await supabase.from('users').insert({
    user_id: userId,
    password_hash: passwordHash,
    name,
    birth_date: birthDate || null,
    gender: gender || 'MALE',
  });

  if (error) return res.status(500).json({ error: '회원가입 실패: ' + error.message });

  return res.status(200).json({ userId });
}
