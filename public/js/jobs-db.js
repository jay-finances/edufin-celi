// jobs-db.js — Catalogue des emplois disponibles dans ÉduFin RPG
// Toutes les valeurs monétaires sont en dollars canadiens (CAD)
// Salaire minimum QC 2025 : 16,10$/h × ~10,5h/sem = ~169$/sem brut
// Les salaires affichés sont nets (après déductions simplifiées ~15%)

export const JOBS = [

  // ─── NE PAS TRAVAILLER ────────────────────────────────────────────────────
  {
    id: 'none',
    label: 'Ne pas travailler',
    emoji: '🌿',
    description: 'Tu consacres ta semaine à toi-même. Zéro revenu, mais du temps pour progresser.',
    category: 'temps-libre',
    salaryPerWeek: 0,
    energyLevel: 'nulle',
    sleepUnits: 15,           // Sommeil minimal — tu récupères bien
    hoursPerWeek: 0,
    timeUnitsUsed: 0,         // Aucun temps pris par le travail
    requirements: {},         // Aucune exigence
    weeklyBonus: {            // Bonus distribués librement par l'élève
      freePoints: 3,          // 3 points à répartir entre Santé / Connaissances / Org
      freePointsLabel: 'Investis dans toi-même : répartis 3 points entre Santé, Connaissances et Organisation.'
    },
    longTermBonus: null,
    contractMinWeeks: 1,      // Peut changer d'avis dès la semaine suivante
    description_long: 'Pas de revenu cette semaine, mais tu gagnes du temps pour te développer. Certains élèves utilisent ces semaines stratégiquement pour débloquer un meilleur emploi plus tôt.'
  },

  // ─── EMPLOIS FAIBLE ÉNERGIE ───────────────────────────────────────────────
  {
    id: 'caissier_epicerie',
    label: 'Caissier·ière — épicerie',
    emoji: '🛒',
    description: 'Rythme calme, horaires fixes. Idéal pour s\'organiser.',
    category: 'commerce',
    salaryPerWeek: 168,
    energyLevel: 'faible',
    sleepUnits: 18,
    hoursPerWeek: 10.5,
    timeUnitsUsed: 12,
    requirements: { organisation: 3 },
    weeklyBonus: null,
    longTermBonus: null,
    contractMinWeeks: 3,
    perks: ['Horaires prévisibles', 'Peu de stress physique'],
    description_long: 'Le classique emploi étudiant. Peu exigeant physiquement, parfait pour quelqu\'un qui veut garder de l\'énergie pour ses études ou ses activités.'
  },

  {
    id: 'prepose_hotel',
    label: 'Préposé·e — hôtel',
    emoji: '🏨',
    description: 'Service à la clientèle dans un environnement hôtelier.',
    category: 'hotellerie',
    salaryPerWeek: 165,
    energyLevel: 'faible',
    sleepUnits: 18,
    hoursPerWeek: 10.5,
    timeUnitsUsed: 12,
    requirements: { organisation: 4, influence: 4 },
    weeklyBonus: null,
    longTermBonus: null,
    contractMinWeeks: 3,
    perks: ['Environnement professionnel', 'Contacts utiles'],
    description_long: 'Requiert un peu plus de sens des relations, mais l\'ambiance est professionnelle. Bon pour développer l\'influence à long terme.'
  },

  {
    id: 'vendeur_boutique',
    label: 'Vendeur·se — boutique',
    emoji: '👕',
    description: 'Vente au détail. L\'influence est ta force ici.',
    category: 'commerce',
    salaryPerWeek: 175,
    energyLevel: 'faible',
    sleepUnits: 18,
    hoursPerWeek: 10.5,
    timeUnitsUsed: 12,
    requirements: { influence: 5, connaissances: 3 },
    weeklyBonus: null,
    longTermBonus: { stat: 'influence', weeksRequired: 4, amount: 1 },
    contractMinWeeks: 3,
    perks: ['Développe l\'influence', 'Rabais employé possible'],
    description_long: 'Si tu es à l\'aise avec les gens, c\'est payant et enrichissant. L\'exposition constante aux techniques de vente développe ton influence naturellement.'
  },

  // ─── EMPLOIS ÉNERGIE MOYENNE ──────────────────────────────────────────────
  {
    id: 'serveur_resto',
    label: 'Serveur·se — resto rapide',
    emoji: '🍔',
    description: 'Rythme soutenu, pourboires variables. Payant mais fatiguant.',
    category: 'restauration',
    salaryPerWeek: 180,
    energyLevel: 'moyenne',
    sleepUnits: 22,
    hoursPerWeek: 10.5,
    timeUnitsUsed: 14,
    requirements: { sante: 4, influence: 3 },
    weeklyBonus: {
      tipsMin: 10,
      tipsMax: 45,
      tipsLabel: 'Pourboires de la semaine'
    },
    longTermBonus: null,
    contractMinWeeks: 3,
    perks: ['Pourboires aléatoires chaque semaine', 'Environnement dynamique'],
    description_long: 'Le salaire de base est correct, mais les pourboires font la différence. Une semaine peut rapporter 10$ de plus, une autre 45$. C\'est aléatoire — comme dans la vraie vie.'
  },

  {
    id: 'commis_entrepot',
    label: 'Commis d\'entrepôt',
    emoji: '📦',
    description: 'Travail physique, charge et déplace. Pas glamour, mais honnête.',
    category: 'logistique',
    salaryPerWeek: 172,
    energyLevel: 'moyenne',
    sleepUnits: 22,
    hoursPerWeek: 10.5,
    timeUnitsUsed: 14,
    requirements: { sante: 5, habiletes: 3 },
    weeklyBonus: null,
    longTermBonus: null,
    contractMinWeeks: 3,
    perks: ['Stabilité', 'Pas de contact client'],
    description_long: 'Si tu préfères le travail concret au service client, l\'entrepôt est pour toi. Moins de stress social, plus de travail physique.'
  },

  {
    id: 'aide_cuisinier',
    label: 'Aide-cuisinier·ière',
    emoji: '🍳',
    description: 'Cuisine professionnelle. Apprends vite, travaille fort.',
    category: 'restauration',
    salaryPerWeek: 170,
    energyLevel: 'moyenne',
    sleepUnits: 22,
    hoursPerWeek: 10.5,
    timeUnitsUsed: 14,
    requirements: { habiletes: 4, organisation: 3 },
    weeklyBonus: null,
    longTermBonus: { stat: 'habiletes', weeksRequired: 4, amount: 1 },
    contractMinWeeks: 3,
    perks: ['Développe les habiletés', 'Compétence réelle utile'],
    description_long: 'La cuisine professionnelle demande de la rigueur et de la rapidité. Ceux qui tiennent développent de vraies habiletés pratiques.'
  },

  {
    id: 'animateur_loisirs',
    label: 'Animateur·trice — camp/loisirs',
    emoji: '🏕️',
    description: 'Animation de groupes. Créatif, social, enrichissant.',
    category: 'loisirs',
    salaryPerWeek: 162,
    energyLevel: 'moyenne',
    sleepUnits: 22,
    hoursPerWeek: 10.5,
    timeUnitsUsed: 14,
    requirements: { influence: 5, connaissances: 4 },
    weeklyBonus: null,
    longTermBonus: { stat: 'influence', weeksRequired: 4, amount: 1 },
    contractMinWeeks: 3,
    perks: ['Développe influence ET connaissances', 'Environnement positif'],
    description_long: 'Le salaire est légèrement inférieur mais les bénéfices en développement personnel sont uniques. Idéal pour ceux qui visent des emplois relationnels.'
  },

  // ─── EMPLOIS ÉNERGIE ÉLEVÉE ───────────────────────────────────────────────
  {
    id: 'livreur_velo',
    label: 'Livreur·se à vélo/pied',
    emoji: '🚲',
    description: 'Cardio forcé. Le mieux payé des emplois accessibles — mais tu le sens.',
    category: 'livraison',
    salaryPerWeek: 190,
    energyLevel: 'elevee',
    sleepUnits: 28,
    hoursPerWeek: 10.5,
    timeUnitsUsed: 16,
    requirements: { sante: 6 },
    weeklyBonus: null,
    longTermBonus: { stat: 'sante', weeksRequired: 4, amount: 1 },
    contractMinWeeks: 3,
    perks: ['Meilleur salaire accessible', 'Développe la Santé à long terme'],
    description_long: 'Le salaire le plus élevé des emplois de départ, mais il faut le mériter. Si ta Santé est faible, tu vas dormir 28 unités par semaine et avoir très peu de temps libre.'
  },

  {
    id: 'prepose_usine',
    label: 'Préposé·e — usine alimentaire',
    emoji: '🏭',
    description: 'Chaîne de production. Répétitif, exigeant, mais stable.',
    category: 'industrie',
    salaryPerWeek: 185,
    energyLevel: 'elevee',
    sleepUnits: 28,
    hoursPerWeek: 10.5,
    timeUnitsUsed: 16,
    requirements: { sante: 4, habiletes: 4 },
    weeklyBonus: null,
    longTermBonus: { stat: 'habiletes', weeksRequired: 4, amount: 1 },
    contractMinWeeks: 3,
    perks: ['Bon salaire', 'Développe les habiletés'],
    description_long: 'Travail de précision dans un environnement industriel. Développe la rigueur et les habiletés pratiques sur le long terme.'
  },

  // ─── EMPLOIS ÉNERGIE TRÈS ÉLEVÉE ─────────────────────────────────────────
  {
    id: 'aide_agricole',
    label: 'Aide agricole — ferme',
    emoji: '🌾',
    description: 'Le travail le plus physique. Dehors, tôt le matin, toute la semaine.',
    category: 'agriculture',
    salaryPerWeek: 178,
    energyLevel: 'tres-elevee',
    sleepUnits: 32,
    hoursPerWeek: 10.5,
    timeUnitsUsed: 18,
    requirements: { sante: 5 },
    weeklyBonus: null,
    longTermBonus: {
      multiStat: [
        { stat: 'sante', weeksRequired: 4, amount: 2 },
        { stat: 'habiletes', weeksRequired: 4, amount: 1 }
      ]
    },
    contractMinWeeks: 3,
    perks: ['Développe Santé (+2) ET Habiletés', 'Expérience unique'],
    description_long: 'Pour les plus robustes. Le bonus de stats est exceptionnel (+2 Santé, +1 Habiletés après 4 semaines) mais le coût en sommeil est très lourd. Avec Santé 5, il ne te reste qu\'environ 14 unités libres par semaine.'
  }
];

