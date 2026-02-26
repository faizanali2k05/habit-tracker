// Frontend notifications helper for Habit Tracker
// Expects a global `supabaseClient` instance and DOM elements:
// - #notif-button (click to toggle list)
// - #notif-count (show unread count)
// - #notif-list (container for notification items)

(function () {
  const POLL_INTERVAL = 30000; // 30s

  function qs(id) { return document.getElementById(id); }

  async function fetchNotifications() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    console.log('Fetching notifications for user:', user?.id);
    const { data, error } = await supabaseClient
      .from('notifications')
      .select('id, type, title, body, read, created_at, task_id, habit_id')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false }); // no limit

    if (error) {
      console.error('Failed to load notifications', error);
      return [];
    }
    console.log('Notifications fetched:', data?.length || 0, 'items');
    return data || [];
  }

  function formatTime(iso) {
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  }

  // render into provided container; if no container passed use the header list
  function updateBellColor(unread) {
    const btn = qs('notif-button');
    if (!btn) return;
    btn.classList.remove('bell-red','bell-green');
    if (unread > 0) btn.classList.add('bell-red');
    else btn.classList.add('bell-green');
  }

  function renderNotifications(list, containerEl) {
    const container = containerEl || qs('notif-list');
    const countEl = qs('notif-count');
    if (!container) return;

    const unread = list.filter(n => !n.read).length;
    // update badge only when rendering header
    if (countEl) {
      countEl.textContent = unread > 0 ? String(unread) : '';
    }
    // always update bell color when header is present
    updateBellColor(unread);

    container.innerHTML = '';

    if (list.length === 0) {
      const li = document.createElement('li');
      li.textContent = 'No notifications';
      container.appendChild(li);
      return;
    }

    for (const n of list) {
      const li = document.createElement('li');
      li.className = 'notif-item' + (n.read ? ' read' : ' unread');

      const title = document.createElement('div');
      title.className = 'notif-title';
      title.textContent = n.title || (n.type || 'Notification');

      const body = document.createElement('div');
      body.className = 'notif-body';
      body.textContent = n.body || '';

      const meta = document.createElement('div');
      meta.className = 'notif-meta';
      meta.textContent = formatTime(n.created_at || n.createdAt || '');

      const actions = document.createElement('div');
      actions.className = 'notif-actions';

      if (!n.read) {
        const btnRead = document.createElement('button');
        btnRead.textContent = 'Mark read';
        btnRead.className = 'notif-action-btn';
        btnRead.addEventListener('click', async (e) => {
          e.stopPropagation();
          await markRead(n.id);
          loadAndRender();
        });
        actions.appendChild(btnRead);
      }



      li.appendChild(title);
      li.appendChild(body);
      li.appendChild(meta);
      li.appendChild(actions);

      // optional click to navigate to task/habit
      li.addEventListener('click', () => {
        if (n.task_id) window.location.href = `dashboard.html?task=${n.task_id}`;
        else if (n.habit_id) window.location.href = `dashboard.html?habit=${n.habit_id}`;
      });

      container.appendChild(li);
    }
  }

  async function markRead(id) {
    const { error } = await supabaseClient.from('notifications').update({ read: true }).eq('id', id);
    if (error) console.error('Failed marking notification read', error);
    else {
      if (window.NotificationsUI && NotificationsUI.loadAndRenderSection) {
        NotificationsUI.loadAndRenderSection();
      }
    }
  }

  async function markAllAsRead() {
    const list = await fetchNotifications();
    const unreadIds = list.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) {
      alert('All notifications already marked as read');
      return;
    }
    for (const id of unreadIds) {
      const { error } = await supabaseClient.from('notifications').update({ read: true }).eq('id', id);
      if (error) console.error('Failed marking read:', id, error);
    }
    await loadAndRender();
    if (window.NotificationsUI && NotificationsUI.loadAndRenderSection) {
      await NotificationsUI.loadAndRenderSection();
    }
  }

  async function loadAndRender() {
    const list = await fetchNotifications();
    renderNotifications(list);
  }

  // load notifications into a dedicated section list (used when user navigates)
  async function loadAndRenderSection() {
    const list = await fetchNotifications();
    const sectionContainer = qs('notif-section-list');
    renderNotifications(list, sectionContainer);
    
    // attach mark-all-read button
    const markAllBtn = qs('notif-mark-all-read-btn');
    if (markAllBtn && !markAllBtn.dataset.attached) {
      markAllBtn.addEventListener('click', markAllAsRead);
      markAllBtn.dataset.attached = 'true';
    }
  }

  function setupUI() {
    const btn = qs('notif-button');
    const list = qs('notif-list');
    if (!btn || !list) return;

    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      // ensure permission requested on first click
      if (Notification.permission !== 'granted') {
        requestNotificationPermission();
      }
      if (!list.classList.contains('open')) {
        // opening menu; refresh content
        await loadAndRender();
      }
      list.classList.toggle('open');
    });

    document.addEventListener('click', () => { list.classList.remove('open'); });
  }

  // Public init
  async function init() {
    setupUI();
    requestNotificationPermission();
    await loadAndRender();
    setInterval(loadAndRender, POLL_INTERVAL);
  }

  document.addEventListener('DOMContentLoaded', init);

  // expose for debugging
  async function createNotification({ type = 'info', title = '', body = '', task_id = null, habit_id = null }) {
    try {
      console.log('createNotification called with:', { type, title, body, task_id, habit_id });
      // ensure we have a user id to satisfy RLS
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) throw new Error('No user logged in');
      const payload = {
        user_id: user.id,
        type,
        title,
        body,
        read: false,
        task_id,
        habit_id,
      };
      console.log('Inserting notification payload:', payload);
      const { error } = await supabaseClient.from('notifications').insert([payload]);
      if (error) throw error;
      console.log('notification saved successfully', payload);
      // show immediate browser notification if permission granted
      showNotification(title, { body });
      // refresh UI
      await loadAndRender();
      if (window.NotificationsUI && NotificationsUI.loadAndRenderSection) {
        await NotificationsUI.loadAndRenderSection();
      }
    } catch (err) {
      console.error('Failed creating notification', err);
    }
  }

  window.NotificationsUI = { loadAndRender, loadAndRenderSection, markRead, markAllAsRead, createNotification };
})();
// Notifications Logic
function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission();
    }
}

function showNotification(title, options) {
    if (Notification.permission === 'granted') {
        new Notification(title, options);
    }
}

console.log('Notifications module loaded');
