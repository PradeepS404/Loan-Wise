/* ===========================
   LoanWise AI — Utility Functions
   =========================== */

// ---- Storage Layer (simulates backend) ----
const DB = {
    getUsers() {
        return JSON.parse(localStorage.getItem('lw_users') || '[]');
    },
    saveUsers(users) {
        localStorage.setItem('lw_users', JSON.stringify(users));
    },
    getApplications() {
        return JSON.parse(localStorage.getItem('lw_applications') || '[]');
    },
    saveApplications(apps) {
        localStorage.setItem('lw_applications', JSON.stringify(apps));
    },
    getAuditLogs() {
        return JSON.parse(localStorage.getItem('lw_audit_logs') || '[]');
    },
    saveAuditLogs(logs) {
        localStorage.setItem('lw_audit_logs', JSON.stringify(logs));
    },
    getCurrentUser() {
        const token = localStorage.getItem('lw_token');
        if (!token) return null;
        try {
            return JSON.parse(atob(token));
        } catch {
            return null;
        }
    },
    setCurrentUser(user) {
        if (user) {
            localStorage.setItem('lw_token', btoa(JSON.stringify(user)));
        } else {
            localStorage.removeItem('lw_token');
        }
    },
    init() {
        // Seed admin user if not exists
        const users = this.getUsers();
        if (!users.find(u => u.email === 'admin@loanwise.com')) {
            users.push({
                id: 'admin-001',
                name: 'Admin',
                email: 'admin@loanwise.com',
                password: 'admin123',
                role: 'admin',
                createdAt: new Date().toISOString()
            });
            this.saveUsers(users);
        }
    }
};

// Initialize DB
DB.init();

// ---- Auth Functions ----
const Auth = {
    signup(name, email, password, phone) {
        const users = DB.getUsers();
        if (users.find(u => u.email === email)) {
            return { success: false, error: 'Email already registered' };
        }

        const user = {
            id: 'user-' + Date.now(),
            name,
            email,
            password,
            phone: phone || '',
            role: 'user',
            createdAt: new Date().toISOString()
        };
        users.push(user);
        DB.saveUsers(users);

        const safeUser = { ...user };
        delete safeUser.password;
        DB.setCurrentUser(safeUser);

        return { success: true, user: safeUser };
    },

    login(email, password) {
        const users = DB.getUsers();
        const user = users.find(u => u.email === email && u.password === password);
        if (!user) {
            return { success: false, error: 'Invalid email or password' };
        }

        const safeUser = { ...user };
        delete safeUser.password;
        DB.setCurrentUser(safeUser);

        return { success: true, user: safeUser };
    },

    logout() {
        DB.setCurrentUser(null);
        window.location.href = 'index.html';
    },

    requireAuth() {
        const user = DB.getCurrentUser();
        if (!user) {
            window.location.href = 'auth.html';
            return null;
        }
        return user;
    },

    requireAdmin() {
        const user = this.requireAuth();
        if (user && user.role !== 'admin') {
            window.location.href = 'dashboard.html';
            return null;
        }
        return user;
    }
};

// ---- Formatting ----
function formatCurrency(amount) {
    return '₹' + Number(amount).toLocaleString('en-IN');
}

function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function formatDateTime(dateStr) {
    return new Date(dateStr).toLocaleString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function generateId() {
    return 'LW-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

// ---- UI Helpers ----
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
        <span>${message}</span>
    `;
    toast.style.cssText = `
        position: fixed; bottom: 24px; right: 24px; z-index: 9999;
        display: flex; align-items: center; gap: 8px;
        padding: 12px 20px; border-radius: 12px;
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white; font-size: 14px; font-weight: 500; font-family: 'Inter', sans-serif;
        box-shadow: 0 10px 40px rgba(0,0,0,0.15);
        animation: fadeInUp 0.3s ease-out;
        transition: opacity 0.3s, transform 0.3s;
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(10px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ---- Scroll Animations ----
function initScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
        observer.observe(el);
    });
}

// ---- Navbar ----
function initNavbar() {
    const navbar = document.getElementById('navbar');
    const navToggle = document.getElementById('navToggle');
    const navLinks = document.getElementById('navLinks');

    if (navbar) {
        window.addEventListener('scroll', () => {
            navbar.classList.toggle('scrolled', window.scrollY > 20);
        });
        // Check on load
        navbar.classList.toggle('scrolled', window.scrollY > 20);
    }

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('open');
        });
    }

    // Update nav for logged-in users
    updateNavAuth();
}

function updateNavAuth() {
    const user = DB.getCurrentUser();
    const navLinks = document.getElementById('navLinks');
    if (!navLinks) return;

    // Find auth buttons in nav
    const authLinks = navLinks.querySelectorAll('a[href="auth.html"], a[href="auth.html#signup"]');

    if (user) {
        authLinks.forEach(link => link.remove());
        // Check if dashboard/admin links already exist
        if (!navLinks.querySelector('a[href="dashboard.html"]')) {
            const dashLink = document.createElement('a');
            dashLink.href = 'dashboard.html';
            dashLink.textContent = 'Dashboard';
            navLinks.appendChild(dashLink);

            if (user.role === 'admin') {
                const adminLink = document.createElement('a');
                adminLink.href = 'admin.html';
                adminLink.textContent = 'Admin';
                adminLink.className = 'btn btn-ghost btn-sm';
                navLinks.appendChild(adminLink);
            }

            const logoutBtn = document.createElement('button');
            logoutBtn.className = 'btn btn-ghost btn-sm';
            logoutBtn.textContent = 'Logout';
            logoutBtn.onclick = () => Auth.logout();
            navLinks.appendChild(logoutBtn);
        }
    }
}

// ---- Validation ----
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validatePhone(phone) {
    return /^[6-9]\d{9}$/.test(phone.replace(/\D/g, ''));
}

function showFieldError(inputEl, message) {
    inputEl.classList.add('error');
    const errorEl = inputEl.parentElement.querySelector('.form-error');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add('visible');
    }
}

function clearFieldError(inputEl) {
    inputEl.classList.remove('error');
    const errorEl = inputEl.parentElement.querySelector('.form-error');
    if (errorEl) {
        errorEl.classList.remove('visible');
    }
}

// ---- Audit Logging ----
function addAuditLog(action, data) {
    const logs = DB.getAuditLogs();
    logs.push({
        id: generateId(),
        action,
        data,
        userId: DB.getCurrentUser()?.id || 'anonymous',
        timestamp: new Date().toISOString()
    });
    DB.saveAuditLogs(logs);
}
