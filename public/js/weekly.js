// weekly.js — Logique de la semaine RPG ÉduFin
// Gère : chargement du profil, calcul du temps, emploi, événement, sauvegarde

import { db, auth } from './firebase-init.js';
import {
  doc, getDoc, setDoc, updateDoc, collection, getDocs
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

import {
  JOBS, JOBS_BY_ID,
  calcSleepUnits, calcFreeTime, getAvailableJobs,
  ENERGY_LABELS
} from './jobs-db.js';

import {
  EVENTS, EVENTS_BY_ID,
  GUARANTEED_BY_WEEK, drawWeeklyEvent, autoResolveEvent
} from './events-db.js';

// ─── CONSTANTES ────────────────────────────────────────────────────────────
const TOTAL_UNITS  = 100;
const SCHOOL_UNITS = 30;
const XP_PER_LEVEL = 1000;

// Activités de temps libre disponibles
export const FREE_TIME_ACTIVITIES = [
  {
    id: 'study_chapter',
    label: 'Étudier un chapitre',
    emoji: '📖',
    cost: 10,
    description: 'Avance dans les modules du cours.',
    effect: { xp: +50, unlocksModule: true },
    maxPerWeek: 1
  },
  {
    id: 'read_learn',
    label: 'Lire / apprendre',
    emoji: '📚',
    cost: 5,
    description: '+1 Connaissances après 4 semaines consécutives.',
    effect: { statProgress: { stat: 'connaissances', progressPerWeek: 1, weeksRequired: 4 } },
    maxPerWeek: 2
  },
  {
    id: 'sport',
    label: 'Faire du sport',
    emoji: '🏃',
    cost: 6,
    description: '+1 Santé après 4 semaines consécutives.',
    effect: { statProgress: { stat: 'sante', progressPerWeek: 1, weeksRequired: 4 } },
    maxPerWeek: 2
  },
  {
    id: 'socialize',
    label: 'Sortir / socialiser',
    emoji: '🎉',
    cost: 5,
    moneyCost: 20,
    description: '+1 Influence temporaire (3 semaines). Coûte ~20$.',
    effect: { stats: { influence: { temp: +1, weeks: 3 } } },
    maxPerWeek: 2
  },
  {
    id: 'organize',
    label: 'S\'organiser / planifier',
    emoji: '🗓️',
    cost: 4,
    description: '+1 Organisation après 4 semaines consécutives.',
    effect: { statProgress: { stat: 'organisation', progressPerWeek: 1, weeksRequired: 4 } },
    maxPerWeek: 1
  },
  {
    id: 'practice_trade',
    label: 'Pratiquer un métier',
    emoji: '🔧',
    cost: 8,
    description: '+1 Habiletés après 4 semaines consécutives.',
    requiresStat: { habiletes: 3 },
    effect: { statProgress: { stat: 'habiletes', progressPerWeek: 1, weeksRequired: 4 } },
    maxPerWeek: 1
  },
  {
    id: 'scroll_phone',
    label: 'Niaiser sur son cell',
    emoji: '📱',
    cost: 3,
    description: 'Aucun bonus. −1 Organisation si tu le fais trop souvent.',
    effect: { trap: { stat: 'organisation', triggerIfWeeks: 3, amount: -1 } },
    isTrap: true,
    maxPerWeek: 3
  },
  {
    id: 'watch_series',
    label: 'Regarder des séries',
    emoji: '📺',
    cost: 4,
    description: 'Aucun bonus. −1 Santé si tu le fais trop souvent.',
    effect: { trap: { stat: 'sante', triggerIfWeeks: 3, amount: -1 } },
    isTrap: true,
    maxPerWeek: 2
  }
];

// ─── ÉTAT GLOBAL ───────────────────────────────────────────────────────────
let currentUser  = null;
let playerData   = null;
let weeklyState  = null;  // État de la semaine en cours

// ─── INITIALISATION ────────────────────────────────────────────────────────
export async function initWeekly() {
  return new Promise((resolve, reject) => {
    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        window.location.href = '../index.html';
        return;
      }
      currentUser = user;
      try {
        await loadPlayerData();
        resolve(playerData);
      } catch(e) {
        reject(e);
      }
    });
  });
}

