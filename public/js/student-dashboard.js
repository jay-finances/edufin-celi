// student-dashboard.js
import { db, auth } from '../js/firebase-init.js';
import { requireAuth, formatCAD, formatDate, initTopbar, isModuleAvailable }
  from '../js/utils.js';
import { doc, getDoc, collection, getDocs, query, orderBy, limit }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Définition des modules
const MODULE_DEFS = [
  { id: 'ch1', num: 1, title: 'La consommation', subtitle: 'Maslow, GAFAM, consumérisme', icon: '🛒' },
  { id: 'ch2', num: 2, title: 'Le rôle de l\'État', subtitle: 'Droits, taxes, offre et demande', icon: '⚖️' },
  { id: 'ch3', num: 3, title: 'Le crédit', subtitle: 'Types de prêts, cote de crédit', icon: '💳' },
  { id: 'ch4', num: 4, title: 'Le budget', subtitle: 'Planification, surendettement', icon: '📊' },
  { id: 'ch5', num: 5, title: 'L\'épargne et l\'investissement', subtitle: 'CELI, actions, FNB, intérêt composé', icon: '📈' },
];

async function init() {
  try {
    const { user, data: userData } = await requireAuth('student');

    // Topbar
    initTopbar(userData);
    document.getElementById('welcome-name').textContent =
      (userData.displayName || userData.email).split(' ')[0];

    // Stats de base
    document.getElementById('stat-balance').textContent =
      formatCAD(userData.celiBalance || 0);

    // Charger la progression des modules
    const progressSnap = await getDocs(
      collection(db, 'users', user.uid, 'progress')
    );
    const progress = {};
    progressSnap.forEach(d => { progress[d.id] = d.data(); });

    // Charger la config des modules (dates de déverrouillage)
    const configSnap = await getDoc(doc(db, 'config', 'modules'));
    const moduleConfig = configSnap.exists() ? configSnap.data() : {};

    // Calculer les stats
    let completed = 0;
    let totalScore = 0;
    let scoreCount = 0;
    let marketUnlocked = false;

    MODULE_DEFS.forEach(m => {
      const p = progress[m.id];
      if (p && p.quizCompleted) {
        completed++;
        if (p.quizScore !== undefined) {
          totalScore += p.quizScore;
          scoreCount++;
        }
        if (m.id === 'ch5') marketUnlocked = true;
      }
    });

    document.getElementById('stat-modules').textContent = `${completed} / 5`;
    document.getElementById('stat-quizzes').textContent = completed;
    document.getElementById('stat-avg-score').textContent =
      scoreCount > 0 ? `${Math.round(totalScore / scoreCount)}%` : '—';

    // Déverrouiller la navigation marché si ch5 complété
    if (marketUnlocked) {
      const navMarket = document.getElementById('nav-market');
      const navPortfolio = document.getElementById('nav-portfolio');
      navMarket.classList.remove('locked');
      navMarket.querySelector('.nav-badge')?.remove();
      navPortfolio.classList.remove('locked');
      navPortfolio.querySelector('.nav-badge')?.remove();
    }

    // Afficher les modules
    renderModulesPreview(MODULE_DEFS, progress, moduleConfig);

    // Vérifier s'il y a un nouveau module disponible
    checkForNewModule(MODULE_DEFS, progress, moduleConfig);

  } catch (err) {
    console.error(err);
  }
}

function renderModulesPreview(modules, progress, config) {
  const container = document.getElementById('modules-preview');
  container.innerHTML = '';

  // Afficher seulement les 3 premiers sur le dashboard
  modules.slice(0, 3).forEach(m => {
    const p = progress[m.id];
    const cfg = config[m.id] || {};
    const isCompleted = p && p.quizCompleted;
    const isAvailable = isModuleAvailable(cfg);
    const isLocked = !isAvailable;

    const statusClass = isCompleted ? 'module-completed' : isLocked ? 'module-locked' : '';
    const numClass = isCompleted ? 'completed' : isLocked ? 'locked' : 'available';
    const statusText = isCompleted
      ? `✓ ${p.quizScore}%`
      : isLocked
        ? `🔒 Disponible le ${cfg.unlockDate ? formatUnlockDate(cfg.unlockDate) : '—'}`
        : 'Commencer →';
    const statusCls = isCompleted
      ? 'status-completed'
      : isLocked ? 'status-locked' : 'status-available';

    const href = isLocked ? '#' : `module.html?id=${m.id}`;

    container.innerHTML += `
      <a class="module-item ${statusClass}" href="${href}"
         ${isLocked ? 'onclick="return false"' : ''}>
        <div class="module-number ${numClass}">${isCompleted ? '✓' : m.num}</div>
        <div class="module-info">
          <div class="module-title">${m.icon} ${m.title}</div>
          <div class="module-meta">${m.subtitle}</div>
        </div>
        <span class="module-status ${statusCls}">${statusText}</span>
      </a>`;
  });

  if (modules.length > 3) {
    container.innerHTML += `
      <a href="modules.html" class="nav-item" style="justify-content:center; margin-top:8px;">
        Voir tous les modules →
      </a>`;
  }
}

function checkForNewModule(modules, progress, config) {
  const hasNew = modules.some(m => {
    const p = progress[m.id];
    const cfg = config[m.id] || {};
    return !p?.quizCompleted && isModuleAvailable(cfg);
  });
  if (hasNew) {
    document.getElementById('sidebar-new-badge').style.display = 'inline';
  }
}

function formatUnlockDate(ts) {
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  return new Intl.DateTimeFormat('fr-CA', {
    day: 'numeric', month: 'long'
  }).format(date);
}

init();
