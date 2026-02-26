// Realtime Subscriptions
async function setupRealtime() {
    if (!window.supabase || !supabaseClient) return;
    console.log('Setting up Supabase Realtime subscriptions...');

    // Habit logs: when a log is added/removed/updated, refresh habits & calendar
    supabaseClient.channel('realtime-habit-logs')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_logs' }, payload => {
            console.log('habit_logs change:', payload.event, payload.new || payload.old);
            if (typeof fetchHabits === 'function') fetchHabits();
            if (typeof loadCalendarData === 'function') loadCalendarData();
        })
        .subscribe();

    // Habits: when habits change, refresh habits list
    supabaseClient.channel('realtime-habits')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'habits' }, payload => {
            console.log('habits change:', payload.event, payload.new || payload.old);
            if (typeof fetchHabits === 'function') fetchHabits();
        })
        .subscribe();

    // Tasks: refresh tasks & calendar when tasks change
    supabaseClient.channel('realtime-tasks')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, payload => {
            console.log('tasks change:', payload.event, payload.new || payload.old);
            if (typeof fetchTasks === 'function') fetchTasks();
            if (typeof loadCalendarData === 'function') loadCalendarData();
        })
        .subscribe();

    // Notifications: refresh notifications when new ones arrive
    supabaseClient.channel('realtime-notifications')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
            console.log('New notification arrived:', payload.new);
            if (window.NotificationsUI && window.NotificationsUI.loadAndRender) {
                window.NotificationsUI.loadAndRender();
            }
        })
        .subscribe();
}

setupRealtime();
