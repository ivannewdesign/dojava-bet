// api/matches.js

import fetch from 'node-fetch';
let cache = {
  data: null,
  timestamp: 0
};

const CACHE_DURATION = 180000;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

async function fetchFromFlashscore(sportId) {
  try {
    const url = `https://flashscore4.p.rapidapi.com/api/flashscore/v1/match/live/${sportId}`;
    
    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'flashscore4.p.rapidapi.com'
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
          allMatches.push(...tournament.matches);
        }
      });
      
      console.log(`Sport ${sportId}: ${allMatches.length} matches`);
      return allMatches;
    }
    
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

  if (cache.data && (now - cache.timestamp) < CACHE_DURATION) {
    return res.status(200).json({
      ...cache.data,
      cached: true,
      cacheAge: Math.floor((now - cache.timestamp) / 1000)
    });
  }

  try {
    const [football, basketball, tennis] = await Promise.all([
      fetchFromFlashscore(1),
      fetchFromFlashscore(3),
      fetchFromFlashscore(2)
    ]);

    cache = {
      data: { football, basketball, tennis, timestamp: now },
      timestamp: now
    };

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