// ─── CHARGER LE PROFIL JOUEUR ──────────────────────────────────────────────
async function loadPlayerData() {
  const snap = await getDoc(doc(db, 'users', currentUser.uid));
  if (!snap.exists()) throw new Error('Profil introuvable');

  const d = snap.data();

  playerData = {
    uid:              currentUser.uid,
    displayName:      d.displayName   || 'Élève',
    celiBalance:      d.celiBalance   || 0,
    rpgLevel:         d.rpgLevel      || 1,
    rpgXP:            d.rpgXP         || 0,
    rpgAge:           d.rpgAge        || 17,
    rpgWeek:          d.rpgWeek       || 1,
    rpgStats:         d.rpgStats      || { sante:5, connaissances:5, habiletes:5, organisation:5, influence:5 },
    rpgJob:           d.rpgJob        || 'none',
    rpgJobWeeks:      d.rpgJobWeeks   || 0,        // Semaines dans l'emploi actuel
    rpgJobChangeable: d.rpgJobChangeable ?? true,  // Peut-il changer d'emploi?
    assets:           d.assets        || { voiture: null, cellulaire: null },
    weeklyEvent:      d.weeklyEvent   || null,      // Événement en cours
    weeklyEventDone:  d.weeklyEventDone || false,   // L'élève a-t-il fait son choix?
    weeklyActivities: d.weeklyActivities || [],     // Activités choisies cette semaine
    activityProgress: d.activityProgress || {},     // Suivi des semaines consécutives
    ch5Completed:     d.ch5Completed  || false,
    rankDelta:        d.rankDelta     || null,
    // Champs calculés
    lastVisit:        d.lastVisit     || null,
    absenceWeeks:     d.absenceWeeks  || 0
  };

  // Calculer l'état de la semaine
  weeklyState = buildWeeklyState();
}

// ─── CONSTRUIRE L'ÉTAT DE LA SEMAINE ──────────────────────────────────────
function buildWeeklyState() {
  const job    = JOBS_BY_ID[playerData.rpgJob] || JOBS_BY_ID['none'];
  const stats  = playerData.rpgStats;

  const sleepUnits = calcSleepUnits(job, stats);
  const freeUnits  = calcFreeTime(job, stats);

  // Événement de la semaine — tiré si absent, sinon garde celui en cours
  let event = null;
  if (playerData.weeklyEvent && !playerData.weeklyEventDone) {
    event = EVENTS_BY_ID[playerData.weeklyEvent] || null;
  }
  if (!event) {
    event = drawWeeklyEvent({
      rpgStats:       stats,
      job:            playerData.rpgJob,
      sameJobWeeks:   playerData.rpgJobWeeks,
      transport:      playerData.assets?.voiture?.type || 'pied',
      hasCar:         !!playerData.assets?.voiture,
      carYear:        playerData.assets?.voiture?.year || null,
      hasRecentPhone: !!playerData.assets?.cellulaire,
      hasRecentOPhone: playerData.assets?.cellulaire?.brand === 'OPhone',
      hasUsedPhone:   playerData.assets?.cellulaire?.condition === 'usagé',
      ch5Completed:   playerData.ch5Completed,
      weekNumber:     playerData.rpgWeek
    });
  }

  return {
    job,
    sleepUnits,
    freeUnits,
    event,
    totalUnits:  TOTAL_UNITS,
    schoolUnits: SCHOOL_UNITS,
    workUnits:   job.timeUnitsUsed || 0,
    usedFreeUnits:    0,
    selectedActivities: [],
    pendingEffects:     []
  };
}

// ─── GETTERS PUBLICS ───────────────────────────────────────────────────────
export function getPlayerData()  { return playerData; }
export function getWeeklyState() { return weeklyState; }
export function getCurrentJob()  { return weeklyState?.job || JOBS_BY_ID['none']; }
export function getCurrentEvent(){ return weeklyState?.event || null; }

export function getRemainingFreeUnits() {
  if (!weeklyState) return 0;
  const used = weeklyState.selectedActivities
    .reduce((sum, a) => sum + (FREE_TIME_ACTIVITIES.find(x => x.id === a)?.cost || 0), 0);
  return weeklyState.freeUnits - used;
}

// ─── CHANGER D'EMPLOI ─────────────────────────────────────────────────────
export function canChangeJob() {
  if (!playerData) return false;
  // Première semaine → toujours possible
  if (playerData.rpgWeek === 1) return true;
  // Contrat minimum respecté?
  return playerData.rpgJobChangeable === true;
}

