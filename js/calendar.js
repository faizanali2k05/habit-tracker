// Calendar Logic — Full interactive calendar synced with Supabase
let calCurrentDate = new Date();
let calTasks = [];
let calHabitLogs = [];

async function loadCalendarData() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    // Fetch all tasks
    const { data: tasks } = await supabaseClient
        .from('tasks')
        .select('*')
        .eq('user_id', user.id);
    calTasks = tasks || [];

    // Fetch all habit logs with habit names
    const { data: habits } = await supabaseClient
        .from('habits')
        .select('id, name')
        .eq('user_id', user.id);

    const habitIds = (habits || []).map(h => h.id);
    let logs = [];
    if (habitIds.length > 0) {
        const { data } = await supabaseClient
            .from('habit_logs')
            .select('*')
            .in('habit_id', habitIds);
        logs = data || [];
    }

    // Attach habit name to each log
    calHabitLogs = logs.map(log => {
        const habit = (habits || []).find(h => h.id === log.habit_id);
        return { ...log, habit_name: habit ? habit.name : 'Unknown' };
    });

    renderCalendar();
}

function renderCalendar() {
    const grid = document.getElementById('calendar-grid');
    const monthLabel = document.getElementById('cal-month-year');
    if (!grid || !monthLabel) return;

    const year = calCurrentDate.getFullYear();
    const month = calCurrentDate.getMonth();
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    monthLabel.textContent = `${monthNames[month]} ${year}`;

    grid.innerHTML = '';

    // Day headers
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    days.forEach(d => {
        const hdr = document.createElement('div');
        hdr.style.cssText = 'padding: 0.5rem; font-size: 0.75rem; font-weight: 600; color: var(--text-muted);';
        hdr.textContent = d;
        grid.appendChild(hdr);
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
        const empty = document.createElement('div');
        grid.appendChild(empty);
    }

    // Day cells
    for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
        const cell = document.createElement('div');
        cell.style.cssText = 'padding: 0.5rem; border-radius: 0.5rem; cursor: pointer; transition: all 0.2s; position: relative; min-height: 40px; display: flex; flex-direction: column; align-items: center; justify-content: center;';

        // Highlight today
        if (dateStr === todayStr) {
            cell.style.background = 'var(--primary)';
            cell.style.color = 'white';
            cell.style.fontWeight = '700';
        } else {
            cell.style.background = 'var(--glass)';
        }

        // Check if there are events on this date
        const taskCount = calTasks.filter(t => t.due_date === dateStr).length;
        const logCount = calHabitLogs.filter(l => l.completed_date === dateStr).length;

        cell.innerHTML = `<span>${d}</span>`;
        if (taskCount > 0 || logCount > 0) {
            cell.innerHTML += `<div style="display: flex; gap: 3px; margin-top: 2px;">
                ${taskCount > 0 ? '<span style="width: 6px; height: 6px; border-radius: 50%; background: #f43f5e;"></span>' : ''}
                ${logCount > 0 ? '<span style="width: 6px; height: 6px; border-radius: 50%; background: #10b981;"></span>' : ''}
            </div>`;
        }

        cell.addEventListener('click', () => showDayEvents(dateStr));
        cell.addEventListener('mouseenter', () => { if (dateStr !== todayStr) cell.style.background = 'rgba(99,102,241,0.3)'; });
        cell.addEventListener('mouseleave', () => { if (dateStr !== todayStr) cell.style.background = 'var(--glass)'; });

        grid.appendChild(cell);
    }
}

function showDayEvents(dateStr) {
    const container = document.getElementById('cal-events-list');
    const dateLabel = document.getElementById('cal-selected-date');
    if (!container || !dateLabel) return;

    const d = new Date(dateStr + 'T00:00:00');
    dateLabel.textContent = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    const dayTasks = calTasks.filter(t => t.due_date === dateStr);
    const dayLogs = calHabitLogs.filter(l => l.completed_date === dateStr);

    container.innerHTML = '';

    if (dayTasks.length === 0 && dayLogs.length === 0) {
        container.innerHTML = `<p style="color: var(--text-muted);">No events on this date.</p>`;
        return;
    }

    dayTasks.forEach(task => {
        const el = document.createElement('div');
        el.style.cssText = 'padding: 0.75rem; border-left: 3px solid #f43f5e; background: var(--glass); border-radius: 0.5rem; margin-bottom: 0.5rem;';
        el.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <strong>${task.title}</strong>
                <span class="tag ${task.priority}" style="font-size: 0.7rem;">${task.priority}</span>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem;">${task.description || ''}</p>
            <span style="font-size: 0.7rem; text-transform: capitalize; color: ${task.status === 'completed' ? 'var(--success)' : 'var(--accent)'};">${task.status}</span>
        `;
        container.appendChild(el);
    });

    dayLogs.forEach(log => {
        const el = document.createElement('div');
        el.style.cssText = 'padding: 0.75rem; border-left: 3px solid #10b981; background: var(--glass); border-radius: 0.5rem; margin-bottom: 0.5rem;';
        el.innerHTML = `
            <strong>${log.habit_name}</strong>
            <p style="font-size: 0.8rem; color: var(--success); margin-top: 0.25rem;">Habit completed</p>
        `;
        container.appendChild(el);
    });
}

// Navigation
document.getElementById('cal-prev').addEventListener('click', () => {
    calCurrentDate.setMonth(calCurrentDate.getMonth() - 1);
    renderCalendar();
});

document.getElementById('cal-next').addEventListener('click', () => {
    calCurrentDate.setMonth(calCurrentDate.getMonth() + 1);
    renderCalendar();
});

document.getElementById('nav-calendar').addEventListener('click', loadCalendarData);
