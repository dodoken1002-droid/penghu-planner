// ── Auth utility — included in every page ─────────────────────────────────────

const ROLE_LABEL = { admin: '管理者', editor: '編輯者', viewer: '確認者' };

// Call at the top of each page's init(). Redirects to /login if not authed
// or role doesn't match. Returns the user object if OK.
async function requirePage(allowedRoles) {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) throw new Error('UNAUTHORIZED');
    const user = await res.json();
    if (allowedRoles && !allowedRoles.includes(user.role)) throw new Error('FORBIDDEN');
    window.currentUser = user;
    _updateNav(user);
    return user;
  } catch (e) {
    location.href = '/login';
    throw e; // stop calling init() from continuing
  }
}

function _updateNav(user) {
  // Show / hide nav links by role
  const plannerLink = document.getElementById('nav-planner');
  const tripsLink   = document.getElementById('nav-trips');
  const adminLink   = document.getElementById('nav-admin');
  if (plannerLink) plannerLink.style.display = user.role === 'admin' ? '' : 'none';
  if (tripsLink)   tripsLink.style.display   = ['admin','viewer'].includes(user.role) ? '' : 'none';
  if (adminLink)   adminLink.style.display   = ['admin','editor'].includes(user.role) ? '' : 'none';

  // Append username chip + logout button (once)
  const navLinks = document.querySelector('.nav-links');
  if (navLinks && !document.getElementById('nav-user-chip')) {
    navLinks.insertAdjacentHTML('beforeend', `
      <span id="nav-user-chip" class="nav-user-chip">
        👤 <span class="nav-user-name">${user.display_name || user.username}</span>
        <span class="nav-user-role">(${ROLE_LABEL[user.role]||user.role})</span>
      </span>
      <button onclick="authLogout()" class="nav-logout-btn">登出</button>
    `);
  }
}

async function authLogout() {
  try { await fetch('/api/auth/logout', { method:'POST', credentials:'include' }); } catch(e){}
  location.href = '/login';
}
