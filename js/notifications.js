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