// ─── INDEX PAR ID ──────────────────────────────────────────────────────────
export const JOBS_BY_ID = Object.fromEntries(JOBS.map(j => [j.id, j]));

// ─── CALCUL DU SOMMEIL ─────────────────────────────────────────────────────
// Ajuste les unités de sommeil selon la Santé et l'Organisation de l'élève
export function calcSleepUnits(job, rpgStats) {
  let sleep = job.sleepUnits;
  const sante = rpgStats.sante || 5;
  const org   = rpgStats.organisation || 5;

  // Santé élevée → moins de sommeil nécessaire
  if (sante >= 9) sleep -= 4;
  else if (sante >= 7) sleep -= 2;
  else if (sante <= 3) sleep += 3;
  else if (sante <= 5) sleep += 1;

  // Organisation élevée → gestion du temps améliorée
  if (org >= 8) sleep -= 2;
  else if (org >= 6) sleep -= 1;

  // Plancher à 10 unités (on doit quand même dormir)
  return Math.max(10, sleep);
}

// ─── CALCUL DU TEMPS LIBRE ────────────────────────────────────────────────
export function calcFreeTime(job, rpgStats) {
  const TOTAL_UNITS  = 100;
  const SCHOOL_UNITS = 30;
  const sleep = calcSleepUnits(job, rpgStats);
  const work  = job.timeUnitsUsed || 0;
  return Math.max(0, TOTAL_UNITS - SCHOOL_UNITS - sleep - work);
}

// ─── EMPLOIS DISPONIBLES POUR UN PROFIL ───────────────────────────────────
// Retourne les emplois que l'élève peut choisir selon ses stats
export function getAvailableJobs(rpgStats) {
  return JOBS.filter(job => {
    if (!job.requirements) return true;
    return Object.entries(job.requirements).every(([stat, min]) => {
      return (rpgStats[stat] || 0) >= min;
    });
  });
}

// ─── ÉTIQUETTES LISIBLES ──────────────────────────────────────────────────
export const ENERGY_LABELS = {
  'nulle':       { label: 'Aucune',       color: '#3B6D11', bg: '#EAF3DE' },
  'faible':      { label: 'Faible',       color: '#3B6D11', bg: '#EAF3DE' },
  'moyenne':     { label: 'Moyenne',      color: '#854F0B', bg: '#FAEEDA' },
  'elevee':      { label: 'Élevée',       color: '#A32D2D', bg: '#FCEBEB' },
  'tres-elevee': { label: 'Très élevée',  color: '#A32D2D', bg: '#FCEBEB' }
};