export async function selectJob(jobId) {
  if (!canChangeJob()) {
    throw new Error('Contrat en cours — tu ne peux pas changer d\'emploi cette semaine.');
  }
  const job = JOBS_BY_ID[jobId];
  if (!job) throw new Error('Emploi inconnu : ' + jobId);

  // Vérifier les exigences
  const available = getAvailableJobs(playerData.rpgStats);
  if (!available.find(j => j.id === jobId)) {
    throw new Error('Tu ne remplis pas les conditions pour cet emploi.');
  }

  // Mettre à jour l'état local
  playerData.rpgJob    = jobId;
  playerData.rpgJobWeeks = 0;
  // Contrat minimum — ne peut pas changer avant X semaines
  playerData.rpgJobChangeable = false;

  // Reconstruire l'état de la semaine
  weeklyState = buildWeeklyState();
  return job;
}

// ─── CHOISIR UNE ACTIVITÉ DE TEMPS LIBRE ──────────────────────────────────
export function toggleActivity(activityId) {
  const activity = FREE_TIME_ACTIVITIES.find(a => a.id === activityId);
  if (!activity) return { success: false, message: 'Activité inconnue.' };

  const selected = weeklyState.selectedActivities;
  const idx = selected.indexOf(activityId);

  if (idx >= 0) {
    // Désélectionner
    weeklyState.selectedActivities.splice(idx, 1);
    return { success: true, action: 'removed' };
  }

  // Vérifier le temps restant
  if (getRemainingFreeUnits() < activity.cost) {
    return { success: false, message: `Pas assez de temps libre. (Coût : ${activity.cost} unités)` };
  }

  // Vérifier les prérequis de stats
  if (activity.requiresStat) {
    const [stat, min] = Object.entries(activity.requiresStat)[0];
    if ((playerData.rpgStats[stat] || 0) < min) {
      return { success: false, message: `Requiert ${stat} ${min}+` };
    }
  }

  // Vérifier le maximum hebdomadaire
  const count = selected.filter(a => a === activityId).length;
  if (count >= activity.maxPerWeek) {
    return { success: false, message: `Maximum ${activity.maxPerWeek}× par semaine.` };
  }

  weeklyState.selectedActivities.push(activityId);
  return { success: true, action: 'added' };
}

// ─── RÉSOUDRE L'ÉVÉNEMENT ─────────────────────────────────────────────────
export function resolveEvent(choiceId) {
  const event  = weeklyState.event;
  if (!event) return null;

  const choice = event.choices.find(c => c.id === choiceId);
  if (!choice) return null;

  weeklyState.pendingEffects.push({
    source: 'event',
    eventId: event.id,
    choiceId,
    consequences: choice.consequences
  });

  playerData.weeklyEventDone = true;
  return choice;
}

// ─── VALIDER ET SOUMETTRE LA SEMAINE ──────────────────────────────────────
export async function submitWeek() {
  if (!playerData || !weeklyState) throw new Error('Données manquantes');

  const effects = computeAllEffects();
  await applyAndSave(effects);
  return effects;
}

