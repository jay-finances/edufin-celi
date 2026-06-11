// module.js — Logique capsule + quiz
import { db, auth } from '../js/firebase-init.js';
import { requireAuth, formatCAD, initTopbar, isModuleAvailable, showToast }
  from '../js/utils.js';
import {
  doc, getDoc, getDocs, collection, setDoc, updateDoc,
  serverTimestamp, increment, query, where, orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ── Contenu des capsules pédagogiques ────────────────────────────
const CAPSULES = {
  ch1: {
    tag: 'Chapitre 1',
    title: 'Le phénomène de la consommation',
    icon: '🛒',
    reward: 250,
    content: `
      <h3>Qu'est-ce que la consommation?</h3>
      <p>La consommation désigne l'acte d'utiliser ou d'acheter des biens et des services pour satisfaire des besoins. Dans nos sociétés modernes, elle est au cœur de la vie économique.</p>

      <div class="highlight-box">
        « Consommer, c'est faire des choix. Les besoins et les désirs sont illimités, mais les ressources, elles, sont limitées. »
      </div>

      <h3>La pyramide de Maslow</h3>
      <p>Abraham Maslow (1908-1970) a classé les besoins humains en cinq niveaux :</p>
      <ul>
        <li><strong>Niveau 1 — Physiologiques :</strong> manger, boire, se loger, dormir</li>
        <li><strong>Niveau 2 — Sécurité :</strong> stabilité d'emploi, logement durable, protection</li>
        <li><strong>Niveau 3 — Appartenance :</strong> famille, amis, groupes sociaux</li>
        <li><strong>Niveau 4 — Estime :</strong> reconnaissance, respect, image de soi</li>
        <li><strong>Niveau 5 — Accomplissement :</strong> créativité, épanouissement personnel</li>
      </ul>
      <p>Les besoins fondamentaux doivent être comblés avant de pouvoir pleinement poursuivre les niveaux supérieurs.</p>

      <h3>Les GAFAM et la société de consommation</h3>
      <p>À partir des années 2000, Google, Apple, Facebook/Meta, Amazon et Microsoft ont profondément transformé nos habitudes. Ils créent de nouveaux besoins, accélèrent les cycles de consommation et collectent nos données pour personnaliser la publicité — c'est ce qu'on appelle le <strong>capitalisme de surveillance</strong>.</p>

      <div class="key-concept">
        <strong>Consumérisme :</strong> Mode de vie axé sur la consommation comme fin en soi. On consomme pour exister socialement, pas seulement pour satisfaire des besoins réels.
      </div>

      <h3>Les facteurs qui influencent la consommation</h3>
      <ul>
        <li><strong>L'âge :</strong> nos besoins changent avec le temps</li>
        <li><strong>Le sexe :</strong> des différences persistent dans les habitudes d'achat</li>
        <li><strong>Le pouvoir d'achat :</strong> déterminé par le revenu disponible</li>
        <li><strong>Le prix :</strong> permet de classifier les biens et services</li>
      </ul>

      <h3>Le processus d'achat réfléchi</h3>
      <p>Pour éviter les pièges de la consommation impulsive, il existe 6 étapes :</p>
      <ul>
        <li>① Déterminer son besoin réel</li>
        <li>② Rassembler l'information</li>
        <li>③ Évaluer les possibilités</li>
        <li>④ Prendre la décision</li>
        <li>⑤ Se procurer le bien ou service</li>
        <li>⑥ Évaluer l'achat après coup</li>
      </ul>

      <div class="highlight-box">
        <strong>À retenir :</strong> La <em>fast fashion</em>, la <em>retail therapy</em> et le mimétisme social (vouloir ce que les autres ont) sont des pièges courants qui peuvent mener à un endettement inutile.
      </div>
    `
  },

  ch2: {
    tag: 'Chapitre 2',
    title: 'Le rôle de l\'État dans la consommation',
    icon: '⚖️',
    reward: 250,
    content: `
      <h3>Les droits du consommateur au Québec</h3>
      <p>La <strong>Loi sur la protection du consommateur</strong> (1971) garantit notamment :</p>
      <ul>
        <li>Le droit à l'information claire sur les biens et services</li>
        <li>La protection contre les pratiques commerciales trompeuses</li>
        <li>La garantie légale de qualité et de durabilité</li>
        <li>Le droit d'annuler certains contrats (vente itinérante, crédit)</li>
      </ul>

      <div class="key-concept">
        <strong>Politique d'exactitude des prix :</strong> Si le prix en caisse est plus élevé que le prix affiché, un article de 15 $ ou moins est gratuit. Pour un article de plus de 15 $, tu obtiens un rabais de 15 $ sur le prix annoncé.
      </div>

      <h3>Les trois types de garanties</h3>
      <ul>
        <li><strong>Légale :</strong> automatique, gratuite, couvre les vices cachés et la durabilité raisonnable</li>
        <li><strong>Du fabricant :</strong> offerte volontairement, durée précisée, couverte dans le prix</li>
        <li><strong>Prolongée :</strong> vendue en extra — souvent peu utile car la garantie légale couvre déjà beaucoup</li>
      </ul>

      <h3>L'offre et la demande</h3>
      <p>Dans un marché libre, le <strong>prix d'équilibre</strong> est atteint lorsque l'offre rencontre la demande :</p>
      <ul>
        <li>Si l'offre baisse (rareté) → prix augmente</li>
        <li>Si l'offre augmente (surplus) → prix baisse</li>
        <li>Si la demande augmente → prix augmente</li>
        <li>Si la demande baisse → prix baisse</li>
      </ul>

      <h3>Les taxes à la consommation</h3>
      <p>Au Canada et au Québec, deux taxes principales s'appliquent à la majorité des achats :</p>
      <ul>
        <li><strong>TPS (taxe fédérale) :</strong> 5 %</li>
        <li><strong>TVQ (taxe provinciale) :</strong> 9,975 %</li>
      </ul>
      <p>Certains biens sont exemptés : aliments de base, médicaments d'ordonnance, services de santé et d'éducation.</p>

      <div class="highlight-box">
        Les taxes servent à <strong>financer les services publics</strong>, à <strong>redistribuer la richesse</strong> et à décourager certaines consommations (tabac, alcool, carburant).
      </div>
    `
  },

  ch3: {
    tag: 'Chapitre 3',
    title: 'Le crédit',
    icon: '💳',
    reward: 300,
    content: `
      <h3>Qu'est-ce que le crédit?</h3>
      <p>Le crédit permet d'obtenir un bien ou service <strong>maintenant</strong> et de le payer <strong>plus tard</strong>, avec des intérêts. C'est un outil utile, mais qui comporte des risques importants.</p>

      <div class="key-concept">
        <strong>Crédit =</strong> Capital emprunté + Taux d'intérêt + Durée de remboursement
      </div>

      <h3>Les conditions pour obtenir du crédit</h3>
      <ul>
        <li>Un emploi et des revenus stables</li>
        <li>Un bon dossier / cote de crédit (TransUnion, Equifax)</li>
        <li>Un taux d'endettement raisonnable</li>
        <li>L'habitude de payer ses dettes à temps</li>
      </ul>

      <h3>Les trois grands types de contrats de crédit</h3>
      <ul>
        <li><strong>Crédit variable (cartes, marges) :</strong> flexible, renouvelable, mais taux élevé (≈ 19-22 % pour les cartes)</li>
        <li><strong>Prêts à terme (personnel, hypothécaire) :</strong> montant fixe, échéancier précis, taux plus bas si garanti</li>
        <li><strong>Vente à tempérament :</strong> crédit intégré à l'achat d'un bien — le vendeur reste propriétaire jusqu'au remboursement complet</li>
      </ul>

      <h3>Bonnes dettes vs mauvaises dettes</h3>
      <ul>
        <li><strong>Bonnes dettes :</strong> prêt étudiant, hypothèque, démarrage d'entreprise — elles peuvent prendre de la valeur</li>
        <li><strong>Mauvaises dettes :</strong> voyages, vêtements, restaurants financés à 20 % — coûteuses et sans retour</li>
      </ul>

      <div class="highlight-box">
        <strong>Règle d'or :</strong> cherche toujours le taux le plus bas possible et la période de remboursement la plus courte que tu peux te permettre. Chaque mois supplémentaire de remboursement coûte de l'argent.
      </div>

      <h3>Le coût réel du crédit</h3>
      <p>Un solde de 1 000 $ sur une carte à 19 % avec paiement minimal de 5 % = <strong>près de 7 ans pour rembourser</strong> et environ 660 $ d'intérêts payés en plus. Le prix réel d'un achat de 1 000 $ devient 1 660 $!</p>
    `
  },

  ch4: {
    tag: 'Chapitre 4',
    title: 'Le budget et le surendettement',
    icon: '📊',
    reward: 300,
    content: `
      <h3>La planification budgétaire</h3>
      <p>Un budget est un <strong>portrait de ta situation financière</strong> et un outil de planification. Il repose sur deux colonnes :</p>
      <ul>
        <li><strong>Revenus :</strong> salaire, allocations, revenus d'investissement</li>
        <li><strong>Dépenses :</strong> fixes et variables</li>
      </ul>

      <div class="key-concept">
        <strong>Dépenses fixes :</strong> loyer, assurances, paiements de prêts — elles ne changent pas d'un mois à l'autre.<br><br>
        <strong>Dépenses variables :</strong> alimentation, sorties, vêtements — elles peuvent être réduites si nécessaire.
      </div>

      <h3>L'importance du fonds d'urgence</h3>
      <p>Les experts recommandent d'avoir <strong>3 à 6 mois</strong> de dépenses essentielles en réserve. C'est ta bouée de sauvetage en cas de perte d'emploi, de maladie ou d'imprévu majeur — pour éviter de plonger dans les dettes.</p>

      <h3>Le surendettement</h3>
      <p>Le surendettement, c'est quand tu ne peux plus payer tes dettes sans sacrifier tes besoins de base. Ses causes les plus fréquentes :</p>
      <ul>
        <li>Taux d'intérêt trop élevés sur les crédits variables</li>
        <li>Faible éducation financière</li>
        <li>Perte de revenu imprévue</li>
        <li>Consommation à crédit de biens non essentiels</li>
      </ul>

      <h3>Les mécanismes de sortie de crise</h3>
      <ul>
        <li><strong>Dépôt volontaire :</strong> procédure provinciale, remboursement allongé, protection contre les saisies</li>
        <li><strong>Proposition de consommateur :</strong> négociation d'un remboursement partiel avec les créanciers</li>
        <li><strong>Faillite personnelle :</strong> dernier recours — libère des dettes mais impact très négatif sur le dossier de crédit pendant plusieurs années</li>
      </ul>

      <div class="highlight-box">
        <strong>À retenir :</strong> l'épargne ne devrait pas être ce qu'il « reste » après les dépenses — elle devrait être planifiée comme une dépense prioritaire, au même titre que le loyer.
      </div>
    `
  },

  ch5: {
    tag: 'Chapitre 5',
    title: 'L\'épargne et l\'investissement',
    icon: '📈',
    reward: 500,
    content: `
      <h3>Qu'est-ce que l'épargne?</h3>
      <p>L'épargne, c'est la partie du revenu disponible qui n'est pas immédiatement consommée. Elle sert à :</p>
      <ul>
        <li>Constituer un fonds d'urgence</li>
        <li>Financer des projets (auto, voyage, études)</li>
        <li>Faire fructifier son argent à long terme</li>
      </ul>

      <h3>Les 3 critères d'un bon placement</h3>
      <ul>
        <li><strong>Rendement :</strong> le revenu généré (intérêts, dividendes, gain en capital)</li>
        <li><strong>Risque (sécurité) :</strong> la garantie de ne pas perdre son capital — plus le risque est élevé, plus le rendement potentiel est grand</li>
        <li><strong>Convertibilité (liquidité) :</strong> la facilité de transformer son placement en argent rapidement</li>
      </ul>

      <h3>L'intérêt composé — la magie du temps</h3>
      <p>L'intérêt composé, c'est l'intérêt calculé sur le capital <strong>plus</strong> les intérêts déjà accumulés. C'est ce qui fait que l'argent « travaille pour toi ».</p>

      <div class="key-concept">
        <strong>Règle du 72 :</strong> Divise 72 par le taux d'intérêt pour savoir en combien d'années ton argent double.<br>
        Exemple : à 6 % d'intérêt → 72 ÷ 6 = <strong>12 ans</strong> pour doubler.
      </div>

      <h3>Le CELI — ton meilleur ami</h3>
      <p>Le Compte d'Épargne Libre d'Impôt est le véhicule de placement idéal pour débuter :</p>
      <ul>
        <li>Disponible dès 18 ans</li>
        <li>Droits de cotisation : <strong>7 000 $/an</strong> (2024)</li>
        <li>Tous les gains (intérêts, dividendes, plus-values) sont <strong>à l'abri de l'impôt</strong></li>
        <li>Les retraits sont libres d'impôt et les droits se reconstituent l'année suivante</li>
        <li>On peut y déposer des actions, FNB, obligations et fonds communs</li>
      </ul>

      <h3>Les principaux véhicules de placement</h3>
      <ul>
        <li><strong>CPG :</strong> placement garanti, risque nul, rendement faible</li>
        <li><strong>Obligations :</strong> prêt à un gouvernement/entreprise, intérêts stables</li>
        <li><strong>Actions :</strong> titre de propriété d'une entreprise, rendement élevé possible mais risque plus grand</li>
        <li><strong>FNB (fonds négociés en bourse) :</strong> panier diversifié d'actions/obligations, faibles frais, idéal pour débutants</li>
      </ul>

      <div class="highlight-box">
        <strong>Le temps, c'est de l'argent :</strong> Ana qui investit 2 000 $/an dès 25 ans accumule 253 679 $ à 65 ans. Tom qui attend à 55 ans pour investir 8 000 $/an n'a que 105 654 $ — malgré le même total investi. Commence tôt!
      </div>
    `
  }
};

// ── État du quiz ──────────────────────────────────────────────────
let currentUser = null;
let userData = null;
let moduleId = null;
let questions = [];
let currentQIndex = 0;
let correctAnswers = 0;
let answered = false;
let phase = 'capsule'; // capsule | quiz | result

// ── Init ──────────────────────────────────────────────────────────
async function init() {
  const params = new URLSearchParams(window.location.search);
  moduleId = params.get('id');

  if (!moduleId || !CAPSULES[moduleId]) {
    window.location.href = 'modules.html';
    return;
  }

  try {
    const authData = await requireAuth('student');
    currentUser = authData.user;
    userData = authData.data;
    initTopbar(userData);

    // Vérifier si le module est verrouillé
    const configSnap = await getDoc(doc(db, 'config', 'modules'));
    const moduleConfig = configSnap.exists() ? configSnap.data() : {};
    const cfg = moduleConfig[moduleId] || {};

    if (!isModuleAvailable(cfg)) {
      showLocked(cfg);
      return;
    }

    // Vérifier si déjà complété
    const progressSnap = await getDoc(
      doc(db, 'users', currentUser.uid, 'progress', moduleId)
    );
    if (progressSnap.exists() && progressSnap.data().quizCompleted) {
      const data = progressSnap.data();
      document.getElementById('module-completed-msg').style.display = 'block';
      document.getElementById('completed-score-msg').textContent =
        `Tu avais obtenu ${data.quizScore}% à ce quiz.`;
      document.getElementById('btn-redo').addEventListener('click', () => {
        document.getElementById('module-completed-msg').style.display = 'none';
        showCapsule();
      });
      return;
    }

    // Charger les questions depuis Firestore
    await loadQuestions();

    // Afficher la capsule
    showCapsule();

  } catch (err) {
    console.error(err);
  }
}

function showLocked(cfg) {
  document.getElementById('module-locked').style.display = 'block';
  if (cfg.unlockDate) {
    const date = cfg.unlockDate.toDate ? cfg.unlockDate.toDate() : new Date(cfg.unlockDate);
    const formatted = new Intl.DateTimeFormat('fr-CA', {
      day: 'numeric', month: 'long', year: 'numeric'
    }).format(date);
    document.getElementById('locked-msg').textContent =
      `Ce module sera disponible à partir du ${formatted}.`;
  }
}

function showCapsule() {
  phase = 'capsule';
  updatePhaseIndicator();

  const capsule = CAPSULES[moduleId];
  document.getElementById('capsule-tag').textContent = capsule.tag;
  document.getElementById('capsule-title').textContent = capsule.title;
  document.getElementById('capsule-icon').textContent = capsule.icon;
  document.getElementById('capsule-body').innerHTML = capsule.content;
  document.getElementById('phase-capsule-content').style.display = 'block';

  document.getElementById('btn-start-quiz').addEventListener('click', startQuiz);
}

async function loadQuestions() {
  // Charger depuis Firestore
  const qSnap = await getDocs(
    query(
      collection(db, 'questions'),
      where('chapter', '==', moduleId),
      where('active', '==', true)
    )
  );

  let allQ = [];
  qSnap.forEach(d => allQ.push({ id: d.id, ...d.data() }));

  // Mélanger et prendre max 10 questions
  allQ = allQ.sort(() => Math.random() - 0.5).slice(0, 10);

  // Si aucune question en base, utiliser les questions par défaut
  if (allQ.length === 0) {
    allQ = getDefaultQuestions(moduleId);
  }

  questions = allQ;
}

function startQuiz() {
  phase = 'quiz';
  updatePhaseIndicator();
  document.getElementById('phase-capsule-content').style.display = 'none';
  document.getElementById('phase-quiz-content').style.display = 'block';
  document.getElementById('quiz-module-title').textContent =
    `Quiz — ${CAPSULES[moduleId].title}`;
  currentQIndex = 0;
  correctAnswers = 0;
  renderQuestion();
}

function renderQuestion() {
  if (currentQIndex >= questions.length) {
    finishQuiz();
    return;
  }

  answered = false;
  const q = questions[currentQIndex];
  const total = questions.length;

  document.getElementById('q-num').textContent = `Question ${currentQIndex + 1}`;
  document.getElementById('quiz-counter').textContent =
    `Question ${currentQIndex + 1} / ${total}`;
  document.getElementById('q-text').textContent = q.question;
  document.getElementById('quiz-progress').style.width =
    `${((currentQIndex + 1) / total) * 100}%`;
  document.getElementById('quiz-score-display').textContent =
    `Score : ${correctAnswers} / ${currentQIndex}`;
  document.getElementById('q-explanation').style.display = 'none';
  document.getElementById('btn-next-q').style.display = 'none';

  // Afficher les options
  const optContainer = document.getElementById('q-options');
  optContainer.innerHTML = '';
  const letters = ['A', 'B', 'C', 'D'];
  q.options.forEach((opt, i) => {
    const btn = document.createElement('div');
    btn.className = 'quiz-option';
    btn.innerHTML = `
      <div class="option-letter">${letters[i]}</div>
      <div class="option-text">${opt}</div>`;
    btn.addEventListener('click', () => selectAnswer(i, q));
    optContainer.appendChild(btn);
  });
}

function selectAnswer(selectedIndex, q) {
  if (answered) return;
  answered = true;

  const options = document.querySelectorAll('.quiz-option');
  const isCorrect = selectedIndex === q.correctIndex;

  if (isCorrect) {
    options[selectedIndex].classList.add('correct');
    correctAnswers++;
  } else {
    options[selectedIndex].classList.add('incorrect');
    options[q.correctIndex].classList.add('correct');
  }

  // Afficher l'explication
  if (q.explanation) {
    const expEl = document.getElementById('q-explanation');
    expEl.textContent = q.explanation;
    expEl.style.display = 'block';
  }

  document.getElementById('quiz-score-display').textContent =
    `Score : ${correctAnswers} / ${currentQIndex + 1}`;

  // Bouton suivant
  const nextBtn = document.getElementById('btn-next-q');
  nextBtn.style.display = 'inline-block';
  const isLast = currentQIndex + 1 >= questions.length;
  nextBtn.textContent = isLast ? 'Voir mes résultats →' : 'Question suivante →';
  nextBtn.onclick = () => {
    currentQIndex++;
    renderQuestion();
  };
}

async function finishQuiz() {
  phase = 'result';
  updatePhaseIndicator();
  document.getElementById('phase-quiz-content').style.display = 'none';
  document.getElementById('phase-result-content').style.display = 'block';

  const total = questions.length;
  const score = Math.round((correctAnswers / total) * 100);
  const passed = score >= 60;
  const capsule = CAPSULES[moduleId];
  const reward = passed ? capsule.reward : Math.round(capsule.reward * 0.4);

  // Mettre à jour Firestore
  try {
    // Sauvegarder la progression
    await setDoc(doc(db, 'users', currentUser.uid, 'progress', moduleId), {
      quizCompleted: true,
      quizScore: score,
      correctAnswers,
      totalQuestions: total,
      completedAt: serverTimestamp(),
      passed
    });

    // Créditer les fonds CELI
    await updateDoc(doc(db, 'users', currentUser.uid), {
      celiBalance: increment(reward)
    });

    // Ajouter une transaction
    await setDoc(
      doc(collection(db, 'users', currentUser.uid, 'transactions')),
      {
        type: 'quiz_reward',
        module: moduleId,
        amount: reward,
        description: `Récompense quiz — ${capsule.title}`,
        date: serverTimestamp()
      }
    );

    const newBalance = (userData.celiBalance || 0) + reward;

    // Afficher les résultats
    document.getElementById('result-reward').textContent = `+${formatCAD(reward)}`;
    document.getElementById('result-score').textContent = `${score}%`;
    document.getElementById('result-new-balance').textContent = formatCAD(newBalance);
    document.getElementById('topbar-balance').textContent = formatCAD(newBalance);

    if (score >= 80) {
      document.getElementById('result-emoji').textContent = '🏆';
      document.getElementById('result-title').textContent = 'Excellent travail!';
      document.getElementById('result-msg').textContent =
        `${correctAnswers} bonnes réponses sur ${total}. Tu maîtrises bien ce chapitre!`;
    } else if (score >= 60) {
      document.getElementById('result-emoji').textContent = '👍';
      document.getElementById('result-title').textContent = 'Beau travail!';
      document.getElementById('result-msg').textContent =
        `${correctAnswers} bonnes réponses sur ${total}. Continue comme ça!`;
    } else {
      document.getElementById('result-emoji').textContent = '📖';
      document.getElementById('result-title').textContent = 'Relis la capsule!';
      document.getElementById('result-msg').textContent =
        `${correctAnswers} bonnes réponses sur ${total}. Relis le contenu pour consolider tes apprentissages.`;
    }

  } catch (err) {
    console.error('Erreur sauvegarde:', err);
    showToast('Erreur lors de la sauvegarde. Contacte ton enseignant.', 'error');
  }
}

function updatePhaseIndicator() {
  const phases = ['capsule', 'quiz', 'result'];
  const steps = ['phase-capsule', 'phase-quiz', 'phase-result'];
  const currentIndex = phases.indexOf(phase);
  steps.forEach((id, i) => {
    const el = document.getElementById(id);
    if (i < currentIndex) el.className = 'phase-step done';
    else if (i === currentIndex) el.className = 'phase-step active';
    else el.className = 'phase-step';
  });
}

// ── Questions par défaut (si Firestore vide) ──────────────────────
function getDefaultQuestions(chapterId) {
  const banks = {
    ch1: [
      {
        question: "Selon la pyramide de Maslow, quel besoin doit être comblé EN PREMIER?",
        options: ["L'estime de soi", "La sécurité", "Les besoins physiologiques (manger, dormir)", "L'accomplissement personnel"],
        correctIndex: 2,
        explanation: "Les besoins physiologiques (manger, boire, se loger) sont à la base de la pyramide et doivent être satisfaits avant tout."
      },
      {
        question: "Qu'est-ce que le 'consumérisme'?",
        options: [
          "Le fait d'acheter uniquement des produits biologiques",
          "Un mode de vie où la consommation devient une fin en soi",
          "Une loi qui protège les consommateurs",
          "Le recyclage des produits usagés"
        ],
        correctIndex: 1,
        explanation: "Le consumérisme désigne l'approche de vivre pour consommer — on consomme pour s'identifier socialement, pas seulement pour répondre à des besoins."
      },
      {
        question: "La 'fast fashion' désigne:",
        options: [
          "Les vêtements de sport haute performance",
          "Le renouvellement rapide des collections pour créer une obsolescence des tendances",
          "Les achats en ligne rapides",
          "Les friperies et vêtements de seconde main"
        ],
        correctIndex: 1,
        explanation: "La fast fashion repose sur un renouvellement incessant des collections, transformant ce qui était 'à la mode' il y a peu en produit dépassé."
      },
      {
        question: "Qu'est-ce que la 'retail therapy'?",
        options: [
          "Un programme gouvernemental d'aide aux commerçants",
          "La thérapie par la consommation — acheter pour améliorer son humeur",
          "Un système de remboursement pour les achats défectueux",
          "La vente de médicaments en pharmacie"
        ],
        correctIndex: 1,
        explanation: "La retail therapy désigne la pratique d'acheter de façon non planifiée pour améliorer son humeur ou contrer des émotions négatives."
      },
      {
        question: "Parmi les facteurs suivants, lequel N'influence PAS directement les habitudes de consommation selon le cours?",
        options: ["L'âge", "Le pouvoir d'achat", "La couleur préférée", "Le sexe"],
        correctIndex: 2,
        explanation: "L'âge, le sexe et le pouvoir d'achat sont des facteurs reconnus. La couleur préférée n'est pas un facteur économique structurant."
      },
      {
        question: "Qu'est-ce que le 'capitalisme de surveillance'?",
        options: [
          "Un système où l'État surveille les entreprises",
          "La collecte et revente de données personnelles par les géants technologiques pour personnaliser la publicité",
          "Les caméras de surveillance dans les commerces",
          "Un mécanisme pour protéger les droits d'auteur"
        ],
        correctIndex: 1,
        explanation: "Le capitalisme de surveillance (concept de Shoshana Zuboff) désigne comment les GAFAM collectent nos données pour anticiper et influencer nos comportements d'achat."
      },
      {
        question: "Dans le processus d'achat réfléchi, quelle est la PREMIÈRE étape?",
        options: [
          "Comparer les prix sur Internet",
          "Consulter les avis en ligne",
          "Déterminer son besoin réel",
          "Prendre la décision d'acheter"
        ],
        correctIndex: 2,
        explanation: "Avant tout, il faut déterminer si on a vraiment BESOIN du bien ou service — distinguer le besoin réel du désir fabriqué par la publicité."
      },
      {
        question: "Vrai ou faux : les besoins humains sont limités, mais les ressources disponibles sont illimitées.",
        options: [
          "Vrai — on peut toujours produire plus",
          "Faux — les besoins sont illimités et les ressources sont limitées",
          "Vrai — les ressources naturelles sont inépuisables",
          "Faux — les besoins et les ressources sont tous les deux illimités"
        ],
        correctIndex: 1,
        explanation: "C'est l'inverse : les besoins et désirs sont ILLIMITÉS, mais les ressources (argent, temps, matières premières) sont LIMITÉES. C'est ce qui force à faire des choix."
      },
      {
        question: "Le 'mimétisme social' (René Girard) dans la consommation signifie que:",
        options: [
          "On imite les publicités télévisées",
          "On désire ce que les autres possèdent ou désirent",
          "On achète des imitations de marques de luxe",
          "On consomme de façon identique à ses parents"
        ],
        correctIndex: 1,
        explanation: "Selon Girard, nos désirs ne sont pas autonomes — nous désirons ce que les autres désirent, ce qui crée de la pression sociale à consommer."
      },
      {
        question: "Quel organisme québécois peut t'aider si un commerçant ne respecte pas tes droits?",
        options: [
          "La Régie du cinéma",
          "L'Office de la protection du consommateur (OPC)",
          "L'Agence du revenu du Canada",
          "La Commission des droits de la personne"
        ],
        correctIndex: 1,
        explanation: "L'OPC est l'organisme mandaté par le gouvernement du Québec pour informer et protéger les consommateurs face aux pratiques commerciales abusives."
      }
    ],

    ch2: [
      {
        question: "Si un article coûte 8,99 $ en rayon mais que le prix en caisse est 10,99 $, que prévoit la Politique d'exactitude des prix?",
        options: [
          "Tu paies 10,99 $",
          "Tu obtiens un rabais de 15 $ sur le prix annoncé",
          "L'article t'est remis GRATUITEMENT",
          "Tu paies la moyenne des deux prix"
        ],
        correctIndex: 2,
        explanation: "Pour un article de 15 $ ou moins, la Politique d'exactitude des prix prévoit qu'il te soit remis gratuitement si le prix en caisse est plus élevé que le prix affiché."
      },
      {
        question: "Quel est le taux actuel de la TVQ (taxe de vente du Québec)?",
        options: ["5 %", "7,5 %", "9,975 %", "14,975 %"],
        correctIndex: 2,
        explanation: "La TVQ est une taxe provinciale de 9,975 %. Elle s'ajoute à la TPS fédérale de 5 % pour un total combiné d'environ 15 % sur la plupart des achats."
      },
      {
        question: "Laquelle de ces situations entraîne généralement une HAUSSE des prix?",
        options: [
          "L'offre augmente, la demande reste stable",
          "L'offre diminue (rareté), la demande reste stable",
          "La demande diminue, l'offre reste stable",
          "L'offre et la demande augmentent en même temps"
        ],
        correctIndex: 1,
        explanation: "Quand l'offre baisse (rareté), les producteurs peuvent demander un prix plus élevé pour le même bien. C'est la loi de l'offre et de la demande."
      },
      {
        question: "La garantie LÉGALE au Québec, c'est:",
        options: [
          "Une garantie que tu dois acheter en supplément chez le vendeur",
          "Une garantie automatique et gratuite qui couvre les vices cachés et la durabilité raisonnable",
          "La garantie que le fabricant offre volontairement pour un an",
          "Une garantie applicable seulement aux voitures neuves"
        ],
        correctIndex: 1,
        explanation: "La garantie légale découle directement de la Loi sur la protection du consommateur. Elle est automatique, gratuite et oblige le vendeur à fournir un bien sans vice caché et d'une durabilité raisonnable."
      },
      {
        question: "Qu'est-ce qu'un oligopole?",
        options: [
          "Un marché avec un seul vendeur (ex: Hydro-Québec)",
          "Un marché dominé par un petit nombre de grandes entreprises puissantes",
          "Une entente illégale entre concurrents pour fixer les prix",
          "Un type de placement financier"
        ],
        correctIndex: 1,
        explanation: "Un oligopole est un marché dominé par peu d'entreprises puissantes — ex: télécommunications, banques, pétrolières. La concurrence y est faible et les prix sont élevés."
      },
      {
        question: "Parmi ces aliments, lequel est exempté de TPS et TVQ au Canada?",
        options: [
          "Un café au lait acheté dans un café",
          "Une boîte de céréales (aliment de base non préparé)",
          "Un repas dans un restaurant rapide",
          "Des chips et croustilles"
        ],
        correctIndex: 1,
        explanation: "Les aliments de base non préparés (pain, céréales, viande, légumes, fruits, produits laitiers) sont exemptés de taxes. Les aliments préparés, les restaurants et certaines collations sont taxés."
      },
      {
        question: "La garantie PROLONGÉE vendue en magasin est souvent peu recommandée parce que:",
        options: [
          "Elle ne couvre pas les bris accidentels",
          "La garantie légale couvre déjà une large part des situations et c'est surtout une source de profits pour le vendeur",
          "Elle est illégale au Québec depuis 2020",
          "Elle ne s'applique qu'aux appareils électroniques"
        ],
        correctIndex: 1,
        explanation: "Des analystes comme Pierre-Yves McSween soulignent que la garantie légale couvre déjà beaucoup, et que la garantie prolongée est surtout un mécanisme de profit pour les détaillants."
      },
      {
        question: "Pourquoi l'État taxe-t-il fortement le tabac et l'alcool (taxes d'accise)?",
        options: [
          "Uniquement pour financer les services publics",
          "Pour générer des revenus ET décourager la consommation de ces produits",
          "Parce que ces produits sont importés de l'étranger",
          "Pour rembourser la dette provinciale"
        ],
        correctIndex: 1,
        explanation: "Les taxes spécifiques sur le tabac, l'alcool et le carburant ont un double objectif : générer des revenus publics ET décourager la consommation de biens jugés nuisibles à la santé ou à l'environnement."
      },
      {
        question: "Le prix d'ÉQUILIBRE dans un marché, c'est:",
        options: [
          "Le prix le plus bas possible pour le consommateur",
          "Le prix fixé par le gouvernement",
          "Le prix auquel la quantité offerte est égale à la quantité demandée",
          "La moyenne des prix de tous les concurrents"
        ],
        correctIndex: 2,
        explanation: "Le prix d'équilibre est atteint quand l'offre et la demande se rencontrent — ni surplus ni pénurie. C'est le mécanisme central du marché libre."
      },
      {
        question: "Éducaloi est un organisme qui:",
        options: [
          "Offre des prêts étudiants à faible taux",
          "Surveille les pratiques des banques québécoises",
          "Vulgarise le droit pour le rendre accessible à tous les citoyens",
          "Gère les plaintes des locataires contre les propriétaires"
        ],
        correctIndex: 2,
        explanation: "Éducaloi est un organisme sans but lucratif qui explique le droit en langage clair et accessible, permettant aux citoyens de mieux connaître leurs droits et responsabilités."
      }
    ],

    ch3: [
      {
        question: "Quel est le taux d'intérêt TYPIQUE d'une carte de crédit au Canada?",
        options: ["5-8 %", "10-12 %", "19-22 %", "30-35 %"],
        correctIndex: 2,
        explanation: "La plupart des cartes de crédit au Canada facturent entre 19 % et 22 % d'intérêt annuel sur les soldes non remboursés. C'est pourquoi payer uniquement le minimum est très coûteux."
      },
      {
        question: "Marc achète une télévision à tempérament. Qui en est le propriétaire légal jusqu'au remboursement complet?",
        options: ["Marc dès la livraison", "Le fabricant de la télé", "Le commerçant/prêteur", "La banque de Marc"],
        correctIndex: 2,
        explanation: "Dans une vente à tempérament, le vendeur demeure propriétaire du bien jusqu'au paiement total. S'il y a défaut de paiement, il peut reprendre le bien."
      },
      {
        question: "Lequel de ces achats représente une 'BONNE dette' selon le cours?",
        options: [
          "Financer un voyage au Mexique à 20 % d'intérêt",
          "Acheter des vêtements de marque à crédit",
          "Contracter un prêt hypothécaire pour acheter une propriété",
          "Mettre un souper de groupe sur sa carte de crédit"
        ],
        correctIndex: 2,
        explanation: "Le prêt hypothécaire finance un actif (la maison) qui peut prendre de la valeur. Les autres exemples financent des biens qui se déprécient ou qui n'ont pas de valeur résiduelle."
      },
      {
        question: "Qu'est-ce que la 'cote de crédit'?",
        options: [
          "Le montant maximal qu'on peut emprunter",
          "Un indicateur chiffré qui synthétise ton historique de remboursement et ta gestion du crédit",
          "Le taux d'intérêt qu'une banque t'offre",
          "Le nombre de cartes de crédit qu'on possède"
        ],
        correctIndex: 1,
        explanation: "La cote de crédit (calculée par TransUnion et Equifax) synthétise ton comportement passé face au crédit. Une cote élevée = moins de risque pour le prêteur = meilleurs taux pour toi."
      },
      {
        question: "Sophie a un solde de 2 000 $ sur sa carte à 19 % et ne paie que le minimum chaque mois. Combien de temps environ lui faudra-t-il pour rembourser?",
        options: ["6 mois", "1-2 ans", "Environ 10 ans ou plus", "3 ans exactement"],
        correctIndex: 2,
        explanation: "Avec des paiements minimaux seulement, il faut souvent 10 ans ou plus pour rembourser un solde de carte de crédit — et on paie souvent autant en intérêts qu'en capital initial!"
      },
      {
        question: "Le CAUTIONNEMENT, c'est quand:",
        options: [
          "Tu offres ta voiture en garantie pour un prêt",
          "Une deuxième personne s'engage à rembourser ta dette si tu ne peux pas le faire",
          "Tu signes un contrat de crédit variable",
          "La banque évalue ta capacité de remboursement"
        ],
        correctIndex: 1,
        explanation: "Le cautionnement lie une tierce personne (la caution) au contrat. Si l'emprunteur fait défaut, la caution doit rembourser. C'est souvent exigé pour les premiers emprunts ou locations."
      },
      {
        question: "Pour minimiser le coût total d'un emprunt, il faut viser:",
        options: [
          "Le taux d'intérêt le plus bas ET la période de remboursement la plus courte possible",
          "Le paiement mensuel le plus bas possible",
          "La période de remboursement la plus longue pour étaler les paiements",
          "Le montant emprunté le plus élevé pour avoir de la marge"
        ],
        correctIndex: 0,
        explanation: "Chaque mois supplémentaire de remboursement coûte des intérêts. La combinaison taux bas + durée courte minimise le coût total — même si les mensualités sont plus élevées."
      },
      {
        question: "Quel type de crédit offre généralement le taux d'intérêt LE PLUS BAS?",
        options: ["La carte de crédit", "La vente à tempérament", "Le prêt hypothécaire", "La marge de crédit personnelle"],
        correctIndex: 2,
        explanation: "Le prêt hypothécaire offre les taux les plus bas car il est garanti par un bien immobilier (la maison). Cette garantie réduit le risque pour le prêteur, qui peut offrir un meilleur taux."
      },
      {
        question: "Quel organisme compile les données pour ton dossier de crédit au Canada?",
        options: [
          "L'Agence du revenu du Canada (ARC)",
          "L'Office de la protection du consommateur",
          "TransUnion et Equifax",
          "La Banque du Canada"
        ],
        correctIndex: 2,
        explanation: "TransUnion et Equifax sont les deux agences d'évaluation du crédit au Canada. Elles compilent ton historique de paiements, tes dettes actuelles et d'autres informations financières."
      },
      {
        question: "Une marge de crédit HYPOTHÉCAIRE se distingue d'une marge personnelle parce que:",
        options: [
          "Son taux est plus élevé",
          "Elle est garantie par ta propriété immobilière, ce qui permet un taux plus bas",
          "Elle ne peut pas être utilisée pour des achats courants",
          "Elle est uniquement disponible aux personnes de plus de 35 ans"
        ],
        correctIndex: 1,
        explanation: "La marge hypothécaire est garantie par la valeur de ta maison. Cette garantie réduit le risque pour la banque, d'où des taux nettement plus bas que pour une marge personnelle non garantie."
      }
    ],

    ch4: [
      {
        question: "Qu'est-ce qu'un budget DÉFICITAIRE?",
        options: [
          "Un budget où les dépenses sont égales aux revenus",
          "Un budget où les dépenses dépassent les revenus",
          "Un budget où les revenus dépassent les dépenses",
          "Un budget qui ne prévoit pas de poste pour l'épargne"
        ],
        correctIndex: 1,
        explanation: "Un budget déficitaire signifie que les dépenses sont supérieures aux revenus. C'est une situation problématique qui mène souvent au recours au crédit pour couvrir les manques."
      },
      {
        question: "Le loyer est un exemple de dépense:",
        options: [
          "Variable — ça peut changer selon les mois",
          "Fixe — le montant est stable et prévisible",
          "Exceptionnelle — ça arrive rarement",
          "Optionnelle — on peut s'en passer"
        ],
        correctIndex: 1,
        explanation: "Le loyer est une dépense fixe : le montant est le même chaque mois et on ne peut pas s'y soustraire. D'autres exemples : assurances, paiements de prêts."
      },
      {
        question: "Combien de mois de dépenses essentielles recommande-t-on d'avoir dans un fonds d'urgence?",
        options: ["1 mois", "2 mois", "3 à 6 mois", "12 mois"],
        correctIndex: 2,
        explanation: "Les experts recommandent de constituer un fonds d'urgence équivalant à 3 à 6 mois de dépenses essentielles. Cela permet de faire face à une perte d'emploi ou un imprévu sans s'endetter."
      },
      {
        question: "Le surendettement, c'est quand:",
        options: [
          "On a plus d'une carte de crédit",
          "On doit rembourser un prêt hypothécaire",
          "On ne peut plus payer ses dettes sans sacrifier ses besoins essentiels",
          "On a un taux d'endettement supérieur à 30 %"
        ],
        correctIndex: 2,
        explanation: "Le surendettement est l'incapacité de faire face à ses obligations financières sans compromettre les dépenses essentielles (nourriture, logement, etc.)."
      },
      {
        question: "La FAILLITE PERSONNELLE est considérée comme:",
        options: [
          "La première option à envisager en cas de dettes",
          "Un dernier recours aux conséquences très négatives sur le dossier de crédit",
          "Une procédure simple et sans conséquence à long terme",
          "Une procédure provinciale administrée par la Cour du Québec"
        ],
        correctIndex: 1,
        explanation: "La faillite est un dernier recours. Elle libère de la plupart des dettes mais affecte très négativement le dossier de crédit pour plusieurs années et peut entraîner la saisie de certains actifs."
      },
      {
        question: "Julie gagne 2 500 $/mois et ses dépenses totales s'élèvent à 2 200 $/mois. Son budget est:",
        options: [
          "Déficitaire de 300 $",
          "Équilibré",
          "Positif (surplus) de 300 $",
          "Impossible à déterminer sans plus d'informations"
        ],
        correctIndex: 2,
        explanation: "2 500 $ - 2 200 $ = 300 $ de surplus. Un budget positif signifie que les revenus dépassent les dépenses — Julie a 300 $ disponibles pour l'épargne ou les imprévus."
      },
      {
        question: "La PROPOSITION DE CONSOMMATEUR se distingue de la faillite parce qu'elle:",
        options: [
          "Permet de conserver ses biens et de négocier un remboursement partiel de ses dettes",
          "Libère complètement de toutes les dettes",
          "N'a aucun impact sur le dossier de crédit",
          "Est administrée par la Cour du Québec et non par un syndic"
        ],
        correctIndex: 0,
        explanation: "La proposition de consommateur permet de négocier avec ses créanciers pour rembourser une partie des dettes sur un plan étalé jusqu'à 5 ans, tout en conservant généralement ses biens."
      },
      {
        question: "Selon les données du cours, le ratio d'endettement des ménages québécois est d'environ:",
        options: [
          "80 % du revenu disponible",
          "145 % du revenu disponible",
          "200 % du revenu disponible",
          "310 % du revenu disponible"
        ],
        correctIndex: 1,
        explanation: "Le ratio d'endettement québécois est d'environ 145 %, soit inférieur à la moyenne canadienne d'environ 180 %. Cela signifie que les Québécois doivent 1,45 $ pour chaque dollar de revenu disponible."
      },
      {
        question: "L'épargne devrait idéalement être traitée comme:",
        options: [
          "Ce qu'il reste après avoir tout dépensé",
          "Un luxe réservé aux gens à revenus élevés",
          "Une dépense prioritaire planifiée au même titre que le loyer",
          "Un montant qu'on dépose seulement à la fin de l'année"
        ],
        correctIndex: 2,
        explanation: "Traiter l'épargne comme une dépense prioritaire garantit qu'elle ne sera pas sacrifiée en cas de manque. La règle d'or : épargne D'ABORD, dépense ensuite avec ce qui reste."
      },
      {
        question: "Parmi ces dépenses, laquelle est VARIABLE?",
        options: [
          "Le paiement mensuel d'un prêt auto",
          "Le loyer d'un appartement",
          "La prime d'assurance automobile annuelle",
          "Les sorties au restaurant"
        ],
        correctIndex: 3,
        explanation: "Les sorties au restaurant varient d'un mois à l'autre et peuvent être réduites si le budget est serré. Le loyer, le prêt auto et l'assurance sont des dépenses fixes et prévisibles."
      }
    ],

    ch5: [
      {
        question: "Selon la règle du 72, combien d'années faut-il pour doubler un placement à un taux d'intérêt de 6 %?",
        options: ["6 ans", "12 ans", "18 ans", "24 ans"],
        correctIndex: 1,
        explanation: "Règle du 72 : 72 ÷ 6 = 12 ans. C'est une méthode simple pour estimer le temps nécessaire pour doubler un investissement selon son taux de rendement."
      },
      {
        question: "La principale différence entre l'intérêt SIMPLE et l'intérêt COMPOSÉ est:",
        options: [
          "Le simple est plus élevé que le composé",
          "Le composé est calculé sur le capital initial PLUS les intérêts déjà accumulés",
          "Le simple s'applique aux actions, le composé aux obligations",
          "Il n'y a aucune différence significative sur 10 ans"
        ],
        correctIndex: 1,
        explanation: "L'intérêt composé est calculé sur un capital augmenté des intérêts déjà encaissés. Les intérêts génèrent eux-mêmes des intérêts, ce qui accélère la croissance du capital dans le temps."
      },
      {
        question: "Le CELI (Compte d'épargne libre d'impôt) est particulièrement avantageux parce que:",
        options: [
          "Les cotisations sont déductibles du revenu imposable",
          "Il n'y a pas de limite de cotisation",
          "Tous les gains (intérêts, dividendes, plus-values) y croissent à l'abri de l'impôt",
          "Il est disponible dès l'âge de 16 ans"
        ],
        correctIndex: 2,
        explanation: "Le CELI permet à ton argent de fructifier sans jamais payer d'impôt sur les gains. Les retraits sont aussi libres d'impôt, contrairement au REER où les retraits sont imposés."
      },
      {
        question: "Un FNB (Fonds négocié en bourse), c'est:",
        options: [
          "Un compte bancaire à taux garanti",
          "Un panier diversifié d'actions ou d'obligations négocié en bourse, à faibles frais",
          "Un prêt accordé par une institution financière",
          "Une devise étrangère qu'on achète pour spéculer"
        ],
        correctIndex: 1,
        explanation: "Un FNB est un 'panier' qui regroupe plusieurs titres (actions, obligations) en un seul produit. Il offre une diversification instantanée à faibles coûts — idéal pour l'investisseur débutant."
      },
      {
        question: "Dans l'exemple du cours, Ana commence à investir à 25 ans et Tom à 55 ans. Les deux investissent le même montant total (80 000 $). Qui accumule le plus à 65 ans?",
        options: [
          "Tom, car il investit des sommes plus importantes chaque année",
          "Ana, grâce à l'effet de l'intérêt composé sur une plus longue période",
          "Ils ont le même résultat puisque le total investi est identique",
          "Ça dépend uniquement du taux de rendement obtenu"
        ],
        correctIndex: 1,
        explanation: "Ana accumule 253 679 $ contre 105 654 $ pour Tom, malgré le même total investi. L'intérêt composé sur 40 ans vs 10 ans fait une différence énorme — le temps est l'actif le plus précieux en investissement."
      },
      {
        question: "Quel profil d'investisseur a la plus FAIBLE tolérance au risque?",
        options: [
          "L'investisseur audacieux",
          "L'investisseur équilibré",
          "L'investisseur prudent",
          "Tous ont la même tolérance au risque"
        ],
        correctIndex: 2,
        explanation: "L'investisseur prudent (souvent jeune ou retraité) préfère des placements sûrs même si le rendement est plus faible. Il ne veut pas risquer de perdre son capital."
      },
      {
        question: "Un CPG (Certificat de placement garanti) est caractérisé par:",
        options: [
          "Un rendement élevé et un risque nul",
          "Un risque nul et un rendement généralement faible",
          "Un risque élevé mais un rendement potentiellement très élevé",
          "Une bonne convertibilité et un rendement moyen"
        ],
        correctIndex: 1,
        explanation: "Le CPG est garanti — ton capital est protégé. En contrepartie, le rendement est généralement faible. C'est la sécurité maximale, mais peu adapté pour faire fructifier l'argent à long terme."
      },
      {
        question: "La CONVERTIBILITÉ (ou liquidité) d'un placement, c'est:",
        options: [
          "Sa capacité à générer un rendement élevé",
          "La possibilité de transformer rapidement le placement en argent comptant",
          "Le niveau de risque associé au placement",
          "La facilité d'investir dans ce type de placement"
        ],
        correctIndex: 1,
        explanation: "La convertibilité mesure la rapidité avec laquelle on peut accéder à son argent. Un compte d'épargne est très liquide; un CPG fermé ou un immeuble sont peu liquides."
      },
      {
        question: "Le REER (Régime enregistré d'épargne-retraite) diffère principalement du CELI parce que:",
        options: [
          "Le REER n'est pas disponible pour les actions",
          "Les cotisations REER sont déductibles du revenu imposable, mais les retraits sont imposés",
          "Le REER est disponible dès l'âge de 16 ans",
          "Il n'y a pas de limite de cotisation au REER"
        ],
        correctIndex: 1,
        explanation: "Le REER réduit ton impôt aujourd'hui (les cotisations sont déductibles) mais les retraits à la retraite sont imposés. Le CELI, lui, n'offre pas de déduction mais les retraits sont toujours libres d'impôt."
      },
      {
        question: "Quel véhicule de placement est le plus approprié pour une personne de 17 ans qui veut commencer à épargner pour ses études?",
        options: [
          "Le REER — pour maximiser les déductions fiscales",
          "Le CELI — sauf qu'il faut attendre 18 ans; en attendant, un compte épargne",
          "Les actions spéculatives — pour maximiser les gains rapidement",
          "Les obligations d'entreprises à 30 ans d'échéance"
        ],
        correctIndex: 1,
        explanation: "Le CELI est idéal pour les jeunes, mais il faut avoir 18 ans pour cotiser. À 17 ans, un compte épargne est la solution. Dès 18 ans, le CELI devient la priorité pour faire fructifier l'épargne à l'abri de l'impôt."
      }
    ]
  };

  return (banks[chapterId] || []).sort(() => Math.random() - 0.5).slice(0, 10);
}

init();
