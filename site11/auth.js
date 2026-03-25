// ===== IRON FOUNDRY SECT — auth.js =====

const FB = {
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
  'sect-leader':    { label: 'Sect Leader',     class: 'role-leader'},
};

// ===== CONTENT FILTER =====
// Blocks sexual content but allows general language
const BLOCKED_PATTERNS = [
  /\bsex\b/i, /\bporn\b/i, /\bnude\b/i, /\bnaked\b/i,
  /\bxxx\b/i, /\berotic\b/i, /\bfuck\b/i, /\bfucking\b/i,
  /\bpussy\b/i, /\bdick\b/i, /\bcock\b/i, /\bboobs\b/i,
  /\btits\b/i, /\bash\b/i, /\bn-word/i,
];

window.filterContent = function(text) {
  if (!text) return { ok: true, cleaned: text };
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(text)) {
      return { ok: false, cleaned: text, reason: 'Your post contains content that is not allowed in the sect.' };
    }
  }
  return { ok: true, cleaned: text };
};

// ===== STATE =====
window._ifs = window._ifs || {};

// ===== MODAL FUNCTIONS (available immediately) =====
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
    m.classList.remove('active');
    m.style.display = '';
  });
};
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal-overlay')) window.closeAllModals();
});

window.canEdit = function() {
  var u = window._ifs && window._ifs.currentUserData;
  if (!window._ifs || !window._ifs.currentUser || !u) return false;
  return u.role === 'sect-leader' || u.canEdit === true;
};

// ===== FIREBASE INIT =====
(async function() {
  try {
    const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js');
    const {
      getAuth, onAuthStateChanged,
      signInWithEmailAndPassword,
      createUserWithEmailAndPassword,
      sendEmailVerification,
      signOut, updateProfile
    } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js');
    const {
      getFirestore, doc, getDoc, setDoc, serverTimestamp
    } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    const { getStorage } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js');

    const app = initializeApp(FB);
    const auth    = getAuth(app);
    const db      = getFirestore(app);
    const storage = getStorage(app);

    window._ifs.auth    = auth;
    window._ifs.db      = db;
    window._ifs.storage = storage;
    window.firebaseDb   = db;

    // ===== AUTH STATE =====
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        window._ifs.currentUser = user;
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) {
            window._ifs.currentUserData = snap.data();
          } else {
            window._ifs.currentUserData = {
              uid: user.uid,
              username: user.displayName || user.email.split('@')[0],
              email: user.email,
              role: 'outer-disciple',
              photoURL: user.photoURL || '',
              emailVerified: user.emailVerified,
            };
          }
        } catch(e) {
          window._ifs.currentUserData = {
            uid: user.uid,
            username: user.displayName || user.email.split('@')[0],
            email: user.email,
            role: 'outer-disciple',
            photoURL: '',
            emailVerified: user.emailVerified,
          };
        }
      } else {
        window._ifs.currentUser     = null;
        window._ifs.currentUserData = null;
      }
      updateNav();
      window.dispatchEvent(new Event('authStateChanged'));
    });

    // ===== LOGIN =====
    window.handleLoginSubmit = async function(e) {
      e.preventDefault();
      const email    = document.getElementById('login-email')?.value?.trim();
      const password = document.getElementById('login-password')?.value;
      const errEl    = document.getElementById('login-error');
      const btn      = e.target.querySelector('button[type="submit"]');
      if (!email || !password) return;
      if (btn) { btn.textContent = 'Entering...'; btn.disabled = true; }

      try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        window.closeAllModals();
        document.getElementById('login-form')?.reset();
        // Nav updates via onAuthStateChanged automatically
      } catch(err) {
        if (errEl) { errEl.textContent = friendlyError(err.code); errEl.style.display = 'block'; }
      } finally {
        if (btn) { btn.textContent = 'Enter the Sect'; btn.disabled = false; }
      }
    };

    // ===== REGISTER =====
    window.handleRegisterSubmit = async function(e) {
      e.preventDefault();
      const username = document.getElementById('reg-username')?.value?.trim();
      const email    = document.getElementById('reg-email')?.value?.trim();
      const password = document.getElementById('reg-password')?.value;
      const confirm  = document.getElementById('reg-confirm')?.value;
      const errEl    = document.getElementById('reg-error');
      const btn      = e.target.querySelector('button[type="submit"]');

      if (!username || !email || !password) return;
      if (username.length < 3) { showErr(errEl, 'Username must be at least 3 characters.'); return; }
      if (password.length < 6) { showErr(errEl, 'Password must be at least 6 characters.'); return; }
      if (confirm && password !== confirm) { showErr(errEl, 'Passwords do not match.'); return; }

      // Filter username
      const filtered = window.filterContent(username);
      if (!filtered.ok) { showErr(errEl, filtered.reason); return; }

      if (btn) { btn.textContent = 'Forging your account...'; btn.disabled = true; }

      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: username });

        // Send verification email
        try {
          await sendEmailVerification(cred.user);
        } catch(verifyErr) {
          console.log('Verification email failed:', verifyErr);
        }

        const role = username === 'SectLeader' ? 'sect-leader' : 'outer-disciple';

        await setDoc(doc(db, 'users', cred.user.uid), {
          uid: cred.user.uid,
          username,
          email,
          role,
          photoURL: '',
          bio: '',
          canEdit: false,
          techniques: [],
          emailVerified: false,
          joined: serverTimestamp(),
        });

        window.closeAllModals();
        document.getElementById('register-form')?.reset();

        // Show verification notice
        showVerificationNotice();
      } catch(err) {
        showErr(errEl, friendlyError(err.code));
      } finally {
        if (btn) { btn.textContent = '⚙ Join the Sect'; btn.disabled = false; }
      }
    };

    // ===== LOGOUT =====
    window.handleLogout = async function() {
      window._ifs.currentUser     = null;
      window._ifs.currentUserData = null;
      await signOut(auth);
      updateNav();
    };

    // Bind forms
    function tryBind() {
      const lf = document.getElementById('login-form');
      if (lf && !lf.dataset.bound) { lf.addEventListener('submit', window.handleLoginSubmit); lf.dataset.bound = 'true'; }
      const rf = document.getElementById('register-form');
      if (rf && !rf.dataset.bound) { rf.addEventListener('submit', window.handleRegisterSubmit); rf.dataset.bound = 'true'; }
      const lb = document.getElementById('btn-logout');
      if (lb && !lb.dataset.bound) { lb.addEventListener('click', window.handleLogout); lb.dataset.bound = 'true'; }
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', tryBind);
    } else {
      tryBind();
    }

  } catch(initErr) {
    console.error('Firebase init error:', initErr);
  }
})();

