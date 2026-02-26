// Habits Logic
const saveHabitBtn = document.getElementById('save-habit');

// Helper to format local date as YYYY-MM-DD (avoids UTC shift from toISOString)
function formatDateLocal(d = new Date()) {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

let habitListenerAttached = false;

async function fetchHabits() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const { data: habits, error } = await supabaseClient
        .from('habits')
        .select('*')
        .eq('user_id', user.id);

    if (error) {
        console.error('Error fetching habits:', error);
        return;
    }

    // Load today's logs (use local date to avoid timezone issues)
    const today = formatDateLocal();
    const habitIds = habits.map(h => h.id);
    let todayLogs = [];

    if (habitIds.length > 0) {
        const { data: logs } = await supabaseClient
            .from('habit_logs')
            .select('habit_id')
            .in('habit_id', habitIds)
            .eq('completed_date', today);
        todayLogs = logs || [];
    }

    const loggedIds = todayLogs.map(l => l.habit_id);

    renderHabits(habits, loggedIds);
    renderDashboardHabits(habits, loggedIds);
    updateHabitsStat(habits, loggedIds);
}

function renderHabits(habits, loggedIds) {
    const habitsListFull = document.getElementById('habits-list-full');
    if (!habitsListFull) return;

    habitsListFull.innerHTML = '';
    if (habits.length === 0) {
        habitsListFull.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;">No habits tracked yet. Click the button above to start your first one!</p>`;
        return;
    }

    habits.forEach(habit => {
        const logged = loggedIds.includes(habit.id);
        const card = document.createElement('div');
        card.className = 'glass-card item-card animate-fade-in';
        card.innerHTML = `
            <div class="item-header">
                <div>
                    <span class="tag">${habit.frequency || 'Daily'}</span>
                    <h4 style="margin-top: 0.5rem; ${logged ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${habit.name}</h4>
                </div>
                <button class="btn btn-secondary log-habit-btn" data-id="${habit.id}" style="width: auto; padding: 0.5rem; ${logged ? 'opacity: 0.4; pointer-events: none;' : ''}">
                    <i class="fas fa-check" style="${logged ? 'color: var(--success);' : ''}"></i>
                </button>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem;">${logged ? 'Completed today!' : 'Tap check to log'}</p>
        `;
        habitsListFull.appendChild(card);
    });

    attachHabitLogListeners();
}

function renderDashboardHabits(habits, loggedIds) {
    const container = document.getElementById('dashboard-habits-preview');
    if (!container) return;

    container.innerHTML = '';
    if (habits.length === 0) {
        container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">No habits yet. Go to Habits to add one!</p>`;
        return;
    }

    habits.forEach(habit => {
        const logged = loggedIds.includes(habit.id);
        const card = document.createElement('div');
        card.className = 'glass-card item-card animate-fade-in';
        card.innerHTML = `
            <div class="item-header">
                <div>
                    <span class="tag">${habit.frequency || 'Daily'}</span>
                    <h4 style="margin-top: 0.5rem; ${logged ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${habit.name}</h4>
                </div>
                <button class="btn btn-secondary log-habit-btn" data-id="${habit.id}" style="width: auto; padding: 0.5rem; ${logged ? 'opacity: 0.4; pointer-events: none;' : ''}">
                    <i class="fas fa-check" style="${logged ? 'color: var(--success);' : ''}"></i>
                </button>
            </div>
        `;
        container.appendChild(card);
    });

    attachHabitLogListeners();
}

function updateHabitsStat(habits, loggedIds) {
    const stat = document.getElementById('stat-habits-today');
    if (stat) {
        stat.textContent = `${loggedIds.length} / ${habits.length}`;
    }
}

function attachHabitLogListeners() {
    // Use event delegation and attach only once to avoid duplicate listeners
    if (habitListenerAttached) return;
    habitListenerAttached = true;

    document.addEventListener('click', async (e) => {
        const btn = e.target.closest && e.target.closest('.log-habit-btn');
        if (!btn) return;

        const habitId = btn.getAttribute('data-id');
        if (!habitId) return; // guard against empty ids
        const today = formatDateLocal();

        // fetch habit name for notification
        let habitName = '';
        try {
            const { data: habitData, error: hErr } = await supabaseClient.from('habits').select('name').eq('id', habitId).single();
            if (!hErr && habitData) habitName = habitData.name || '';
        } catch (e) { /* ignore */ }

        const { error } = await supabaseClient
            .from('habit_logs')
            .insert([{ habit_id: habitId, completed_date: today }]);

        if (error) {
            alert(error.message);
        } else {
            fetchHabits();
            console.log('Habit logged, creating notification...');
            if (window.NotificationsUI && window.NotificationsUI.createNotification) {
                console.log('NotificationsUI available, creating habit notification');
                window.NotificationsUI.createNotification({ type: 'habit_completed', title: `Habit completed: ${habitName || 'Habit'}`, body: habitName || '', habit_id: habitId });
                if (NotificationsUI.loadAndRenderSection) {
                    NotificationsUI.loadAndRenderSection();
                }
            } else {
                console.warn('NotificationsUI not available for habit notification');
            }
        }
    });
}

if (saveHabitBtn) {
    saveHabitBtn.addEventListener('click', async () => {
        const nameInput = document.getElementById('habit-name');
        const goalInput = document.getElementById('habit-goal');
        const name = nameInput.value;
        const { data: { user } } = await supabaseClient.auth.getUser();

        if (!name || !user) {
            alert("Please enter a habit title");
            return;
        }

        const { error } = await supabaseClient
            .from('habits')
            .insert([{
                name: name,
                user_id: user.id,
                frequency: 'Daily',
                goal: goalInput ? goalInput.value || null : null
            }]);

        if (error) {
            alert(error.message);
        } else {
            nameInput.value = '';
            document.getElementById('habit-modal').style.display = 'none';
            fetchHabits();
        }
    });
}

// Initial fetch & listener
document.addEventListener('DOMContentLoaded', fetchHabits);
const navHabits = document.getElementById('nav-habits');
if (navHabits) navHabits.addEventListener('click', fetchHabits);
const navDashboardForHabits = document.getElementById('nav-dashboard');
if (navDashboardForHabits) navDashboardForHabits.addEventListener('click', fetchHabits);
