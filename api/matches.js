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
    
    // PARSE - Flashscore returns array of tournaments, each with matches
    if (Array.isArray(data)) {
      const allMatches = [];
      
      data.forEach(tournament => {
        if (tournament.matches && Array.isArray(tournament.matches)) {
          // Add each match to the flat array
          allMatches.push(...tournament.matches);
        }
      });
      
      console.log(`Sport ${sportId}: ${allMatches.length} matches from ${data.length} tournaments`);
      return allMatches;
    }
    
    console.log(`Sport ${sportId}: No data`);
    return [];
    
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

  // Check cache
  if (cache.data && (now - cache.timestamp) < CACHE_DURATION) {
    console.log('Serving from cache');
    return res.status(200).json({
      ...cache.data,
      cached: true,
      cacheAge: Math.floor((now - cache.timestamp) / 1000)
    });
  }

  console.log('Fetching fresh data');

  try {
    // Fetch all sports in parallel
    const [football, basketball, tennis] = await Promise.all([
      fetchFromFlashscore(1),  // Football
      fetchFromFlashscore(3),  // Basketball
      fetchFromFlashscore(2)   // Tennis
    ]);

    console.log('Total matches - Football:', football.length, 'Basketball:', basketball.length, 'Tennis:', tennis.length);

    // Update cache
    cache = {
      data: {
        football,
        basketball,
        tennis,
        timestamp: now
      },
      timestamp: now
    };

    return res.status(200).json({
      ...cache.data,
      cached: false,
      cacheAge: 0
    });

  } catch (error) {
    console.error('Handler error:', error.message);
    
    // Return stale cache if available
    if (cache.data) {
      return res.status(200).json({
        ...cache.data,
        cached: true,
        error: 'Stale cache'
      });
    }

    // No cache, return empty
    return res.status(500).json({ 
      error: 'Failed to fetch',
      football: [],
      basketball: [],
      tennis: []
    });
  }
}