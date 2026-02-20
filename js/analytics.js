// Analytics Logic — Live Charts using Chart.js + Supabase data
let taskStatusChart = null;
let taskPriorityChart = null;
let habitWeeklyChart = null;

async function loadAnalytics() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    // Fetch tasks
    const { data: tasks } = await supabaseClient
        .from('tasks')
        .select('*')
        .eq('user_id', user.id);

    // Fetch habits
    const { data: habits } = await supabaseClient
        .from('habits')
        .select('*')
        .eq('user_id', user.id);

    // Fetch habit logs for last 7 days
    const now = new Date();
    const dates = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().split('T')[0]);
    }

    const habitIds = habits ? habits.map(h => h.id) : [];
    let logs = [];
    if (habitIds.length > 0) {
        const { data } = await supabaseClient
            .from('habit_logs')
            .select('completed_date')
            .in('habit_id', habitIds)
            .gte('completed_date', dates[0])
            .lte('completed_date', dates[6]);
        logs = data || [];
    }

    // --- Chart 1: Task Status (Doughnut) ---
    const pending = (tasks || []).filter(t => t.status === 'pending').length;
    const completed = (tasks || []).filter(t => t.status === 'completed').length;

    const ctx1 = document.getElementById('chart-task-status');
    if (ctx1) {
        if (taskStatusChart) taskStatusChart.destroy();
        taskStatusChart = new Chart(ctx1, {
            type: 'doughnut',
            data: {
                labels: ['Pending', 'Completed'],
                datasets: [{
                    data: [pending, completed],
                    backgroundColor: ['rgba(244, 63, 94, 0.8)', 'rgba(16, 185, 129, 0.8)'],
                    borderColor: ['rgba(244, 63, 94, 1)', 'rgba(16, 185, 129, 1)'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } }
                }
            }
        });
    }

    // --- Chart 2: Task Priority (Bar) ---
    const high = (tasks || []).filter(t => t.priority === 'High').length;
    const medium = (tasks || []).filter(t => t.priority === 'Medium').length;
    const low = (tasks || []).filter(t => t.priority === 'Low').length;

    const ctx2 = document.getElementById('chart-task-priority');
    if (ctx2) {
        if (taskPriorityChart) taskPriorityChart.destroy();
        taskPriorityChart = new Chart(ctx2, {
            type: 'bar',
            data: {
                labels: ['High', 'Medium', 'Low'],
                datasets: [{
                    label: 'Tasks',
                    data: [high, medium, low],
                    backgroundColor: ['rgba(244, 63, 94, 0.7)', 'rgba(99, 102, 241, 0.7)', 'rgba(16, 185, 129, 0.7)'],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true, ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
                },
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    // --- Chart 3: Habit Completion Last 7 Days (Line) ---
    const dayLabels = dates.map(d => {
        const dt = new Date(d + 'T00:00:00');
        return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    });

    const logCounts = dates.map(d => logs.filter(l => l.completed_date === d).length);

    const ctx3 = document.getElementById('chart-habit-weekly');
    if (ctx3) {
        if (habitWeeklyChart) habitWeeklyChart.destroy();
        habitWeeklyChart = new Chart(ctx3, {
            type: 'line',
            data: {
                labels: dayLabels,
                datasets: [{
                    label: 'Habits Completed',
                    data: logCounts,
                    borderColor: 'rgba(99, 102, 241, 1)',
                    backgroundColor: 'rgba(99, 102, 241, 0.15)',
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#6366f1',
                    pointBorderColor: '#fff',
                    pointRadius: 5,
                    pointHoverRadius: 8
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: { beginAtZero: true, ticks: { color: '#94a3b8', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
                },
                plugins: {
                    legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } }
                }
            }
        });
    }
}

document.getElementById('nav-analytics').addEventListener('click', loadAnalytics);
