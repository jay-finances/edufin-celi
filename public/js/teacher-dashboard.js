// teacher-dashboard.js — Version 2 avec groupes
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

// ── Constantes ────────────────────────────────────────────────────
const GROUPS = ['50', '51', '56', '57', '58', '59'];
const MODULE_DEFS = [
  { id: 'ch1', title: 'Ch.1 — Consommation',  icon: '🛒' },
  { id: 'ch2', title: 'Ch.2 — Rôle de l\'État', icon: '⚖️' },
  { id: 'ch3', title: 'Ch.3 — Crédit',         icon: '💳' },
  { id: 'ch4', title: 'Ch.4 — Budget',          icon: '📊' },
  { id: 'ch5', title: 'Ch.5 — Épargne',         icon: '📈' },
];
const CH_CLASSES = { ch1:'tag-ch1', ch2:'tag-ch2', ch3:'tag-ch3', ch4:'tag-ch4', ch5:'tag-ch5' };
const CH_LABELS  = { ch1:'Ch.1', ch2:'Ch.2', ch3:'Ch.3', ch4:'Ch.4', ch5:'Ch.5' };
const DEFAULT_PASSWORD = 'Edufin2025!';

let currentUser = null;
let allStudents  = [];
let allQuestions = [];
let currentGroupFilter = 'all';
let currentQFilter     = 'all';
let editingQId         = null;
let importRows         = [];

// ── Init ──────────────────────────────────────────────────────────
async function init() {
  try {
    const authData = await requireAuth('teacher');
    currentUser = authData.user;
    const nameEl   = document.getElementById('topbar-username');
    const avatarEl = document.getElementById('topbar-avatar');
    if (nameEl)   nameEl.textContent   = authData.data.displayName || 'Professeur';
    if (avatarEl) avatarEl.textContent = (authData.data.displayName || 'P').charAt(0).toUpperCase();
    document.getElementById('btn-logout').addEventListener('click', logout);

    setupNavigation();
    await loadStudents();
    setupStudentActions();
    setupModuleDates();
    setupQuestionBank();
    setupFundsModal();
    setupImport();
    setupBabillard();
  } catch (err) { console.error(err); }
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
      if (section === 'questions')    loadQuestions();
      if (section === 'transactions') loadTransactions();
    });
  });
}

// ── Chargement élèves ─────────────────────────────────────────────
async function loadStudents() {
  const snap = await getDocs(
    query(collection(db, 'users'), where('role', '==', 'student'))
  );
  allStudents = [];
  snap.forEach(d => allStudents.push({ id: d.id, ...d.data() }));
  allStudents.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '', 'fr'));

  renderGroupStats();
  renderStudentsTable(allStudents);
  populateFundsModal();
}

// ── Stats par groupe ──────────────────────────────────────────────
function renderGroupStats() {
  const container = document.getElementById('group-stats-container');

  // Stat globale
  const stats = [{ label: 'Tous les groupes', students: allStudents, highlight: true }];
  GROUPS.forEach(g => {
    const s = allStudents.filter(st => st.group === g);
    if (s.length > 0) stats.push({ label: `Groupe ${g}`, students: s, group: g });
  });

  container.innerHTML = stats.map(s => {
    const count     = s.students.length;
    const avgBalance = count > 0
      ? s.students.reduce((sum, st) => sum + (st.celiBalance || 0), 0) / count
      : 0;
    const completed  = s.students.filter(st => {
      const prog = st.moduleProgress || {};
      return Object.values(prog).some(p => p.completed);
    }).length;
    const activeThis  = s.students.filter(st => {
      if (!st.lastLogin) return false;
      const d = st.lastLogin.toDate ? st.lastLogin.toDate() : new Date(st.lastLogin);
      return (Date.now() - d) < 7 * 24 * 60 * 60 * 1000;
    }).length;

    return `
      <div class="group-stat" style="${s.highlight ? 'background:rgba(0,200,150,0.06); border:1.5px solid rgba(0,200,150,0.2);' : ''}">
        <div class="group-stat-label">${s.label}</div>
        <div class="group-stat-value">${count}</div>
        <div style="font-size:11px; color:var(--text-soft); margin-top:4px;">
          élève${count > 1 ? 's' : ''} ·
          <span style="color:var(--accent-dim);">${activeThis} actif${activeThis > 1 ? 's' : ''} (7j)</span>
        </div>
        <div style="font-size:12px; color:var(--text-soft); margin-top:6px;">
          Solde moy. : <strong>${formatCAD(avgBalance)}</strong>
        </div>
      </div>`;
  }).join('');
}

