// teacher-dashboard.js
import { db, auth } from '../js/firebase-init.js';
import { requireAuth, formatCAD, formatDate, formatDateShort, showToast, logout }
  from '../js/utils.js';
import {
  collection, getDocs, getDoc, doc, setDoc, updateDoc, addDoc,
  deleteDoc, serverTimestamp, increment, query, orderBy, where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
  createUserWithEmailAndPassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const MODULE_DEFS = [
  { id: 'ch1', title: 'Chapitre 1 — La consommation', icon: '🛒' },
  { id: 'ch2', title: 'Chapitre 2 — Le rôle de l\'État', icon: '⚖️' },
  { id: 'ch3', title: 'Chapitre 3 — Le crédit', icon: '💳' },
  { id: 'ch4', title: 'Chapitre 4 — Le budget', icon: '📊' },
  { id: 'ch5', title: 'Chapitre 5 — L\'épargne', icon: '📈' },
];

const CH_LABELS = { ch1:'Ch.1', ch2:'Ch.2', ch3:'Ch.3', ch4:'Ch.4', ch5:'Ch.5' };
const CH_CLASSES = { ch1:'tag-ch1', ch2:'tag-ch2', ch3:'tag-ch3', ch4:'tag-ch4', ch5:'tag-ch5' };

let currentUser = null;
let allStudents = [];
let allQuestions = [];
let currentQFilter = 'all';
let editingQId = null;

// ── Init ──────────────────────────────────────────────────────────
async function init() {
  try {
    const authData = await requireAuth('teacher');
    currentUser = authData.user;

    const nameEl = document.getElementById('topbar-username');
    const avatarEl = document.getElementById('topbar-avatar');
    if (nameEl) nameEl.textContent = authData.data.displayName || 'Professeur';
    if (avatarEl) {
      avatarEl.textContent = (authData.data.displayName || 'P').charAt(0).toUpperCase();
    }

    document.getElementById('btn-logout').addEventListener('click', logout);

    setupNavigation();
    await loadStudents();
    setupStudentActions();
    setupModuleDates();
    setupQuestionBank();
    setupFundsModal();

  } catch (err) {
    console.error(err);
  }
}

// ── Navigation ────────────────────────────────────────────────────
function setupNavigation() {
  document.querySelectorAll('.teacher-nav-item[data-section]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.teacher-nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const section = btn.dataset.section;
      document.querySelectorAll('.section-panel').forEach(p => p.classList.remove('visible'));
      document.getElementById(`section-${section}`).classList.add('visible');

      if (section === 'questions') loadQuestions();
      if (section === 'transactions') loadTransactions();
    });
  });
}

// ── Élèves ────────────────────────────────────────────────────────
async function loadStudents() {
  const snap = await getDocs(
    query(collection(db, 'users'), where('role', '==', 'student'))
  );
  allStudents = [];
  snap.forEach(d => allStudents.push({ id: d.id, ...d.data() }));

  allStudents.sort((a, b) =>
    (a.displayName || '').localeCompare(b.displayName || ''));

  renderStudentsTable(allStudents);
  document.getElementById('student-count').textContent =
    `${allStudents.length} élève(s)`;

  // Populate modal select
  const sel = document.getElementById('modal-student-select');
  sel.innerHTML = allStudents.map(s =>
    `<option value="${s.id}">${s.displayName || s.email}</option>`
  ).join('');
}

