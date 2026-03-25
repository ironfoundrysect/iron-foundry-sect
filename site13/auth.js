// ===== IRON FOUNDRY SECT — auth.js v13 =====
// Uses sessionStorage cache to prevent nav flicker on page load

const FB_CFG = {
  apiKey: "AIzaSyC_5Lzy7w_r8_018F_j6qxbXa5GIj9Twpk",
  authDomain: "ironfoundrysect.firebaseapp.com",
  projectId: "ironfoundrysect",
  storageBucket: "ironfoundrysect.firebasestorage.app",
  messagingSenderId: "183565240555",
  appId: "1:183565240555:web:2d114a5352747e3cdd56ae"
};

const ROLES = {
  'outer-disciple': { label: 'Outer Disciple', class: 'role-outer' },
  'core-disciple':  { label: 'Core Disciple',  class: 'role-core'  },
  'elder':          { label: 'Elder',           class: 'role-elder' },
  'sect-leader':    { label: 'Sect Leader',     class: 'role-leader' },
};

const BLOCKED = [
  /\bporn\b/i, /\bnude\b/i, /\bnaked\b/i, /\bxxx\b/i, /\berotic\b/i,
  /\bfuck\b/i, /\bpussy\b/i, /\bdick\b/i, /\bcock\b/i, /\bboobs\b/i, /\btits\b/i,
];

window._ifs = { ready: false, currentUser: null, currentUserData: null,
                auth: null, db: null, storage: null };

// ===== CACHE HELPERS =====
const CACHE_KEY = 'ifs_user_cache';
function saveCache(ud) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(ud)); } catch(e) {}
}
function loadCache() {
  try { var v = sessionStorage.getItem(CACHE_KEY); return v ? JSON.parse(v) : null; } catch(e) { return null; }
}
function clearCache() {
  try { sessionStorage.removeItem(CACHE_KEY); } catch(e) {}
}

// ===== SYNC HELPERS =====
window.filterContent = function(text) {
  if (!text) return { ok: true };
  for (var p of BLOCKED) {
    if (p.test(text)) return { ok: false, reason: 'That content isn\'t allowed in the sect.' };
  }
  return { ok: true };
};

window.canEdit = function() {
  var u = window._ifs.currentUserData;
  return !!(window._ifs.currentUser && u && (u.role === 'sect-leader' || u.canEdit));
};

window.openModal = function(id) {
  var el = document.getElementById(id);
  if (el) { el.classList.add('active'); el.style.display = 'flex'; }
};
window.closeModal = function(id) {
  var el = document.getElementById(id);
  if (el) { el.classList.remove('active'); el.style.display = ''; }
};
window.closeAllModals = function() {
  document.querySelectorAll('.modal-overlay').forEach(function(m) {
    m.classList.remove('active'); m.style.display = '';
  });
};
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-overlay')) window.closeAllModals();
});

// ===== NAV UPDATE =====
function updateNav(ud) {
  var loginBtn    = document.getElementById('btn-login');
  var joinBtn     = document.getElementById('btn-join');
  var logoutBtn   = document.getElementById('btn-logout');
  var userDisp    = document.getElementById('user-display');
  var adminLink   = document.getElementById('admin-nav-link');
  var profileLink = document.getElementById('profile-nav-link');
  var composeBtn  = document.getElementById('compose-btn');

  if (!loginBtn) return;

  if (ud) {
    loginBtn.style.display  = 'none';
    joinBtn.style.display   = 'none';
    logoutBtn.style.display = 'inline-flex';
    if (profileLink) profileLink.style.display = 'inline';
    if (adminLink)   adminLink.style.display   = ud.role === 'sect-leader' ? 'inline' : 'none';
    if (composeBtn)  composeBtn.style.display  = 'flex';

    var ri      = ROLES[ud.role] || ROLES['outer-disciple'];
    var initial = (ud.username || '?').charAt(0).toUpperCase();
    var avatar  = ud.photoURL
      ? '<img src="' + ud.photoURL + '" style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:1px solid #c8860a40;">'
      : '<div style="width:28px;height:28px;border-radius:50%;background:#161616;border:1px solid #2a2218;display:flex;align-items:center;justify-content:center;font-size:0.8rem;color:#c8860a;">' + initial + '</div>';

    if (userDisp) {
      userDisp.innerHTML =
        '<a href="profile.html" style="display:flex;align-items:center;gap:0.5rem;text-decoration:none;">' +
          avatar +
          '<span style="color:#9a9080;font-family:\'Share Tech Mono\',monospace;font-size:0.75rem;">' + (ud.username || 'Disciple') + '</span>' +
          '<span class="role-badge ' + ri.class + '">' + ri.label + '</span>' +
        '</a>';
    }
  } else {
    loginBtn.style.display  = 'inline-flex';
    joinBtn.style.display   = 'inline-flex';
    logoutBtn.style.display = 'none';
    if (userDisp)    userDisp.innerHTML        = '';
    if (adminLink)   adminLink.style.display   = 'none';
    if (profileLink) profileLink.style.display = 'none';
    if (composeBtn)  composeBtn.style.display  = 'none';
  }
}

