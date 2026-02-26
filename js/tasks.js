// Tasks Logic
async function fetchTasks() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const { data: tasks, error } = await supabaseClient
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching tasks:', error);
        return;
    }

    renderTasks(tasks);
    renderDashboardPendingTasks(tasks);
    updateDashboardStats(tasks);
}

function renderTasks(tasks) {
    const tasksList = document.getElementById('tasks-list-full');
    if (!tasksList) return;

    tasksList.innerHTML = '';

    if (tasks.length === 0) {
        tasksList.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 3rem;">No tasks yet. Add one above!</p>`;
        return;
    }

    tasks.forEach(task => {
        const card = document.createElement('div');
        card.className = 'glass-card item-card animate-fade-in';
        card.innerHTML = `
            <div class="item-header">
                <div>
                    <span class="tag ${task.priority}">${task.priority}</span>
                    <h4 style="margin-top: 0.5rem; ${task.status === 'completed' ? 'text-decoration: line-through; opacity: 0.6;' : ''}">${task.title}</h4>
                </div>
                <button class="btn btn-secondary toggle-task-btn" data-id="${task.id}" data-status="${task.status}" style="width: auto; padding: 0.5rem;">
                    <i class="fas ${task.status === 'completed' ? 'fa-check-circle' : 'fa-circle'}" style="${task.status === 'completed' ? 'color: var(--success);' : ''}"></i>
                </button>
            </div>
            <p style="font-size: 0.875rem; color: var(--text-muted);">${task.description || 'No description'}</p>
            <div style="margin-top: 1rem; display: flex; justify-content: space-between; align-items: center; font-size: 0.75rem;">
                <span>Due: ${task.due_date || 'No date'}</span>
                <span style="text-transform: capitalize;">${task.status}</span>
            </div>
        `;
        tasksList.appendChild(card);
    });

    // Add toggle listeners
    document.querySelectorAll('#tasks-list-full .toggle-task-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');
            const currentStatus = btn.getAttribute('data-status');
            const newStatus = currentStatus === 'pending' ? 'completed' : 'pending';

            // fetch title for notification
            let titleText = '';
            try {
                const { data: taskData, error: tErr } = await supabaseClient.from('tasks').select('title').eq('id', id).single();
                if (!tErr && taskData) titleText = taskData.title || '';
            } catch (e) { /* ignore */ }

            const { error } = await supabaseClient
                .from('tasks')
                .update({ status: newStatus })
                .eq('id', id);

            if (!error) {
                fetchTasks();
                if (newStatus === 'completed') {
                    console.log('Task marked complete, creating notification...');
                    if (window.NotificationsUI && window.NotificationsUI.createNotification) {
                        console.log('NotificationsUI available, creating notification');
                        window.NotificationsUI.createNotification({ type: 'task_completed', title: `Task completed: ${titleText || 'Task'}`, body: titleText || '', task_id: id });
                        if (NotificationsUI.loadAndRenderSection) {
                            NotificationsUI.loadAndRenderSection();
                        }
                    } else {
                        console.warn('NotificationsUI not available or createNotification not found');
                    }
                }
            }
        });
    });
}

function renderDashboardPendingTasks(tasks) {
    const container = document.getElementById('dashboard-pending-tasks');
    if (!container) return;

    const pending = tasks.filter(t => t.status === 'pending');
    container.innerHTML = '';

    if (pending.length === 0) {
        container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">All caught up! No pending tasks.</p>`;
        return;
    }

    pending.slice(0, 6).forEach(task => {
        const card = document.createElement('div');
        card.className = 'glass-card item-card animate-fade-in';
        card.innerHTML = `
            <div class="item-header">
                <div>
                    <span class="tag ${task.priority}">${task.priority}</span>
                    <h4 style="margin-top: 0.5rem;">${task.title}</h4>
                </div>
                <button class="btn btn-secondary dash-toggle-btn" data-id="${task.id}" style="width: auto; padding: 0.5rem;">
                    <i class="fas fa-check"></i>
                </button>
            </div>
            <p style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.5rem;">${task.due_date ? 'Due: ' + task.due_date : 'No due date'}</p>
        `;
        container.appendChild(card);
    });

    document.querySelectorAll('.dash-toggle-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const id = btn.getAttribute('data-id');

            let titleText = '';
            try {
                const { data: taskData, error: tErr } = await supabaseClient.from('tasks').select('title').eq('id', id).single();
                if (!tErr && taskData) titleText = taskData.title || '';
            } catch (e) { /* ignore */ }

            const { error } = await supabaseClient
                .from('tasks')
                .update({ status: 'completed' })
                .eq('id', id);
            if (!error) {
                fetchTasks();
                if (newStatus === 'completed') {
                    console.log('Task marked complete, creating notification...');
                    if (window.NotificationsUI && window.NotificationsUI.createNotification) {
                        console.log('NotificationsUI available, creating notification');
                        window.NotificationsUI.createNotification({ type: 'task_completed', title: `Task completed: ${titleText || 'Task'}`, body: titleText || '', task_id: id });
                        if (NotificationsUI.loadAndRenderSection) {
                            NotificationsUI.loadAndRenderSection();
                        }
                    } else {
                        console.warn('NotificationsUI not available or createNotification not found');
                    }
                }
            }
        });
    });
}

function updateDashboardStats(tasks) {
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const pending = tasks.filter(t => t.status === 'pending').length;
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

    const statCompletion = document.getElementById('stat-completion');
    const statFill = document.getElementById('stat-completion-fill');
    const statPending = document.getElementById('stat-pending');

    if (statCompletion) statCompletion.textContent = pct + '%';
    if (statFill) statFill.style.width = pct + '%';
    if (statPending) statPending.textContent = pending;
}

async function addTaskFromMain() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    const titleInput = document.getElementById("mainTaskTitle");
    const descInput = document.getElementById("mainTaskDesc");
    const priorityInput = document.getElementById("mainTaskPriority");
    const dueInput = document.getElementById("mainTaskDue");

    const title = titleInput.value;

    if (!title) {
        alert("Enter a task title");
        return;
    }

    const { error } = await supabaseClient.from("tasks").insert([
        {
            title: title,
            description: descInput ? descInput.value : null,
            priority: priorityInput ? priorityInput.value : 'Medium',
            due_date: dueInput && dueInput.value ? dueInput.value : null,
            user_id: user.id,
            status: 'pending'
        }
    ]);

    if (error) {
        alert(error.message);
    } else {
        titleInput.value = "";
        if (descInput) descInput.value = "";
        if (priorityInput) priorityInput.value = "Medium";
        if (dueInput) dueInput.value = "";
        fetchTasks();
    }
}

// Initial fetch when nav to tasks
const navTasksEl = document.getElementById('nav-tasks');
if (navTasksEl) navTasksEl.addEventListener('click', fetchTasks);
const navDashboardForTasks = document.getElementById('nav-dashboard');
if (navDashboardForTasks) navDashboardForTasks.addEventListener('click', fetchTasks);
document.addEventListener('DOMContentLoaded', fetchTasks);

// Expose to window
window.addTaskFromMain = addTaskFromMain;