// ===== NAV UPDATE =====
function updateNav() {
  const user     = window._ifs && window._ifs.currentUser;
  const userData = window._ifs && window._ifs.currentUserData;
  const loginBtn    = document.getElementById('btn-login');
  const joinBtn     = document.getElementById('btn-join');
  const logoutBtn   = document.getElementById('btn-logout');
  const userDisp    = document.getElementById('user-display');
  const adminLink   = document.getElementById('admin-nav-link');
  const profileLink = document.getElementById('profile-nav-link');

  if (!loginBtn) return;

  if (user && userData) {
    loginBtn.style.display    = 'none';
    joinBtn.style.display     = 'none';
    logoutBtn.style.display   = 'inline-flex';
    if (profileLink) profileLink.style.display = 'inline';

    const roleInfo = ROLES[userData.role] || ROLES['outer-disciple'];
    const initial  = (userData.username || '?').charAt(0).toUpperCase();
    const avatar   = userData.photoURL
      ? '<img src="' + userData.photoURL + '" style="width:28px;height:28px;border-radius:50%;object-fit:cover;border:1px solid #c8860a40;">'
      : '<div style="width:28px;height:28px;border-radius:50%;background:#161616;border:1px solid #2a2218;display:flex;align-items:center;justify-content:center;font-size:0.8rem;color:#c8860a;">' + initial + '</div>';

    if (userDisp) {
      userDisp.innerHTML =
        '<a href="profile.html" style="display:flex;align-items:center;gap:0.5rem;text-decoration:none;">' +
          avatar +
          '<span style="color:#9a9080;font-family:\'Share Tech Mono\',monospace;font-size:0.75rem;">' + userData.username + '</span>' +
          '<span class="role-badge ' + roleInfo.class + '">' + roleInfo.label + '</span>' +
        '</a>';
    }
    if (adminLink) adminLink.style.display = userData.role === 'sect-leader' ? 'inline' : 'none';
  } else {
    loginBtn.style.display    = 'inline-flex';
    joinBtn.style.display     = 'inline-flex';
    logoutBtn.style.display   = 'none';
    if (userDisp)    userDisp.innerHTML         = '';
    if (adminLink)   adminLink.style.display    = 'none';
    if (profileLink) profileLink.style.display  = 'none';
  }
}

function showErr(el, msg) {
  if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function showVerificationNotice() {
  // Show a toast/notice that verification email was sent
  const notice = document.createElement('div');
  notice.style.cssText = 'position:fixed;top:80px;right:20px;background:#1a2a1a;border:1px solid #4caf5040;color:#4caf50;padding:1rem 1.5rem;font-family:monospace;font-size:0.85rem;z-index:99999;border-radius:2px;max-width:320px;';
  notice.innerHTML = '<strong>Welcome to the sect!</strong><br>A verification email has been sent to your inbox. Check it when you get a chance!';
  document.body.appendChild(notice);
  setTimeout(() => notice.remove(), 6000);
}

function friendlyError(code) {
  var map = {
    'auth/email-already-in-use': 'That email is already registered. Try logging in instead.',
    'auth/invalid-email':        'That doesn\'t look like a valid email address.',
    'auth/weak-password':        'Password needs to be at least 6 characters.',
    'auth/user-not-found':       'No account found with that email.',
    'auth/wrong-password':       'Wrong password — give it another shot.',
    'auth/invalid-credential':   'Email or password is incorrect.',
    'auth/too-many-requests':    'Too many attempts — take a breather and try again.',
    'auth/network-request-failed': 'Network issue — check your connection.',
  };
  return map[code] || 'Something went wrong — try again in a sec.';
}