// ===== APPLY CACHE IMMEDIATELY (prevents flicker) =====
(function() {
  var cached = loadCache();
  if (cached) {
    window._ifs.currentUserData = cached;
    // Apply nav immediately — don't wait for DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() { updateNav(cached); });
    } else {
      updateNav(cached);
    }
  }
})();

// ===== FIREBASE BOOT =====
(async function boot() {
  try {
    var fbApp   = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
    var fbAuth  = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
    var fbStore = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    var fbStg   = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js');

    var app     = fbApp.initializeApp(FB_CFG);
    var auth    = fbAuth.getAuth(app);
    var db      = fbStore.getFirestore(app);
    var storage = fbStg.getStorage(app);

    window._ifs.auth    = auth;
    window._ifs.db      = db;
    window._ifs.storage = storage;
    window._ifs.ready   = true;
    window.firebaseDb   = db;

    // ===== AUTH STATE =====
    fbAuth.onAuthStateChanged(auth, async function(user) {
      if (user) {
        window._ifs.currentUser = user;
        try {
          var snap = await fbStore.getDoc(fbStore.doc(db, 'users', user.uid));
          var ud = snap.exists()
            ? snap.data()
            : { uid: user.uid, username: user.displayName || user.email.split('@')[0],
                email: user.email, role: 'outer-disciple', photoURL: '' };
          window._ifs.currentUserData = ud;
          saveCache(ud);
        } catch(e) {
          var ud = { uid: user.uid, username: user.displayName || user.email.split('@')[0],
                     email: user.email, role: 'outer-disciple', photoURL: '' };
          window._ifs.currentUserData = ud;
          saveCache(ud);
        }
      } else {
        window._ifs.currentUser     = null;
        window._ifs.currentUserData = null;
        clearCache();
      }

      var ud = window._ifs.currentUserData;
      if (document.getElementById('btn-login')) {
        updateNav(ud);
      } else {
        document.addEventListener('DOMContentLoaded', function() { updateNav(ud); });
      }

      // Reveal/hide admin sections on sect page
      var adminSection    = document.getElementById('admin');
      var socialsSection  = document.getElementById('socials-admin');
      var editBioBtn      = document.getElementById('edit-bio-btn');
      var isLeader        = ud && ud.role === 'sect-leader';
      if (adminSection)   adminSection.classList.toggle('revealed', !!isLeader);
      if (socialsSection) socialsSection.classList.toggle('revealed', !!isLeader);
      if (editBioBtn)     editBioBtn.style.display = isLeader ? 'inline-flex' : 'none';

      window.dispatchEvent(new Event('authStateChanged'));
    });

    // ===== LOGIN =====
    window.handleLoginSubmit = async function(e) {
      e.preventDefault();
      var email    = (document.getElementById('login-email')    || {}).value || '';
      var password = (document.getElementById('login-password') || {}).value || '';
      var errEl    = document.getElementById('login-error');
      var btn      = e.target.querySelector('button[type="submit"]');
      email = email.trim();
      if (!email || !password) return;
      if (btn) { btn.textContent = 'Entering...'; btn.disabled = true; }
      try {
        await fbAuth.signInWithEmailAndPassword(auth, email, password);
        window.closeAllModals();
        if (e.target) e.target.reset();
      } catch(err) {
        showErr(errEl, friendlyError(err.code));
      } finally {
        if (btn) { btn.textContent = 'Enter the Sect'; btn.disabled = false; }
      }
    };

    // ===== REGISTER =====
    window.handleRegisterSubmit = async function(e) {
      e.preventDefault();
      var username = ((document.getElementById('reg-username') || {}).value || '').trim();
      var email    = ((document.getElementById('reg-email')    || {}).value || '').trim();
      var password = (document.getElementById('reg-password')  || {}).value || '';
      var confirm  = (document.getElementById('reg-confirm')   || {}).value || '';
      var errEl    = document.getElementById('reg-error');
      var btn      = e.target.querySelector('button[type="submit"]');

      if (!username || username.length < 3) { showErr(errEl, 'Pick a sect name with at least 3 characters.'); return; }
      if (!email)                           { showErr(errEl, 'Email is required.'); return; }
      if (password.length < 6)              { showErr(errEl, 'Password needs at least 6 characters.'); return; }
      if (confirm && password !== confirm)  { showErr(errEl, "Passwords don't match."); return; }

      var fc = window.filterContent(username);
      if (!fc.ok) { showErr(errEl, fc.reason); return; }

      if (btn) { btn.textContent = 'Forging...'; btn.disabled = true; }
      try {
        var cred = await fbAuth.createUserWithEmailAndPassword(auth, email, password);
        await fbAuth.updateProfile(cred.user, { displayName: username });
        try { await fbAuth.sendEmailVerification(cred.user); } catch(ve) {}

        var role = username === 'SectLeader' ? 'sect-leader' : 'outer-disciple';
        var ud   = { uid: cred.user.uid, username: username, email: email, role: role,
                     photoURL: '', bio: '', canEdit: false, techniques: [] };

        await fbStore.setDoc(fbStore.doc(db, 'users', cred.user.uid),
          Object.assign({}, ud, { joined: fbStore.serverTimestamp() }));

        window._ifs.currentUserData = ud;
        saveCache(ud);
        window.closeAllModals();
        if (e.target) e.target.reset();
        showToast('Welcome to the sect, ' + username + '! Check your email to verify your address.', 'success');
      } catch(err) {
        showErr(errEl, friendlyError(err.code));
      } finally {
        if (btn) { btn.textContent = '⚙ Begin Cultivation'; btn.disabled = false; }
      }
    };

    // ===== LOGOUT =====
    window.handleLogout = async function() {
      clearCache();
      window._ifs.currentUser     = null;
      window._ifs.currentUserData = null;
      updateNav(null);
      await fbAuth.signOut(auth);
    };

    // ===== BIND FORMS =====
    function bindForms() {
      var lf = document.getElementById('login-form');
      if (lf && !lf._b) { lf.addEventListener('submit', window.handleLoginSubmit);    lf._b = 1; }
      var rf = document.getElementById('register-form');
      if (rf && !rf._b) { rf.addEventListener('submit', window.handleRegisterSubmit); rf._b = 1; }
      var lb = document.getElementById('btn-logout');
      if (lb && !lb._b) { lb.addEventListener('click',  window.handleLogout);         lb._b = 1; }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bindForms);
    } else {
      bindForms();
    }
    setTimeout(bindForms, 300);
    setTimeout(bindForms, 1000);

  } catch(err) {
    console.error('[IFS] Boot error:', err);
  }
})();

