class Notifications {
    static container;
    static initialized = false;

    static initialize() {
        if (this.initialized) return;

        this.container = document.createElement('div');
        this.container.className = 'notifications-container';
        document.body.appendChild(this.container);

        this.initialized = true;
    }

    static show(message, type = 'success') {
        this.initialize();

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-icon">
                ${type === 'success' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-exclamation-circle"></i>'}
            </div>
            <div class="notification-message">${message}</div>
        `;

        this.container.appendChild(notification);

        // Auto-remove após 3 segundos
        setTimeout(() => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    static success(message) {
        this.show(message, 'success');
    }

    static error(message) {
        this.show(message, 'error');
    }
}