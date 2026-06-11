// utils.js — Fonctions partagées v2 (avec support groupes)
import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, updateDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ── Garde d'authentification ──────────────────────────────────────
export function requireAuth(expectedRole, redirectTo = '../index.html') {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();
      if (!user) { window.location.href = redirectTo; return reject('Non connecté'); }
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (!snap.exists() || snap.data().role !== expectedRole) {
        window.location.href = redirectTo; return reject('Rôle incorrect');
      }
      await updateDoc(doc(db, 'users', user.uid), {
        lastLogin: serverTimestamp(),
        loginCount: (snap.data().loginCount || 0) + 1
      });
      resolve({ user, data: snap.data() });
    });
  });
}

// ── Formatage monétaire ───────────────────────────────────────────
export function formatCAD(amount) {
  return new Intl.NumberFormat('fr-CA', {
    style: 'currency', currency: 'CAD', minimumFractionDigits: 2
  }).format(amount || 0);
}

// ── Formatage dates ───────────────────────────────────────────────
export function formatDate(timestamp) {
  if (!timestamp) return '—';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return new Intl.DateTimeFormat('fr-CA', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  }).format(date);
}

export function formatDateShort(timestamp) {
  if (!timestamp) return '—';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return new Intl.DateTimeFormat('fr-CA', {
    day: 'numeric', month: 'short', year: 'numeric'
  }).format(date);
}

// ── Toast notifications ───────────────────────────────────────────
export function showToast(message, type = 'info', duration = 3500) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 300ms';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── Déconnexion ───────────────────────────────────────────────────
export async function logout() {
  const { signOut } = await import(
    "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js"
  );
  await signOut(auth);
  window.location.href = '../index.html';
}

// ── Vérifier si un module est disponible (avec support groupes) ───
export function isModuleAvailable(moduleConfig, userGroup) {
  // Chercher la config spécifique au groupe d'abord
  let cfg = null;

  if (userGroup && moduleConfig[`group_${userGroup}`]) {
    // Config spécifique au groupe de l'élève
    cfg = moduleConfig[`group_${userGroup}`];
  } else if (moduleConfig.default) {
    // Config par défaut (tous les groupes)
    cfg = moduleConfig.default;
  } else {
    // Ancienne structure — compatibilité rétroactive
    cfg = moduleConfig;
  }

  if (!cfg || !cfg.unlockDate) return true; // Pas de date = disponible

  const unlockDate = cfg.unlockDate.toDate
    ? cfg.unlockDate.toDate()
    : new Date(cfg.unlockDate);

  return new Date() >= unlockDate;
}

// ── Obtenir la récompense d'un module (avec support groupes) ──────
export function getModuleReward(moduleConfig, moduleId, userGroup) {
  const defaults = { ch1:250, ch2:250, ch3:300, ch4:300, ch5:500 };

  let cfg = null;
  if (userGroup && moduleConfig[`group_${userGroup}`]?.[moduleId]) {
    cfg = moduleConfig[`group_${userGroup}`][moduleId];
  } else if (moduleConfig.default?.[moduleId]) {
    cfg = moduleConfig.default[moduleId];
  } else if (moduleConfig[moduleId]) {
    // Ancienne structure
    cfg = moduleConfig[moduleId];
  }

  return cfg?.reward || defaults[moduleId] || 250;
}

// ── Obtenir la date de déverrouillage lisible ─────────────────────
export function getUnlockDate(moduleConfig, moduleId, userGroup) {
  let cfg = null;
  if (userGroup && moduleConfig[`group_${userGroup}`]?.[moduleId]) {
    cfg = moduleConfig[`group_${userGroup}`][moduleId];
  } else if (moduleConfig.default?.[moduleId]) {
    cfg = moduleConfig.default[moduleId];
  } else if (moduleConfig[moduleId]) {
    cfg = moduleConfig[moduleId];
  }

  if (!cfg?.unlockDate) return null;
  return cfg.unlockDate.toDate ? cfg.unlockDate.toDate() : new Date(cfg.unlockDate);
}

// ── Initialiser la topbar ─────────────────────────────────────────
export function initTopbar(userData) {
  const nameEl    = document.getElementById('topbar-username');
  const avatarEl  = document.getElementById('topbar-avatar');
  const balanceEl = document.getElementById('topbar-balance');
  const logoutBtn = document.getElementById('btn-logout');

  if (nameEl) nameEl.textContent = userData.displayName || userData.email;
  if (avatarEl) {
    const initials = (userData.displayName || userData.email || 'U')
      .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    avatarEl.textContent = initials;
  }
  if (balanceEl) balanceEl.textContent = formatCAD(userData.celiBalance || 0);
  if (logoutBtn) logoutBtn.addEventListener('click', logout);
}