// ── Tableau élèves ────────────────────────────────────────────────
function renderStudentsTable(students) {
  const tbody = document.getElementById('students-tbody');
  document.getElementById('student-count').textContent = `${students.length} élève(s)`;

  if (students.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7"
      style="text-align:center; padding:32px; color:var(--slate);">
      Aucun élève dans ce groupe. Ajoutez-en via le bouton ci-dessus ou l'import CSV.
    </td></tr>`;
    return;
  }

  tbody.innerHTML = students.map(s => {
    const lastLogin  = formatDateShort(s.lastLogin);
    const balance    = formatCAD(s.celiBalance || 0);
    const progress   = s.moduleProgress || {};
    const completed  = Object.values(progress).filter(p => p.completed).length;
    const dots       = MODULE_DEFS.map(m => {
      const p   = progress[m.id];
      const cls = p?.completed ? 'done' : 'pending';
      return `<div class="progress-dot ${cls}" title="${m.title}"></div>`;
    }).join('');
    const avgScore = s.avgQuizScore ? `${Math.round(s.avgQuizScore)}%` : '—';
    const groupBadge = s.group
      ? `<span style="background:rgba(0,200,150,0.1); color:var(--accent-dim);
           font-size:11px; font-weight:700; padding:2px 8px; border-radius:20px;">
           Gr. ${s.group}</span>`
      : '<span style="color:var(--slate); font-size:12px;">—</span>';

    return `
      <tr>
        <td>
          <div style="font-weight:600;">${s.displayName || '—'}</div>
          <div style="font-size:12px; color:var(--slate);">${s.email}</div>
        </td>
        <td>${groupBadge}</td>
        <td style="font-size:13px;">${lastLogin}</td>
        <td>
          <div class="progress-mini">${dots}</div>
          <div style="font-size:11px; color:var(--slate); margin-top:3px;">${completed}/5</div>
        </td>
        <td><span class="font-mono" style="font-weight:600;">${balance}</span></td>
        <td>${avgScore}</td>
        <td>
          <div style="display:flex; gap:5px;">
            <button class="btn-icon btn-add-funds-row" title="Ajouter des fonds"
              data-uid="${s.id}">💰</button>
            <button class="btn-icon danger btn-delete-student" title="Supprimer"
              data-uid="${s.id}" data-name="${s.displayName || s.email}">🗑️</button>
          </div>
        </td>
      </tr>`;
  }).join('');

  tbody.querySelectorAll('.btn-add-funds-row').forEach(btn => {
    btn.addEventListener('click', () => openFundsModal(btn.dataset.uid));
  });
  tbody.querySelectorAll('.btn-delete-student').forEach(btn => {
    btn.addEventListener('click', () => {
      if (confirm(`Désactiver le compte de ${btn.dataset.name}?`)) {
        deleteStudent(btn.dataset.uid);
      }
    });
  });
}

function setupStudentActions() {
  // Onglets groupes
  document.querySelectorAll('.group-tab[data-group]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.group-tab[data-group]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentGroupFilter = btn.dataset.group;
      applyFilters();
    });
  });

  // Recherche
  document.getElementById('student-search').addEventListener('input', applyFilters);

  // Toggle formulaire
  document.getElementById('btn-show-add-student').addEventListener('click', () => {
    const form = document.getElementById('add-student-form');
    form.style.display = form.style.display === 'none' ? 'grid' : 'none';
  });

  // Créer un élève
  document.getElementById('btn-create-student').addEventListener('click', createStudent);
}

function applyFilters() {
  const search = document.getElementById('student-search').value.toLowerCase();
  let filtered = allStudents;
  if (currentGroupFilter !== 'all') {
    filtered = filtered.filter(s => s.group === currentGroupFilter);
  }
  if (search) {
    filtered = filtered.filter(s =>
      (s.displayName || '').toLowerCase().includes(search) ||
      (s.email || '').toLowerCase().includes(search)
    );
  }
  renderStudentsTable(filtered);
}

async function createStudent() {
  const name     = document.getElementById('new-student-name').value.trim();
  const email    = document.getElementById('new-student-email').value.trim();
  const group    = document.getElementById('new-student-group').value;
  const password = document.getElementById('new-student-password').value;
  const errEl    = document.getElementById('add-student-error');

  errEl.style.display = 'none';
  if (!name || !email || !password) {
    errEl.textContent = 'Tous les champs sont requis.';
    errEl.style.display = 'block'; return;
  }
  if (password.length < 6) {
    errEl.textContent = 'Mot de passe : minimum 6 caractères.';
    errEl.style.display = 'block'; return;
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', cred.user.uid), {
      displayName: name, email, role: 'student',
      group, celiBalance: 0,
      createdAt: serverTimestamp(), createdBy: currentUser.uid,
      moduleProgress: {}, loginCount: 0
    });
    showToast(`✓ Compte de ${name} (Gr.${group}) créé!`, 'success');
    document.getElementById('new-student-name').value = '';
    document.getElementById('new-student-email').value = '';
    document.getElementById('new-student-password').value = '';
    document.getElementById('add-student-form').style.display = 'none';
    await loadStudents();
  } catch (err) {
    errEl.textContent = err.code === 'auth/email-already-in-use'
      ? 'Ce courriel est déjà utilisé.' : 'Erreur lors de la création.';
    errEl.style.display = 'block';
  }
}

async function deleteStudent(uid) {
  try {
    await updateDoc(doc(db, 'users', uid), { deleted: true, role: 'deleted' });
    showToast('Compte désactivé.', 'info');
    await loadStudents();
  } catch { showToast('Erreur.', 'error'); }
}

// ── Import CSV ────────────────────────────────────────────────────
function setupImport() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('csv-file-input');

  fileInput.addEventListener('change', e => {
    if (e.target.files[0]) parseCSV(e.target.files[0]);
  });

  dropZone.addEventListener('dragover', e => {
    e.preventDefault(); dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault(); dropZone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) parseCSV(e.dataTransfer.files[0]);
  });

  document.getElementById('btn-confirm-import').addEventListener('click', runImport);
}

function parseCSV(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    importRows = [];

    lines.forEach((line, i) => {
      const cols = line.split(',').map(c => c.trim().replace(/^"|"$/g, ''));
      if (cols.length < 3) return;

      // Détecter si c'est une ligne d'en-tête
      if (i === 0 && isNaN(cols[0]) &&
          (cols[0].toLowerCase().includes('prénom') ||
           cols[0].toLowerCase().includes('nom') ||
           cols[0].toLowerCase().includes('prenom'))) return;

      const [prenom, nom, email, groupe] = cols;
      const errors = [];
      if (!prenom || !nom) errors.push('Prénom/Nom manquant');
      if (!email || !email.includes('@')) errors.push('Courriel invalide');
      if (groupe && !GROUPS.includes(groupe)) errors.push(`Groupe "${groupe}" inconnu`);

      importRows.push({
        prenom: prenom || '',
        nom: nom || '',
        displayName: `${prenom || ''} ${nom || ''}`.trim(),
        email: email || '',
        group: groupe || '',
        valid: errors.length === 0,
        errors
      });
    });

    renderImportPreview();
  };
  reader.readAsText(file, 'UTF-8');
}

function renderImportPreview() {
  const valid   = importRows.filter(r => r.valid).length;
  const invalid = importRows.filter(r => !r.valid).length;

  document.getElementById('preview-title').textContent =
    `Aperçu — ${importRows.length} ligne(s) détectée(s)`;
  document.getElementById('preview-sub').textContent =
    `✓ ${valid} valide(s)${invalid > 0 ? ` · ✗ ${invalid} erreur(s)` : ''}` +
    ` · Mot de passe initial : ${DEFAULT_PASSWORD}`;

  const tbody = document.getElementById('preview-tbody');
  tbody.innerHTML = importRows.map(r => `
    <tr class="${r.valid ? 'row-valid' : 'row-error'}">
      <td>${r.prenom}</td>
      <td>${r.nom}</td>
      <td>${r.email}</td>
      <td>${r.group ? `Gr. ${r.group}` : '<span style="color:var(--warn);">—</span>'}</td>
      <td style="font-size:12px;">
        ${r.valid
          ? '<span style="color:var(--accent-dim);">✓ Prêt</span>'
          : `<span style="color:var(--danger);">${r.errors.join(', ')}</span>`}
      </td>
    </tr>`).join('');

  document.getElementById('import-preview-section').style.display = 'block';
  document.getElementById('drop-zone').style.display = 'none';
}

window.resetImport = function() {
  importRows = [];
  document.getElementById('csv-file-input').value = '';
  document.getElementById('import-preview-section').style.display = 'none';
  document.getElementById('drop-zone').style.display = 'block';
  document.getElementById('import-progress').style.display = 'none';
  document.getElementById('import-result').style.display = 'none';
};

async function runImport() {
  const validRows = importRows.filter(r => r.valid);
  if (validRows.length === 0) {
    showToast('Aucune ligne valide à importer.', 'error'); return;
  }

  document.getElementById('btn-confirm-import').disabled = true;
  document.getElementById('import-progress').style.display = 'block';

  let success = 0, failed = 0;
  const errors = [];

  for (let i = 0; i < validRows.length; i++) {
    const row = validRows[i];
    const pct = Math.round(((i + 1) / validRows.length) * 100);

    document.getElementById('import-progress-label').textContent =
      `Création de ${row.displayName}...`;
    document.getElementById('import-progress-count').textContent =
      `${i + 1} / ${validRows.length}`;
    document.getElementById('import-progress-bar').style.width = `${pct}%`;

    try {
      const cred = await createUserWithEmailAndPassword(auth, row.email, DEFAULT_PASSWORD);
      await setDoc(doc(db, 'users', cred.user.uid), {
        displayName: row.displayName,
        email: row.email,
        role: 'student',
        group: row.group,
        celiBalance: 0,
        createdAt: serverTimestamp(),
        createdBy: currentUser.uid,
        moduleProgress: {},
        loginCount: 0
      });
      success++;
    } catch (err) {
      failed++;
      const msg = err.code === 'auth/email-already-in-use'
        ? 'Courriel déjà utilisé' : err.message;
      errors.push(`${row.displayName} (${row.email}) : ${msg}`);
    }

    // Petite pause pour éviter de surcharger Firebase
    await new Promise(r => setTimeout(r, 300));
  }

  // Résultat
  const resultEl = document.getElementById('import-result');
  resultEl.style.display = 'block';
  resultEl.innerHTML = `
    <div style="padding:16px; background:${success > 0 ? 'rgba(0,200,150,0.08)' : 'rgba(232,68,90,0.08)'};
         border-radius:var(--radius-md); border:1px solid ${success > 0 ? 'rgba(0,200,150,0.3)' : 'rgba(232,68,90,0.3)'};">
      <div style="font-weight:700; font-size:15px; margin-bottom:8px;">
        ${success > 0 ? '✅' : '❌'} Import terminé
      </div>
      <div style="font-size:14px;">
        <span style="color:var(--accent-dim);">✓ ${success} compte(s) créé(s)</span>
        ${failed > 0 ? `<span style="color:var(--danger); margin-left:12px;">✗ ${failed} échec(s)</span>` : ''}
      </div>
      ${errors.length > 0 ? `
        <div style="margin-top:10px; font-size:12px; color:var(--danger);">
          ${errors.map(e => `<div>• ${e}</div>`).join('')}
        </div>` : ''}
    </div>`;

  document.getElementById('import-progress-label').textContent = 'Import terminé!';
  document.getElementById('btn-confirm-import').disabled = false;

  if (success > 0) {
    showToast(`${success} élève(s) importé(s) avec succès!`, 'success');
    await loadStudents();
  }
}

// ── Dates de déverrouillage par groupe ────────────────────────────
async function setupModuleDates() {
  const configSnap = await getDoc(doc(db, 'config', 'modules'));
  const config = configSnap.exists() ? configSnap.data() : {};

  const container = document.getElementById('group-dates-container');

  // Créer une carte par groupe + une carte "Tous les groupes"
  const allGroups = ['all', ...GROUPS];

  container.innerHTML = allGroups.map(g => {
    const label = g === 'all' ? '🌐 Tous les groupes (défaut)' : `📋 Groupe ${g}`;
    const groupConfig = g === 'all' ? (config.default || {}) : (config[`group_${g}`] || {});

    const moduleRows = MODULE_DEFS.map(m => {
      const cfg = groupConfig[m.id] || {};
      let dateVal = '';
      if (cfg.unlockDate) {
        const d = cfg.unlockDate.toDate ? cfg.unlockDate.toDate() : new Date(cfg.unlockDate);
        dateVal = d.toISOString().split('T')[0];
      }
      const reward = cfg.reward || getDefaultReward(m.id);

      return `
        <div class="module-date-row">
          <span class="module-date-label">${m.icon} ${m.title}</span>
          <input type="date" class="date-input module-date"
            data-group="${g}" data-module="${m.id}" value="${dateVal}"
            title="Date de déverrouillage">
          <input type="number" class="date-input module-reward"
            data-group="${g}" data-module="${m.id}" value="${reward}"
            min="0" max="9999" style="width:70px;" title="Récompense ($)">
        </div>`;
    }).join('');

    return `
      <div class="group-dates-card ${g === 'all' ? 'style="grid-column:1/-1;"' : ''}">
        <div class="group-dates-title">
          ${label}
          ${g === 'all' ? '<span style="font-size:11px; color:var(--slate); font-weight:400;">(appliqué si pas de date spécifique par groupe)</span>' : ''}
        </div>
        ${moduleRows}
      </div>`;
  }).join('');

  document.getElementById('btn-save-dates').addEventListener('click', saveDates);
}

async function saveDates() {
  const updates = {};

  document.querySelectorAll('.module-date').forEach(inp => {
    const g  = inp.dataset.group;
    const m  = inp.dataset.module;
    const key = g === 'all' ? 'default' : `group_${g}`;
    if (!updates[key]) updates[key] = {};
    if (!updates[key][m]) updates[key][m] = {};
    updates[key][m].unlockDate = inp.value ? new Date(inp.value + 'T00:00:00') : null;
  });

  document.querySelectorAll('.module-reward').forEach(inp => {
    const g  = inp.dataset.group;
    const m  = inp.dataset.module;
    const key = g === 'all' ? 'default' : `group_${g}`;
    if (!updates[key]) updates[key] = {};
    if (!updates[key][m]) updates[key][m] = {};
    updates[key][m].reward = parseInt(inp.value) || 0;
  });

  try {
    await setDoc(doc(db, 'config', 'modules'), updates, { merge: true });
    showToast('✓ Calendriers sauvegardés!', 'success');
  } catch { showToast('Erreur lors de la sauvegarde.', 'error'); }
}

function getDefaultReward(id) {
  return { ch1:250, ch2:250, ch3:300, ch4:300, ch5:500 }[id] || 250;
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

  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
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
      Aucune question pour ce chapitre.
    </div>`; return;
  }

  container.innerHTML = filtered.map(q => `
    <div style="display:flex; align-items:flex-start; gap:14px; padding:16px 20px;
         border:1.5px solid var(--slate-light); border-radius:var(--radius-md);
         margin-bottom:10px; background:var(--white);">
      <span style="flex-shrink:0; padding:3px 10px; border-radius:20px; font-size:11px;
           font-weight:700;" class="${CH_CLASSES[q.chapter] || ''}">
        ${CH_LABELS[q.chapter] || q.chapter}
      </span>
      <div style="flex:1;">
        <div style="font-weight:600; font-size:14px; margin-bottom:4px;">${q.question}</div>
        <div style="font-size:12px; color:var(--slate);">
          ${(q.options || []).map((o,i) => `${['A','B','C','D'][i]}. ${o}`).join(' · ')}
        </div>
        ${q.source ? `<div style="font-size:11px; color:var(--accent-dim); margin-top:3px;">
          Source: ${q.source}</div>` : ''}
      </div>
      <div style="display:flex; gap:5px; flex-shrink:0;">
        <button class="btn-icon" onclick="editQuestion('${q.id}')" title="Modifier">✏️</button>
        <button class="btn-icon danger" onclick="deleteQuestion('${q.id}')" title="Supprimer">🗑️</button>
      </div>
    </div>`).join('');
}

