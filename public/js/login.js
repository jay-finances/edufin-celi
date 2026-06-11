// login.js
import { auth, db } from './firebase-init.js';
import {
  signInWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentTab = 'eleve';

// Gestion des onglets
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentTab = btn.dataset.tab;
  });
});

// Formulaire de connexion
document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();

  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const errorDiv = document.getElementById('login-error');
  const btn      = document.getElementById('login-btn');

  errorDiv.style.display = 'none';
  btn.querySelector('.btn-text').style.display = 'none';
  btn.querySelector('.btn-loader').style.display = 'inline';
  btn.disabled = true;

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const uid = credential.user.uid;

    // Vérifier le rôle dans Firestore
    const userDoc = await getDoc(doc(db, 'users', uid));

    if (!userDoc.exists()) {
      throw new Error('Compte introuvable. Contacte ton enseignant.');
    }

    const userData = userDoc.data();
    const role = userData.role;

    // Vérifier que l'onglet correspond au rôle
    if (currentTab === 'enseignant' && role !== 'teacher') {
      throw new Error('Ce compte n\'a pas les droits enseignant.');
    }
    if (currentTab === 'eleve' && role === 'teacher') {
      throw new Error('Utilise l\'onglet Enseignant pour te connecter.');
    }

    // Mettre à jour lastLogin
    const { doc: firestoreDoc, updateDoc, serverTimestamp } =
      await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");
    // On importe différemment pour éviter le conflit de noms
    const { updateDoc: update, serverTimestamp: timestamp } =
      await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js");

    // Rediriger selon le rôle
    if (role === 'teacher') {
      window.location.href = 'pages/teacher-dashboard.html';
    } else {
      window.location.href = 'pages/student-dashboard.html';
    }

  } catch (err) {
    let msg = 'Courriel ou mot de passe incorrect.';
    if (err.code === 'auth/too-many-requests') {
      msg = 'Trop de tentatives. Réessaie dans quelques minutes.';
    } else if (err.message && !err.code) {
      msg = err.message;
    }
    errorDiv.textContent = msg;
    errorDiv.style.display = 'block';

    btn.querySelector('.btn-text').style.display = 'inline';
    btn.querySelector('.btn-loader').style.display = 'none';
    btn.disabled = false;
  }
});
