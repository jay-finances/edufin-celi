// api/news.js — Proxy RSS pour ÉduFin
// Lit les flux La Presse côté serveur et retourne du JSON propre

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=1800'); // cache 30 min

  const FEEDS = [
    {
      url: 'https://www.lapresse.ca/affaires/finances-personnelles/rss',
      label: 'Finances personnelles',
    },
    {
      url: 'https://www.lapresse.ca/affaires/economie/rss',
      label: 'Économie',
    },
  ];

  // Articles épinglés par l'enseignant (lus depuis Firestore via paramètre)
  // Le front-end envoie les articles épinglés directement — pas besoin de les lire ici

  try {
    const allItems = [];

    for (const feed of FEEDS) {
      const response = await fetch(feed.url, {
        headers: { 'User-Agent': 'EduFin-RSS-Reader/1.0' },
      });

      if (!response.ok) continue;

      const xml = await response.text();

      // Parse RSS avec regex légère (pas de lib externe nécessaire)
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];

      for (const [, itemXml] of items) {
        const title = extractCDATA(itemXml, 'title');
        const link  = extractTag(itemXml, 'link') || extractCDATA(itemXml, 'link');
        const desc  = stripHtml(extractCDATA(itemXml, 'description') || '');
        const pubDate = extractTag(itemXml, 'pubDate') || '';
        const author  = extractCDATA(itemXml, 'dc:creator') || '';

        if (!title || !link) continue;

        allItems.push({
          title,
          link,
          description: desc.slice(0, 200) + (desc.length > 200 ? '…' : ''),
          pubDate,
          author,
          source: feed.label,
          isBerube: author.toLowerCase().includes('bérubé') ||
                    author.toLowerCase().includes('berube'),
        });
      }
    }

    // Tri par date décroissante
    allItems.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));

    res.status(200).json({ items: allItems.slice(0, 20) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

function extractTag(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>([^<]*)<\/${tag}>`));
  return m ? m[1].trim() : '';
}

function extractCDATA(xml, tag) {
  const m = xml.match(new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?<\\/${tag}>`, 's'));
  return m ? m[1].trim() : '';
}

function stripHtml(str) {
  return str.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').trim();
}
