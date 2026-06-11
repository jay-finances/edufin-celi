// api/quotes.js — Proxy Yahoo Finance pour Vercel
// Ce fichier s'exécute côté serveur sur Vercel et évite les problèmes CORS

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');

  const { symbols } = req.query;

  if (!symbols) {
    return res.status(400).json({ error: 'Paramètre symbols requis' });
  }

  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${encodeURIComponent(symbols)}&fields=regularMarketPrice,regularMarketChange,regularMarketChangePercent,currency,shortName`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; EduFinBot/1.0)',
        'Accept': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance error: ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Erreur proxy Yahoo Finance:', error);

    // Renvoyer des données simulées en cas d'échec
    return res.status(200).json({
      quoteResponse: {
        result: [],
        error: 'Données simulées — API temporairement indisponible'
      }
    });
  }
}