// ─── CALCULER TOUS LES EFFETS DE LA SEMAINE ───────────────────────────────
function computeAllEffects() {
  const effects = {
    moneyDelta:    0,
    xpDelta:       0,
    statDeltas:    {},
    statTemp:      [],
    statProgress:  {},
    messages:      [],
    newLevel:      null,
    newJobWeeks:   playerData.rpgJobWeeks + 1,
    jobChangeable: false
  };

  const job   = weeklyState.job;
  const stats = playerData.rpgStats;

  // 1. Revenu de l'emploi
  if (job.salaryPerWeek > 0) {
    effects.moneyDelta += job.salaryPerWeek;
    effects.messages.push({
      type: 'income',
      text: `Salaire de la semaine : +${job.salaryPerWeek} $`,
      amount: job.salaryPerWeek
    });

    // Pourboires aléatoires (serveur)
    if (job.weeklyBonus?.tipsMin != null) {
      const tips = Math.floor(
        Math.random() * (job.weeklyBonus.tipsMax - job.weeklyBonus.tipsMin + 1)
      ) + job.weeklyBonus.tipsMin;
      effects.moneyDelta += tips;
      effects.messages.push({
        type: 'tips',
        text: `Pourboires de la semaine : +${tips} $`,
        amount: tips
      });
    }
  }

  // 2. Points libres (ne pas travailler)
  if (job.weeklyBonus?.freePoints) {
    effects.freePointsAvailable = job.weeklyBonus.freePoints;
    effects.messages.push({
      type: 'freepoints',
      text: job.weeklyBonus.freePointsLabel
    });
  }

  // 3. Effets des activités de temps libre
  for (const actId of weeklyState.selectedActivities) {
    const activity = FREE_TIME_ACTIVITIES.find(a => a.id === actId);
    if (!activity) continue;

    // Coût en argent (ex: socialiser)
    if (activity.moneyCost) {
      effects.moneyDelta -= activity.moneyCost;
      effects.messages.push({
        type: 'expense',
        text: `${activity.label} : −${activity.moneyCost} $`,
        amount: -activity.moneyCost
      });
    }

    // Progression de stat à long terme
    if (activity.effect?.statProgress) {
      const sp = activity.effect.statProgress;
      effects.statProgress[sp.stat] = (effects.statProgress[sp.stat] || 0) + 1;
    }

    // Stats temporaires (socialiser)
    if (activity.effect?.stats) {
      Object.entries(activity.effect.stats).forEach(([stat, change]) => {
        if (change.temp) {
          effects.statTemp.push({ stat, amount: change.temp, weeks: change.weeks });
        }
        if (change.perm) {
          effects.statDeltas[stat] = (effects.statDeltas[stat] || 0) + change.perm;
        }
      });
    }

    // XP pour les activités productives
    if (!activity.isTrap) {
      effects.xpDelta += 15;
    }
  }

  // 4. Effets de l'événement résolu
  for (const pending of weeklyState.pendingEffects) {
    const cons = pending.consequences;
    if (!cons) continue;

    if (cons.money)     effects.moneyDelta += cons.money;
    if (cons.xp)        effects.xpDelta    += cons.xp;

    if (cons.stats) {
      Object.entries(cons.stats).forEach(([stat, change]) => {
        if (change.perm) {
          effects.statDeltas[stat] = (effects.statDeltas[stat] || 0) + change.perm;
        }
        if (change.temp) {
          effects.statTemp.push({ stat, amount: change.temp, weeks: change.weeks });
        }
      });
    }

    if (cons.moneyLost === 'weekSalary') {
      effects.moneyDelta -= job.salaryPerWeek;
      effects.messages.push({
        type: 'expense',
        text: `Maladie — salaire perdu : −${job.salaryPerWeek} $`,
        amount: -job.salaryPerWeek
      });
    }

    if (cons.message) {
      effects.messages.push({ type: 'event', text: cons.message });
    }
  }

  // 5. Progression XP et niveau
  const newXP = (playerData.rpgXP || 0) + effects.xpDelta;
  const newLevel = Math.floor(newXP / XP_PER_LEVEL) + 1;
  if (newLevel > playerData.rpgLevel) {
    effects.newLevel = newLevel;
    effects.messages.push({
      type: 'levelup',
      text: `🎉 Niveau ${newLevel} atteint!`
    });
  }

  // 6. Bonus long terme de l'emploi (après N semaines consécutives)
  if (job.longTermBonus && effects.newJobWeeks >= job.longTermBonus.weeksRequired) {
    const bonus = job.longTermBonus;
    if (effects.newJobWeeks % bonus.weeksRequired === 0) {
      effects.statDeltas[bonus.stat] = (effects.statDeltas[bonus.stat] || 0) + bonus.amount;
      effects.messages.push({
        type: 'bonus',
        text: `Bonus emploi : +${bonus.amount} ${capitalize(bonus.stat)} (${bonus.weeksRequired} sem. consécutives)`
      });
    }
  }

  // 7. Contrat d'emploi — peut-il changer la semaine prochaine?
  const minWeeks = job.contractMinWeeks || 3;
  effects.jobChangeable = effects.newJobWeeks >= minWeeks;

  return effects;
}

