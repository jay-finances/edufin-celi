// events-db.js — Banque d'événements hebdomadaires ÉduFin RPG
// Structure de chaque événement :
//   id, title, emoji, type, baseProbability,
//   probabilityModifiers (ajustent le % selon les stats/contexte),
//   choices (tableau d'options avec conséquences),
//   autoResolve (si l'événement expire sans choix)
//   guaranteedWeek (null ou numéro de semaine pour événements fixes)

// ─── TYPES D'ÉVÉNEMENTS ────────────────────────────────────────────────────
// opportunite  → bonne nouvelle, choix d'en profiter ou non
// malchance    → problème à gérer, les conséquences varient selon le choix
// dilemme      → pas de bonne réponse évidente, question de valeurs/stratégie
// rencontre    → événement social lié à l'Influence
// garanti      → se produit à une semaine précise pour tous les élèves

export const EVENTS = [

  // ═══════════════════════════════════════════════════════
  // OPPORTUNITÉS
  // ═══════════════════════════════════════════════════════

  {
    id: 'heures_sup',
    title: 'Ton patron t\'offre des heures supplémentaires',
    emoji: '⏰',
    type: 'opportunite',
    baseProbability: 20,
    expiresInDays: 7,
    probabilityModifiers: [
      { condition: 'organisation >= 7',        delta: +15, label: 'Tu es organisé·e — ton patron te fait confiance' },
      { condition: 'sameJobWeeks >= 4',         delta: +10, label: 'Ancienneté dans le poste' },
      { condition: 'energyLevel === elevee',    delta: -10, label: 'Ton emploi est déjà très exigeant' },
      { condition: 'job === none',              delta: -99, label: 'N/A — tu ne travailles pas' }
    ],
    choices: [
      {
        id: 'A',
        label: 'Accepter — tu travailles 3h de plus',
        emoji: '✅',
        consequences: {
          money: +55,
          timeUnits: -4,
          stats: { sante: { temp: -1, weeks: 2 } },
          xp: +30,
          message: '+55$ dans ta poche. Tu es un peu plus fatigué cette semaine.'
        }
      },
      {
        id: 'B',
        label: 'Refuser poliment',
        emoji: '🙅',
        consequences: {
          money: 0,
          xp: 0,
          message: 'Tu refuses. Ton patron comprend. Aucune conséquence.'
        }
      }
    ],
    autoResolve: 'B'  // Si expiré → refus automatique, aucun effet
  },

  {
    id: 'placement_ami',
    title: 'Un ami te parle d\'une opportunité de placement',
    emoji: '💡',
    type: 'opportunite',
    baseProbability: 10,
    expiresInDays: 7,
    probabilityModifiers: [
      { condition: 'connaissances >= 6',   delta: +20, label: 'Tes connaissances financières attirent ce genre de discussion' },
      { condition: 'ch5Completed',         delta: +15, label: 'Tu as complété le chapitre sur l\'investissement' },
      { condition: 'influence >= 7',       delta: +10, label: 'Tu côtoies des gens intéressants' }
    ],
    choices: [
      {
        id: 'A',
        label: 'Investir 200$ sur le conseil de ton ami',
        emoji: '📈',
        consequences: {
          money: -200,
          moneyDelayed: { min: 160, max: 480, weeks: 3, label: 'Retour sur investissement dans 3 semaines' },
          xp: +20,
          message: 'Tu mises 200$. Dans 3 semaines, tu sauras si c\'était une bonne idée.'
        }
      },
      {
        id: 'B',
        label: 'Faire tes propres recherches d\'abord',
        emoji: '🔍',
        consequences: {
          money: -100,
          moneyDelayed: { min: 100, max: 200, weeks: 2, label: 'Retour sur investissement dans 2 semaines' },
          stats: { connaissances: { perm: +1 } },
          xp: +50,
          message: 'Tu prends le temps de comprendre avant d\'investir. +1 Connaissances permanent.'
        }
      },
      {
        id: 'C',
        label: 'Ne rien faire — trop risqué',
        emoji: '❌',
        consequences: {
          money: 0,
          xp: +10,
          message: 'Tu passes ton tour. La prudence a du bon aussi.'
        }
      }
    ],
    autoResolve: 'C'
  },

  {
    id: 'soiree_reseau',
    title: 'Tu es invité·e à une soirée — des gens influents seront là',
    emoji: '🎉',
    type: 'rencontre',
    baseProbability: 8,
    expiresInDays: 5,
    probabilityModifiers: [
      { condition: 'influence >= 7',     delta: +25, label: 'Ton réseau social est actif' },
      { condition: 'hasRecentPhone',     delta: +15, label: 'Ton nouveau cell joue en ta faveur' },
      { condition: 'transport === pied', delta: -10, label: 'Se rendre là-bas à pied, c\'est compliqué' },
      { condition: 'sante <= 4',         delta: -15, label: 'Tu es trop épuisé·e pour sortir' }
    ],
    choices: [
      {
        id: 'A',
        label: 'Y aller et t\'impliquer — échanges, contacts, discussions',
        emoji: '🤝',
        consequences: {
          money: -25,
          stats: { influence: { perm: +2 } },
          xp: +75,
          unlockFutureEvent: 'offre_emploi_reseau',
          message: '+2 Influence permanent. Une soirée bien investie. Un événement futur pourrait découler de cette rencontre.'
        }
      },
      {
        id: 'B',
        label: 'Y aller mais rester discret·e',
        emoji: '👀',
        consequences: {
          money: -15,
          stats: { influence: { perm: +1 } },
          xp: +30,
          message: '+1 Influence. Tu observes plus que tu participes, mais c\'est quand même utile.'
        }
      },
      {
        id: 'C',
        label: 'Rester à la maison — tu es trop fatigué·e',
        emoji: '🛋️',
        consequences: {
          money: 0,
          stats: { influence: { temp: -1, weeks: 2 } },
          xp: 0,
          message: 'Tu passes ton tour. Ton cercle social remarque ton absence.'
        }
      }
    ],
    autoResolve: 'C'
  },

  {
    id: 'covoiturage',
    title: 'Quelqu\'un t\'offre du covoiturage régulier',
    emoji: '🚗',
    type: 'opportunite',
    baseProbability: 12,
    expiresInDays: 7,
    probabilityModifiers: [
      { condition: 'transport === pied',  delta: +25, label: 'Tu cherchais justement une solution de transport' },
      { condition: 'transport === velo',  delta: +20, label: 'Le covoiturage t\'économiserait du temps' },
      { condition: 'organisation >= 6',   delta: +10, label: 'Tu es ponctuel·le — les gens aiment faire équipe avec toi' }
    ],
    choices: [
      {
        id: 'A',
        label: 'Accepter — tu partages les frais',
        emoji: '✅',
        consequences: {
          monthlyExpense: -25,
          stats: { organisation: { perm: +1 } },
          freeTimeBonus: +5,
          xp: +40,
          message: '+1 Organisation · +5 unités de temps libre par semaine · −25$/mois. Un compromis gagnant.'
        }
      },
      {
        id: 'B',
        label: 'Refuser — tu préfères ton indépendance',
        emoji: '🙅',
        consequences: {
          money: 0,
          xp: +10,
          message: 'Tu gardes ton indépendance. Aucun changement.'
        }
      }
    ],
    autoResolve: 'B'
  },

  {
    id: 'contrat_renovation',
    title: 'Un voisin te propose un contrat de petite rénovation',
    emoji: '🛠️',
    type: 'opportunite',
    baseProbability: 10,
    expiresInDays: 5,
    probabilityModifiers: [
      { condition: 'habiletes >= 6',       delta: +30, label: 'Ta réputation manuelle te précède' },
      { condition: 'hasPickup',            delta: +15, label: 'Ta camionnette, c\'est pratique pour ce genre de travail' },
      { condition: 'habiletes <= 3',       delta: -20, label: 'Tu n\'as pas les compétences requises' }
    ],
    choices: [
      {
        id: 'A',
        label: 'Accepter — une fin de semaine complète de travail',
        emoji: '💪',
        consequences: {
          money: +180,
          timeUnits: -8,
          stats: { habiletes: { perm: +1 } },
          xp: +60,
          message: '+180$ · +1 Habiletés permanent. Du bon travail bien payé.'
        }
      },
      {
        id: 'B',
        label: 'Aider à moitié — juste le gros du travail physique',
        emoji: '🔨',
        consequences: {
          money: +80,
          timeUnits: -4,
          xp: +30,
          message: '+80$ pour quelques heures de travail. Correct.'
        }
      },
      {
        id: 'C',
        label: 'Refuser poliment',
        emoji: '❌',
        consequences: {
          money: 0,
          xp: 0,
          message: 'Tu déclines. Ton voisin comprend.'
        }
      }
    ],
    autoResolve: 'C'
  },

  // ═══════════════════════════════════════════════════════
  // MALCHANCES
  // ═══════════════════════════════════════════════════════

  {
    id: 'niaiser_cell',
    title: 'Tu passes des heures sur ton cell sans t\'en rendre compte',
    emoji: '📱',
    type: 'malchance',
    baseProbability: 5,
    expiresInDays: 7,
    probabilityModifiers: [
      { condition: 'job === none',          delta: +30, label: 'Trop de temps libre non structuré' },
      { condition: 'organisation <= 4',     delta: +25, label: 'Ton manque d\'organisation te rend vulnérable' },
      { condition: 'hasRecentOPhone',       delta: +15, label: 'Le OPhone 16 ou 17, c\'est difficile à poser' },
      { condition: 'organisation >= 7',     delta: -20, label: 'Tu sais gérer ton temps' },
      { condition: 'sante >= 7',            delta: -10, label: 'Ton énergie te garde actif·ve' }
    ],
    choices: [
      {
        id: 'A',
        label: 'Tu t\'en rends compte et tu te reprends',
        emoji: '😬',
        consequences: {
          timeUnits: -3,
          xp: -25,
          message: 'Tu récupères la situation. −3 unités de temps, mais tu as appris quelque chose.'
        }
      },
      {
        id: 'B',
        label: 'C\'est ta journée off — tu continues',
        emoji: '😴',
        consequences: {
          timeUnits: -8,
          stats: { organisation: { temp: -1, weeks: 3 } },
          xp: -50,
          message: '−8 unités de temps · −1 Organisation temporaire (3 semaines). Une journée entière de perdue.'
        }
      }
    ],
    autoResolve: 'A'  // Si passif → version légère
  },

  {
    id: 'maladie',
    title: 'Tu tombes malade',
    emoji: '🤒',
    type: 'malchance',
    baseProbability: 8,
    expiresInDays: 7,
    probabilityModifiers: [
      { condition: 'sante <= 4',             delta: +25, label: 'Ta santé fragile te rend vulnérable' },
      { condition: 'energyLevel === elevee', delta: +15, label: 'L\'épuisement affaiblit le système immunitaire' },
      { condition: 'energyLevel === tres-elevee', delta: +20, label: 'Tu te pousses trop fort' },
      { condition: 'sante >= 8',             delta: -20, label: 'Ta bonne santé te protège' },
      { condition: 'sante >= 6',             delta: -10, label: 'Tu résistes assez bien' }
    ],
    choices: [
      {
        id: 'A',
        label: 'Te reposer — tu manques le travail',
        emoji: '🛏️',
        consequences: {
          moneyLost: 'weekSalary',  // Perd le salaire de la semaine
          stats: { sante: { temp: +1, weeks: 2 } },
          xp: +10,
          message: 'Tu perds ton salaire de la semaine mais tu récupères bien.'
        }
      },
      {
        id: 'B',
        label: 'Travailler quand même — tu toughs it out',
        emoji: '😤',
        consequences: {
          money: 0,  // Salaire conservé
          stats: { sante: { perm: -2 } },
          riskRecurrence: 0.25,
          xp: -20,
          message: 'Tu gardes ton salaire mais tu t\'abîmes. −2 Santé permanent. Risque de rechute +25%.'
        }
      },
      {
        id: 'C',
        label: 'Consulter un médecin (50$)',
        emoji: '👨‍⚕️',
        consequences: {
          money: -50,
          stats: { sante: { temp: +1, weeks: 1 } },
          xp: +25,
          message: '−50$ · Récupération rapide · Aucune rechute possible.'
        }
      }
    ],
    autoResolve: 'A'
  },

  {
    id: 'panne_auto',
    title: 'Ton auto tombe en panne',
    emoji: '🔧',
    type: 'malchance',
    baseProbability: 0,  // 0% sans voiture
    expiresInDays: 5,
    probabilityModifiers: [
      { condition: 'carYear <= 2017',        delta: +22, label: 'Voiture de 2017 ou avant — usure normale' },
      { condition: 'carYear <= 2019',        delta: +12, label: 'Voiture de 2018–2019' },
      { condition: 'carYear >= 2020',        delta: +5,  label: 'Voiture récente, risque plus faible' },
      { condition: 'habiletes >= 7',         delta: -12, label: 'Tu fais ton entretien préventif toi-même' },
      { condition: 'hasCar === false',       delta: -99, label: 'N/A — tu n\'as pas de voiture' }
    ],
    choices: [
      {
        id: 'A',
        label: 'Aller au garage — réparer immédiatement',
        emoji: '🔩',
        consequences: {
          money: { min: -300, max: -1200, label: 'Coût de réparation' },
          noCarWeeks: 1,
          xp: +15,
          message: 'Réparé rapidement. Coût variable selon la panne. 1 semaine sans auto.'
        }
      },
      {
        id: 'B',
        label: 'Réparer toi-même (si Habiletés 6+)',
        emoji: '🪛',
        requiresStat: { habiletes: 6 },
        consequences: {
          money: -80,
          stats: { habiletes: { perm: +1 } },
          noCarWeeks: 2,
          xp: +80,
          message: '−80$ en pièces · +1 Habiletés permanent · 2 semaines sans auto. Apprentissage réel.'
        }
      },
      {
        id: 'C',
        label: 'Remettre à plus tard',
        emoji: '🙈',
        consequences: {
          moneyDelayed: { min: -1500, max: -2500, weeks: 3 },
          stats: { organisation: { perm: -1 } },
          xp: -30,
          message: 'Mauvaise idée. La panne empire. Dans 3 semaines : −1 500$ à −2 500$. −1 Organisation.'
        }
      }
    ],
    autoResolve: 'A'
  },

  {
    id: 'cell_brise',
    title: 'Ton écran de cell est brisé',
    emoji: '📵',
    type: 'malchance',
    baseProbability: 6,
    expiresInDays: 7,
    probabilityModifiers: [
      { condition: 'hasUsedPhone',       delta: +15, label: 'Les appareils usagés sont plus fragiles' },
      { condition: 'organisation >= 7',  delta: -12, label: 'Tu en prends bien soin' },
      { condition: 'noPhone',            delta: -99, label: 'N/A — tu n\'as pas changé de cell' }
    ],
    choices: [
      {
        id: 'A',
        label: 'Faire réparer l\'écran',
        emoji: '🔧',
        consequences: {
          money: -150,
          noPhoneWeeks: 1,
          xp: +10,
          message: '−150$ · 1 semaine sans ton cell principal.'
        }
      },
      {
        id: 'B',
        label: 'Acheter un cell usagé de remplacement',
        emoji: '📱',
        consequences: {
          money: { min: -200, max: -350 },
          statsLost: 'phoneBonus',
          xp: +10,
          message: 'Tu perds le bonus d\'Influence de ton ancien cell si c\'était un OPhone.'
        }
      },
      {
        id: 'C',
        label: 'Te passer de cell temporairement',
        emoji: '🤷',
        consequences: {
          money: 0,
          stats: { influence: { temp: -1, weeks: 4 } },
          xp: +20,
          message: '−1 Influence temporaire (4 sem.) mais tu économises 150$+.'
        }
      }
    ],
    autoResolve: 'C'
  },

  {
    id: 'conflit_collegue',
    title: 'Conflit avec un·e collègue de travail',
    emoji: '😤',
    type: 'malchance',
    baseProbability: 10,
    expiresInDays: 7,
    probabilityModifiers: [
      { condition: 'influence <= 4',     delta: +20, label: 'Tu as du mal à gérer les relations' },
      { condition: 'influence >= 7',     delta: -15, label: 'Tu désamorces naturellement les tensions' },
      { condition: 'job === none',       delta: -99, label: 'N/A — tu ne travailles pas' }
    ],
    choices: [
      {
        id: 'A',
        label: 'Confronter directement',
        emoji: '💬',
        consequences: {
          randomOutcome: [
            { probability: 0.5, stats: { influence: { perm: +1 } }, xp: +50, message: 'Ça se règle bien. +1 Influence.' },
            { probability: 0.5, stats: { influence: { perm: -1 } }, xp: -20, message: 'Ça dégénère. −1 Influence.' }
          ]
        }
      },
      {
        id: 'B',
        label: 'En parler au patron',
        emoji: '👔',
        consequences: {
          stats: { influence: { temp: -1, weeks: 3 } },
          xp: +20,
          message: 'Réglé, mais tes collègues trouvent que tu es allé·e vite aux patrons. −1 Influence temporaire.'
        }
      },
      {
        id: 'C',
        label: 'Ignorer et laisser passer',
        emoji: '🙄',
        consequences: {
          timeUnits: -5,
          xp: -10,
          weeksDuration: 2,
          message: '−5 unités de temps (stress) pendant 2 semaines. Le malaise s\'étire.'
        }
      }
    ],
    autoResolve: 'C'
  },

  // ═══════════════════════════════════════════════════════
  // DILEMMES
  // ═══════════════════════════════════════════════════════

  {
    id: 'cours_en_ligne',
    title: 'Tu découvres un cours en ligne sur la finance personnelle',
    emoji: '🎓',
    type: 'dilemme',
    baseProbability: 12,
    expiresInDays: 10,
    probabilityModifiers: [
      { condition: 'connaissances >= 6',   delta: +20, label: 'Tu cherches à progresser intellectuellement' },
      { condition: 'job === none',          delta: +15, label: 'Tu as du temps — pourquoi pas?' },
      { condition: 'organisation >= 7',     delta: +10, label: 'Tu planifies bien ton temps' }
    ],
    choices: [
      {
        id: 'A',
        label: 'Payer le cours complet (200$)',
        emoji: '💳',
        consequences: {
          money: -200,
          stats: { connaissances: { perm: +2 } },
          xp: +100,
          weeksDuration: 6,
          message: '−200$ · +2 Connaissances permanent · +100 XP. Un investissement en toi-même sur 6 semaines.'
        }
      },
      {
        id: 'B',
        label: 'Trouver une version gratuite en ligne',
        emoji: '🔍',
        consequences: {
          money: 0,
          stats: { connaissances: { perm: +1 } },
          timeUnits: -3,
          xp: +50,
          weeksDuration: 8,
          message: '+1 Connaissances · −3 unités/sem. pendant 8 semaines. Ça prend plus de temps mais c\'est gratuit.'
        }
      },
      {
        id: 'C',
        label: 'Remettre à plus tard',
        emoji: '📅',
        consequences: {
          money: 0,
          xp: +5,
          message: 'Tu notes ça pour plus tard. L\'événement peut revenir.'
        }
      }
    ],
    autoResolve: 'C'
  },

  {
    id: 'pression_sociale_souliers',
    title: 'Tes amis achètent tous les nouveaux OShoe Pro (350$)',
    emoji: '👟',
    type: 'dilemme',
    baseProbability: 15,
    expiresInDays: 5,
    probabilityModifiers: [
      { condition: 'influence <= 5',     delta: +25, label: 'La pression de conformité est forte sur toi' },
      { condition: 'connaissances >= 7', delta: -15, label: 'Tu reconnais les mécanismes de pression sociale' },
      { condition: 'hasRecentOPhone',    delta: +10, label: 'Tu es déjà dans une dynamique de consommation' }
    ],
    choices: [
      {
        id: 'A',
        label: 'Acheter (FOMO — tout le monde en a)',
        emoji: '🛍️',
        consequences: {
          money: -350,
          stats: { influence: { temp: +1, weeks: 4 } },
          xp: -20,
          message: '−350$ · +1 Influence temporaire (4 sem.). Consommation ostentatoire — chapitre 1.'
        }
      },
      {
        id: 'B',
        label: 'Résister — expliquer tes priorités financières',
        emoji: '💪',
        consequences: {
          money: 0,
          stats: { connaissances: { perm: +1 } },
          xp: +75,
          message: '+1 Connaissances · +75 XP. Pas facile socialement, mais financièrement c\'est la bonne décision.'
        }
      },
      {
        id: 'C',
        label: 'Acheter usagé sur Kijiji (compromis malin)',
        emoji: '🔄',
        consequences: {
          money: -120,
          stats: { influence: { temp: 0.5, weeks: 3 }, connaissances: { perm: +1 } },
          xp: +40,
          message: '−120$ · +0,5 Influence temporaire · +1 Connaissances. Le compromis intelligent.'
        }
      }
    ],
    autoResolve: 'B'
  },

  {
    id: 'aide_famille',
    title: 'Ta famille a besoin d\'aide financière ce mois-ci',
    emoji: '🏠',
    type: 'dilemme',
    baseProbability: 5,
    expiresInDays: 7,
    probabilityModifiers: [
      // Pas de modificateur — peut arriver à n'importe qui
    ],
    choices: [
      {
        id: 'A',
        label: 'Donner 150$ — tout ce que tu peux',
        emoji: '❤️',
        consequences: {
          money: -150,
          stats: { influence: { perm: +2 } },
          xp: +100,
          message: '−150$ · +2 Influence permanent · +100 XP. La générosité a une valeur réelle.'
        }
      },
      {
        id: 'B',
        label: 'Donner 50$ — ce que tu as les moyens de donner',
        emoji: '🤝',
        consequences: {
          money: -50,
          stats: { influence: { perm: +1 } },
          xp: +50,
          message: '−50$ · +1 Influence permanent. Tu aides selon tes moyens.'
        }
      },
      {
        id: 'C',
        label: 'Expliquer que tu n\'as vraiment pas les moyens',
        emoji: '😔',
        consequences: {
          money: 0,
          xp: +15,
          message: 'Tu expliques ta situation. Ta famille comprend. Aucune conséquence financière.'
        }
      }
    ],
    autoResolve: 'C'
  },

  // ═══════════════════════════════════════════════════════
  // ÉVÉNEMENTS GARANTIS (semaines spécifiques)
  // ═══════════════════════════════════════════════════════

  {
    id: 'black_friday',
    title: 'Black Friday — vente flash sur le OPhone 17 Pro (−30%)',
    emoji: '⚡',
    type: 'garanti',
    guaranteedWeek: 8,
    baseProbability: 100,
    expiresInDays: 14,
    probabilityModifiers: [],
    pedagogicalNote: 'Lié au chapitre 1 — consommation, marketing, retail therapy. Bon moment de discussion en classe.',
    choices: [
      {
        id: 'A',
        label: 'Acheter impulsif — c\'est trop beau pour passer (980$)',
        emoji: '🛍️',
        consequences: {
          money: -980,
          stats: { influence: { temp: +2, weeks: 6 } },
          xp: -30,
          message: '−980$ · +2 Influence temporaire (6 sem.). Le marketing a fonctionné.'
        }
      },
      {
        id: 'B',
        label: 'Calculer si tu en as vraiment besoin avant de décider',
        emoji: '🧮',
        consequences: {
          money: 0,
          stats: { connaissances: { perm: +1 } },
          xp: +75,
          message: 'Tu prends le temps de réfléchir. +1 Connaissances · +75 XP. L\'achat réfléchi.'
        }
      },
      {
        id: 'C',
        label: 'Ignorer complètement — tu n\'en as pas besoin',
        emoji: '🚫',
        consequences: {
          money: 0,
          stats: { organisation: { perm: +1 } },
          xp: +50,
          message: '+1 Organisation · +50 XP. Tu résistes aux techniques de marketing.'
        }
      }
    ],
    autoResolve: 'B'
  },

  {
    id: 'choix_cellulaire',
    title: 'Ton forfait arrive à échéance — tu dois choisir ton cellulaire',
    emoji: '📱',
    type: 'garanti',
    guaranteedWeek: 2,
    baseProbability: 100,
    expiresInDays: 14,
    probabilityModifiers: [],
    isShoppingEvent: true,
    shopType: 'cellulaire',
    choices: [],  // Géré par l'interface cellulaire
    autoResolve: 'garder_actuel'
  },

  {
    id: 'choix_transport',
    title: 'Tu as maintenant accès au permis de conduire — quel transport choisiras-tu?',
    emoji: '🚗',
    type: 'garanti',
    guaranteedWeek: 4,
    baseProbability: 100,
    expiresInDays: 14,
    probabilityModifiers: [],
    isShoppingEvent: true,
    shopType: 'transport',
    choices: [],  // Géré par l'interface transport
    autoResolve: 'transport_commun'
  }
];

