// Auth Logic
async function signup() {
    const email = document.getElementById("signup-email") ? document.getElementById("signup-email").value : document.getElementById("email").value;
    const password = document.getElementById("signup-password") ? document.getElementById("signup-password").value : document.getElementById("password").value;
    const username = document.getElementById("signup-username") ? document.getElementById("signup-username").value.trim() : '';

    const { error } = await supabaseClient.auth.signUp({
        email,
        password
    }, { data: { username } });

    if (error) {
        alert(error.message);
    } else {
        alert('Signup successful! Please check your email to confirm.');
        // redirect after short delay
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 500);
    }
}

async function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) {
        alert(error.message);
    } else {
        window.location.href = "dashboard.html";
    }
}

async function logout() {
    const { error } = await supabaseClient.auth.signOut();
    if (error) alert(error.message);
    window.location.href = "index.html";
}

// Make them globally accessible for onclick attributes
window.signup = signup;
window.login = login;
window.logout = logout;

// Event Listeners for existing UI components
document.addEventListener('DOMContentLoaded', () => {
    const btnLogin = document.getElementById('btn-login');
    const btnSignup = document.getElementById('btn-signup');
    const btnLogout = document.getElementById('btn-logout');

    if (btnLogin) btnLogin.addEventListener('click', login);
    if (btnSignup) btnSignup.addEventListener('click', signup);
    if (btnLogout) btnLogout.addEventListener('click', logout);
});
