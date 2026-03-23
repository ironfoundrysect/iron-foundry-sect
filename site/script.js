// ===== IRON FOUNDRY SECT - script.js =====
// Auth + Role Management System

const OWNER_USERNAME = 'SectLeader'; // Change this to your username
const OWNER_PASSWORD = 'forge2024!'; // Change this to your password

const ROLES = {
  'outer-disciple': { label: 'Outer Disciple', class: 'role-outer', rank: 1 },
  'core-disciple':  { label: 'Core Disciple',  class: 'role-core',  rank: 2 },
  'elder':          { label: 'Elder',           class: 'role-elder', rank: 3 },
  'sect-leader':    { label: 'Sect Leader',     class: 'role-leader',rank: 4 },
};

// ===== STORAGE HELPERS =====
function getUsers() {
  return JSON.parse(localStorage.getItem('ifs_users') || '{}');
}

function saveUsers(users) {
  localStorage.setItem('ifs_users', JSON.stringify(users));
}

function getCurrentUser() {
  return JSON.parse(sessionStorage.getItem('ifs_current') || 'null');
}

function setCurrentUser(user) {
  sessionStorage.setItem('ifs_current', JSON.stringify(user));
}

function logout() {
  sessionStorage.removeItem('ifs_current');
  updateNavAuth();
  location.reload();
}

// ===== AUTH FUNCTIONS =====
function register(username, password, email) {
  const users = getUsers();

  if (users[username]) return { ok: false, msg: 'Username already taken.' };
  if (username.length < 3) return { ok: false, msg: 'Username must be at least 3 characters.' };
  if (password.length < 6) return { ok: false, msg: 'Password must be at least 6 characters.' };

  const role = (username === OWNER_USERNAME && password === OWNER_PASSWORD)
    ? 'sect-leader'
    : 'outer-disciple';

  users[username] = { username, password, email, role, joined: Date.now() };
  saveUsers(users);
  setCurrentUser({ username, role });
  return { ok: true };
}

function login(username, password) {
  const users = getUsers();
  const user = users[username];
  if (!user) return { ok: false, msg: 'No disciple found with that username.' };
  if (user.password !== password) return { ok: false, msg: 'Incorrect password.' };
  setCurrentUser({ username, role: user.role });
  return { ok: true };
}

// ===== NAV UI =====
function updateNavAuth() {
  const user = getCurrentUser();
  const loginBtn  = document.getElementById('btn-login');
  const joinBtn   = document.getElementById('btn-join');
  const logoutBtn = document.getElementById('btn-logout');
  const userDisp  = document.getElementById('user-display');
  const adminLink = document.getElementById('admin-nav-link');

  if (!loginBtn) return;

  if (user) {
    loginBtn.classList.add('hidden');
    joinBtn.classList.add('hidden');
    if (logoutBtn) logoutBtn.classList.remove('hidden');
    if (userDisp) {
      const roleInfo = ROLES[user.role] || ROLES['outer-disciple'];
      userDisp.innerHTML = `
        <span style="color:var(--text-secondary);font-family:var(--font-mono);font-size:0.75rem;">${user.username}</span>
        <span class="role-badge ${roleInfo.class}">${roleInfo.label}</span>
      `;
    }
    if (adminLink) {
      if (user.role === 'sect-leader') adminLink.classList.remove('hidden');
      else adminLink.classList.add('hidden');
    }
  } else {
    loginBtn.classList.remove('hidden');
    joinBtn.classList.remove('hidden');
    if (logoutBtn) logoutBtn.classList.add('hidden');
    if (userDisp) userDisp.innerHTML = '';
    if (adminLink) adminLink.classList.add('hidden');
  }
}

// ===== MODAL SYSTEM =====
function openModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.add('active');
}

function closeModal(id) {
  const m = document.getElementById(id);
  if (m) m.classList.remove('active');
}

function closeAllModals() {
  document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
}

// ===== FORM HANDLERS =====
function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const err = document.getElementById('login-error');

  const result = login(username, password);
  if (result.ok) {
    closeAllModals();
    updateNavAuth();
    showAlert('login-alert', `Welcome back, ${username}!`, 'success');
    setTimeout(() => location.reload(), 800);
  } else {
    err.textContent = result.msg;
    err.style.display = 'block';
  }
}

