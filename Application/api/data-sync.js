import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // GET: userId에 해당하는 데이터 전체 로드
  if (req.method === 'GET') {
    const userId = req.query?.userId;
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const { data, error } = await supabase
      .from('user_sync')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) return res.status(500).json({ error: error.message });
    if (!data)  return res.status(200).json({});

    return res.status(200).json({
      bodyRecords:    data.body_records    ?? [],
      workoutRecords: data.workout_records ?? [],
      calendarData:   data.calendar_data   ?? {},
      goal:           data.goal            ?? '근력_상승',
    });
  }

  // POST: 데이터 전체 upsert
  if (req.method === 'POST') {
    const { userId, bodyRecords, workoutRecords, calendarData, goal } = req.body || {};
    if (!userId) return res.status(400).json({ error: 'userId required' });

    const { error } = await supabase
      .from('user_sync')
      .upsert({
        user_id:         userId,
        body_records:    bodyRecords    ?? [],
        workout_records: workoutRecords ?? [],
        calendar_data:   calendarData   ?? {},
        goal:            goal           ?? '근력_상승',
        updated_at:      new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
