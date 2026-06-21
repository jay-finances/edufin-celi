// student-dashboard.js
import { db, auth } from '../js/firebase-init.js';
import { requireAuth, formatCAD, formatDate, initTopbar, isModuleAvailable }
  from '../js/utils.js';
import { doc, getDoc, collection, getDocs, query, orderBy, limit, onSnapshot }
  from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Définition des modules
const MODULE_DEFS = [
  { id: 'ch1', num: 1, title: 'La consommation', subtitle: 'Maslow, GAFAM, consumérisme', icon: '🛒' },
  { id: 'ch2', num: 2, title: 'Le rôle de l\'État', subtitle: 'Droits, taxes, offre et demande', icon: '⚖️' },
  { id: 'ch3', num: 3, title: 'Le crédit', subtitle: 'Types de prêts, cote de crédit', icon: '💳' },
  { id: 'ch4', num: 4, title: 'Le budget', subtitle: 'Planification, surendettement', icon: '📊' },
  { id: 'ch5', num: 5, title: 'L\'épargne et l\'investissement', subtitle: 'CELI, actions, FNB, intérêt composé', icon: '📈' },
];

// ── Avatar : chargement + écoute temps réel ─────────────────────────────────
// onSnapshot est importé statiquement en haut du fichier avec db.
// Dès que character-editor.html sauvegarde un avatar, le dashboard
// se met à jour immédiatement sans rechargement de page.
function loadAvatarRealtime(uid, initialData) {
  // 1. Affichage immédiat avec les données déjà chargées par requireAuth
  applyAvatarData(initialData);

  // 2. Écoute Firestore temps réel — utilise db et onSnapshot importés statiquement
  onSnapshot(doc(db, 'users', uid), (snap) => {
    if (snap.exists()) {
      applyAvatarData(snap.data());
    }
  });
}

function applyAvatarData(userData) {
  const avatarData  = userData.avatar       || {};
  const rpgLevel    = userData.rpgLevel     || 1;
  // DEBUG — à retirer après confirmation de fonctionnement
  console.log('[RPG] applyAvatarData appelé. Avatar keys:', Object.keys(avatarData));
  const rpgXP       = userData.rpgXP       || 0;
  const rpgAge      = userData.rpgAge      || 17;
  const rpgWeek     = userData.rpgWeek     || 1;
  const rpgStats    = userData.rpgStats    || { sante:5, connaissances:5, habiletes:5, organisation:5, influence:5 };
  const celiBalance = userData.celiBalance || 0;
  const ch5Done     = userData.ch5Completed || false;
  const rankDelta   = userData.rankDelta   ?? null;

  // ── Fond de carte avatar selon bgColor ──
  const card = document.getElementById('avatarCardMini');
  if (card && avatarData.bgColor) card.setAttribute('data-bg', avatarData.bgColor);

  // ── Étoiles et niveau ──
  const stars = '★'.repeat(Math.min(rpgLevel, 5)) + '☆'.repeat(Math.max(0, 5 - rpgLevel));
  setText('avatarStars', stars);
  setText('avatarLevel', 'Niv. ' + rpgLevel);

  // ── Barre XP ──
  const XP_PER_LVL = 1000;
  const xpInLvl    = rpgXP % XP_PER_LVL;
  const xpPct      = Math.round((xpInLvl / XP_PER_LVL) * 100);
  setText('rpgXpLabel', xpInLvl.toLocaleString('fr-CA') + ' / ' + XP_PER_LVL.toLocaleString('fr-CA') + ' XP');
  setText('rpgXpNext', '+' + (XP_PER_LVL - xpInLvl).toLocaleString('fr-CA') + ' XP pour niveau ' + (rpgLevel + 1));
  const xpFill = document.getElementById('rpgXpFill');
  if (xpFill) xpFill.style.width = xpPct + '%';

  // ── Badge âge ──
  setText('rpgAgeBadge', 'Étudiant · ' + rpgAge + ' ans');

  // ── Valeur nette ──
  const netFormatted = Math.abs(celiBalance).toLocaleString('fr-CA', { minimumFractionDigits:2, maximumFractionDigits:2 });
  setText('statNetWorth', (celiBalance < 0 ? '−' : '') + netFormatted + ' $');
  setText('statNetWorthSub', ch5Done ? 'CELI · Débloqué ✓' : 'Compte épargne ordinaire');
  const netEl = document.querySelector('#cardNetWorth .rpg-stat-value');
  if (netEl) netEl.style.color = celiBalance >= 0 ? '#1D9E75' : '#DC2626';

  // ── Stats RPG ──
  const vals = Object.values(rpgStats);
  const avg  = vals.length ? vals.reduce((a,b)=>a+b,0) / vals.length : 5;
  setText('statRPGAvg', avg.toFixed(1).replace('.', ','));
  const STAT_NAMES = { sante:'Santé', connaissances:'Connaissances', habiletes:'Habiletés', organisation:'Organisation', influence:'Influence' };
  const topEntry = Object.entries(rpgStats).sort((a,b) => b[1]-a[1])[0];
  if (topEntry) setText('statRPGSub', 'Meilleure stat : ' + (STAT_NAMES[topEntry[0]]||topEntry[0]) + ' (' + topEntry[1] + '/10)');

  // ── SVG Avatar — généré dynamiquement si character.js disponible ──
  generateAndInjectAvatar(avatarData);
}

