// ===== IRON FOUNDRY SECT — script.js (Firebase Edition) =====

import { auth, db, storage } from './firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
  doc, setDoc, getDoc, getDocs, updateDoc,
  collection, onSnapshot, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// ===== CONSTANTS =====
const OWNER_USERNAME = 'SectLeader';
const OWNER_EMAIL    = 'owner@ironfoundrysect.com'; // Change to your real email

window.canEdit = function() {
  if (!currentUser || !currentUserData) return false;
  return currentUserData.role === 'sect-leader' || currentUserData.canEdit === true;
}

const ROLES = {
  'outer-disciple': { label: 'Outer Disciple', class: 'role-outer', rank: 1 },
  'core-disciple':  { label: 'Core Disciple',  class: 'role-core',  rank: 2 },
  'elder':          { label: 'Elder',           class: 'role-elder', rank: 3 },
  'sect-leader':    { label: 'Sect Leader',     class: 'role-leader',rank: 4 },
};

let currentUser = null;
let currentUserData = null;

// ===== AUTH STATE =====
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        currentUserData = snap.data();
      } else {
        // Doc doesn't exist yet — use display name from auth as fallback
        currentUserData = {
          uid: user.uid,
          username: user.displayName || user.email?.split('@')[0] || 'Disciple',
          email: user.email,
          role: 'outer-disciple',
          photoURL: user.photoURL || '',
        };
      }
    } catch(e) {
      currentUserData = {
        uid: user.uid,
        username: user.displayName || 'Disciple',
        email: user.email,
        role: 'outer-disciple',
        photoURL: '',
      };
    }
  } else {
    currentUser = null;
    currentUserData = null;
  }
  updateNavAuth();
  renderAdminTable();
  renderMembers();
  window.dispatchEvent(new Event('authStateChanged'));
});

// ===== NAV UI =====
function updateNavAuth() {
  const loginBtn  = document.getElementById('btn-login');
  const joinBtn   = document.getElementById('btn-join');
  const logoutBtn = document.getElementById('btn-logout');
  const userDisp  = document.getElementById('user-display');
  const adminLink = document.getElementById('admin-nav-link');
  const profileLink = document.getElementById('profile-nav-link');

  if (!loginBtn) return;

  if (currentUser && currentUserData) {
    loginBtn.classList.add('hidden');
    joinBtn.classList.add('hidden');
    logoutBtn.classList.remove('hidden');
    if (profileLink) profileLink.classList.remove('hidden');

    const roleInfo = ROLES[currentUserData.role] || ROLES['outer-disciple'];
    const avatar = currentUserData.photoURL
      ? `<img src="${currentUserData.photoURL}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:1px solid var(--border-accent);">`
      : `<div style="width:28px;height:28px;border-radius:50%;background:var(--bg-tertiary);border:1px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:0.8rem;">${(currentUserData.username||'?').charAt(0).toUpperCase()}</div>`;

    if (userDisp) {
      userDisp.innerHTML = `
        <a href="profile.html" style="display:flex;align-items:center;gap:0.5rem;text-decoration:none;">
          ${avatar}
          <span style="color:var(--text-secondary);font-family:var(--font-mono);font-size:0.75rem;">${currentUserData.username}</span>
          <span class="role-badge ${roleInfo.class}">${roleInfo.label}</span>
        </a>
      `;
    }
    if (adminLink) {
      adminLink.classList.toggle('hidden', currentUserData.role !== 'sect-leader');
    }
  } else {
    loginBtn.classList.remove('hidden');
    joinBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
    if (userDisp) userDisp.innerHTML = '';
    if (adminLink) adminLink.classList.add('hidden');
    if (profileLink) profileLink.classList.add('hidden');
  }
}

