import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async () => {
  const supabase = createClient(
    // Use non-reserved env var names (Dashboard disallows names starting with SUPABASE_)
    Deno.env.get('PROJECT_URL')!,
    Deno.env.get('SERVICE_ROLE_KEY')!
  )

  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];

    // 1) TASK REMINDERS: pending tasks due today, send up to 8 reminders spaced 3 hours apart
    const { data: tasks } = await supabase
      .from('tasks')
      .select('id, user_id, title, reminder_count, last_reminder_sent_at, due_date, due_at, status')
      .or(`and(status.eq.pending,due_date.eq.${today}),and(status.eq.pending,due_at::date.eq.${today}))`)

    if (tasks && tasks.length) {
      for (const t of tasks as any[]) {
        // skip completed
        if (t.status !== 'pending') continue;

        const sentToday = await supabase.from('notifications').select('*', {count:'exact'}).eq('task_id', t.id).eq('type','task_reminder').gte('created_at', today + 'T00:00:00Z');
        const countToday = (sentToday.data && sentToday.data.length) || 0;
        if (countToday >= 8) continue;

        // check last reminder time
        if (t.last_reminder_sent_at) {
          const last = new Date(t.last_reminder_sent_at);
          if ((now.getTime() - last.getTime()) < (3 * 60 * 60 * 1000)) continue; // not yet 3h
        }

        // create notification
        await supabase.from('notifications').insert([{
          user_id: t.user_id,
          type: 'task_reminder',
          title: 'Pending task reminder',
          body: `You have a pending task: ${t.title}`,
          task_id: t.id
        }]);

        // increment reminder_count and set last_reminder_sent_at
        await supabase.from('tasks').update({ reminder_count: (t.reminder_count || 0) + 1, last_reminder_sent_at: new Date().toISOString() }).eq('id', t.id);
      }
    }

    // 2) HABIT REMINDERS: for habits with no log today, up to 8 reminders per habit per day
    const { data: habits } = await supabase.from('habits').select('id, user_id, name');
    if (habits && habits.length) {
      for (const h of habits as any[]) {
        // check logs today
        const { data: logs } = await supabase.from('habit_logs').select('*').eq('habit_id', h.id).eq('completed_date', today);
        if (logs && logs.length > 0) continue; // already logged

        const sentToday = await supabase.from('notifications').select('*', {count:'exact'}).eq('habit_id', h.id).eq('type','habit_reminder').gte('created_at', today + 'T00:00:00Z');
        const countToday = (sentToday.data && sentToday.data.length) || 0;
        if (countToday >= 8) continue;

        // find last reminder for this habit
        const { data: lastNotifs } = await supabase.from('notifications').select('created_at').eq('habit_id', h.id).eq('type','habit_reminder').order('created_at', {ascending:false}).limit(1);
        if (lastNotifs && lastNotifs.length) {
          const last = new Date(lastNotifs[0].created_at);
          if ((now.getTime() - last.getTime()) < (3 * 60 * 60 * 1000)) continue; // less than 3h
        }

        await supabase.from('notifications').insert([{
          user_id: h.user_id,
          type: 'habit_reminder',
          title: 'Habit reminder',
          body: `Don't forget your habit: ${h.name}`,
          habit_id: h.id
        }]);
      }
    }

    return new Response('Reminders generated');
  } catch (err) {
    console.error(err);
    return new Response('Error', { status: 500 });
  }
})
