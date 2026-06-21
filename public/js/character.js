/**
 * ÉduFin RPG — character.js
 * Moteur de génération SVG des avatars pixel-art style Retro Bowl
 * Toutes les options sont combinables librement.
 * Stockage Firestore : users/{uid}/avatar (objet plat)
 */

// ─────────────────────────────────────────────
// CATALOGUE DES OPTIONS
// ─────────────────────────────────────────────

export const AVATAR_OPTIONS = {

  skinTone: {
    label: 'Teinte de peau',
    options: [
      { id: 'pale',    label: 'Claire',        color: '#FBDFC0', shadow: '#D4A876' },
      { id: 'light',   label: 'Lumineuse',     color: '#F5C080', shadow: '#C8884A' },
      { id: 'medium',  label: 'Dorée',         color: '#E8A060', shadow: '#B86830' },
      { id: 'tan',     label: 'Hâlée',         color: '#C07840', shadow: '#8A4A18' },
      { id: 'dark',    label: 'Foncée',        color: '#6B3010', shadow: '#3A1505' },
      { id: 'deep',    label: 'Profonde',      color: '#3A1A05', shadow: '#1A0A00' },
    ]
  },

  faceShape: {
    label: 'Forme du visage',
    options: [
      { id: 'round',   label: 'Ronde'      },
      { id: 'oval',    label: 'Ovale'      },
      { id: 'square',  label: 'Carrée'     },
      { id: 'heart',   label: 'En cœur'   },
      { id: 'long',    label: 'Allongée'   },
    ]
  },

  eyeShape: {
    label: 'Yeux',
    options: [
      { id: 'round',    label: 'Ronds'      },
      { id: 'almond',   label: 'Amande'     },
      { id: 'wide',     label: 'Grands'     },
      { id: 'narrow',   label: 'Petits'     },
      { id: 'hooded',   label: 'Tombants'   },
    ]
  },

  eyeColor: {
    label: "Couleur des yeux",
    options: [
      { id: 'brown',    label: 'Brun',       color: '#5A2A08' },
      { id: 'darkbrown',label: 'Brun foncé', color: '#2A1008' },
      { id: 'blue',     label: 'Bleu',       color: '#2255AA' },
      { id: 'green',    label: 'Vert',       color: '#1A7A40' },
      { id: 'hazel',    label: 'Noisette',   color: '#7A4A10' },
      { id: 'teal',     label: 'Turquoise',  color: '#1A7A90' },
      { id: 'gray',     label: 'Gris',       color: '#5A6A7A' },
      { id: 'amber',    label: 'Ambré',      color: '#AA6A00' },
    ]
  },

  hairStyle: {
    label: 'Coiffure',
    options: [
      { id: 'short',    label: 'Courte classique' },
      { id: 'long',     label: 'Longue'           },
      { id: 'curly',    label: 'Frisée'           },
      { id: 'bun',      label: 'Chignon'          },
      { id: 'braids',   label: 'Tresses'          },
      { id: 'shaved',   label: 'Rasée'            },
      { id: 'undercut', label: 'Undercut'         },
      { id: 'afro',     label: 'Afro'             },
    ]
  },

  hairColor: {
    label: 'Couleur des cheveux',
    options: [
      { id: 'black',    label: 'Noir',          color: '#0A0A0A' },
      { id: 'darkbrown',label: 'Brun foncé',    color: '#3D1F05' },
      { id: 'brown',    label: 'Brun',          color: '#6B3A10' },
      { id: 'auburn',   label: 'Auburn',        color: '#8B2000' },
      { id: 'red',      label: 'Roux',          color: '#B03200' },
      { id: 'blonde',   label: 'Blond',         color: '#C8A030' },
      { id: 'lightblonde',label:'Blond clair',  color: '#E0C060' },
      { id: 'white',    label: 'Blanc/Gris',    color: '#B0B0B0' },
      { id: 'blue',     label: 'Bleu',          color: '#1A40AA', unlock: 'boutique' },
      { id: 'pink',     label: 'Rose',          color: '#CC4080', unlock: 'boutique' },
    ]
  },

  mouth: {
    label: 'Bouche',
    options: [
      { id: 'smile',    label: 'Sourire doux'    },
      { id: 'grin',     label: 'Grand sourire'   },
      { id: 'neutral',  label: 'Neutre'          },
      { id: 'smirk',    label: 'En coin'         },
      { id: 'pout',     label: 'Moue'            },
      { id: 'surprised',label: 'Surprise'        },
    ]
  },

  facial: {
    label: 'Pilosité',
    unlock: 'age_18',
    options: [
      { id: 'none',       label: 'Aucune'         },
      { id: 'stubble',    label: 'Duvet'          },
      { id: 'mustache',   label: 'Moustache'      },
      { id: 'short_beard',label: 'Barbe courte'   },
      { id: 'long_beard', label: 'Barbe longue'   },
      { id: 'goatee',     label: 'Bouc'           },
    ]
  },

  glasses: {
    label: 'Lunettes',
    options: [
      { id: 'none',       label: 'Aucunes'        },
      { id: 'round',      label: 'Rondes'         },
      { id: 'rect',       label: 'Rectangulaires' },
      { id: 'cateye',     label: 'Cat-eye',       unlock: 'boutique' },
      { id: 'tinted',     label: 'Teintées',      unlock: 'boutique' },
      { id: 'monocle',    label: 'Monocle',       unlock: 'rare'     },
    ]
  },

  earrings: {
    label: "Boucles d'oreilles",
    options: [
      { id: 'none',       label: 'Aucunes'          },
      { id: 'gold_studs', label: 'Clous dorés'      },
      { id: 'black_studs',label: 'Clous noirs'      },
      { id: 'hoops',      label: 'Anneaux',          unlock: 'boutique' },
      { id: 'drops',      label: 'Pendants argent',  unlock: 'boutique' },
      { id: 'chandelier', label: 'Chandelier',       unlock: 'rare'     },
    ]
  },

  outfit: {
    label: 'Tenue',
    options: [
      { id: 'tshirt_gray',  label: 'T-shirt gris'        },
      { id: 'hoodie_blue',  label: 'Hoodie bleu'         },
      { id: 'hoodie_black', label: 'Hoodie noir'         },
      { id: 'shirt_red',    label: 'Chandail rouge'      },
      { id: 'shirt_green',  label: 'Chandail vert'       },
      { id: 'jacket_denim', label: 'Veste en jean',       unlock: 'boutique' },
      { id: 'coat_luxury',  label: 'Manteau chic',        unlock: 'boutique', influence: 2 },
      { id: 'jersey',       label: 'Jersey sport',        unlock: 'boutique' },
      { id: 'suit',         label: 'Veston',              unlock: 'ch5'      },
    ]
  },

  bgColor: {
    label: 'Fond de carte',
    options: [
      { id: 'blue',    label: 'Bleu',    from: '#4A8FD4', to: '#2A5FA0' },
      { id: 'red',     label: 'Rouge',   from: '#D04060', to: '#8A1A30' },
      { id: 'green',   label: 'Vert',    from: '#3AAA5A', to: '#1A6A30' },
      { id: 'gold',    label: 'Doré',    from: '#D4A000', to: '#8A6000' },
      { id: 'purple',  label: 'Violet',  from: '#7040D0', to: '#3A1A80' },
      { id: 'teal',    label: 'Sarcelle',from: '#20A0A0', to: '#0A6060' },
    ]
  },

};

