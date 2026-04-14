import { auth } from './firebase-init.js';
import { onAuthStateChanged, signOut }
  from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";

onAuthStateChanged(auth, user => {
  const emailEl  = document.getElementById('nav-user-email');
  const logoutBtn = document.getElementById('nav-logout-btn');
  const loginLink = document.getElementById('nav-login-link');
  if (!emailEl || !logoutBtn || !loginLink) return;

  if (user) {
    emailEl.textContent    = user.email;
    logoutBtn.style.display = 'inline-block';
    loginLink.style.display = 'none';
  } else {
    emailEl.textContent    = '';
    logoutBtn.style.display = 'none';
    loginLink.style.display = 'inline-block';
  }
});

document.getElementById('nav-logout-btn')
  ?.addEventListener('click', () => signOut(auth));
