// portfolio.js
import { db } from '../js/firebase-init.js';
import { requireAuth, formatCAD, formatDate, initTopbar, showToast }
  from '../js/utils.js';
import {
  doc, getDoc, getDocs, collection, query, orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const FALLBACK_PRICES = {
  'RY.TO': 135.42, 'TD.TO': 83.15, 'SHOP.TO': 112.30, 'ENB.TO': 57.80,
  'CNR.TO': 175.60, 'BCE.TO': 44.20, 'BNS.TO': 72.10, 'MFC.TO': 40.50,
  'ABX.TO': 25.80, 'SU.TO': 55.30, 'AAPL': 189.50, 'MSFT': 415.20,
  'AMZN': 185.30, 'GOOGL': 168.40, 'TSLA': 242.10, 'NVDA': 875.40,
  'JPM': 198.60, 'JNJ': 156.30, 'V': 278.90, 'WMT': 68.40,
  'XIC.TO': 32.15, 'XUS.TO': 61.40, 'XEQT.TO': 29.80, 'VFV.TO': 118.50,
  'ZAG.TO': 15.20
};

const STOCK_NAMES = {
  'RY.TO': 'Banque Royale', 'TD.TO': 'Banque TD', 'SHOP.TO': 'Shopify',
  'ENB.TO': 'Enbridge', 'CNR.TO': 'CN Rail', 'BCE.TO': 'BCE',
  'BNS.TO': 'Banque Scotia', 'MFC.TO': 'Manuvie', 'ABX.TO': 'Barrick Gold',
  'SU.TO': 'Suncor', 'AAPL': 'Apple', 'MSFT': 'Microsoft', 'AMZN': 'Amazon',
  'GOOGL': 'Alphabet', 'TSLA': 'Tesla', 'NVDA': 'NVIDIA', 'JPM': 'JPMorgan',
  'JNJ': 'J&J', 'V': 'Visa', 'WMT': 'Walmart', 'XIC.TO': 'iShares Canada',
  'XUS.TO': 'iShares S&P500', 'XEQT.TO': 'iShares All-Equity',
  'VFV.TO': 'Vanguard S&P500', 'ZAG.TO': 'BMO Obligations'
};

async function init() {
  try {
    const { user, data: userData } = await requireAuth('student');
    initTopbar(userData);

    const portfolio = userData.portfolio || {};
    const cash = userData.celiBalance || 0;

    // Récupérer les cours actuels
    const prices = await fetchCurrentPrices(Object.keys(portfolio));

    // Calculer les stats
    let totalInvested = 0;
    let totalCost = 0;

    Object.entries(portfolio).forEach(([symbol, pos]) => {
      const currentPrice = prices[symbol] || FALLBACK_PRICES[symbol] || 0;
      totalInvested += currentPrice * pos.shares;
      totalCost += (pos.avgCost || 0) * pos.shares;
    });

    const totalCELI = totalInvested + cash;
    const gainLoss = totalInvested - totalCost;
    const gainPct = totalCost > 0 ? (gainLoss / totalCost) * 100 : 0;

    // Afficher les stats
    document.getElementById('stat-invested').textContent = formatCAD(totalInvested);
    document.getElementById('stat-cash').textContent = formatCAD(cash);
    document.getElementById('stat-total').textContent = formatCAD(totalCELI);

    const gainEl = document.getElementById('stat-gain');
    gainEl.textContent = `${gainLoss >= 0 ? '+' : ''}${formatCAD(gainLoss)}`;
    gainEl.className = `stat-value font-mono ${gainLoss >= 0 ? 'green' : 'text-red'}`;
    document.getElementById('stat-gain-pct').textContent =
      `${gainLoss >= 0 ? '+' : ''}${gainPct.toFixed(2)}% vs coût d'achat`;

    // Afficher les positions
    renderHoldings(portfolio, prices);

    // Charger et afficher l'historique
    const txSnap = await getDocs(
      query(
        collection(db, 'users', user.uid, 'transactions'),
        orderBy('date', 'desc')
      )
    );
    const transactions = [];
    txSnap.forEach(d => transactions.push({ id: d.id, ...d.data() }));
    renderHistory(transactions);

  } catch (err) {
    console.error(err);
  }
}

async function fetchCurrentPrices(symbols) {
  if (symbols.length === 0) return {};
  const prices = {};

  try {
    const url = `/api/quotes?symbols=${encodeURIComponent(symbols.join(','))}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('API error');
    const data = await res.json();
    data.quoteResponse?.result?.forEach(q => {
      prices[q.symbol] = q.regularMarketPrice;
    });
  } catch {
    symbols.forEach(s => {
      const base = FALLBACK_PRICES[s] || 50;
      prices[s] = parseFloat((base * (1 + (Math.random() - 0.5) * 0.02)).toFixed(2));
    });
  }

  return prices;
}

function renderHoldings(portfolio, prices) {
  const container = document.getElementById('holdings-container');
  const entries = Object.entries(portfolio);

  if (entries.length === 0) {
    container.innerHTML = `
      <div class="empty-portfolio">
        <div class="empty-portfolio-icon">📭</div>
        <h3 style="font-size:20px; font-weight:700; margin-bottom:8px;">Portefeuille vide</h3>
        <p class="text-muted" style="margin-bottom:24px;">Tu n'as pas encore effectué de placement.<br>
        Rends-toi au marché boursier pour commencer!</p>
        <a href="market.html" class="btn-primary"
          style="text-decoration:none; display:inline-block; width:auto; padding:12px 28px;">
          Aller au marché →
        </a>
      </div>`;
    return;
  }

  // Trier par valeur décroissante
  entries.sort(([sa, a], [sb, b]) => {
    const va = (prices[sa] || 0) * a.shares;
    const vb = (prices[sb] || 0) * b.shares;
    return vb - va;
  });

  container.innerHTML = `
    <div style="overflow-x:auto;">
      <div style="display:grid; grid-template-columns:auto 1fr repeat(4, auto); gap:12px;
           padding:10px 20px; font-size:11px; font-weight:700; text-transform:uppercase;
           letter-spacing:0.8px; color:var(--slate); border-bottom:2px solid var(--slate-light);">
        <span></span>
        <span>Titre</span>
        <span style="text-align:right;">Qté</span>
        <span style="text-align:right;">Coût moy.</span>
        <span style="text-align:right;">Prix actuel</span>
        <span style="text-align:right;">Gain/Perte</span>
      </div>
      ${entries.map(([symbol, pos]) => {
        const currentPrice = prices[symbol] || FALLBACK_PRICES[symbol] || 0;
        const totalValue = currentPrice * pos.shares;
        const cost = (pos.avgCost || 0) * pos.shares;
        const gain = totalValue - cost;
        const gainPct = cost > 0 ? (gain / cost) * 100 : 0;
        const isUp = gain >= 0;
        const shortSymbol = symbol.replace('.TO', '');
        const name = STOCK_NAMES[symbol] || symbol;

        return `
          <div class="holding-row">
            <div class="holding-logo">${shortSymbol.slice(0,4)}</div>
            <div>
              <div style="font-weight:700; font-size:15px;">${shortSymbol}</div>
              <div style="font-size:12px; color:var(--text-soft);">${name}</div>
            </div>
            <div style="text-align:right; font-family:var(--font-mono); font-weight:600;">
              ${pos.shares}
            </div>
            <div style="text-align:right; font-family:var(--font-mono); font-size:13px; color:var(--text-soft);">
              ${formatCAD(pos.avgCost || 0)}
            </div>
            <div style="text-align:right;">
              <div class="font-mono" style="font-weight:700;">${formatCAD(currentPrice)}</div>
              <div style="font-size:12px; color:var(--text-soft);">= ${formatCAD(totalValue)}</div>
            </div>
            <div style="text-align:right;">
              <div class="font-mono ${isUp ? 'gain-positive' : 'gain-negative'}" style="font-weight:700;">
                ${isUp ? '+' : ''}${formatCAD(gain)}
              </div>
              <div style="font-size:12px; ${isUp ? 'color:var(--accent-dim)' : 'color:var(--danger)'}">
                ${isUp ? '+' : ''}${gainPct.toFixed(2)}%
              </div>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

function renderHistory(transactions) {
  const container = document.getElementById('history-container');

  if (transactions.length === 0) {
    container.innerHTML = `<p class="text-muted" style="text-align:center; padding:32px;">
      Aucune transaction pour l'instant.
    </p>`;
    return;
  }

  const typeConfig = {
    stock_buy:      { icon: '📈', label: 'Achat',           cls: 'buy',    color: 'var(--accent-dim)' },
    stock_sell:     { icon: '📉', label: 'Vente',           cls: 'sell',   color: 'var(--danger)' },
    quiz_reward:    { icon: '🎓', label: 'Quiz réussi',     cls: 'credit', color: 'var(--accent-dim)' },
    teacher_credit: { icon: '👩‍🏫', label: 'Crédit enseignant', cls: 'credit', color: 'var(--accent-dim)' },
  };

  container.innerHTML = transactions.slice(0, 50).map(tx => {
    const cfg = typeConfig[tx.type] || { icon: '💰', label: tx.type, cls: 'credit', color: 'var(--text)' };
    const amount = tx.amount || tx.total || 0;
    const isPositive = amount >= 0;

    return `
      <div class="history-row">
        <div class="tx-icon ${cfg.cls}">${cfg.icon}</div>
        <div>
          <div style="font-weight:600; font-size:14px;">${cfg.label}${tx.symbol ? ` — ${tx.symbol.replace('.TO','')}` : ''}</div>
          <div style="font-size:12px; color:var(--text-soft);">${tx.description || ''}</div>
        </div>
        <div style="text-align:right; font-size:12px; color:var(--text-soft);">
          ${formatDate(tx.date)}
        </div>
        <div style="text-align:right; font-family:var(--font-mono); font-weight:700;
             color:${isPositive ? 'var(--accent-dim)' : 'var(--danger)'};">
          ${isPositive ? '+' : ''}${formatCAD(Math.abs(amount))}
        </div>
      </div>`;
  }).join('');
}

init();