// Génère le SVG de l avatar et l injecte dans la mini carte.
// character.js est dans public/js/ — chemin relatif depuis public/pages/
async function generateAndInjectAvatar(avatarData) {
  if (!avatarData || Object.keys(avatarData).length === 0) return;
  const cont = document.getElementById('avatarSVGMini');
  if (!cont) return;
  try {
    const mod = await import('./character.js');
    if (mod && mod.generateAvatarSVG) {
      const svg = mod.generateAvatarSVG(avatarData, 68);
      cont.innerHTML = svg;
    }
  } catch(e) {
    // character.js absent ou erreur — log pour debug, fallback SVG gardé
    console.warn('[Avatar] Impossible de charger character.js:', e.message);
  }
}

function setText(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}

async function init() {
  try {
    const { user, data: userData } = await requireAuth('student');

    // Topbar
    initTopbar(userData);

    // welcome-name — écrit le prénom (le script RPG gère le reste du header)
    const firstName = (userData.displayName || userData.email).split(' ')[0];
    const welcomeEl = document.getElementById('welcome-name');
    if (welcomeEl) welcomeEl.textContent = firstName;

    // Stats de base (garde compatibilité topbar)
    const balanceEl = document.getElementById('stat-balance');
    if (balanceEl) balanceEl.textContent = formatCAD(userData.celiBalance || 0);

    // Charger l avatar depuis Firestore et écouter les changements en temps réel
    loadAvatarRealtime(user.uid, userData);

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

    // Charger le babillard
    await loadCorkBoard();
    await loadWeekQuestion(user.uid);

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
// ── Actualités économiques ─────────────────────────────────────

async function loadNews() {
  const list = document.getElementById('newsList');
  list.innerHTML = `
    <div class="news-loading">
      <div class="news-spinner"></div>
      <span>Chargement…</span>
    </div>`;
  try {
    const res  = await fetch('/api/news.js');
    const data = await res.json();
    if (!data.items || data.items.length === 0) {
      list.innerHTML = '<p class="news-error">Aucun article disponible pour l\'instant.</p>';
      return;
    }
    list.innerHTML = data.items.map(item => `
      <a class="news-card" href="${item.link}" target="_blank" rel="noopener">
        <div class="news-card-meta">
          ${item.isBerube ? '<span class="news-berube-badge">✦ N. Bérubé</span>' : ''}
          <span class="news-date">${formatNewsDate(item.pubDate)}</span>
        </div>
        <div class="news-card-title">${escNewsHtml(item.title)}</div>
        ${item.description ? `<div class="news-card-desc">${escNewsHtml(item.description)}</div>` : ''}
      </a>
    `).join('');
  } catch (err) {
    list.innerHTML = '<p class="news-error">Impossible de charger les actualités.<br>Réessaie dans un moment.</p>';
  }
}

function formatNewsDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  const diffH = Math.floor((new Date() - d) / 3600000);
  if (diffH < 1)  return 'À l\'instant';
  if (diffH < 24) return `Il y a ${diffH} h`;
  return d.toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' });
}

function escNewsHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;')
                    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

loadNews();
document.getElementById('news-refresh-btn').addEventListener('click', loadNews);

// ── Babillard ──────────────────────────────────────────────────

const CORK_PAGE_SIZE = 8;
let corkAllMessages = [];
let corkDisplayed = 0;

async function loadCorkBoard() {
  const grid = document.getElementById('notesGrid');
  if (!grid) return;
  try {
    const q = query(
      collection(db, 'babillard'),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);
    if (snap.empty) {
      grid.innerHTML = '<div class="cork-loading">Aucun message pour l\'instant.</div>';
      return;
    }
    corkAllMessages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    corkDisplayed = 0;
    grid.innerHTML = '';
    renderCorkMessages();
  } catch (err) {
    console.warn('Babillard non disponible:', err);
    grid.innerHTML = '<div class="cork-loading">Babillard temporairement indisponible.</div>';
  }
}

function renderCorkMessages() {
  const grid    = document.getElementById('notesGrid');
  const moreBtn = document.getElementById('cork-load-more');
  const count   = document.getElementById('cork-count');
  const slice   = corkAllMessages.slice(corkDisplayed, corkDisplayed + CORK_PAGE_SIZE);

  slice.forEach(msg => {
    const color = msg.color || 'note-yellow';
    const pin   = msg.pin   || 'pin-red';
    const date  = msg.createdAt?.toDate
      ? msg.createdAt.toDate().toLocaleDateString('fr-CA',
          { day:'numeric', month:'long', year:'numeric' })
      : '';
    const imgHtml  = msg.imageUrl
      ? `<img class="note-img" src="${msg.imageUrl}" alt="Image du message">`
      : '';
    const linkHtml = msg.linkUrl
      ? `<a class="note-link" href="${msg.linkUrl}" target="_blank" rel="noopener">→ ${msg.linkLabel || msg.linkUrl}</a>`
      : '';
    const div = document.createElement('div');
    div.className = `note ${color}`;
    div.innerHTML = `
      <div class="pushpin ${pin}"></div>
      <div class="note-date">${date}</div>
      <div class="note-title">${escNewsHtml(msg.title || '')}</div>
      <div class="note-body">${escNewsHtml(msg.content || '')}</div>
      ${imgHtml}
      ${linkHtml}
    `;
    grid.appendChild(div);
  });

  corkDisplayed += slice.length;
  if (count) {
    count.textContent = `${corkAllMessages.length} message${corkAllMessages.length > 1 ? 's' : ''}`;
  }
  if (moreBtn) {
    moreBtn.style.display = corkDisplayed < corkAllMessages.length ? 'block' : 'none';
  }
}

document.getElementById('corkMoreBtn')?.addEventListener('click', renderCorkMessages);
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
    const { setDoc, increment: fsIncrement } =
      await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js');

    await setDoc(doc(db, 'users', userId, 'weeklyQuiz', `week-${weekNum}`), {
      choiceIndex, isCorrect, answeredAt: new Date(),
    });

    const statsRef  = doc(db, 'weeklyQuizStats', `week-${weekNum}`);
    const statsData = { total: fsIncrement(1) };
    statsData[`choice_${choiceIndex}`] = fsIncrement(1);
    await setDoc(statsRef, statsData, { merge: true });

    if (isCorrect) {
      await setDoc(doc(db, 'users', userId), {
        celiBalance: fsIncrement(QUIZ_BONUS)
      }, { merge: true });
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
// ═══════════════════════════════════════════════════════════════
// BLOC RPG — Avatar temps réel
// Entièrement indépendant du code existant ci-dessus.
// Utilise onSnapshot pour mettre à jour l'avatar dès que
// character-editor.html sauvegarde dans Firestore.
// ═══════════════════════════════════════════════════════════════
(async function initRPGAvatar() {
  try {
    // Attendre que l'utilisateur soit authentifié (auth déjà importé en haut)
    auth.onAuthStateChanged(async (user) => {
      if (!user) return;

      // Charger character.js pour générer le SVG
      let generateAvatarSVG = null;
      try {
        const mod = await import('./character.js');
        generateAvatarSVG = mod.generateAvatarSVG || null;
      } catch(e) {
        console.warn('[RPG Avatar] character.js non chargé:', e.message);
      }

      // Écouter le document utilisateur en temps réel
      // onSnapshot se déclenche immédiatement au chargement,
      // puis à chaque modification (ex: sauvegarde depuis character-editor)
      onSnapshot(doc(db, 'users', user.uid), (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        applyRPGData(data, generateAvatarSVG);
      });
    });
  } catch(e) {
    console.warn('[RPG Avatar] Erreur init:', e);
  }
})();

function applyRPGData(data, generateAvatarSVG) {
  const avatar     = data.avatar       || {};
  const rpgLevel   = data.rpgLevel     || 1;
  const rpgXP      = data.rpgXP        || 0;
  const rpgAge     = data.rpgAge       || 17;
  const rpgWeek    = data.rpgWeek      || 1;
  const rpgStats   = data.rpgStats     || { sante:5, connaissances:5, habiletes:5, organisation:5, influence:5 };
  const balance    = data.celiBalance  || 0;
  const ch5Done    = data.ch5Completed || false;
  const rankDelta  = data.rankDelta    ?? null;

  // ── Mini carte avatar : fond coloré ──
  const card = document.getElementById('avatarCardMini');
  if (card && avatar.bgColor) card.setAttribute('data-bg', avatar.bgColor);

  // ── Étoiles + niveau ──
  rpgSet('avatarStars', '★'.repeat(Math.min(rpgLevel,5)) + '☆'.repeat(Math.max(0,5-rpgLevel)));
  rpgSet('avatarLevel', 'Niv. ' + rpgLevel);

  // ── Badge âge ──
  rpgSet('rpgAgeBadge', 'Étudiant · ' + rpgAge + ' ans');

  // ── Sous-titre semaine ──
  const chapLabel = 'Ch. ' + Math.min(rpgLevel, 5) + ' en cours';
  rpgSet('rpgSubtitle', 'Semaine ' + rpgWeek + ' sur 32 · ' + chapLabel);

  // ── Barre XP ──
  const XP_PER = 1000;
  const xpIn   = rpgXP % XP_PER;
  const xpPct  = Math.round(xpIn / XP_PER * 100);
  rpgSet('rpgXpLabel', xpIn.toLocaleString('fr-CA') + ' / ' + XP_PER.toLocaleString('fr-CA') + ' XP');
  rpgSet('rpgXpNext',  '+' + (XP_PER - xpIn).toLocaleString('fr-CA') + ' XP pour niveau ' + (rpgLevel+1));
  const xpBar = document.getElementById('rpgXpFill');
  if (xpBar) xpBar.style.width = xpPct + '%';

  // ── Valeur nette ──
  const net = Math.abs(balance).toLocaleString('fr-CA', {minimumFractionDigits:2, maximumFractionDigits:2});
  rpgSet('statNetWorth', (balance < 0 ? '−' : '') + net + ' $');
  rpgSet('statNetWorthSub', ch5Done ? 'CELI · Débloqué ✓' : 'Compte épargne ordinaire');
  const netEl = document.querySelector('#cardNetWorth .rpg-stat-value');
  if (netEl) netEl.style.color = balance >= 0 ? '#1D9E75' : '#DC2626';

  // ── Stats RPG ──
  const vals = Object.values(rpgStats);
  const avg  = vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 5;
  rpgSet('statRPGAvg', avg.toFixed(1).replace('.',','));
  const NAMES = {sante:'Santé',connaissances:'Connaissances',habiletes:'Habiletés',organisation:'Organisation',influence:'Influence'};
  const top = Object.entries(rpgStats).sort((a,b)=>b[1]-a[1])[0];
  if (top) rpgSet('statRPGSub', 'Meilleure : ' + (NAMES[top[0]]||top[0]) + ' (' + top[1] + '/10)');

  // ── SVG Avatar ──
  if (generateAvatarSVG && Object.keys(avatar).length > 0) {
    try {
      const svg  = generateAvatarSVG(avatar, 68);
      const cont = document.getElementById('avatarSVGMini');
      if (cont) {
        cont.innerHTML = svg;
        console.log('[RPG Avatar] SVG injecté, taille:', svg.length);
      } else {
        console.warn('[RPG Avatar] avatarSVGMini introuvable dans le DOM');
      }
    } catch(e) {
      console.warn('[RPG Avatar] Erreur génération SVG:', e.message);
    }
  } else {
    console.log('[RPG Avatar] generateAvatarSVG:', !!generateAvatarSVG, '| avatar keys:', Object.keys(avatar).length);
  }
}

// Utilitaire setText sûr (ne plante pas si l'élément n'existe pas)
function rpgSet(id, txt) {
  const el = document.getElementById(id);
  if (el) el.textContent = txt;
}
