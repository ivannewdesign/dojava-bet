// api/matches.js

let cache = {
  data: null,
  timestamp: 0
};

const CACHE_DURATION = 180000; // 3 minute
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

async function fetchFromFlashscore(sportId) {
  try {
    const url = `https://flashscore.p.rapidapi.com/api/flashscore/v1/match/live/${sportId}`;
    
    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'flashscore.p.rapidapi.com'
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    
    // Flashscore vraća array direktno
    return data || [];
    
  } catch (error) {
    console.error(`Error fetching sport ${sportId}:`, error);
    return [];
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const now = Date.now();

  if (cache.data && (now - cache.timestamp) < CACHE_DURATION) {
    console.log('✅ Serving from cache');
    return res.status(200).json({
      ...cache.data,
      cached: true,
      cacheAge: Math.floor((now - cache.timestamp) / 1000)
    });
  }

  console.log('🔄 Fetching fresh data...');

  try {
    const [football, basketball, tennis] = await Promise.all([
      fetchFromFlashscore(1),  // Football
      fetchFromFlashscore(3),  // Basketball
      fetchFromFlashscore(2)   // Tennis
    ]);

    cache = {
      data: {
        football,
        basketball,
        tennis,
        timestamp: now
      },
      timestamp: now
    };

    console.log(`✅ Fresh data cached`);

    return res.status(200).json({
      ...cache.data,
      cached: false,
      cacheAge: 0
    });

  } catch (error) {
    console.error('❌ Error:', error);
    
    if (cache.data) {
      return res.status(200).json({
        ...cache.data,
        cached: true,
        error: 'Stale cache'
      });
    }

    return res.status(500).json({ 
      error: 'Failed to fetch',
      football: [],
      basketball: [],
      tennis: []
    });
  }
}