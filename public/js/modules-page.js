// modules-page.js
import { db } from '../js/firebase-init.js';
import { requireAuth, formatCAD, initTopbar, isModuleAvailable }
  from '../js/utils.js';
import {
  doc, getDoc, getDocs, collection
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const MODULE_DEFS = [
  { id: 'ch1', num: 1, title: 'La consommation',               subtitle: 'Maslow, GAFAM, consumérisme, processus d\'achat',  icon: '🛒', reward: 250 },
  { id: 'ch2', num: 2, title: 'Le rôle de l\'État',            subtitle: 'Droits, garanties, taxes, offre et demande',        icon: '⚖️', reward: 250 },
  { id: 'ch3', num: 3, title: 'Le crédit',                     subtitle: 'Types de contrats, cote de crédit, coût réel',      icon: '💳', reward: 300 },
  { id: 'ch4', num: 4, title: 'Le budget et le surendettement',subtitle: 'Planification, dépenses fixes/variables, insolvabilité', icon: '📊', reward: 300 },
  { id: 'ch5', num: 5, title: 'L\'épargne et l\'investissement',subtitle: 'CELI, intérêt composé, actions, FNB, profil d\'investisseur', icon: '📈', reward: 500 },
];

async function init() {
  try {
    const { user, data: userData } = await requireAuth('student');
    initTopbar(userData);

    // Charger progression
    const progressSnap = await getDocs(collection(db, 'users', user.uid, 'progress'));
    const progress = {};
    progressSnap.forEach(d => { progress[d.id] = d.data(); });

    // Charger config modules (dates de déverrouillage, récompenses)
    const configSnap = await getDoc(doc(db, 'config', 'modules'));
    const moduleConfig = configSnap.exists() ? configSnap.data() : {};

    // Stats globales
    const completed = MODULE_DEFS.filter(m => progress[m.id]?.quizCompleted).length;
    const pct = Math.round((completed / MODULE_DEFS.length) * 100);

    document.getElementById('global-progress').textContent = `${completed} / ${MODULE_DEFS.length}`;
    document.getElementById('progress-pct').textContent = `${pct}%`;
    document.getElementById('progress-bar-global').style.width = `${pct}%`;

    // Mettre à jour les récompenses selon config
    MODULE_DEFS.forEach(m => {
      const cfg = moduleConfig[m.id] || {};
      const reward = cfg.reward || m.reward;
      const rewardEl = document.getElementById(`reward-${m.id}`);
      if (rewardEl) {
        rewardEl.querySelector('.font-mono').textContent = formatCAD(reward);
      }
    });

    // Vérifier accès marché (ch5 complété)
    const marketUnlocked = progress['ch5']?.quizCompleted;
    if (!marketUnlocked) {
      ['nav-market', 'nav-portfolio'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
          el.classList.add('locked');
          el.style.pointerEvents = 'none';
          el.style.opacity = '0.4';
        }
      });
    }

    // Rendu des modules
    renderModules(MODULE_DEFS, progress, moduleConfig);

  } catch (err) {
    console.error(err);
  }
}

function renderModules(modules, progress, config) {
  const container = document.getElementById('all-modules');
  container.innerHTML = '';

  modules.forEach((m, index) => {
    const p = progress[m.id];
    const cfg = config[m.id] || {};
    const isCompleted = p?.quizCompleted;
    const isAvailable = isModuleAvailable(cfg);
    const isLocked = !isAvailable;

    // Calculer date de déverrouillage lisible
    let unlockDateStr = '';
    if (isLocked && cfg.unlockDate) {
      const d = cfg.unlockDate.toDate ? cfg.unlockDate.toDate() : new Date(cfg.unlockDate);
      unlockDateStr = new Intl.DateTimeFormat('fr-CA', {
        day: 'numeric', month: 'long', year: 'numeric'
      }).format(d);
    }

    const reward = cfg.reward || m.reward;

    // Statut
    let statusText, statusCls, numCls, itemCls, href, onclick;
    if (isCompleted) {
      statusText = `✓ ${p.quizScore}% · ${formatCAD(reward)} reçus`;
      statusCls = 'status-completed';
      numCls = 'completed';
      itemCls = 'module-completed';
      href = `module.html?id=${m.id}`;
      onclick = '';
    } else if (isLocked) {
      statusText = unlockDateStr ? `🔒 Disponible le ${unlockDateStr}` : '🔒 Verrouillé';
      statusCls = 'status-locked';
      numCls = 'locked';
      itemCls = 'module-locked';
      href = '#';
      onclick = 'onclick="return false"';
    } else {
      statusText = `Commencer — ${formatCAD(reward)} à gagner`;
      statusCls = 'status-available';
      numCls = 'available';
      itemCls = '';
      href = `module.html?id=${m.id}`;
      onclick = '';
    }

    // Connecteur entre modules
    const connector = index < modules.length - 1 ? `
      <div style="display:flex; align-items:center; padding:0 20px;">
        <div style="width:2px; height:16px; background:${isCompleted ? 'var(--accent)' : 'var(--slate-light)'}; margin-left:19px;"></div>
      </div>` : '';

    container.innerHTML += `
      <a class="module-item ${itemCls}" href="${href}" ${onclick}
         style="display:flex; align-items:center; gap:16px; padding:20px 24px;">
        <div class="module-number ${numCls}" style="width:44px; height:44px; flex-shrink:0; font-size:16px;">
          ${isCompleted ? '✓' : m.num}
        </div>
        <div style="flex:1;">
          <div style="font-size:17px; font-weight:700; margin-bottom:3px;">
            ${m.icon} ${m.title}
          </div>
          <div style="font-size:13px; color:var(--text-soft);">${m.subtitle}</div>
          ${isCompleted ? `
            <div style="display:flex; gap:12px; margin-top:6px; font-size:12px;">
              <span style="color:var(--accent-dim);">Score : ${p.quizScore}%</span>
              <span style="color:var(--text-soft);">·</span>
              <span style="color:var(--text-soft);">${p.correctAnswers}/${p.totalQuestions} bonnes réponses</span>
            </div>` : ''}
        </div>
        <div style="text-align:right; flex-shrink:0;">
          <span class="module-status ${statusCls}">${statusText}</span>
        </div>
      </a>
      ${connector}`;
  });
}

init();