async function saveQuestion() {
  const chapter      = document.getElementById('q-chapter').value;
  const questionText = document.getElementById('q-text-input').value.trim();
  const opts         = [0,1,2,3].map(i => document.getElementById(`q-opt-${i}`).value.trim());
  const correctIndex = parseInt(document.getElementById('q-correct').value);
  const explanation  = document.getElementById('q-explanation-input').value.trim();
  const source       = document.getElementById('q-source').value.trim();

  if (!questionText || opts.some(o => !o)) {
    showToast('Remplis tous les champs obligatoires.', 'error'); return;
  }

  const data = { chapter, question: questionText, options: opts,
    correctIndex, explanation, source, active: true, updatedAt: serverTimestamp() };

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
  } catch { showToast('Erreur sauvegarde.', 'error'); }
}

window.editQuestion = function(qid) {
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
};

window.deleteQuestion = async function(qid) {
  if (!confirm('Supprimer cette question?')) return;
  try {
    await deleteDoc(doc(db, 'questions', qid));
    showToast('Question supprimée.', 'info');
    allQuestions = allQuestions.filter(q => q.id !== qid);
    renderQuestions();
  } catch { showToast('Erreur.', 'error'); }
};

function clearQForm() {
  document.getElementById('q-text-input').value = '';
  [0,1,2,3].forEach(i => { document.getElementById(`q-opt-${i}`).value = ''; });
  document.getElementById('q-correct').value = '0';
  document.getElementById('q-explanation-input').value = '';
  document.getElementById('q-source').value = '';
}

