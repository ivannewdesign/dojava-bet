// api/matches.js

import fetch from 'node-fetch';

let cache = {
  data: null,
  timestamp: 0
};

const CACHE_DURATION = 180000; // 3 min
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

async function fetchMatchesForDay(sportId) {
  try {
    const url = `https://flashscore4.p.rapidapi.com/api/flashscore/v1/match/day/${sportId}`;
    
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
    
    // Parse - returns array of tournaments with matches
    if (Array.isArray(data)) {
      const allMatches = [];
      
      data.forEach(tournament => {
        if (tournament.matches && Array.isArray(tournament.matches)) {
          // Add tournament info to each match
          tournament.matches.forEach(match => {
            allMatches.push({
              ...match,
              tournament_name: tournament.name || 'Unknown League',
              country_name: tournament.country_name || ''
            });
          });
        }
      });
      
      console.log(`✅ Sport ${sportId}: ${allMatches.length} matches`);
      return allMatches;
    }
    
    return [];
    
  } catch (error) {
    console.error(`❌ Error sport ${sportId}:`, error.message);
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

  // Return cached data if fresh
  if (cache.data && (now - cache.timestamp) < CACHE_DURATION) {
    return res.status(200).json({
      ...cache.data,
      cached: true,
      cacheAge: Math.floor((now - cache.timestamp) / 1000)
    });
  }

  try {
    // Fetch all sports in parallel
    const [football, basketball, tennis] = await Promise.all([
      fetchMatchesForDay(1),  // Football
      fetchMatchesForDay(3),  // Basketball
      fetchMatchesForDay(2)   // Tennis
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
    console.error('❌ Handler error:', error.message);
    
    // Return stale cache if available
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