function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('reg-username').value.trim();
  const password = document.getElementById('reg-password').value;
  const email    = document.getElementById('reg-email').value.trim();
  const err = document.getElementById('reg-error');

  const result = register(username, password, email);
  if (result.ok) {
    closeAllModals();
    updateNavAuth();
    setTimeout(() => location.reload(), 300);
  } else {
    err.textContent = result.msg;
    err.style.display = 'block';
  }
}

function showAlert(id, msg, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.className = `alert alert-${type} show`;
  setTimeout(() => el.classList.remove('show'), 3000);
}

// ===== ADMIN PANEL =====
function renderAdminTable() {
  const tbody = document.getElementById('admin-tbody');
  if (!tbody) return;

  const users = getUsers();
  const current = getCurrentUser();

  if (!current || current.role !== 'sect-leader') {
    tbody.innerHTML = '<tr><td colspan="4" style="color:var(--accent-ember);font-family:var(--font-mono);font-size:0.8rem;">Access Denied. Sect Leader only.</td></tr>';
    return;
  }

  if (Object.keys(users).length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="color:var(--text-muted);font-family:var(--font-mono);font-size:0.8rem;">No disciples have registered yet.</td></tr>';
    return;
  }

  tbody.innerHTML = Object.values(users).map(user => {
    const roleOpts = Object.entries(ROLES).map(([val, info]) =>
      `<option value="${val}" ${user.role === val ? 'selected' : ''}>${info.label}</option>`
    ).join('');
    return `
      <tr>
        <td>${user.username}</td>
        <td>${user.email || '—'}</td>
        <td>
          <select class="role-select" id="role-${user.username}">${roleOpts}</select>
        </td>
        <td>
          <button class="btn-save-role" onclick="saveRole('${user.username}')">Save</button>
        </td>
      </tr>
    `;
  }).join('');
}

function saveRole(username) {
  const select = document.getElementById(`role-${username}`);
  if (!select) return;
  const newRole = select.value;
  const users = getUsers();
  if (!users[username]) return;
  users[username].role = newRole;
  saveUsers(users);

  // Update session if changing own role (shouldn't happen normally)
  const current = getCurrentUser();
  if (current && current.username === username) {
    setCurrentUser({ ...current, role: newRole });
    updateNavAuth();
  }

  const btn = select.nextElementSibling;
  if (btn) {
    btn.textContent = 'Saved!';
    btn.style.background = 'var(--accent-gold)';
    btn.style.color = '#000';
    setTimeout(() => { btn.textContent = 'Save'; btn.style.background = ''; btn.style.color = ''; }, 1500);
  }
}

// ===== HAMBURGER MENU =====
function initHamburger() {
  const ham = document.querySelector('.hamburger');
  const nav = document.querySelector('nav');
  if (!ham || !nav) return;
  ham.addEventListener('click', () => nav.classList.toggle('open'));
}

// ===== SMOOTH SCROLL =====
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// ===== SCROLL REVEAL =====
function initScrollReveal() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.technique-card, .pillar, .forge-card, .member-card, .path-step').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });
}

// ===== TECHNIQUES FILTER =====
function initFilter() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const cards = document.querySelectorAll('.technique-card[data-rank]');
  if (!filterBtns.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const filter = btn.dataset.filter;
      cards.forEach(card => {
        card.style.display = (filter === 'all' || card.dataset.rank === filter) ? 'block' : 'none';
      });
    });
  });
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  updateNavAuth();
  initHamburger();
  initSmoothScroll();
  initScrollReveal();
  initFilter();
  renderAdminTable();

  // Login form
  const lf = document.getElementById('login-form');
  if (lf) lf.addEventListener('submit', handleLogin);

  // Register form
  const rf = document.getElementById('register-form');
  if (rf) rf.addEventListener('submit', handleRegister);

  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeAllModals();
    });
  });

  // Logout button
  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  // Hero join redirect
  const heroJoin = document.getElementById('hero-join');
  if (heroJoin) heroJoin.addEventListener('click', () => openModal('modal-register'));
});