// ── Fonds CELI ────────────────────────────────────────────────────
function setupFundsModal() {
  document.getElementById('btn-add-funds-quick').addEventListener('click', () => openFundsModal());
  document.getElementById('btn-cancel-funds').addEventListener('click', () => {
    document.getElementById('modal-funds').style.display = 'none';
  });
  document.getElementById('btn-confirm-funds').addEventListener('click', addFunds);
}

function populateFundsModal() {
  const sel = document.getElementById('modal-student-select');
  sel.innerHTML = allStudents.map(s =>
    `<option value="${s.id}">${s.displayName || s.email}${s.group ? ` (Gr.${s.group})` : ''}</option>`
  ).join('');
}

function openFundsModal(uid) {
  if (uid) document.getElementById('modal-student-select').value = uid;
  document.getElementById('modal-funds-error').style.display = 'none';
  document.getElementById('modal-funds').style.display = 'flex';
}

async function addFunds() {
  const uid    = document.getElementById('modal-student-select').value;
  const amount = parseFloat(document.getElementById('modal-amount').value);
  const reason = document.getElementById('modal-reason').value.trim();
  const errEl  = document.getElementById('modal-funds-error');
  errEl.style.display = 'none';

  if (!uid || isNaN(amount) || amount <= 0) {
    errEl.textContent = 'Sélectionne un élève et entre un montant valide.';
    errEl.style.display = 'block'; return;
  }

  try {
    await updateDoc(doc(db, 'users', uid), { celiBalance: increment(amount) });
    await addDoc(collection(db, 'users', uid, 'transactions'), {
      type: 'teacher_credit', amount,
      description: reason || 'Crédit enseignant',
      date: serverTimestamp(), addedBy: currentUser.uid
    });
    const student = allStudents.find(s => s.id === uid);
    showToast(`${formatCAD(amount)} ajoutés à ${student?.displayName || 'l\'élève'}!`, 'success');
    document.getElementById('modal-funds').style.display = 'none';
    document.getElementById('modal-reason').value = '';
    await loadStudents();
  } catch {
    errEl.textContent = 'Erreur lors de l\'ajout de fonds.';
    errEl.style.display = 'block';
  }
}

// ── Transactions ──────────────────────────────────────────────────
async function loadTransactions() {
  const tbody = document.getElementById('transactions-tbody');
  tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:20px;">Chargement...</td></tr>`;

  const allTx = [];
  for (const student of allStudents.slice(0, 50)) {
    const txSnap = await getDocs(
      query(collection(db, 'users', student.id, 'transactions'), orderBy('date', 'desc'))
    );
    txSnap.forEach(d => allTx.push({
      ...d.data(),
      studentName: student.displayName || student.email,
      studentGroup: student.group || '—'
    }));
  }
  allTx.sort((a, b) => {
    const da = a.date?.toDate?.() || new Date(0);
    const db2 = b.date?.toDate?.() || new Date(0);
    return db2 - da;
  });

  const typeLabels = {
    quiz_reward: '🎓 Quiz',
    teacher_credit: '👩‍🏫 Crédit',
    stock_buy: '📈 Achat',
    stock_sell: '📉 Vente'
  };

  tbody.innerHTML = allTx.slice(0, 150).map(tx => {
    const amount = tx.amount || 0;
    return `
      <tr>
        <td style="font-weight:600;">${tx.studentName}</td>
        <td><span style="background:rgba(0,200,150,0.1); color:var(--accent-dim);
             font-size:11px; font-weight:700; padding:2px 8px; border-radius:20px;">
             Gr. ${tx.studentGroup}</span></td>
        <td>${typeLabels[tx.type] || tx.type}</td>
        <td class="font-mono" style="font-weight:700;
            color:${amount > 0 ? 'var(--accent-dim)' : 'var(--danger)'}">
          ${amount > 0 ? '+' : ''}${formatCAD(Math.abs(amount))}
        </td>
        <td style="font-size:13px; color:var(--text-soft);">${tx.description || '—'}</td>
        <td style="font-size:12px; color:var(--text-soft);">${formatDate(tx.date)}</td>
      </tr>`;
  }).join('');
}

init();
// ── Babillard enseignant ───────────────────────────────────────
let editingCorkId = null;

async function setupBabillard() {
  await loadCorkAdminList();
  await loadWeekQuestion(user.uid);

  document.getElementById('cork-submit-btn')
    .addEventListener('click', async () => {
      const title     = document.getElementById('cork-title').value.trim();
      const content   = document.getElementById('cork-content').value.trim();
      const color     = document.getElementById('cork-color').value;
      const pin       = document.getElementById('cork-pin').value;
      const imageUrl  = document.getElementById('cork-image').value.trim();
      const linkUrl   = document.getElementById('cork-link-url').value.trim();
      const linkLabel = document.getElementById('cork-link-label').value.trim();
      const feedback  = document.getElementById('cork-feedback');

      if (!title || !content) {
        feedback.style.color = '#e55';
        feedback.textContent = 'Le titre et le message sont obligatoires.';
        return;
      }

      try {
        if (editingCorkId) {
          // Mode modification
          await updateDoc(doc(db, 'babillard', editingCorkId), {
            title, content, color, pin,
            imageUrl:  imageUrl  || null,
            linkUrl:   linkUrl   || null,
            linkLabel: linkLabel || null,
          });
          feedback.style.color = '#0d9e72';
          feedback.textContent = '✓ Message modifié!';
          editingCorkId = null;
          document.getElementById('cork-submit-btn').textContent = '📌 Afficher sur le babillard';
          document.getElementById('cork-cancel-edit').style.display = 'none';
        } else {
          // Mode création
          await addDoc(collection(db, 'babillard'), {
            title, content, color, pin,
            imageUrl:  imageUrl  || null,
            linkUrl:   linkUrl   || null,
            linkLabel: linkLabel || null,
            createdAt: serverTimestamp(),
          });
          feedback.style.color = '#0d9e72';
          feedback.textContent = '✓ Message affiché sur le babillard!';
        }

        // Vider le formulaire
        ['cork-title','cork-content','cork-image','cork-link-url','cork-link-label']
          .forEach(id => { document.getElementById(id).value = ''; });
        document.getElementById('cork-color').value = 'note-yellow';
        document.getElementById('cork-pin').value   = 'pin-red';

        setTimeout(() => feedback.textContent = '', 3000);
        await loadCorkAdminList();

      } catch (err) {
        feedback.style.color = '#e55';
        feedback.textContent = 'Erreur : ' + err.message;
      }
    });

  // Bouton annuler modification
  document.getElementById('cork-cancel-edit')
    .addEventListener('click', () => {
      editingCorkId = null;
      ['cork-title','cork-content','cork-image','cork-link-url','cork-link-label']
        .forEach(id => { document.getElementById(id).value = ''; });
      document.getElementById('cork-color').value = 'note-yellow';
      document.getElementById('cork-pin').value   = 'pin-red';
      document.getElementById('cork-submit-btn').textContent = '📌 Afficher sur le babillard';
      document.getElementById('cork-cancel-edit').style.display = 'none';
      document.getElementById('cork-feedback').textContent = '';
    });

  // Délégateur pour Modifier / Supprimer
  document.getElementById('cork-admin-list')
    .addEventListener('click', async (e) => {
      const deleteBtn = e.target.closest('[data-delete-id]');
      const editBtn   = e.target.closest('[data-edit-id]');

      if (deleteBtn) {
        await deleteCorkMessage(deleteBtn.dataset.deleteId);
      }
      if (editBtn) {
        await editCorkMessage(editBtn.dataset.editId);
      }
    });
}