// ===== REGISTER =====
async function handleRegister(e) {
  e.preventDefault();
  const username = document.getElementById('reg-username').value.trim();
  const email    = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const err      = document.getElementById('reg-error');

  if (username.length < 3) {
    err.textContent = 'Username must be at least 3 characters.';
    err.style.display = 'block'; return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: username });

    const role = (username === OWNER_USERNAME) ? 'sect-leader' : 'outer-disciple';

    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      username,
      email,
      role,
      photoURL: '',
      bio: '',
      joined: serverTimestamp(),
    });

    closeAllModals();
    setTimeout(() => location.reload(), 300);
  } catch (error) {
    err.textContent = friendlyError(error.code);
    err.style.display = 'block';
  }
}

// ===== LOGIN =====
async function handleLogin(e) {
  e.preventDefault();
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const err      = document.getElementById('login-error');

  try {
    await signInWithEmailAndPassword(auth, email, password);
    closeAllModals();
    // Small delay then reload so nav fully updates
    setTimeout(() => location.reload(), 300);
  } catch (error) {
    err.textContent = friendlyError(error.code);
    err.style.display = 'block';
  }
}

// ===== LOGOUT =====
async function handleLogout() {
  currentUser = null;
  currentUserData = null;
  await signOut(auth);
  location.reload();
}

// ===== PROFILE UPDATE =====
window.handleProfileUpdate = async function(e) {
  e.preventDefault();
  if (!currentUser) return;

  const bio      = document.getElementById('profile-bio')?.value || '';
  const username = document.getElementById('profile-username')?.value.trim() || currentUserData.username;
  const fileInput = document.getElementById('profile-photo');
  const statusEl  = document.getElementById('profile-status');

  try {
    let photoURL = currentUserData.photoURL || '';

    // Upload photo if selected
    if (fileInput && fileInput.files[0]) {
      const file = fileInput.files[0];
      const storageRef = ref(storage, `avatars/${currentUser.uid}`);
      await uploadBytes(storageRef, file);
      photoURL = await getDownloadURL(storageRef);
    }

    await updateDoc(doc(db, 'users', currentUser.uid), { username, bio, photoURL });
    await updateProfile(currentUser, { displayName: username, photoURL });

    currentUserData = { ...currentUserData, username, bio, photoURL };

    if (statusEl) {
      statusEl.textContent = 'Profile updated!';
      statusEl.className = 'alert alert-success show';
      setTimeout(() => statusEl.classList.remove('show'), 3000);
    }
    updateNavAuth();
  } catch (err) {
    if (statusEl) {
      statusEl.textContent = 'Error updating profile.';
      statusEl.className = 'alert alert-error show';
    }
  }
}

