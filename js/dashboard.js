// Navigation & Dashboard Protection Logic
document.addEventListener("DOMContentLoaded", async () => {
    const { data } = await supabaseClient.auth.getUser();

    if (!data.user) {
        window.location.href = "index.html";
        return;
    }

    // Update UI with user info
    const userDisplay = document.getElementById('user-display-name');
    if (userDisplay) {
        userDisplay.textContent = data.user.email.split('@')[0];
    }

    // Mobile Menu Toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.querySelector('.sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    function toggleMenu() {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
    }

    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMenu);
    }

    if (overlay) {
        overlay.addEventListener('click', toggleMenu);
    }

    // Tab Switching Logic
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            const targetId = item.id.replace('nav-', 'section-');

            // Close mobile menu if open
            if (sidebar.classList.contains('open')) {
                toggleMenu();
            }

            // Update Active Nav
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Show Target Section
            sections.forEach(section => {
                section.style.display = section.id === targetId ? 'block' : 'none';
            });

            // Page Title Update
            const pageTitle = item.querySelector('span').textContent;
            document.title = `${pageTitle} | HabitFlow`;
        });
    });
});
