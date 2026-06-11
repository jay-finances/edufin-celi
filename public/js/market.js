// market.js — Simulation boursière
import { db, auth } from '../js/firebase-init.js';
import { requireAuth, formatCAD, initTopbar, showToast }
  from '../js/utils.js';
import {
  doc, getDoc, updateDoc, addDoc, collection, serverTimestamp, increment
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ── Univers des titres disponibles ────────────────────────────────
const STOCKS = [
  // TSX canadien
  { symbol: 'RY.TO',  name: 'Banque Royale du Canada',   market: 'TSX',    sector: 'Finance' },
  { symbol: 'TD.TO',  name: 'Banque TD',                  market: 'TSX',    sector: 'Finance' },
  { symbol: 'SHOP.TO',name: 'Shopify Inc.',               market: 'TSX',    sector: 'Tech' },
  { symbol: 'ENB.TO', name: 'Enbridge Inc.',              market: 'TSX',    sector: 'Énergie' },
  { symbol: 'CNR.TO', name: 'Canadien National',          market: 'TSX',    sector: 'Transport' },
  { symbol: 'BCE.TO', name: 'BCE Inc.',                   market: 'TSX',    sector: 'Télécom' },
  { symbol: 'BNS.TO', name: 'Banque Scotia',              market: 'TSX',    sector: 'Finance' },
  { symbol: 'MFC.TO', name: 'Manuvie',                    market: 'TSX',    sector: 'Finance' },
  { symbol: 'ABX.TO', name: 'Barrick Gold',               market: 'TSX',    sector: 'Ressources' },
  { symbol: 'SU.TO',  name: 'Suncor Énergie',             market: 'TSX',    sector: 'Énergie' },
  // NYSE / NASDAQ américain
  { symbol: 'AAPL',   name: 'Apple Inc.',                 market: 'NASDAQ', sector: 'Tech' },
  { symbol: 'MSFT',   name: 'Microsoft Corp.',            market: 'NASDAQ', sector: 'Tech' },
  { symbol: 'AMZN',   name: 'Amazon.com Inc.',            market: 'NASDAQ', sector: 'Commerce' },
  { symbol: 'GOOGL',  name: 'Alphabet (Google)',          market: 'NASDAQ', sector: 'Tech' },
  { symbol: 'TSLA',   name: 'Tesla Inc.',                 market: 'NASDAQ', sector: 'Auto/Tech' },
  { symbol: 'NVDA',   name: 'NVIDIA Corp.',               market: 'NASDAQ', sector: 'Tech' },
  { symbol: 'JPM',    name: 'JPMorgan Chase',             market: 'NYSE',   sector: 'Finance' },
  { symbol: 'JNJ',    name: 'Johnson & Johnson',          market: 'NYSE',   sector: 'Santé' },
  { symbol: 'V',      name: 'Visa Inc.',                  market: 'NYSE',   sector: 'Finance' },
  { symbol: 'WMT',    name: 'Walmart Inc.',               market: 'NYSE',   sector: 'Commerce' },
  // FNB populaires
  { symbol: 'XIC.TO', name: 'iShares MSCI Canada (FNB)', market: 'FNB',    sector: 'FNB Canada' },
  { symbol: 'XUS.TO', name: 'iShares Core S&P 500 (FNB)',market: 'FNB',    sector: 'FNB USA' },
  { symbol: 'XEQT.TO',name: 'iShares All Equity (FNB)',  market: 'FNB',    sector: 'FNB Mondial' },
  { symbol: 'VFV.TO', name: 'Vanguard S&P 500 (FNB)',    market: 'FNB',    sector: 'FNB USA' },
  { symbol: 'ZAG.TO', name: 'BMO Obligations (FNB)',     market: 'FNB',    sector: 'FNB Obligations' },
];

// ── Prix de repli (si l'API échoue) ──────────────────────────────
const FALLBACK_PRICES = {
  'RY.TO': 135.42, 'TD.TO': 83.15, 'SHOP.TO': 112.30, 'ENB.TO': 57.80,
  'CNR.TO': 175.60, 'BCE.TO': 44.20, 'BNS.TO': 72.10, 'MFC.TO': 40.50,
  'ABX.TO': 25.80, 'SU.TO': 55.30, 'AAPL': 189.50, 'MSFT': 415.20,
  'AMZN': 185.30, 'GOOGL': 168.40, 'TSLA': 242.10, 'NVDA': 875.40,
  'JPM': 198.60, 'JNJ': 156.30, 'V': 278.90, 'WMT': 68.40,
  'XIC.TO': 32.15, 'XUS.TO': 61.40, 'XEQT.TO': 29.80, 'VFV.TO': 118.50,
  'ZAG.TO': 15.20
};

let currentUser = null;
let userData = null;
let stockData = {};     // symbol → { price, change, changePct }
let portfolio = {};     // symbol → { shares, avgCost }
let tradeMode = 'buy';  // 'buy' | 'sell'
let tradeSymbol = null;
let tradeQty = 1;
let currentFilter = 'all';
let allLoaded = false;

// ── Init ──────────────────────────────────────────────────────────
async function init() {
  try {
    const authData = await requireAuth('student');
    currentUser = authData.user;
    userData = authData.data;
    initTopbar(userData);

    // Charger le portefeuille
    await loadPortfolio();

    // Afficher squelettes pendant le chargement
    renderSkeletons();

    // Charger les cours
    await fetchPrices();
    allLoaded = true;
    renderStocks();

    // Rafraîchir toutes les 3 minutes
    setInterval(async () => {
      await fetchPrices();
      renderStocks();
    }, 180000);

    setupFilters();
    setupSearch();
    setupTradeModal();

  } catch (err) {
    console.error(err);
  }
}

// ── Chargement du portefeuille ────────────────────────────────────
async function loadPortfolio() {
  const snap = await getDoc(doc(db, 'users', currentUser.uid));
  userData = snap.data();
  portfolio = userData.portfolio || {};
}

// ── API cours boursiers ───────────────────────────────────────────
async function fetchPrices() {
  const symbols = STOCKS.map(s => s.symbol).join(',');

  try {
    // Utiliser l'API Yahoo Finance via proxy Vercel
    const url = `/api/quotes?symbols=${encodeURIComponent(symbols)}`;
    const res = await fetch(url);

    if (!res.ok) throw new Error('API non disponible');

    const data = await res.json();
    if (data && data.quoteResponse && data.quoteResponse.result) {
      data.quoteResponse.result.forEach(q => {
        stockData[q.symbol] = {
          price: q.regularMarketPrice,
          change: q.regularMarketChange,
          changePct: q.regularMarketChangePercent,
          currency: q.currency || 'CAD'
        };
      });
    }
  } catch (err) {
    // Utiliser les prix de repli avec une légère variation aléatoire
    console.warn('API indisponible, utilisation des prix simulés');
    STOCKS.forEach(s => {
      const base = FALLBACK_PRICES[s.symbol] || 50;
      const variation = (Math.random() - 0.48) * base * 0.015;
      const price = parseFloat((base + variation).toFixed(2));
      const change = parseFloat(variation.toFixed(2));
      const changePct = parseFloat(((variation / base) * 100).toFixed(2));
      stockData[s.symbol] = { price, change, changePct, currency: s.symbol.endsWith('.TO') ? 'CAD' : 'USD' };
    });
  }

  document.getElementById('last-update').textContent =
    new Intl.DateTimeFormat('fr-CA', { hour:'2-digit', minute:'2-digit', second:'2-digit' }).format(new Date());
}

// ── Rendu squelettes ──────────────────────────────────────────────
function renderSkeletons() {
  const grid = document.getElementById('stock-grid');
  grid.innerHTML = Array(12).fill(0).map(() => `
    <div class="stock-tile" style="pointer-events:none;">
      <div class="stock-tile-header">
        <div>
          <div class="loading-skeleton" style="width:80px; margin-bottom:8px;"></div>
          <div class="loading-skeleton" style="width:140px; height:14px;"></div>
        </div>
        <div class="loading-skeleton" style="width:50px; height:20px;"></div>
      </div>
      <div class="loading-skeleton" style="width:100px; height:28px; margin-bottom:8px;"></div>
      <div class="loading-skeleton" style="width:70px; height:16px; margin-bottom:16px;"></div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
        <div class="loading-skeleton" style="height:40px; border-radius:8px;"></div>
        <div class="loading-skeleton" style="height:40px; border-radius:8px;"></div>
      </div>
    </div>`).join('');
}

// ── Rendu des titres ──────────────────────────────────────────────
function renderStocks(filter = currentFilter, search = '') {
  const grid = document.getElementById('stock-grid');

  let filtered = STOCKS.filter(s => {
    const matchMarket = filter === 'all' || s.market === filter;
    const matchSearch = !search ||
      s.symbol.toLowerCase().includes(search.toLowerCase()) ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.sector.toLowerCase().includes(search.toLowerCase());
    return matchMarket && matchSearch;
  });

  if (filtered.length === 0) {
    grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:48px; color:var(--slate);">
      Aucun titre trouvé pour cette recherche.
    </div>`;
    return;
  }

  grid.innerHTML = filtered.map(s => {
    const data = stockData[s.symbol];
    if (!data) return '';

    const price = data.price;
    const change = data.change;
    const changePct = data.changePct;
    const isUp = change >= 0;
    const currency = data.currency || 'CAD';
    const sharesOwned = portfolio[s.symbol]?.shares || 0;

    const priceFormatted = new Intl.NumberFormat('fr-CA', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2
    }).format(price);

    const changeFormatted = `${isUp ? '+' : ''}${change.toFixed(2)} (${isUp ? '+' : ''}${changePct.toFixed(2)}%)`;

    return `
      <div class="stock-tile" data-symbol="${s.symbol}">
        <div class="stock-tile-header">
          <div>
            <div class="stock-symbol-big">${s.symbol.replace('.TO', '')}</div>
            <div class="stock-name-sub">${s.name}</div>
            <div style="font-size:11px; color:var(--slate); margin-top:4px;">${s.sector}</div>
          </div>
          <span class="stock-exchange-badge">${s.market}</span>
        </div>
        <div class="stock-price-big">${priceFormatted}</div>
        <div class="stock-change-row">
          <span class="change-badge ${isUp ? 'up' : 'down'}">${changeFormatted}</span>
          <span style="font-size:11px; color:var(--slate);">${currency}</span>
        </div>
        ${sharesOwned > 0 ? `
          <div style="font-size:12px; color:var(--accent-dim); margin-bottom:12px; font-weight:600;">
            📦 Tu possèdes ${sharesOwned} action${sharesOwned > 1 ? 's' : ''}
          </div>` : ''}
        <div class="stock-tile-actions">
          <button class="btn-buy-tile" data-symbol="${s.symbol}" data-action="buy">
            Acheter
          </button>
          <button class="btn-sell-tile" data-symbol="${s.symbol}" data-action="sell"
            ${sharesOwned === 0 ? 'disabled' : ''}>
            Vendre ${sharesOwned > 0 ? `(${sharesOwned})` : ''}
          </button>
        </div>
      </div>`;
  }).join('');

  // Événements
  grid.querySelectorAll('.btn-buy-tile, .btn-sell-tile:not(:disabled)').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openTradeModal(btn.dataset.symbol, btn.dataset.action);
    });
  });
}

// ── Filtres et recherche ──────────────────────────────────────────
function setupFilters() {
  document.querySelectorAll('.filter-chip[data-market]').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip[data-market]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentFilter = chip.dataset.market;
      renderStocks(currentFilter, document.getElementById('stock-search-input').value);
    });
  });
}

function setupSearch() {
  document.getElementById('stock-search-input').addEventListener('input', e => {
    renderStocks(currentFilter, e.target.value);
  });
}

// ── Modal de transaction ──────────────────────────────────────────
function setupTradeModal() {
  document.getElementById('btn-qty-minus').addEventListener('click', () => {
    if (tradeQty > 1) { tradeQty--; updateModalSummary(); }
  });
  document.getElementById('btn-qty-plus').addEventListener('click', () => {
    tradeQty++;
    updateModalSummary();
  });
  document.getElementById('btn-qty-max').addEventListener('click', () => {
    if (tradeMode === 'buy') {
      const price = stockData[tradeSymbol]?.price || 0;
      const balance = userData.celiBalance || 0;
      tradeQty = Math.max(1, Math.floor(balance / price));
    } else {
      tradeQty = portfolio[tradeSymbol]?.shares || 1;
    }
    updateModalSummary();
  });
  document.getElementById('btn-confirm-trade').addEventListener('click', confirmTrade);
}

function openTradeModal(symbol, action) {
  tradeSymbol = symbol;
  tradeMode = action;
  tradeQty = 1;

  const stock = STOCKS.find(s => s.symbol === symbol);
  const data = stockData[symbol];
  const sharesOwned = portfolio[symbol]?.shares || 0;

  document.getElementById('modal-trade-title').textContent =
    `${action === 'buy' ? 'Acheter' : 'Vendre'} — ${symbol.replace('.TO', '')}`;

  const currency = data.currency || 'CAD';
  document.getElementById('modal-price').textContent = new Intl.NumberFormat('fr-CA', {
    style: 'currency', currency, minimumFractionDigits: 2
  }).format(data.price);

  if (action === 'buy') {
    document.getElementById('modal-balance-label').textContent = 'Solde disponible';
    document.getElementById('modal-available').textContent = formatCAD(userData.celiBalance || 0);
  } else {
    document.getElementById('modal-balance-label').textContent = 'Actions possédées';
    document.getElementById('modal-available').textContent = `${sharesOwned} action${sharesOwned > 1 ? 's' : ''}`;
  }

  document.getElementById('modal-trade-error').style.display = 'none';
  document.getElementById('btn-confirm-trade').textContent =
    action === 'buy' ? "Confirmer l'achat" : "Confirmer la vente";
  document.getElementById('btn-confirm-trade').style.background =
    action === 'buy'
      ? 'linear-gradient(135deg, var(--accent), var(--accent-dim))'
      : 'linear-gradient(135deg, var(--danger), #c0392b)';

  updateModalSummary();
  document.getElementById('modal-trade').style.display = 'flex';
}

function updateModalSummary() {
  const data = stockData[tradeSymbol];
  if (!data) return;
  const currency = data.currency || 'CAD';
  const total = data.price * tradeQty;

  document.getElementById('qty-display').textContent = tradeQty;
  document.getElementById('sum-qty').textContent = tradeQty;
  document.getElementById('sum-unit-price').textContent = new Intl.NumberFormat('fr-CA', {
    style: 'currency', currency, minimumFractionDigits: 2
  }).format(data.price);
  document.getElementById('sum-total').textContent = new Intl.NumberFormat('fr-CA', {
    style: 'currency', currency: 'CAD', minimumFractionDigits: 2
  }).format(total);
}

async function confirmTrade() {
  const errEl = document.getElementById('modal-trade-error');
  errEl.style.display = 'none';

  const data = stockData[tradeSymbol];
  const price = data.price;
  const total = price * tradeQty;
  const stock = STOCKS.find(s => s.symbol === tradeSymbol);

  if (tradeMode === 'buy') {
    // Vérifications
    if (total > (userData.celiBalance || 0)) {
      errEl.textContent = `Solde insuffisant. Tu as ${formatCAD(userData.celiBalance || 0)} disponible.`;
      errEl.style.display = 'block';
      return;
    }

    // Plafond CELI annuel simulé (7000$)
    const yearlyInvested = userData.yearlyInvested || 0;
    if (yearlyInvested + total > 7000) {
      errEl.textContent = `Cette transaction dépasserait le plafond CELI annuel de 7 000 $.`;
      errEl.style.display = 'block';
      return;
    }

    try {
      const currentShares = portfolio[tradeSymbol]?.shares || 0;
      const currentAvg = portfolio[tradeSymbol]?.avgCost || 0;
      const newShares = currentShares + tradeQty;
      const newAvg = ((currentAvg * currentShares) + (price * tradeQty)) / newShares;

      const newPortfolio = {
        ...portfolio,
        [tradeSymbol]: { shares: newShares, avgCost: parseFloat(newAvg.toFixed(4)) }
      };

      await updateDoc(doc(db, 'users', currentUser.uid), {
        celiBalance: increment(-total),
        portfolio: newPortfolio,
        yearlyInvested: increment(total)
      });

      await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), {
        type: 'stock_buy',
        symbol: tradeSymbol,
        name: stock?.name,
        shares: tradeQty,
        price,
        total: -total,
        amount: -total,
        description: `Achat de ${tradeQty} action(s) ${tradeSymbol}`,
        date: serverTimestamp()
      });

      portfolio = newPortfolio;
      userData.celiBalance = (userData.celiBalance || 0) - total;
      userData.yearlyInvested = (userData.yearlyInvested || 0) + total;

      document.getElementById('topbar-balance').textContent = formatCAD(userData.celiBalance);
      document.getElementById('modal-trade').style.display = 'none';
      showToast(`✅ Achat de ${tradeQty} action(s) ${tradeSymbol.replace('.TO','')} confirmé!`, 'success');
      renderStocks(currentFilter, document.getElementById('stock-search-input').value);

    } catch (err) {
      errEl.textContent = 'Erreur lors de la transaction.';
      errEl.style.display = 'block';
    }

  } else {
    // VENTE
    const sharesOwned = portfolio[tradeSymbol]?.shares || 0;
    if (tradeQty > sharesOwned) {
      errEl.textContent = `Tu ne possèdes que ${sharesOwned} action(s).`;
      errEl.style.display = 'block';
      return;
    }

    try {
      const newShares = sharesOwned - tradeQty;
      const newPortfolio = { ...portfolio };
      if (newShares === 0) {
        delete newPortfolio[tradeSymbol];
      } else {
        newPortfolio[tradeSymbol] = { ...newPortfolio[tradeSymbol], shares: newShares };
      }

      await updateDoc(doc(db, 'users', currentUser.uid), {
        celiBalance: increment(total),
        portfolio: newPortfolio
      });

      await addDoc(collection(db, 'users', currentUser.uid, 'transactions'), {
        type: 'stock_sell',
        symbol: tradeSymbol,
        name: stock?.name,
        shares: tradeQty,
        price,
        total,
        amount: total,
        description: `Vente de ${tradeQty} action(s) ${tradeSymbol}`,
        date: serverTimestamp()
      });

      portfolio = newPortfolio;
      userData.celiBalance = (userData.celiBalance || 0) + total;

      document.getElementById('topbar-balance').textContent = formatCAD(userData.celiBalance);
      document.getElementById('modal-trade').style.display = 'none';
      showToast(`✅ Vente de ${tradeQty} action(s) ${tradeSymbol.replace('.TO','')} confirmée!`, 'success');
      renderStocks(currentFilter, document.getElementById('stock-search-input').value);

    } catch (err) {
      errEl.textContent = 'Erreur lors de la transaction.';
      errEl.style.display = 'block';
    }
  }
}

init();
