import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { userId, password } = req.body || {};

  if (!userId || !password)
    return res.status(400).json({ error: '아이디와 비밀번호를 입력하세요.' });

  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !user)
    return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid)
    return res.status(401).json({ error: '아이디 또는 비밀번호가 일치하지 않습니다.' });

  const token = btoa(`${userId}:${Date.now()}`);
  return res.status(200).json({
    userId: user.user_id,
    name: user.name,
    gender: user.gender,
    birthDate: user.birth_date,
    token,
  });
}