// ─── INDEX PAR ID ──────────────────────────────────────────────────────────
export const EVENTS_BY_ID = Object.fromEntries(EVENTS.map(e => [e.id, e]));

// ─── ÉVÉNEMENTS GARANTIS PAR SEMAINE ──────────────────────────────────────
export const GUARANTEED_BY_WEEK = EVENTS
  .filter(e => e.guaranteedWeek)
  .reduce((acc, e) => {
    acc[e.guaranteedWeek] = e;
    return acc;
  }, {});

// ─── TIRER UN ÉVÉNEMENT ALÉATOIRE ─────────────────────────────────────────
// Calcule la probabilité réelle de chaque événement selon le profil de l'élève
// et tire un événement au sort parmi ceux disponibles
export function drawWeeklyEvent(profile) {
  const {
    rpgStats = {},
    job = 'none',
    sameJobWeeks = 0,
    transport = 'pied',
    hasCar = false,
    carYear = null,
    hasRecentPhone = false,
    hasRecentOPhone = false,
    hasUsedPhone = false,
    ch5Completed = false,
    weekNumber = 1
  } = profile;

  // Événement garanti cette semaine?
  if (GUARANTEED_BY_WEEK[weekNumber]) {
    return GUARANTEED_BY_WEEK[weekNumber];
  }

  // Construire le contexte pour évaluer les modificateurs
  const ctx = {
    ...rpgStats,
    job,
    sameJobWeeks,
    transport,
    hasCar,
    carYear,
    hasRecentPhone,
    hasRecentOPhone,
    hasUsedPhone,
    ch5Completed,
    energyLevel: getEnergyLevel(job),
    hasPickup: ['jord_fserie', 'chefrolait_siverado', 'rissan_titan'].includes(hasCar)
  };

  // Calculer la probabilité réelle de chaque événement
  const candidates = EVENTS
    .filter(e => !e.guaranteedWeek)
    .map(e => {
      let prob = e.baseProbability;
      (e.probabilityModifiers || []).forEach(mod => {
        if (evalCondition(mod.condition, ctx)) {
          prob += mod.delta;
        }
      });
      prob = Math.min(80, Math.max(2, prob)); // Entre 2% et 80%
      return { event: e, probability: prob };
    })
    .filter(c => c.probability > 0);

  // Tirage pondéré
  const total = candidates.reduce((sum, c) => sum + c.probability, 0);
  let rand = Math.random() * total;
  for (const candidate of candidates) {
    rand -= candidate.probability;
    if (rand <= 0) return candidate.event;
  }

  return candidates[0]?.event || null;
}

// ─── RÉSOLUTION AUTOMATIQUE (élève passif) ────────────────────────────────
export function autoResolveEvent(event) {
  if (!event.autoResolve) return null;
  const choiceId = event.autoResolve;
  return event.choices.find(c => c.id === choiceId) || null;
}

// ─── UTILITAIRES INTERNES ─────────────────────────────────────────────────
function evalCondition(condition, ctx) {
  try {
    // Évaluation simple des conditions de type "stat >= X"
    const fn = new Function(...Object.keys(ctx), `return ${condition};`);
    return fn(...Object.values(ctx));
  } catch(e) {
    return false;
  }
}

function getEnergyLevel(jobId) {
  const levels = {
    'none': 'nulle',
    'caissier_epicerie': 'faible',
    'prepose_hotel': 'faible',
    'vendeur_boutique': 'faible',
    'serveur_resto': 'moyenne',
    'commis_entrepot': 'moyenne',
    'aide_cuisinier': 'moyenne',
    'animateur_loisirs': 'moyenne',
    'livreur_velo': 'elevee',
    'prepose_usine': 'elevee',
    'aide_agricole': 'tres-elevee'
  };
  return levels[jobId] || 'faible';
}
