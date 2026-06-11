// utils.js — Fonctions partagées

import { auth, db } from './firebase-init.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc, updateDoc, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ── Garde d'authentification ──────────────────────────────────────
export function requireAuth(expectedRole, redirectTo = '../index.html') {
  return new Promise((resolve, reject) => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      unsub();
      if (!user) {
        window.location.href = redirectTo;
        return reject('Non connecté');
      }
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (!snap.exists() || snap.data().role !== expectedRole) {
        window.location.href = redirectTo;
        return reject('Rôle incorrect');
      }
      // Mettre à jour lastLogin
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
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2
  }).format(amount);
}

// ── Formatage date ────────────────────────────────────────────────
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
    toast.style.animation = 'toast-out 300ms ease forwards';
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

// ── Vérifier si un module est disponible ─────────────────────────
export function isModuleAvailable(module) {
  if (!module.unlockDate) return true;
  const unlockDate = module.unlockDate.toDate
    ? module.unlockDate.toDate()
    : new Date(module.unlockDate);
  return new Date() >= unlockDate;
}

// ── Initialiser la topbar ─────────────────────────────────────────
export function initTopbar(userData) {
  const nameEl = document.getElementById('topbar-username');
  const avatarEl = document.getElementById('topbar-avatar');
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