// Avatar par défaut pour un nouvel élève
export const DEFAULT_AVATAR = {
  skinTone:  'light',
  faceShape: 'round',
  eyeShape:  'round',
  eyeColor:  'brown',
  hairStyle: 'short',
  hairColor: 'darkbrown',
  mouth:     'smile',
  facial:    'none',
  glasses:   'none',
  earrings:  'none',
  outfit:    'tshirt_gray',
  bgColor:   'blue',
};

// ─────────────────────────────────────────────
// GÉNÉRATEUR SVG
// ─────────────────────────────────────────────

/**
 * Génère le SVG complet d'un avatar.
 * @param {object} av - Objet avatar (toutes les clés de DEFAULT_AVATAR)
 * @param {number} size - Largeur en px (hauteur = size * 1.4)
 * @returns {string} - SVG complet sous forme de chaîne HTML
 */
export function generateAvatarSVG(av = {}, size = 90) {
  const a = { ...DEFAULT_AVATAR, ...av };

  // Résoudre les couleurs
  const skin  = AVATAR_OPTIONS.skinTone.options.find(o => o.id === a.skinTone) || AVATAR_OPTIONS.skinTone.options[1];
  const hair  = AVATAR_OPTIONS.hairColor.options.find(o => o.id === a.hairColor) || AVATAR_OPTIONS.hairColor.options[0];
  const iris  = AVATAR_OPTIONS.eyeColor.options.find(o => o.id === a.eyeColor) || AVATAR_OPTIONS.eyeColor.options[0];
  const bg    = AVATAR_OPTIONS.bgColor.options.find(o => o.id === a.bgColor) || AVATAR_OPTIONS.bgColor.options[0];

  const sc = skin.color;    // skin color
  const ss = skin.shadow;   // skin shadow
  const hc = hair.color;    // hair color
  const ic = iris.color;    // iris color

  // Dimensions internes SVG (viewBox 45 × 63)
  const W = 45, H = 63;

  const svgW = size;
  const svgH = Math.round(size * (H / W));

  // ── Helpers ──
  const e   = (tag, attrs, ...children) => {
    const a = Object.entries(attrs).map(([k,v]) => `${k}="${v}"`).join(' ');
    if (!children.length) return `<${tag} ${a}/>`;
    return `<${tag} ${a}>${children.join('')}</${tag}>`;
  };
  const ellipse = (cx,cy,rx,ry,fill,extra='') => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`;
  const rect    = (x,y,w,h,fill,rx=0,extra='') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${extra}/>`;
  const path    = (d, stroke, sw, fill='none', extra='') => `<path d="${d}" stroke="${stroke}" stroke-width="${sw}" fill="${fill}" stroke-linecap="round" ${extra}/>`;
  const line    = (x1,y1,x2,y2,stroke,sw,extra='') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}" ${extra}/>`;

  let layers = [];

  // ── 1. OMBRE AU SOL ──
  layers.push(ellipse(22, 61, 10, 1.8, 'rgba(0,0,0,0.28)'));

  // ── 2. CORPS ──
  const outfitData = {
    tshirt_gray:  { body: '#909090', detail: '#707070', type: 'tshirt' },
    hoodie_blue:  { body: '#2E5FA0', detail: '#1a3a70', type: 'hoodie' },
    hoodie_black: { body: '#2A2A2A', detail: '#111',    type: 'hoodie' },
    shirt_red:    { body: '#C03050', detail: '#801A30', type: 'shirt'  },
    shirt_green:  { body: '#2A8A40', detail: '#1A5A28', type: 'shirt'  },
    jacket_denim: { body: '#3A5A8A', detail: '#1A3A6A', type: 'jacket' },
    coat_luxury:  { body: '#1A1A2A', detail: '#2A2A3A', type: 'coat'   },
    jersey:       { body: '#CC2020', detail: '#881010', type: 'jersey' },
    suit:         { body: '#2A3A5A', detail: '#1A2A4A', type: 'suit'   },
  };
  const od = outfitData[a.outfit] || outfitData.tshirt_gray;

  // Corps principal
  layers.push(rect(5, 35, 35, 24, od.body, 5));

  // Détails selon type
  if (od.type === 'hoodie') {
    layers.push(`<polygon points="22,35 16,44 28,44" fill="${od.detail}"/>`);
    layers.push(rect(14, 47, 17, 9, od.detail, 2));
  } else if (od.type === 'tshirt') {
    layers.push(rect(17, 39, 11, 9, od.detail, 2));
  } else if (od.type === 'coat') {
    layers.push(`<polygon points="22,35 14,46 22,46" fill="${od.detail}"/>`);
    layers.push(`<polygon points="22,35 30,46 22,46" fill="${od.detail}"/>`);
    layers.push(ellipse(16, 42, 3, 3, '#FFD700'));
    layers.push(ellipse(16, 42, 1.5, 1.5, '#AA8800'));
  } else if (od.type === 'jacket') {
    layers.push(rect(5, 35, 6, 24, od.detail, 0, 'opacity="0.5"'));
    layers.push(rect(34, 35, 6, 24, od.detail, 0, 'opacity="0.5"'));
  } else if (od.type === 'suit') {
    layers.push(`<polygon points="22,35 15,46 22,46" fill="${od.detail}"/>`);
    layers.push(`<polygon points="22,35 29,46 22,46" fill="${od.detail}"/>`);
    layers.push(rect(20, 42, 4, 3, '#E8E8E8', 0, 'opacity="0.8"'));
  }

  // ── 3. BRAS ──
  // Gauche
  layers.push(rect(0, 35, 7, 16, od.body, 3));
  layers.push(ellipse(3, 53, 3, 3.5, sc));
  // Droit
  layers.push(rect(38, 35, 7, 16, od.body, 3));
  layers.push(ellipse(42, 53, 3, 3.5, sc));

  // ── 4. COU ──
  layers.push(rect(18, 30, 9, 7, sc, 2));

  // ── 5. CHEVEUX DERRIÈRE (longs / tresses / afro) ──
  if (['long','braids','afro'].includes(a.hairStyle)) {
    const hw = a.hairStyle === 'afro' ? 7 : 5;
    layers.push(rect(6, 14, hw, 28, hc, 2.5));
    layers.push(rect(34-hw+1, 14, hw, 28, hc, 2.5));
    if (a.hairStyle === 'braids') {
      // lignes de tresses
      for (let i = 0; i < 4; i++) {
        layers.push(line(8, 18+i*7, 8, 24+i*7, 'rgba(0,0,0,0.3)', 1));
        layers.push(line(37, 18+i*7, 37, 24+i*7, 'rgba(0,0,0,0.3)', 1));
      }
    }
  }

  // ── 6. TÊTE ──
  const faceShapes = {
    round:  { rx: 13, ry: 13 },
    oval:   { rx: 10, ry: 14 },
    square: { rx: 12, ry: 12, cornerRx: 3 },
    heart:  null, // spécial
    long:   { rx: 9,  ry: 15 },
  };

  const fs = faceShapes[a.faceShape];
  if (a.faceShape === 'heart') {
    layers.push(ellipse(22, 14, 13, 10, sc));
    layers.push(ellipse(22, 22, 9, 9, sc));
  } else if (a.faceShape === 'square') {
    layers.push(rect(9, 6, 27, 25, sc, 3));
  } else {
    layers.push(ellipse(22, 18, fs.rx, fs.ry, sc));
  }

  // Oreilles
  layers.push(ellipse(9, 19, 3, 4, sc));
  layers.push(ellipse(35, 19, 3, 4, sc));

  // ── 7. CHEVEUX DEVANT ──
  const hairTop = () => {
    switch (a.hairStyle) {
      case 'shaved': return ''; // pas de cheveux
      case 'afro':
        return [
          ellipse(22, 8, 16, 10, hc),
          rect(6, 10, 30, 10, hc),
          ellipse(7, 16, 4, 6, hc),
          ellipse(37, 16, 4, 6, hc),
          ellipse(12, 7, 4, 4, hc, 'opacity="0.7"'),
          ellipse(19, 5, 4, 4, hc, 'opacity="0.7"'),
          ellipse(26, 5, 4, 4, hc, 'opacity="0.7"'),
          ellipse(33, 7, 4, 4, hc, 'opacity="0.7"'),
        ].join('');
      case 'bun':
        return [
          ellipse(22, 8, 13, 7, hc),
          rect(9, 8, 26, 7, hc),
          ellipse(22, 4, 6, 5, hc), // chignon
          ellipse(9, 14, 3, 5, hc),
          ellipse(35, 14, 3, 5, hc),
        ].join('');
      case 'undercut':
        return [
          ellipse(22, 7, 13, 6, hc),
          rect(9, 7, 26, 5, hc),
          // côtés rasés plus courts
          ellipse(10, 14, 2, 4, hc, 'opacity="0.5"'),
          ellipse(34, 14, 2, 4, hc, 'opacity="0.5"'),
        ].join('');
      default: // short, long, curly, braids
        return [
          ellipse(22, 7, 13, 7, hc),
          rect(9, 7, 26, 8, hc),
          ellipse(9, 14, 3, 5, hc),
          ellipse(35, 14, 3, 5, hc),
          // texture frisée
          ...(a.hairStyle === 'curly' ? [
            ellipse(14, 6, 4, 4, hc, 'opacity="0.7"'),
            ellipse(21, 4, 4, 4, hc, 'opacity="0.7"'),
            ellipse(28, 6, 4, 4, hc, 'opacity="0.7"'),
            ellipse(10, 11, 3, 3, hc, 'opacity="0.5"'),
            ellipse(34, 11, 3, 3, hc, 'opacity="0.5"'),
          ] : []),
        ].join('');
    }
  };
  layers.push(hairTop());

  // ── 8. SOURCILS ──
  layers.push(rect(13, 15, 6, 2, darken(hc), 1));
  layers.push(rect(26, 15, 6, 2, darken(hc), 1));

  // ── 9. YEUX ──
  const eyeParams = {
    round:  { rx: 4.5, ry: 4,   iy: 0   },
    almond: { rx: 5,   ry: 3,   iy: 0.5 },
    wide:   { rx: 5,   ry: 5,   iy: 0   },
    narrow: { rx: 4,   ry: 2.5, iy: 0.5 },
    hooded: { rx: 4.5, ry: 3.5, iy: 0.5 },
  };
  const ep = eyeParams[a.eyeShape] || eyeParams.round;

  // Blancs des yeux
  layers.push(ellipse(15, 20, ep.rx, ep.ry, 'white'));
  layers.push(ellipse(29, 20, ep.rx, ep.ry, 'white'));
  // Iris
  layers.push(ellipse(15, 20+ep.iy, 3, 3, ic));
  layers.push(ellipse(29, 20+ep.iy, 3, 3, ic));
  // Pupilles
  layers.push(ellipse(15, 20+ep.iy, 1.5, 1.5, '#0A0A0A'));
  layers.push(ellipse(29, 20+ep.iy, 1.5, 1.5, '#0A0A0A'));
  // Reflets
  layers.push(ellipse(15.8, 19.3, 0.8, 0.8, 'white', 'opacity="0.95"'));
  layers.push(ellipse(29.8, 19.3, 0.8, 0.8, 'white', 'opacity="0.95"'));

  // Maquillage (boucles oreilles chandelier = style → ombre à paupières légère)
  if (['chandelier', 'drops'].includes(a.earrings)) {
    layers.push(ellipse(15, 18.5, 5.5, 1.5, '#3A0A20', 'opacity="0.35"'));
    layers.push(ellipse(29, 18.5, 5.5, 1.5, '#3A0A20', 'opacity="0.35"'));
  }

  // ── 10. NEZ ──
  layers.push(ellipse(22, 25, 2, 1.5, ss));

  // ── 11. BOUCHE ──
  const mouths = {
    smile:     () => path('M17 28 Q22 32 27 28', ss, 1.5),
    grin:      () => [
      path('M16 28 Q22 33 28 28', '#4A1A0A', 1.5),
      path('M17 28 Q22 32 27 28', 'white', 1.1, 'none', 'opacity="0.8"'),
    ].join(''),
    neutral:   () => rect(15, 28, 14, 1.5, ss, 0.8),
    smirk:     () => path('M17 28 Q21 31 27 27', ss, 1.5),
    pout:      () => path('M17 30 Q22 27 27 30', ss, 1.5),
    surprised: () => [
      ellipse(22, 29, 4, 3, '#4A1A0A'),
      ellipse(22, 28.5, 3.2, 2, '#AA3030'),
    ].join(''),
  };
  layers.push((mouths[a.mouth] || mouths.smile)());

  // ── 12. PILOSITÉ ──
  if (a.facial && a.facial !== 'none') {
    const beard = {
      stubble:     () => ellipse(22, 28, 6, 2.5, ss, 'opacity="0.25"'),
      mustache:    () => path('M16 26 Q22 29 28 26', darken(hc), 1.5),
      short_beard: () => [
        ellipse(22, 29, 8, 4, '#0A0A0A', 'opacity="0.45"'),
        path('M14 26 Q22 30 30 26', '#0A0A0A', 1, 'none', 'opacity="0.45"'),
      ].join(''),
      long_beard:  () => [
        rect(13, 27, 18, 8, '#0A0A0A', 3, 'opacity="0.5"'),
        path('M14 26 Q22 30 30 26', '#0A0A0A', 1.2, 'none', 'opacity="0.5"'),
      ].join(''),
      goatee:      () => [
        ellipse(22, 30, 4, 3, '#0A0A0A', 'opacity="0.5"'),
        path('M17 26 Q22 28 27 26', '#0A0A0A', 1, 'none', 'opacity="0.45"'),
      ].join(''),
    };
    layers.push((beard[a.facial] || (() => ''))());
  }

  // ── 13. LUNETTES ──
  if (a.glasses && a.glasses !== 'none') {
    const glassColor = { round:'#444', rect:'#222', cateye:'#1A1A2A', tinted:'#0A4A60', monocle:'#8A6000' };
    const gc = glassColor[a.glasses] || '#444';

    const glassLayers = {
      round: [
        `<circle cx="15" cy="20" r="5" fill="none" stroke="${gc}" stroke-width="0.9"/>`,
        `<circle cx="29" cy="20" r="5" fill="none" stroke="${gc}" stroke-width="0.9"/>`,
        line(20, 20, 24, 20, gc, 0.8),
        line(10, 19, 9, 17, gc, 0.8),
        line(34, 19, 35, 17, gc, 0.8),
      ],
      rect: [
        rect(10, 17, 10, 7, 'none', 1, `stroke="${gc}" stroke-width="0.9"`),
        rect(25, 17, 10, 7, 'none', 1, `stroke="${gc}" stroke-width="0.9"`),
        line(20, 20.5, 25, 20.5, gc, 0.8),
        line(10, 20, 9, 18, gc, 0.8),
        line(35, 20, 36, 18, gc, 0.8),
      ],
      cateye: [
        `<path d="M9 22 Q11 15 20 17 Q20 23 15 24 Z" fill="${gc}" opacity="0.85"/>`,
        `<path d="M24 17 Q33 15 35 22 L30 24 Q24 23 24 17 Z" fill="${gc}" opacity="0.85"/>`,
        line(20, 19, 24, 19, gc, 0.8),
        line(9, 21, 8, 18, gc, 0.8),
        line(35, 21, 36, 18, gc, 0.8),
      ],
      tinted: [
        rect(10, 17, 10, 7, '#1A6A80', 1, 'opacity="0.65"'),
        rect(25, 17, 10, 7, '#1A6A80', 1, 'opacity="0.65"'),
        rect(10, 17, 10, 7, 'none', 1, `stroke="${gc}" stroke-width="0.8"`),
        rect(25, 17, 10, 7, 'none', 1, `stroke="${gc}" stroke-width="0.8"`),
        line(20, 20.5, 25, 20.5, gc, 0.8),
        line(10, 20, 9, 18, gc, 0.8),
        line(35, 20, 36, 18, gc, 0.8),
      ],
      monocle: [
        `<circle cx="29" cy="20" r="5.5" fill="rgba(180,140,0,0.1)" stroke="${gc}" stroke-width="0.9"/>`,
        line(29, 25.5, 29, 29, gc, 0.7),
        line(34, 18, 36, 16, gc, 0.7),
      ],
    };
    (glassLayers[a.glasses] || []).forEach(l => layers.push(l));
  }

  // ── 14. BOUCLES D'OREILLES ──
  if (a.earrings && a.earrings !== 'none') {
    const earringLayers = {
      gold_studs:  [ellipse(9, 20, 1.8, 1.8, '#FFD700'), ellipse(35, 20, 1.8, 1.8, '#FFD700')],
      black_studs: [ellipse(9, 20, 1.8, 1.8, '#1A1A1A'), ellipse(35, 20, 1.8, 1.8, '#1A1A1A'),
                    ellipse(9, 20, 0.8, 0.8, '#444'), ellipse(35, 20, 0.8, 0.8, '#444')],
      hoops: [
        `<circle cx="9" cy="20" r="2.8" fill="none" stroke="#FFD700" stroke-width="0.9"/>`,
        `<circle cx="35" cy="20" r="2.8" fill="none" stroke="#FFD700" stroke-width="0.9"/>`,
      ],
      drops: [
        line(9, 19, 9, 24, '#C0C0C0', 0.8), ellipse(9, 25, 1.5, 1.5, '#C0C0C0'),
        line(35, 19, 35, 24, '#C0C0C0', 0.8), ellipse(35, 25, 1.5, 1.5, '#C0C0C0'),
      ],
      chandelier: [
        line(9, 19, 9, 22, '#FFD700', 0.8), ellipse(9, 23, 2, 1.2, '#FFD700'),
        ellipse(9, 25.5, 1.5, 1, '#EF9F27'), ellipse(9, 27.5, 1.2, 1.2, '#FFD700'),
        line(35, 19, 35, 22, '#FFD700', 0.8), ellipse(35, 23, 2, 1.2, '#FFD700'),
        ellipse(35, 25.5, 1.5, 1, '#EF9F27'), ellipse(35, 27.5, 1.2, 1.2, '#FFD700'),
      ],
    };
    (earringLayers[a.earrings] || []).forEach(l => layers.push(l));
  }

  // ── Assemblage final ──
  return `<svg width="${svgW}" height="${svgH}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="image-rendering:pixelated; display:block;">${layers.join('')}</svg>`;
}