async function loadCorkAdminList() {
  const list = document.getElementById('cork-admin-list');
  if (!list) return;

  try {
    const q    = query(collection(db, 'babillard'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);

    if (snap.empty) {
      list.innerHTML = '<p style="color:#aaa; font-size:13px;">Aucun message pour l\'instant.</p>';
      return;
    }

    list.innerHTML = snap.docs.map(d => {
      const data = d.data();
      const date = data.createdAt?.toDate
        ? data.createdAt.toDate().toLocaleDateString('fr-CA',
            { day:'numeric', month:'long', year:'numeric' })
        : '';
      return `
        <div style="display:flex; align-items:flex-start; justify-content:space-between;
                    padding:12px 0; border-bottom:1px solid #f0f0f0; gap:16px;">
          <div style="flex:1;">
            <div style="font-size:13px; font-weight:600; color:#1a1a2e;">
              ${escapeHtml(data.title || '')}
            </div>
            <div style="font-size:12px; color:#777; margin-top:3px;">${date}</div>
          </div>
          <div style="display:flex; gap:8px; flex-shrink:0;">
            <button data-edit-id="${d.id}"
              style="background:none; border:1px solid #c8ede2; color:#0d9e72;
                     border-radius:7px; padding:5px 12px; font-size:12px; cursor:pointer;">
              Modifier
            </button>
            <button data-delete-id="${d.id}"
              style="background:none; border:1px solid #ffd0d0; color:#e55;
                     border-radius:7px; padding:5px 12px; font-size:12px; cursor:pointer;">
              Supprimer
            </button>
          </div>
        </div>`;
    }).join('');

  } catch (err) {
    list.innerHTML = '<p style="color:#aaa; font-size:13px;">Erreur : ' + err.message + '</p>';
  }
}

async function editCorkMessage(docId) {
  try {
    const snap = await getDoc(doc(db, 'babillard', docId));
    if (!snap.exists()) return;
    const data = snap.data();

    document.getElementById('cork-title').value      = data.title     || '';
    document.getElementById('cork-content').value    = data.content   || '';
    document.getElementById('cork-color').value      = data.color     || 'note-yellow';
    document.getElementById('cork-pin').value        = data.pin       || 'pin-red';
    document.getElementById('cork-image').value      = data.imageUrl  || '';
    document.getElementById('cork-link-url').value   = data.linkUrl   || '';
    document.getElementById('cork-link-label').value = data.linkLabel || '';

    editingCorkId = docId;
    document.getElementById('cork-submit-btn').textContent = '💾 Enregistrer les modifications';
    document.getElementById('cork-cancel-edit').style.display = 'inline-block';

    // Scroll vers le formulaire
    document.getElementById('cork-title').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('cork-title').focus();

  } catch (err) {
    alert('Erreur : ' + err.message);
  }
}

async function deleteCorkMessage(docId) {
  if (!confirm('Supprimer ce message du babillard?')) return;
  try {
    await deleteDoc(doc(db, 'babillard', docId));
    await loadCorkAdminList();
  } catch (err) {
    alert('Erreur : ' + err.message);
  }
}

function escapeHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
                    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
// ── Question de la semaine ─────────────────────────────────────

const WEEKLY_QUESTIONS = [
  { week:1,  category:'Personnalités', question:"Qui a fondé Amazon en 1994?", choices:["Bill Gates","Elon Musk","Jeff Bezos","Mark Zuckerberg"], answer:2, fact:"Jeff Bezos a lancé Amazon depuis son garage. Il a quitté son poste de PDG en 2021 pour se concentrer sur Blue Origin." },
  { week:2,  category:'Économie', question:"Que signifie l'acronyme PIB?", choices:["Produit intérieur brut","Plan d'investissement bancaire","Profit industriel brut","Prix indicatif de base"], answer:0, fact:"Le PIB mesure la valeur totale des biens et services produits dans un pays. Le PIB du Canada est d'environ 2 000 milliards $ par an." },
  { week:3,  category:'Monnaies', question:"Quelle est la monnaie officielle du Japon?", choices:["Yuan","Won","Yen","Baht"], answer:2, fact:"Le yen (¥) est l'une des monnaies les plus échangées au monde, derrière le dollar américain et l'euro." },
  { week:4,  category:'Entreprises', question:"Quelle entreprise a lancé l'iPhone en 2007?", choices:["Microsoft","Samsung","Apple","Google"], answer:2, fact:"Apple (AAPL) est régulièrement la plus grande entreprise au monde par capitalisation boursière, dépassant les 3 000 milliards $." },
  { week:5,  category:'Économie', question:"Qu'est-ce que l'inflation?", choices:["Une baisse des salaires","Une hausse généralisée des prix","Une augmentation des taux d'intérêt","Une réduction de la dette nationale"], answer:1, fact:"La Banque du Canada vise un taux d'inflation de 2%. Une inflation trop haute réduit le pouvoir d'achat des consommateurs." },
  { week:6,  category:'Monnaies', question:"Quel pays utilise le Franc suisse?", choices:["France","Belgique","Suisse","Luxembourg"], answer:2, fact:"Le franc suisse (CHF) est considéré comme une valeur refuge mondiale grâce à la stabilité économique de la Suisse." },
  { week:7,  category:'Personnalités', question:"Quel investisseur légendaire est surnommé 'l'Oracle d'Omaha'?", choices:["George Soros","Peter Lynch","Warren Buffett","Ray Dalio"], answer:2, fact:"Warren Buffett a transformé 10 000 $ en milliards grâce à l'investissement à long terme. Il vit toujours dans la même maison achetée en 1958." },
  { week:8,  category:'Entreprises', question:"Quelle entreprise possède les marques Instagram et WhatsApp?", choices:["Alphabet","Meta","Twitter/X","Snapchat"], answer:1, fact:"Meta (META) a changé de nom en 2021 pour refléter son ambition dans le métavers. Elle possède aussi Threads." },
  { week:9,  category:'Économie', question:"Qu'est-ce qu'un FNB (Fonds négocié en bourse)?", choices:["Un prêt bancaire spécial","Un fonds qui suit un indice et se négocie en bourse","Une obligation gouvernementale","Un compte d'épargne à taux élevé"], answer:1, fact:"Les FNB (ETF en anglais) permettent d'investir dans des centaines d'actions à la fois. Ils sont populaires pour leurs faibles frais." },
  { week:10, category:'Monnaies', question:"Quelle est la monnaie de la Chine?", choices:["Yen","Won","Ringgit","Yuan"], answer:3, fact:"Le yuan (¥) ou renminbi est la monnaie de la 2e économie mondiale. La Chine explore aussi une version numérique." },
  { week:11, category:'Personnalités', question:"Qui est le PDG d'Apple depuis 2011?", choices:["Steve Jobs","Tim Cook","Jony Ive","Scott Forstall"], answer:1, fact:"Tim Cook a pris la direction d'Apple après le décès de Steve Jobs. Sous sa direction, Apple est devenue la première entreprise à valoir 3 000 milliards $." },
  { week:12, category:'Entreprises', question:"Quel géant du logiciel possède Xbox et LinkedIn?", choices:["Apple","Google","Microsoft","Oracle"], answer:2, fact:"Microsoft (MSFT) a racheté LinkedIn pour 26 milliards $ en 2016 et Activision Blizzard pour 69 milliards $ en 2023." },
  { week:13, category:'Économie', question:"Quelle est la limite de cotisation annuelle au CELI en 2024?", choices:["5 000 $","6 500 $","7 000 $","8 000 $"], answer:2, fact:"En 2024, la limite annuelle du CELI est de 7 000 $. Les revenus générés dans un CELI sont complètement à l'abri de l'impôt." },
  { week:14, category:'Monnaies', question:"Quelle est la monnaie de l'Inde?", choices:["Roupie","Taka","Ringgit","Rupiah"], answer:0, fact:"La roupie indienne (₹) est gérée par la Reserve Bank of India. L'Inde est la 5e économie mondiale." },
  { week:15, category:'Personnalités', question:"Qui a fondé Tesla et SpaceX?", choices:["Jeff Bezos","Richard Branson","Elon Musk","Peter Thiel"], answer:2, fact:"Elon Musk n'a pas fondé Tesla (il a rejoint l'entreprise en 2004) mais en est le PDG. Il a fondé SpaceX en 2002 avec l'objectif d'aller sur Mars." },
  { week:16, category:'Entreprises', question:"Quelle entreprise fabrique les puces électroniques utilisées dans la majorité des iPhone?", choices:["Intel","AMD","NVIDIA","TSMC"], answer:3, fact:"TSMC (Taiwan Semiconductor) fabrique les puces les plus avancées au monde pour Apple, NVIDIA et AMD." },
  { week:17, category:'Économie', question:"Quel indice boursier regroupe les 500 plus grandes entreprises américaines?", choices:["Dow Jones","Nasdaq","S&P 500","Russell 2000"], answer:2, fact:"Le S&P 500 est considéré comme le meilleur indicateur de la santé de l'économie américaine. Il a généré un rendement moyen d'environ 10% par an." },
  { week:18, category:'Monnaies', question:"Quelle monnaie est utilisée en Corée du Sud?", choices:["Yen","Yuan","Won","Ringgit"], answer:2, fact:"Le won sud-coréen (₩) est la monnaie d'un pays reconnu pour ses géants technologiques comme Samsung et LG." },
  { week:19, category:'Personnalités', question:"Qui est le PDG de NVIDIA?", choices:["Lisa Su","Jensen Huang","Pat Gelsinger","Cristiano Amon"], answer:1, fact:"Jensen Huang a cofondé NVIDIA en 1993 et en est toujours PDG. Il est reconnaissable à sa veste en cuir noire caractéristique." },
  { week:20, category:'Entreprises', question:"Sous quel symbole boursier Tesla est-il coté?", choices:["TSL","TSLA","TES","TESL"], answer:1, fact:"Tesla (TSLA) est entrée dans le S&P500 en 2020 et est devenue l'une des entreprises les plus valorisées au monde." },
  { week:21, category:'Économie', question:"Qu'est-ce qu'un marché baissier (bear market)?", choices:["Une hausse de 20% des marchés","Une baisse de 20% ou plus des marchés","Un marché stable depuis 6 mois","Un marché avec peu de transactions"], answer:1, fact:"Un bear market est une baisse de 20% ou plus depuis un sommet récent. Il est souvent associé à une récession économique." },
  { week:22, category:'Monnaies', question:"Quelle est la monnaie officielle du Brésil?", choices:["Peso","Real","Sol","Bolivar"], answer:1, fact:"Le real brésilien (R$) est la monnaie de la plus grande économie d'Amérique latine." },
  { week:23, category:'Personnalités', question:"Qui a cofondé Apple avec Steve Jobs?", choices:["Bill Gates","Steve Wozniak","Michael Dell","Gordon Moore"], answer:1, fact:"Steve Wozniak a conçu le premier Apple I dans un garage en 1976. Il a quitté Apple en 1985 mais reste un ambassadeur de la marque." },
  { week:24, category:'Entreprises', question:"Quelle entreprise est derrière le moteur de recherche Google?", choices:["Meta","Amazon","Alphabet","Microsoft"], answer:2, fact:"Alphabet (GOOGL) est la société mère de Google, YouTube, Waymo et DeepMind." },
  { week:25, category:'Économie', question:"Qu'est-ce que le taux directeur?", choices:["Le taux de chômage cible","Le taux d'intérêt fixé par la banque centrale","Le taux de croissance du PIB","Le taux d'imposition des entreprises"], answer:1, fact:"Le taux directeur de la Banque du Canada influence directement les taux hypothécaires et les taux des prêts auto." },
  { week:26, category:'Monnaies', question:"Quel pays utilise la Livre sterling?", choices:["Australie","Canada","Royaume-Uni","Irlande"], answer:2, fact:"La livre sterling (£) est la plus ancienne monnaie encore en circulation dans le monde." },
  { week:27, category:'Personnalités', question:"Qui a fondé Microsoft avec Bill Gates?", choices:["Steve Ballmer","Paul Allen","Satya Nadella","Gordon Moore"], answer:1, fact:"Paul Allen et Bill Gates ont fondé Microsoft en 1975. Allen est décédé en 2018, laissant une fortune de plus de 20 milliards $." },
  { week:28, category:'Entreprises', question:"Quelle chaîne de café est cotée sous le symbole SBUX?", choices:["Tim Hortons","Dunkin","Starbucks","Peet's Coffee"], answer:2, fact:"Starbucks (SBUX) exploite plus de 35 000 établissements dans 80 pays. La Chine est son 2e marché mondial." },
  { week:29, category:'Économie', question:"Qu'est-ce qu'une action (stock)?", choices:["Un prêt fait à une entreprise","Une part de propriété dans une entreprise","Un dépôt bancaire garanti","Un contrat d'assurance"], answer:1, fact:"Acheter une action, c'est devenir copropriétaire d'une entreprise. Si elle prospère, la valeur de ton action augmente." },
  { week:30, category:'Monnaies', question:"Quelle est la monnaie commune de la zone euro?", choices:["Franc","Mark","Euro","Florin"], answer:2, fact:"L'euro (€) est utilisé par 20 pays de l'Union européenne et est la 2e monnaie de réserve mondiale." },
  { week:31, category:'Personnalités', question:"Qui est la PDG d'AMD?", choices:["Ginni Rometty","Lisa Su","Mary Barra","Safra Catz"], answer:1, fact:"Lisa Su a pris la direction d'AMD en 2014 alors que l'entreprise était au bord de la faillite. Elle l'a transformée en rival sérieux d'Intel et NVIDIA." },
  { week:32, category:'Entreprises', question:"Quelle entreprise canadienne du TSX est la plus grande banque au pays?", choices:["TD Bank","RBC","BMO","Banque Scotia"], answer:1, fact:"La Banque Royale du Canada (RY) est régulièrement la plus grande banque canadienne par capitalisation boursière." },
  { week:33, category:'Économie', question:"Qu'est-ce qu'une obligation (bond)?", choices:["Une action d'entreprise à risque élevé","Un prêt fait à un gouvernement ou une entreprise","Un compte d'épargne bancaire","Un fonds commun de placement"], answer:1, fact:"Quand tu achètes une obligation du gouvernement canadien, tu lui prêtes de l'argent et il te verse des intérêts en retour." },
  { week:34, category:'Monnaies', question:"Quelle est la monnaie officielle de la Russie?", choices:["Hryvnia","Zloty","Rouble","Lira"], answer:2, fact:"Le rouble russe (₽) existe depuis le 13e siècle, ce qui en fait l'une des plus anciennes monnaies du monde." },
  { week:35, category:'Personnalités', question:"Qui a fondé Facebook (maintenant Meta)?", choices:["Jack Dorsey","Evan Spiegel","Mark Zuckerberg","Kevin Systrom"], answer:2, fact:"Mark Zuckerberg a lancé Facebook depuis sa chambre à Harvard en 2004. À 23 ans, il était déjà milliardaire." },
  { week:36, category:'Entreprises', question:"Quelle entreprise fabrique les cartes graphiques GeForce?", choices:["AMD","Intel","NVIDIA","Qualcomm"], answer:2, fact:"NVIDIA (NVDA) est devenue l'une des entreprises les plus précieuses au monde grâce à l'explosion de l'IA." },
  { week:37, category:'Économie', question:"Quelle institution fixe les taux d'intérêt aux États-Unis?", choices:["Le Trésor américain","La Réserve fédérale (Fed)","Le FMI","La Banque mondiale"], answer:1, fact:"La Réserve fédérale américaine (Fed) influence les taux d'intérêt mondiaux. Quand elle augmente ses taux, ça affecte les hypothèques canadiennes." },
  { week:38, category:'Monnaies', question:"Quelle monnaie utilise l'Australie?", choices:["Dollar néo-zélandais","Dollar australien","Dollar de Singapour","Dollar canadien"], answer:1, fact:"Le dollar australien (AUD) est l'une des monnaies les plus échangées au monde malgré la petite taille de son économie." },
  { week:39, category:'Personnalités', question:"Qui est la PDG de General Motors?", choices:["Mary Barra","Lisa Su","Sheryl Sandberg","Whitney Wolfe"], answer:0, fact:"Mary Barra est PDG de GM depuis 2014, première femme à diriger un grand constructeur automobile mondial." },
  { week:40, category:'Entreprises', question:"Sous quel symbole boursier Amazon est-il listé sur le Nasdaq?", choices:["AMZ","AMZN","AMAZ","AZN"], answer:1, fact:"Amazon (AMZN) a débuté comme librairie en ligne en 1994. Aujourd'hui, AWS (cloud) génère la majorité de ses profits." },
  { week:41, category:'Économie', question:"Quel est le principal avantage du REER par rapport au CELI?", choices:["Les retraits sont toujours sans impôt","Les cotisations sont déductibles d'impôt","Il n'y a pas de limite de cotisation","Il peut être utilisé avant 65 ans seulement"], answer:1, fact:"Le REER réduit ton revenu imposable l'année de la cotisation. C'est avantageux si tu es dans une tranche d'imposition élevée maintenant." },
  { week:42, category:'Monnaies', question:"Quel pays utilise le Peso mexicain?", choices:["Argentine","Colombie","Mexique","Chili"], answer:2, fact:"Le peso mexicain (MXN) est la monnaie la plus échangée d'Amérique latine sur les marchés internationaux." },
  { week:43, category:'Personnalités', question:"Qui est le PDG de JPMorgan Chase, la plus grande banque américaine?", choices:["Lloyd Blankfein","Brian Moynihan","Jamie Dimon","David Solomon"], answer:2, fact:"Jamie Dimon dirige JPMorgan Chase depuis 2005. Il est l'un des banquiers les plus influents au monde." },
  { week:44, category:'Entreprises', question:"Quelle est la plus grande entreprise pétrolière américaine du S&P500?", choices:["Chevron","Shell","ExxonMobil","BP"], answer:2, fact:"ExxonMobil (XOM) est l'une des plus grandes entreprises au monde. Son ancêtre Standard Oil a été fondé par John D. Rockefeller." },
  { week:45, category:'Économie', question:"Quel pays est le plus grand producteur de pétrole au monde?", choices:["Arabie saoudite","Russie","Canada","États-Unis"], answer:3, fact:"Les États-Unis sont devenus le plus grand producteur de pétrole au monde grâce à la révolution du pétrole de schiste dans les années 2010." },
  { week:46, category:'Monnaies', question:"Quelle est la monnaie de l'Arabie saoudite?", choices:["Dirham","Dinar","Riyal","Livre"], answer:2, fact:"Le riyal saoudien (SAR) est arrimé au dollar américain depuis 1986, ce qui stabilise les revenus pétroliers du pays." },
  { week:47, category:'Personnalités', question:"Qui a fondé Virgin Group?", choices:["Rupert Murdoch","Richard Branson","James Dyson","Philip Green"], answer:1, fact:"Richard Branson a lancé Virgin à 16 ans avec un magazine étudiant. Virgin compte aujourd'hui plus de 40 entreprises." },
  { week:48, category:'Entreprises', question:"Quelle entreprise est connue pour sa carte de paiement Visa?", choices:["Mastercard","Visa","American Express","PayPal"], answer:1, fact:"Visa (V) ne prête pas d'argent — elle traite les paiements entre banques. C'est l'un des modèles d'affaires les plus rentables au monde." },
  { week:49, category:'Économie', question:"Que représente le symbole $ dans le contexte canadien?", choices:["Dollar américain uniquement","Dollar canadien uniquement","Les deux selon le contexte","Le peso mexicain"], answer:2, fact:"Le dollar canadien (CAD) vaut généralement entre 0,70 et 0,80 $ US. Cette différence affecte le coût des importations et du tourisme." },
  { week:50, category:'Monnaies', question:"Quelle monnaie est utilisée en Turquie?", choices:["Drachme","Lira","Zloty","Forint"], answer:1, fact:"La livre turque (₺) a connu une forte inflation ces dernières années, illustrant les défis économiques du pays." },
  { week:51, category:'Personnalités', question:"Qui est le gouverneur de la Banque du Canada?", choices:["Mark Carney","Stephen Poloz","Tiff Macklem","David Dodge"], answer:2, fact:"Tiff Macklem est gouverneur de la Banque du Canada depuis 2020. Il supervise la politique monétaire et les taux d'intérêt canadiens." },
  { week:52, category:'Entreprises', question:"Quelle entreprise de Warren Buffett est cotée sous BRK.B?", choices:["BlackRock","Berkshire Hathaway","Vanguard","Fidelity"], answer:1, fact:"Berkshire Hathaway possède des dizaines d'entreprises dont GEICO, Dairy Queen et des participations dans Apple et Coca-Cola." },
];

const QUIZ_BONUS = 10;

function getCurrentWeekNumber() {
  const now   = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.ceil((now - start) / (1000 * 60 * 60 * 24 * 7));
}

async function loadWeekQuestion(userId) {
  const weekNum  = getCurrentWeekNumber();
  const question = WEEKLY_QUESTIONS[(weekNum - 1) % 52];
  const widget   = document.getElementById('quizWidget');
  if (!widget) return;

  try {
    const answerDoc = await getDoc(doc(db, 'users', userId, 'weeklyQuiz', `week-${weekNum}`));
    if (answerDoc.exists()) {
      const saved = answerDoc.data();
      renderQuizQuestion(question);
      await showQuizResults(question, weekNum, saved.choiceIndex, userId, true);
    } else {
      renderQuizQuestion(question);
      setupQuizChoices(question, weekNum, userId);
    }
  } catch (err) {
    console.warn('Quiz hebdo non disponible:', err);
    widget.innerHTML = '<p class="quiz-already">Quiz temporairement indisponible.</p>';
  }
}

function renderQuizQuestion(q) {
  const widget = document.getElementById('quizWidget');
  const catColors = {
    'Monnaies':      '#e3f2fd',
    'Entreprises':   '#e8f5e9',
    'Personnalités': '#fce4ec',
    'Économie':      '#fff8e1',
  };
  const bg = catColors[q.category] || '#e8f5f0';
  widget.innerHTML = `
    <div class="quiz-widget-header">
      <span class="quiz-widget-title">⭐ Question de la semaine</span>
      <span class="quiz-category-badge" style="background:${bg}">${q.category}</span>
    </div>
    <div class="quiz-question-text">${escNewsHtml(q.question)}</div>
    <div class="quiz-choices" id="quizChoices"></div>
    <div class="quiz-result" id="quizResult"></div>
  `;
}

function setupQuizChoices(q, weekNum, userId) {
  const container = document.getElementById('quizChoices');
  if (!container) return;
  q.choices.forEach((choice, i) => {
    const btn = document.createElement('button');
    btn.className = 'quiz-choice-btn';
    btn.textContent = choice;
    btn.addEventListener('click', () => handleQuizAnswer(q, weekNum, i, userId));
    container.appendChild(btn);
  });
}

async function handleQuizAnswer(q, weekNum, choiceIndex, userId) {
  document.querySelectorAll('.quiz-choice-btn').forEach(btn => btn.disabled = true);
  const isCorrect = choiceIndex === q.answer;
  const btns = document.querySelectorAll('.quiz-choice-btn');
  btns[choiceIndex].classList.add(isCorrect ? 'correct' : 'wrong');
  btns[q.answer].classList.add('correct');

  try {
    const { setDoc, increment: fsIncrement, updateDoc: fsUpdateDoc } =
      await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

    await setDoc(doc(db, 'users', userId, 'weeklyQuiz', `week-${weekNum}`), {
      choiceIndex, isCorrect, answeredAt: new Date(),
    });

    const statsRef  = doc(db, 'weeklyQuizStats', `week-${weekNum}`);
    const statsData = { total: fsIncrement(1) };
    statsData[`choice_${choiceIndex}`] = fsIncrement(1);
    await setDoc(statsRef, statsData, { merge: true });

    if (isCorrect) {
      await fsUpdateDoc(doc(db, 'users', userId), {
        celiBalance: fsIncrement(QUIZ_BONUS),
      });
    }
  } catch (err) {
    console.warn('Erreur sauvegarde quiz:', err);
  }

  await showQuizResults(q, weekNum, choiceIndex, userId, false);
}

async function showQuizResults(q, weekNum, choiceIndex, userId, alreadyAnswered) {
  const resultDiv  = document.getElementById('quizResult');
  const choicesDiv = document.getElementById('quizChoices');
  if (!resultDiv) return;

  const isCorrect = choiceIndex === q.answer;

  let stats = null;
  try {
    const statsDoc = await getDoc(doc(db, 'weeklyQuizStats', `week-${weekNum}`));
    if (statsDoc.exists()) stats = statsDoc.data();
  } catch (e) { /* silencieux */ }

  const total        = stats?.total || 1;
  const correctCount = stats?.[`choice_${q.answer}`] || 0;
  const pctCorrect   = Math.round((correctCount / total) * 100);

  const barsHtml = q.choices.map((choice, i) => {
    const count = stats?.[`choice_${i}`] || 0;
    const pct   = Math.round((count / total) * 100);
    return `
      <div class="quiz-bar-row">
        <span class="quiz-bar-label">${escNewsHtml(choice)}</span>
        <div class="quiz-bar-track">
          <div class="quiz-bar-fill ${i === q.answer ? '' : 'wrong-bar'}" style="width:${pct}%"></div>
        </div>
        <span class="quiz-bar-pct">${pct}%</span>
      </div>`;
  }).join('');

  const bonusHtml    = (!alreadyAnswered && isCorrect)
    ? `<div class="quiz-bonus">🎉 +${QUIZ_BONUS} $ crédités à ton CELI!</div>` : '';
  const alreadyHtml  = alreadyAnswered
    ? `<div class="quiz-already">Tu as déjà répondu cette semaine.<br>Nouvelle question lundi prochain!</div>` : '';

  resultDiv.innerHTML = `
    ${alreadyHtml}
    <div class="quiz-result-text">
      ${isCorrect ? '✅ Bonne réponse!' : `❌ La bonne réponse était : ${escNewsHtml(q.choices[q.answer])}`}
    </div>
    <div class="quiz-fact">💡 ${escNewsHtml(q.fact)}</div>
    ${bonusHtml}
    <div class="quiz-bars">${barsHtml}</div>
    <div class="quiz-stats">${total} élève${total > 1 ? 's' : ''} ont répondu · ${pctCorrect}% de bonnes réponses</div>
  `;

  resultDiv.classList.add('visible');
  if (choicesDiv) choicesDiv.style.display = 'none';
}