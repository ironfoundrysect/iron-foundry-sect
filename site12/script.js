// ===== IRON FOUNDRY SECT — script.js =====
// Auth is handled by auth.js — this module handles page-specific features

import {
  doc, setDoc, getDoc, getDocs, updateDoc,
  collection, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js";

// Wait for auth.js to initialize Firebase
function window._ifs?.db      { return window._ifs?.db; }
function getAuth()    { return window._ifs?.auth; }
function window._ifs?.storage { return window._ifs?.storage; }
function window._ifs?.currentUser     { return window._ifs?.currentUser; }
function window._ifs?.currentUserData { return window._ifs?.currentUserData; }

// ===== CONSTANTS =====
const OWNER_USERNAME = 'SectLeader';
const OWNER_EMAIL    = 'owner@ironfoundrysect.com'; // Change to your real email

window.canEdit = function() {
  if (!window._ifs?.currentUser || !currentUserData) return false;
  return window._ifs?.currentUserData?.role === 'sect-leader' || window._ifs?.currentUserData?.canEdit === true;
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
// Auth state is managed by auth.js
// Listen for auth changes dispatched by auth.js
window.addEventListener('authStateChanged', () => {
  renderAdminTable();
  renderMembers();
});





// ===== PROFILE UPDATE =====
window.handleProfileUpdate = async function(e) {
  e.preventDefault();
  if (!window._ifs?.currentUser) return;

  const bio      = document.getElementById('profile-bio')?.value || '';
  const username = document.getElementById('profile-username')?.value.trim() || window._ifs?.currentUserData?.username;
  const fileInput = document.getElementById('profile-photo');
  const statusEl  = document.getElementById('profile-status');

  try {
    let photoURL = window._ifs?.currentUserData?.photoURL || '';

    // Upload photo if selected
    if (fileInput && fileInput.files[0]) {
      const file = fileInput.files[0];
      const storageRef = ref(window._ifs?.storage, `avatars/${window._ifs?.currentUser?.uid}`);
      await uploadBytes(storageRef, file);
      photoURL = await getDownloadURL(storageRef);
    }

    await updateDoc(doc(window._ifs?.db, 'users', window._ifs?.currentUser?.uid), { username, bio, photoURL });
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
  if (!window._ifs?.currentUser || !currentUserData) {
    const container = document.getElementById('profile-container');
    if (container) container.innerHTML = '<p style="color:var(--text-muted);font-family:var(--font-mono);">Please log in to view your profile.</p>';
    return;
  }

  const roleInfo = ROLES[window._ifs?.currentUserData?.role] || ROLES['outer-disciple'];
  const avatar = window._ifs?.currentUserData?.photoURL
    ? `<img src="${window._ifs?.currentUserData?.photoURL}" style="width:100px;height:100px;border-radius:50%;object-fit:cover;border:2px solid var(--accent-gold);">`
    : `<div style="width:100px;height:100px;border-radius:50%;background:var(--bg-tertiary);border:2px solid var(--border);display:flex;align-items:center;justify-content:center;font-size:2.5rem;">${(window._ifs?.currentUserData?.username||'?').charAt(0).toUpperCase()}</div>`;

  const container = document.getElementById('profile-container');
  if (!container) return;

  container.innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:3rem;align-items:start;">
      <div>
        <div style="text-align:center;margin-bottom:2rem;">
          ${avatar}
          <h2 style="font-family:var(--font-display);font-size:1.5rem;margin-top:1rem;letter-spacing:0.05em;">${window._ifs?.currentUserData?.username}</h2>
          <span class="role-badge ${roleInfo.class}" style="font-size:0.8rem;">${roleInfo.label}</span>
          ${currentUserData.bio ? `<p style="color:var(--text-secondary);margin-top:1rem;font-size:0.95rem;">${currentUserData.bio}</p>` : ''}
        </div>
        <div style="background:var(--bg-tertiary);border:1px solid var(--border);padding:1.5rem;">
          <div style="font-family:var(--font-mono);font-size:0.75rem;color:var(--text-muted);letter-spacing:0.2em;text-transform:uppercase;margin-bottom:1rem;">Disciple Info</div>
          <div style="font-family:var(--font-mono);font-size:0.85rem;color:var(--text-secondary);">
            <div style="padding:0.5rem 0;border-bottom:1px solid var(--border);">Email: <span style="color:var(--text-primary);">${window._ifs?.currentUserData?.email}</span></div>
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
            <input type="text" id="profile-username" value="${window._ifs?.currentUserData?.username}" />
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

  if (!window._ifs?.currentUserData || window._ifs.currentUserData.role !== 'sect-leader') {
    tbody.innerHTML = '<tr><td colspan="4" style="color:var(--accent-ember);font-family:var(--font-mono);font-size:0.8rem;">Access Denied. Sect Leader only.</td></tr>';
    return;
  }

  const snap = await getDocs(collection(window._ifs?.db, 'users'));
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
  await updateDoc(doc(window._ifs?.db, 'users', uid), { role: newRole, canEdit: canEditVal });
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
  await updateDoc(doc(window._ifs?.db, 'users', uid), { role: newRole });
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

  const snap = await getDocs(collection(window._ifs?.db, 'users'));
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
// These override the bridge versions once the module loads
window.openModal = function(id) {
  var el = document.getElementById(id);
  if (el) { el.classList.add('active'); el.style.display = 'flex'; }
};
window.closeModal = function(id) {
  var el = document.getElementById(id);
  if (el) { el.classList.remove('active'); }
};
window.closeAllModals = function() {
  document.querySelectorAll('.modal-overlay').forEach(function(m) {
    m.classList.remove('active');
  });
};

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

// Hamburger handled by auth.js

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

  // Auth form binding handled by auth.js
  const heroJoin = document.getElementById('hero-join');
  if (heroJoin) heroJoin.addEventListener('click', () => window.openModal('modal-register'));

  // Page-specific init
  if (document.getElementById('profile-container')) renderProfilePage();
  if (document.getElementById('dynamic-members')) renderMembers();
  if (document.getElementById('admin-tbody')) renderAdminTable();
});