// ===== DOM READY =====
document.addEventListener('DOMContentLoaded', function() {
  // Apply cached nav state again on DOM ready
  var cached = loadCache();
  updateNav(cached || null);

  // Hamburger
  var ham = document.querySelector('.hamburger');
  var nav = document.querySelector('nav');
  if (ham && nav) ham.addEventListener('click', function() { nav.classList.toggle('open'); });
});

// ===== TOAST =====
function showToast(msg, type) {
  var bg = type === 'success' ? '#1a2a1a' : '#2a1a1a';
  var cl = type === 'success' ? '#4caf50' : '#ff6b6b';
  var br = type === 'success' ? '#4caf5040' : '#ff6b6b40';
  var t  = document.createElement('div');
  t.style.cssText = 'position:fixed;top:80px;right:20px;background:' + bg + ';border:1px solid ' + br +
    ';color:' + cl + ';padding:1rem 1.5rem;font-family:monospace;font-size:0.85rem;' +
    'z-index:99999;border-radius:2px;max-width:320px;line-height:1.5;';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function() { if (t.parentNode) t.parentNode.removeChild(t); }, 5000);
}
window.showToast = showToast;

function showErr(el, msg) { if (el) { el.textContent = msg; el.style.display = 'block'; } }

function friendlyError(code) {
  var m = {
    'auth/email-already-in-use': 'That email is already registered — try logging in.',
    'auth/invalid-email':        "That doesn't look like a valid email.",
    'auth/weak-password':        'Password needs at least 6 characters.',
    'auth/user-not-found':       'No account found with that email.',
    'auth/wrong-password':       'Wrong password — give it another shot.',
    'auth/invalid-credential':   'Email or password is incorrect.',
    'auth/too-many-requests':    'Too many attempts — take a break and try again.',
    'auth/network-request-failed': 'Network issue — check your connection.',
  };
  return m[code] || 'Something went wrong — try again in a sec.';
}