// ===== RENDER PROFILE PAGE =====
window.renderProfilePage = async function() {
  if (!currentUser || !currentUserData) {
    const container = document.getElementById('profile-container');
    if (container) container.innerHTML = '<p style="color:var(--text-muted);font-family:var(--font-mono);">Please log in to view your profile.</p>';
    return;
  }

  const roleInfo = ROLES[currentUserData.role] || ROLES['outer-disciple'];
  const avatar = currentUserData.photoURL
    ? `<img src="${currentUserData.photoURL}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:2px solid var(--accent-gold);">`
    : `<div style="width:100px;height:100px;border-radius:50%;background:var(--bg-tertiary);border:2px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:2.5rem;">${(currentUserData.username||'?').charAt(0).toUpperCase()}</div>`;

  const container = document.getElementById('profile-container');
  if (!container) return;

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:3rem;align-items:start;">
      <div>
        <div style="text-align:center;margin-bottom:2rem;">
          ${avatar}
          <h2 style="font-family:var(--font-display);font-size:1.5rem;margin-top:1rem;letter-spacing:0.05em;">${currentUserData.username}</h2>
          <span class="role-badge ${roleInfo.class}" style="font-size:0.8rem;">${roleInfo.label}</span>
          ${currentUserData.bio ? `<p style="color:var(--text-secondary);margin-top:1rem;font-size:0.95rem;">${currentUserData.bio}</p>` : ''}
        </div>
        <div style="background:var(--bg-tertiary);border:1px solid var(--border);padding:1.5rem;">
          <div style="font-family:var(--font-mono);font-size:0.75rem;color:var(--text-muted);letter-spacing:0.2em;text-transform:uppercase;margin-bottom:1rem;">Disciple Info</div>
          <div style="font-family:var(--font-mono);font-size:0.85rem;color:var(--text-secondary);">
            <div style="padding:0.5rem 0;border-bottom:1px solid var(--border);">Email: <span style="color:var(--text-primary);">${currentUserData.email}</span></div>
            <div style="padding:0.5rem 0;">Rank: <span style="color:var(--accent-gold);">${roleInfo.label}</span></div>
          </div>
        </div>
      </div>
      <div>
        <span class="section-label">▸ Edit Profile</span>
        <h3 style="font-family:var(--font-display);font-size:1.2rem;margin-bottom:1.5rem;letter-spacing:0.05em;">Update Your Profile</h3>
        <div id="profile-status" class="alert"></div>
        <form onsubmit="handleProfileUpdate(event)">
          <div class="form-group">
            <label>Username</label>
            <input type="text" id="profile-username" value="${currentUserData.username}" />
          </div>
          <div class="form-group">
            <label>Bio</label>
            <input type="text" id="profile-bio" value="${currentUserData.bio || ''}" placeholder="Tell the sect about yourself..." />
          </div>
          <div class="form-group">
            <label>Profile Picture</label>
            <input type="file" id="profile-photo" accept="image/*" style="background:var(--bg-tertiary);border:1px solid var(--border);color:var(--text-primary);padding:0.75rem;width:100%;border-radius:2px;" />
          </div>
          <button type="submit" class="btn btn-primary mt-2">Save Changes</button>
        </form>
      </div>
    </div>
  `;
}

// ===== ADMIN TABLE =====
window.renderAdminTable = async function() {
  const tbody = document.getElementById('admin-tbody');
  if (!tbody) return;

  if (!currentUserData || currentUserData.role !== 'sect-leader') {
    tbody.innerHTML = '<tr><td colspan="4" style="color:var(--accent-ember);font-family:var(--font-mono);font-size:0.8rem;">Access Denied. Sect Leader only.</td></tr>';
    return;
  }

  const snap = await getDocs(collection(db, 'users'));
  if (snap.empty) {
    tbody.innerHTML = '<tr><td colspan="4" style="color:var(--text-muted);font-family:var(--font-mono);font-size:0.8rem;">No disciples registered yet.</td></tr>';
    return;
  }

  tbody.innerHTML = snap.docs.map(d => {
    const u = d.data();
    const roleOpts = Object.entries(ROLES).map(([val, info]) =>
      `<option value="${val}" ${u.role === val ? 'selected' : ''}>${info.label}</option>`
    ).join('');
    const editorChecked = u.canEdit ? 'checked' : '';
    return `
      <tr>
        <td>${u.username}</td>
        <td>${u.email}</td>
        <td><select class="role-select" id="role-${u.uid}">${roleOpts}</select></td>
        <td style="text-align:center;"><input type="checkbox" id="editor-${u.uid}" ${editorChecked} style="width:16px;height:16px;accent-color:var(--accent-gold);cursor:pointer;" title="Grant editor access" /></td>
        <td><button class="btn-save-role" onclick="saveRole('${u.uid}')">Save</button></td>
      </tr>
    `;
  }).join('');
}

window.saveRole = async function(uid) {
  const select = document.getElementById(`role-${uid}`);
  const editorCb = document.getElementById(`editor-${uid}`);
  if (!select) return;
  const newRole = select.value;
  const canEditVal = editorCb ? editorCb.checked : false;
  await updateDoc(doc(db, 'users', uid), { role: newRole, canEdit: canEditVal });
  const btn = select.parentElement.parentElement.querySelector('.btn-save-role');
  if (btn) {
    btn.textContent = 'Saved!';
    btn.style.background = 'var(--accent-gold)';
    btn.style.color = '#000';
    setTimeout(() => { btn.textContent = 'Save'; btn.style.background = ''; btn.style.color = ''; }, 1500);
  }
}`);
  if (!select) return;
  const newRole = select.value;
  await updateDoc(doc(db, 'users', uid), { role: newRole });
  const btn = select.nextElementSibling;
  if (btn) {
    btn.textContent = 'Saved!';
    btn.style.background = 'var(--accent-gold)';
    btn.style.color = '#000';
    setTimeout(() => { btn.textContent = 'Save'; btn.style.background = ''; btn.style.color = ''; }, 1500);
  }
}