/**
 * Génère la carte complète (fond coloré + avatar + nom + stats)
 */
export function generateCharacterCard(av = {}, profile = {}, size = 100) {
  const a   = { ...DEFAULT_AVATAR, ...av };
  const bg  = AVATAR_OPTIONS.bgColor.options.find(o => o.id === a.bgColor) || AVATAR_OPTIONS.bgColor.options[0];
  const svgH = Math.round(size * (63/45));
  const name = profile.displayName || 'Joueur';
  const level = profile.level || 1;
  const stars = '★'.repeat(Math.min(level, 5)) + '☆'.repeat(Math.max(0, 5-level));
  const netWorth = profile.netWorth ?? 0;
  const netColor = netWorth >= 0 ? '#7EE8A2' : '#FF8080';

  // Influence bonus visible si tenue active
  const outfit = AVATAR_OPTIONS.outfit.options.find(o => o.id === a.outfit);
  const influenceBonus = outfit?.influence;

  return `
<div style="
  border-radius:10px;
  overflow:hidden;
  border:2px solid rgba(0,0,0,0.4);
  display:inline-block;
  width:${size + 20}px;
  font-family: system-ui, sans-serif;
  box-shadow: inset 0 -3px 0 rgba(0,0,0,0.25);
">
  <div style="
    background: linear-gradient(170deg, ${bg.from} 30%, ${bg.to} 100%);
    padding:10px 10px 6px;
    text-align:center;
    position:relative;
    min-height:${svgH + 20}px;
    display:flex; align-items:flex-end; justify-content:center;
  ">
    ${influenceBonus ? `<div style="position:absolute;top:5px;right:5px;background:#FFD700;color:#5A3A00;font-size:9px;font-weight:600;padding:2px 6px;border-radius:4px;">+${influenceBonus} ✦ Influence</div>` : ''}
    ${generateAvatarSVG(av, size)}
  </div>
  <div style="background:#2A2A3E;padding:7px 10px 9px;border-top:2px solid rgba(0,0,0,0.4);">
    <div style="color:#fff;font-size:13px;font-weight:500;text-align:center;">${name}</div>
    <div style="color:#FFD700;text-align:center;font-size:12px;letter-spacing:1px;margin-top:2px;">${stars}</div>
    <div style="color:${netColor};text-align:center;font-size:11px;margin-top:3px;">Valeur nette : ${formatMoney(netWorth)}</div>
    <div style="color:#AAA;text-align:center;font-size:10px;margin-top:1px;">Niv. ${level}</div>
  </div>
</div>`;
}

// ─────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────

function darken(hex) {
  // Assombrit légèrement une couleur hex pour les sourcils/pilosité
  try {
    const n = parseInt(hex.replace('#',''), 16);
    const r = Math.max(0, (n>>16) - 40);
    const g = Math.max(0, ((n>>8)&0xFF) - 40);
    const b = Math.max(0, (n&0xFF) - 40);
    return '#' + [r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');
  } catch { return '#0A0A0A'; }
}

function formatMoney(n) {
  if (Math.abs(n) >= 1000) return (n/1000).toFixed(1).replace('.0','') + ' k$';
  return n + ' $';
}

/**
 * Vérifie si une option est disponible pour l'élève
 * @param {string} unlock - Code de déverrouillage de l'option
 * @param {object} progress - Progression de l'élève depuis Firestore
 */
export function isUnlocked(unlock, progress = {}) {
  if (!unlock) return true;
  if (unlock === 'boutique') return true; // achetable en boutique avec argent du jeu
  if (unlock === 'age_18')   return progress.ageUnlocked18 === true;
  if (unlock === 'ch5')      return progress.ch5Completed === true;
  if (unlock === 'rare')     return (progress.rareItems || []).includes(unlock);
  return false;
}
