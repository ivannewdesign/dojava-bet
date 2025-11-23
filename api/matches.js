// api/matches.js

let cache = {
  data: null,
  timestamp: 0
};

const CACHE_DURATION = 180000;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

async function fetchFromFlashscore(sportId) {
  try {
    const url = `https://flashscore.p.rapidapi.com/api/flashscore/v1/match/live/${sportId}`;
    
    console.log(`Calling: ${url}`);
    
    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'flashscore.p.rapidapi.com'
      }
    });

    console.log(`Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error: ${response.status} - ${errorText}`);
      throw new Error(`API Error: ${response.status}`);
    }

    const data = await response.json();
    
    console.log(`Sport ${sportId} data:`, JSON.stringify(data).substring(0, 500));
    console.log(`Type:`, Array.isArray(data) ? 'Array' : typeof data);
    console.log(`Length:`, Array.isArray(data) ? data.length : 'N/A');
    
    return data || [];
    
  } catch (error) {
    console.error(`Error sport ${sportId}:`, error.message);
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
    console.log('Serving from cache');
    return res.status(200).json({
      ...cache.data,
      cached: true,
      cacheAge: Math.floor((now - cache.timestamp) / 1000)
    });
  }

  console.log('Fetching fresh data');
  console.log('API Key present:', !!RAPIDAPI_KEY);

  try {
    const [football, basketball, tennis] = await Promise.all([
      fetchFromFlashscore(1),
      fetchFromFlashscore(3),
      fetchFromFlashscore(2)
    ]);

    console.log('Football items:', Array.isArray(football) ? football.length : 0);
    console.log('Basketball items:', Array.isArray(basketball) ? basketball.length : 0);
    console.log('Tennis items:', Array.isArray(tennis) ? tennis.length : 0);

    cache = {
      data: { football, basketball, tennis, timestamp: now },
      timestamp: now
    };

    console.log('Data cached');

    return res.status(200).json({
      ...cache.data,
      cached: false,
      cacheAge: 0
    });

  } catch (error) {
    console.error('Handler error:', error.message);
    
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