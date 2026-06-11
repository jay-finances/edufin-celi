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