// ===== RENDER MEMBERS =====
window.renderMembers = async function() {
  const container = document.getElementById('dynamic-members');
  if (!container) return;

  const snap = await getDocs(collection(db, 'users'));
  const byRole = { 'sect-leader': [], 'elder': [], 'core-disciple': [], 'outer-disciple': [] };

  snap.forEach(d => {
    const u = d.data();
    if (byRole[u.role]) byRole[u.role].push(u);
    else byRole['outer-disciple'].push(u);
  });

  const roleConfig = [
    { key: 'sect-leader', label: 'Sect Leader',     badge: 'role-leader', icon: '👑' },
    { key: 'elder',       label: 'Elders',           badge: 'role-elder',  icon: '🔥' },
    { key: 'core-disciple', label: 'Core Disciples', badge: 'role-core',   icon: '⚡' },
    { key: 'outer-disciple', label: 'Outer Disciples', badge: 'role-outer', icon: '🌱' },
  ];

  let html = '<div class="sect-hierarchy">';
  let total = 0;

  roleConfig.forEach(({ key, label, badge, icon }) => {
    const members = byRole[key];
    if (!members.length) return;
    total += members.length;
    html += `
      <div class="rank-tier">
        <div class="rank-tier-header">
          <span style="font-size:1.5rem;">${icon}</span>
          <h3>${label}</h3>
          <span class="role-badge ${badge}">${members.length}</span>
        </div>
        <div class="members-grid">
          ${members.map(m => {
            const avatar = m.photoURL
              ? `<img src="${m.photoURL}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;border:2px solid var(--border);">`
              : `<div style="width:64px;height:64px;border-radius:50%;background:var(--bg-tertiary);border:2px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:1.5rem;">${m.username.charAt(0).toUpperCase()}</div>`;
            return `
              <div class="member-card">
                <div style="display:flex;justify-content:center;margin-bottom:1rem;">${avatar}</div>
                <div class="member-name">${m.username}</div>
                ${m.bio ? `<p style="font-size:0.8rem;color:var(--text-muted);margin-top:0.25rem;">${m.bio}</p>` : ''}
                <span class="role-badge ${badge}" style="font-size:0.65rem;margin-top:0.5rem;display:inline-block;">${ROLES[m.role]?.label || 'Outer Disciple'}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  });

  if (total === 0) {
    html += '<p style="color:var(--text-muted);font-family:var(--font-mono);font-size:0.85rem;">No disciples have registered yet. Be the first.</p>';
  }

  html += '</div>';
  container.innerHTML = html;
}

// ===== MODAL =====
window.openModal  = (id) => document.getElementById(id)?.classList.add('active');
window.closeModal = (id) => document.getElementById(id)?.classList.remove('active');
window.closeAllModals = () => document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));

// ===== HELPERS =====
function friendlyError(code) {
  const map = {
    'auth/email-already-in-use': 'That email is already registered.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/user-not-found': 'No account found with that email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Incorrect email or password.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}

// ===== HAMBURGER =====
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
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
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
  initHamburger();
  initSmoothScroll();
  initScrollReveal();
  initFilter();

  const lf = document.getElementById('login-form');
  if (lf) lf.addEventListener('submit', handleLogin);

  const rf = document.getElementById('register-form');
  if (rf) rf.addEventListener('submit', handleRegister);

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => { if (e.target === overlay) closeAllModals(); });
  });

  const logoutBtn = document.getElementById('btn-logout');
  if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

  const heroJoin = document.getElementById('hero-join');
  if (heroJoin) heroJoin.addEventListener('click', () => openModal('modal-register'));

  // Page-specific init
  if (document.getElementById('profile-container')) renderProfilePage();
  if (document.getElementById('dynamic-members')) renderMembers();
  if (document.getElementById('admin-tbody')) renderAdminTable();
});