// ─── APPLIQUER ET SAUVEGARDER DANS FIRESTORE ──────────────────────────────
async function applyAndSave(effects) {
  const newStats    = { ...playerData.rpgStats };
  const newBalance  = playerData.celiBalance + effects.moneyDelta;
  const newXP       = (playerData.rpgXP || 0) + effects.xpDelta;
  const newLevel    = effects.newLevel || playerData.rpgLevel;
  const newWeek     = playerData.rpgWeek + 1;

  // Appliquer les deltas de stats permanentes
  Object.entries(effects.statDeltas).forEach(([stat, delta]) => {
    newStats[stat] = Math.min(10, Math.max(1, (newStats[stat] || 5) + delta));
  });

  // Appliquer la progression long terme des activités
  const newProgress = { ...playerData.activityProgress };
  Object.entries(effects.statProgress).forEach(([stat, progress]) => {
    newProgress[stat] = (newProgress[stat] || 0) + progress;
    // Déblocage après 4 semaines consécutives
    const activity = FREE_TIME_ACTIVITIES.find(a =>
      a.effect?.statProgress?.stat === stat
    );
    const required = activity?.effect?.statProgress?.weeksRequired || 4;
    if (newProgress[stat] >= required) {
      newStats[stat] = Math.min(10, (newStats[stat] || 5) + 1);
      newProgress[stat] = 0; // Remise à zéro du compteur
      effects.messages.push({
        type: 'statup',
        text: `+1 ${capitalize(stat)} permanent! (${required} semaines consécutives)`
      });
    }
  });

  // Préparer les stats temporaires (stocker pour affichage futur)
  const existingTemp = playerData.tempStats || [];
  const newTemp = [...existingTemp, ...effects.statTemp.map(t => ({
    ...t,
    weeksRemaining: t.weeks,
    addedWeek: playerData.rpgWeek
  }))];

  // Tick des stats temporaires (réduire d'1 semaine)
  const updatedTemp = newTemp
    .map(t => ({ ...t, weeksRemaining: t.weeksRemaining - 1 }))
    .filter(t => t.weeksRemaining > 0);

  // Construire l'objet de mise à jour Firestore
  const updateData = {
    celiBalance:        newBalance,
    rpgXP:              newXP,
    rpgLevel:           newLevel,
    rpgWeek:            newWeek,
    rpgStats:           newStats,
    rpgJob:             playerData.rpgJob,
    rpgJobWeeks:        effects.newJobWeeks,
    rpgJobChangeable:   effects.jobChangeable,
    activityProgress:   newProgress,
    tempStats:          updatedTemp,
    weeklyEvent:        null,           // Reset — nouvel événement la semaine prochaine
    weeklyEventDone:    false,
    weeklyActivities:   weeklyState.selectedActivities,
    lastVisit:          new Date().toISOString(),
    absenceWeeks:       0               // Reset puisqu'il a joué
  };

  await updateDoc(doc(db, 'users', currentUser.uid), updateData);

  // Mettre à jour playerData local
  Object.assign(playerData, updateData);
}

// ─── GESTION DE L'ABSENTÉISME ─────────────────────────────────────────────
// Appelé au chargement si lastVisit > 7 jours
export async function handleAbsence(weeksAbsent) {
  if (!playerData || weeksAbsent <= 0) return;

  const job = JOBS_BY_ID[playerData.rpgJob] || JOBS_BY_ID['none'];
  let salaryMultiplier = 1;
  let lostJob = false;

  if (weeksAbsent >= 3) {
    lostJob = true;
    salaryMultiplier = 0;
  } else if (weeksAbsent === 2) {
    salaryMultiplier = 0.6;
  } else if (weeksAbsent === 1) {
    salaryMultiplier = 0.8;
  }

  const autoSalary = Math.round(job.salaryPerWeek * salaryMultiplier * weeksAbsent);
  const newBalance  = playerData.celiBalance + autoSalary;
  const newWeek     = playerData.rpgWeek + weeksAbsent;

  const updateData = {
    celiBalance:  newBalance,
    rpgWeek:      newWeek,
    absenceWeeks: weeksAbsent,
    lastVisit:    new Date().toISOString()
  };

  if (lostJob) {
    updateData.rpgJob          = 'none';
    updateData.rpgJobWeeks     = 0;
    updateData.rpgJobChangeable = true;
  }

  await updateDoc(doc(db, 'users', currentUser.uid), updateData);
  Object.assign(playerData, updateData);

  return {
    weeksAbsent,
    autoSalary,
    lostJob,
    messages: lostJob
      ? [`Tu as été absent·e ${weeksAbsent} semaines. Tu as perdu ton emploi, mais ton épargne est intacte.`]
      : [`Tu as été absent·e ${weeksAbsent} semaine(s). Revenu automatique versé : +${autoSalary} $.`]
  };
}

// ─── UTILITAIRES ────────────────────────────────────────────────────────────
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export {
  JOBS, JOBS_BY_ID, FREE_TIME_ACTIVITIES,
  EVENTS, EVENTS_BY_ID,
  getAvailableJobs, calcSleepUnits, calcFreeTime,
  ENERGY_LABELS
};