function renderStudentsTable(students) {
  const tbody = document.getElementById('students-tbody');
  if (students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:32px; color:var(--slate);">
      Aucun élève trouvé. Créez le premier compte ci-dessus.
    </td></tr>`;
    return;
  }

  tbody.innerHTML = students.map(s => {
    const lastLogin = formatDateShort(s.lastLogin);
    const balance = formatCAD(s.celiBalance || 0);
    const progress = s.moduleProgress || {};
    const completedCount = Object.values(progress).filter(p => p.completed).length;

    // Dots de progression
    const dots = MODULE_DEFS.map(m => {
      const p = progress[m.id];
      const cls = p?.completed ? 'done' : 'pending';
      return `<div class="progress-dot ${cls}" title="${m.title}"></div>`;
    }).join('');

    const avgScore = s.avgQuizScore ? `${Math.round(s.avgQuizScore)}%` : '—';

    return `
      <tr data-uid="${s.id}">
        <td>
          <div style="font-weight:600;">${s.displayName || '—'}</div>
          <div style="font-size:12px; color:var(--slate);">${s.email}</div>
        </td>
        <td>${lastLogin}</td>
        <td>
          <div class="progress-mini">${dots}</div>
          <div style="font-size:11px; color:var(--slate); margin-top:4px;">${completedCount}/5 modules</div>
        </td>
        <td><span class="font-mono" style="font-weight:600;">${balance}</span></td>
        <td>${avgScore}</td>
        <td>
          <div style="display:flex; gap:6px;">
            <button class="btn-icon btn-add-funds" title="Ajouter des fonds" data-uid="${s.id}" data-name="${s.displayName || s.email}">💰</button>
            <button class="btn-icon btn-view-student" title="Voir le détail" data-uid="${s.id}">👁️</button>
            <button class="btn-icon danger btn-delete-student" title="Supprimer" data-uid="${s.id}" data-name="${s.displayName || s.email}">🗑️</button>
          </div>
        </td>
      </tr>`;
  }).join('');

  // Événements
  tbody.querySelectorAll('.btn-add-funds').forEach(btn => {
    btn.addEventListener('click', () => openFundsModal(btn.dataset.uid));
  });
  tbody.querySelectorAll('.btn-delete-student').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm(`Supprimer le compte de ${btn.dataset.name}? Cette action est irréversible.`)) {
        deleteStudent(btn.dataset.uid);
      }
    });
  });
}

function setupStudentActions() {
  // Recherche
  document.getElementById('student-search').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    const filtered = allStudents.filter(s =>
      (s.displayName || '').toLowerCase().includes(q) ||
      (s.email || '').toLowerCase().includes(q)
    );
    renderStudentsTable(filtered);
  });

  // Toggle formulaire ajout
  document.getElementById('btn-show-add-student').addEventListener('click', () => {
    const form = document.getElementById('add-student-form');
    form.style.display = form.style.display === 'none' ? 'grid' : 'none';
  });

  // Créer un élève
  document.getElementById('btn-create-student').addEventListener('click', createStudent);
}

async function createStudent() {
  const name = document.getElementById('new-student-name').value.trim();
  const email = document.getElementById('new-student-email').value.trim();
  const password = document.getElementById('new-student-password').value;
  const errEl = document.getElementById('add-student-error');

  errEl.style.display = 'none';
  if (!name || !email || !password) {
    errEl.textContent = 'Tous les champs sont requis.';
    errEl.style.display = 'block';
    return;
  }
  if (password.length < 6) {
    errEl.textContent = 'Le mot de passe doit avoir au moins 6 caractères.';
    errEl.style.display = 'block';
    return;
  }

  try {
    // Créer l'utilisateur Firebase Auth
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    // Créer le document Firestore
    await setDoc(doc(db, 'users', cred.user.uid), {
      displayName: name,
      email: email,
      role: 'student',
      celiBalance: 0,
      createdAt: serverTimestamp(),
      createdBy: currentUser.uid,
      moduleProgress: {},
      loginCount: 0
    });

    showToast(`Compte de ${name} créé avec succès!`, 'success');
    document.getElementById('new-student-name').value = '';
    document.getElementById('new-student-email').value = '';
    document.getElementById('new-student-password').value = '';
    document.getElementById('add-student-form').style.display = 'none';

    await loadStudents();
  } catch (err) {
    let msg = 'Erreur lors de la création du compte.';
    if (err.code === 'auth/email-already-in-use') {
      msg = 'Cette adresse courriel est déjà utilisée.';
    }
    errEl.textContent = msg;
    errEl.style.display = 'block';
  }
}

async function deleteStudent(uid) {
  try {
    await updateDoc(doc(db, 'users', uid), { deleted: true, role: 'deleted' });
    showToast('Compte désactivé.', 'info');
    await loadStudents();
  } catch (err) {
    showToast('Erreur lors de la suppression.', 'error');
  }
}

// ── Dates de déverrouillage ───────────────────────────────────────
async function setupModuleDates() {
  const configSnap = await getDoc(doc(db, 'config', 'modules'));
  const config = configSnap.exists() ? configSnap.data() : {};

  const container = document.getElementById('module-dates-list');
  container.innerHTML = MODULE_DEFS.map(m => {
    const cfg = config[m.id] || {};
    let dateVal = '';
    if (cfg.unlockDate) {
      const d = cfg.unlockDate.toDate ? cfg.unlockDate.toDate() : new Date(cfg.unlockDate);
      dateVal = d.toISOString().split('T')[0];
    }
    const rewardVal = cfg.reward || getDefaultReward(m.id);

    return `
      <div class="module-unlock-row">
        <div>
          <div style="font-weight:600;">${m.icon} ${m.title}</div>
          <div class="text-muted" style="font-size:12px;">
            Récompense actuelle : ${formatCAD(rewardVal)}
          </div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <label style="font-size:13px; color:var(--text-soft);">Disponible le :</label>
          <input type="date" class="date-input module-date-input"
            data-module="${m.id}" value="${dateVal}">
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <label style="font-size:13px; color:var(--text-soft);">Récompense ($) :</label>
          <input type="number" class="date-input module-reward-input"
            data-module="${m.id}" value="${rewardVal}" min="0" max="9999"
            style="width:80px;">
        </div>
      </div>`;
  }).join('');

  document.getElementById('btn-save-dates').addEventListener('click', saveDates);
}

async function saveDates() {
  const updates = {};
  document.querySelectorAll('.module-date-input').forEach(inp => {
    const moduleId = inp.dataset.module;
    if (!updates[moduleId]) updates[moduleId] = {};
    if (inp.value) {
      updates[moduleId].unlockDate = new Date(inp.value + 'T00:00:00');
    } else {
      updates[moduleId].unlockDate = null;
    }
  });
  document.querySelectorAll('.module-reward-input').forEach(inp => {
    const moduleId = inp.dataset.module;
    if (!updates[moduleId]) updates[moduleId] = {};
    updates[moduleId].reward = parseInt(inp.value) || 0;
  });

  try {
    await setDoc(doc(db, 'config', 'modules'), updates, { merge: true });
    showToast('Dates et récompenses sauvegardées!', 'success');
  } catch (err) {
    showToast('Erreur lors de la sauvegarde.', 'error');
  }
}

function getDefaultReward(id) {
  return { ch1: 250, ch2: 250, ch3: 300, ch4: 300, ch5: 500 }[id] || 250;
}

// ── Banque de questions ───────────────────────────────────────────
function setupQuestionBank() {
  document.getElementById('btn-show-add-q').addEventListener('click', () => {
    editingQId = null;
    clearQForm();
    const form = document.getElementById('add-q-form');
    form.style.display = form.style.display === 'none' ? 'flex' : 'none';
  });

  document.getElementById('btn-cancel-q').addEventListener('click', () => {
    document.getElementById('add-q-form').style.display = 'none';
    editingQId = null;
  });

  document.getElementById('btn-save-q').addEventListener('click', saveQuestion);

  // Filtres
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      currentQFilter = btn.dataset.filter;
      renderQuestions();
    });
  });
}

async function loadQuestions() {
  const snap = await getDocs(
    query(collection(db, 'questions'), orderBy('chapter'), orderBy('createdAt', 'desc'))
  );
  allQuestions = [];
  snap.forEach(d => allQuestions.push({ id: d.id, ...d.data() }));
  renderQuestions();
}

function renderQuestions() {
  const filtered = currentQFilter === 'all'
    ? allQuestions
    : allQuestions.filter(q => q.chapter === currentQFilter);

  document.getElementById('q-total').textContent =
    `${filtered.length} question${filtered.length > 1 ? 's' : ''}`;

  const container = document.getElementById('questions-list');
  if (filtered.length === 0) {
    container.innerHTML = `<div class="card" style="text-align:center; padding:32px; color:var(--slate);">
      Aucune question pour ce chapitre. Ajoutez-en une!
    </div>`;
    return;
  }

  container.innerHTML = filtered.map(q => `
    <div class="question-bank-item" data-qid="${q.id}">
      <span class="question-chapter-tag ${CH_CLASSES[q.chapter] || ''}">
        ${CH_LABELS[q.chapter] || q.chapter}
      </span>
      <div class="question-text-preview">
        <div style="font-weight:600; margin-bottom:4px;">${q.question}</div>
        <div style="font-size:12px; color:var(--slate);">
          ${q.options ? q.options.map((o,i) => `${['A','B','C','D'][i]}. ${o}`).join(' · ') : ''}
        </div>
        ${q.source ? `<div style="font-size:11px; color:var(--accent-dim); margin-top:4px;">Source: ${q.source}</div>` : ''}
      </div>
      <div class="question-actions">
        <button class="btn-icon btn-edit-q" data-qid="${q.id}" title="Modifier">✏️</button>
        <button class="btn-icon danger btn-delete-q" data-qid="${q.id}" title="Supprimer">🗑️</button>
      </div>
    </div>`
  ).join('');

  container.querySelectorAll('.btn-edit-q').forEach(btn => {
    btn.addEventListener('click', () => editQuestion(btn.dataset.qid));
  });
  container.querySelectorAll('.btn-delete-q').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm('Supprimer cette question?')) deleteQuestion(btn.dataset.qid);
    });
  });
}

async function saveQuestion() {
  const chapter = document.getElementById('q-chapter').value;
  const questionText = document.getElementById('q-text-input').value.trim();
  const opts = [0,1,2,3].map(i => document.getElementById(`q-opt-${i}`).value.trim());
  const correctIndex = parseInt(document.getElementById('q-correct').value);
  const explanation = document.getElementById('q-explanation-input').value.trim();
  const source = document.getElementById('q-source').value.trim();

  if (!questionText || opts.some(o => !o)) {
    showToast('Remplis tous les champs obligatoires.', 'error');
    return;
  }

  const data = {
    chapter,
    question: questionText,
    options: opts,
    correctIndex,
    explanation,
    source,
    active: true,
    updatedAt: serverTimestamp()
  };

  try {
    if (editingQId) {
      await updateDoc(doc(db, 'questions', editingQId), data);
      showToast('Question modifiée!', 'success');
    } else {
      data.createdAt = serverTimestamp();
      data.createdBy = currentUser.uid;
      await addDoc(collection(db, 'questions'), data);
      showToast('Question ajoutée!', 'success');
    }
    document.getElementById('add-q-form').style.display = 'none';
    editingQId = null;
    clearQForm();
    await loadQuestions();
  } catch (err) {
    showToast('Erreur lors de la sauvegarde.', 'error');
  }
}

function editQuestion(qid) {
  const q = allQuestions.find(x => x.id === qid);
  if (!q) return;
  editingQId = qid;

  document.getElementById('q-chapter').value = q.chapter;
  document.getElementById('q-text-input').value = q.question;
  [0,1,2,3].forEach(i => {
    document.getElementById(`q-opt-${i}`).value = q.options?.[i] || '';
  });
  document.getElementById('q-correct').value = q.correctIndex;
  document.getElementById('q-explanation-input').value = q.explanation || '';
  document.getElementById('q-source').value = q.source || '';

  document.getElementById('add-q-form').style.display = 'flex';
  document.getElementById('add-q-form').scrollIntoView({ behavior: 'smooth' });
}

async function deleteQuestion(qid) {
  try {
    await deleteDoc(doc(db, 'questions', qid));
    showToast('Question supprimée.', 'info');
    allQuestions = allQuestions.filter(q => q.id !== qid);
    renderQuestions();
  } catch (err) {
    showToast('Erreur lors de la suppression.', 'error');
  }
}

function clearQForm() {
  document.getElementById('q-text-input').value = '';
  [0,1,2,3].forEach(i => { document.getElementById(`q-opt-${i}`).value = ''; });
  document.getElementById('q-correct').value = '0';
  document.getElementById('q-explanation-input').value = '';
  document.getElementById('q-source').value = '';
}

// ── Modal ajout de fonds ──────────────────────────────────────────
function setupFundsModal() {
  document.getElementById('btn-add-funds-quick').addEventListener('click', () => openFundsModal());
  document.getElementById('btn-cancel-funds').addEventListener('click', () => {
    document.getElementById('modal-funds').style.display = 'none';
  });
  document.getElementById('btn-confirm-funds').addEventListener('click', addFunds);
}

function openFundsModal(uid) {
  if (uid) {
    document.getElementById('modal-student-select').value = uid;
  }
  document.getElementById('modal-funds-error').style.display = 'none';
  document.getElementById('modal-funds').style.display = 'flex';
}

async function addFunds() {
  const uid = document.getElementById('modal-student-select').value;
  const amount = parseFloat(document.getElementById('modal-amount').value);
  const reason = document.getElementById('modal-reason').value.trim();
  const errEl = document.getElementById('modal-funds-error');

  errEl.style.display = 'none';
  if (!uid || isNaN(amount) || amount <= 0) {
    errEl.textContent = 'Sélectionne un élève et entre un montant valide.';
    errEl.style.display = 'block';
    return;
  }

  try {
    // Mettre à jour le solde
    await updateDoc(doc(db, 'users', uid), {
      celiBalance: increment(amount)
    });

    // Enregistrer la transaction
    await addDoc(collection(db, 'users', uid, 'transactions'), {
      type: 'teacher_credit',
      amount,
      description: reason || 'Crédit enseignant',
      date: serverTimestamp(),
      addedBy: currentUser.uid
    });

    const student = allStudents.find(s => s.id === uid);
    showToast(`${formatCAD(amount)} ajoutés à ${student?.displayName || 'l\'élève'}!`, 'success');
    document.getElementById('modal-funds').style.display = 'none';
    await loadStudents();
  } catch (err) {
    errEl.textContent = 'Erreur lors de l\'ajout de fonds.';
    errEl.style.display = 'block';
  }
}

// ── Transactions ──────────────────────────────────────────────────
async function loadTransactions() {
  const tbody = document.getElementById('transactions-tbody');
  tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px;">Chargement...</td></tr>`;

  const allTx = [];
  for (const student of allStudents.slice(0, 30)) {
    const txSnap = await getDocs(
      query(
        collection(db, 'users', student.id, 'transactions'),
        orderBy('date', 'desc')
      )
    );
    txSnap.forEach(d => {
      allTx.push({ ...d.data(), studentName: student.displayName || student.email });
    });
  }

  allTx.sort((a, b) => {
    const da = a.date?.toDate?.() || new Date(0);
    const db2 = b.date?.toDate?.() || new Date(0);
    return db2 - da;
  });

  if (allTx.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:32px; color:var(--slate);">
      Aucune transaction enregistrée.
    </td></tr>`;
    return;
  }

  const typeLabels = {
    quiz_reward: '🎓 Quiz réussi',
    teacher_credit: '👩‍🏫 Crédit enseignant',
    stock_buy: '📈 Achat d\'action',
    stock_sell: '📉 Vente d\'action'
  };

  tbody.innerHTML = allTx.slice(0, 100).map(tx => `
    <tr>
      <td style="font-weight:600;">${tx.studentName}</td>
      <td>${typeLabels[tx.type] || tx.type}</td>
      <td>
        <span class="font-mono" style="font-weight:600; color:${tx.amount > 0 ? 'var(--accent-dim)' : 'var(--danger)'}">
          ${tx.amount > 0 ? '+' : ''}${formatCAD(tx.amount)}
        </span>
      </td>
      <td style="color:var(--text-soft); font-size:13px;">${tx.description || '—'}</td>
      <td style="color:var(--text-soft); font-size:13px;">${formatDate(tx.date)}</td>
    </tr>`
  ).join('');
}

init();
