// api/leagues.js - Get leagues for a country

import fetch from 'node-fetch';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

// Cache leagues to reduce API calls
let leaguesCache = {};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { sport, country } = req.query;
  
  // Validate params
  if (!sport || !country) {
    return res.status(400).json({ 
      error: 'Missing sport or country parameter',
      example: '/api/leagues?sport=1&country=176'
    });
  }

  const cacheKey = `${sport}-${country}`;
  
  // Return cached if available (cache for 24h)
  if (leaguesCache[cacheKey] && (Date.now() - leaguesCache[cacheKey].timestamp) < 86400000) {
    return res.status(200).json({
      leagues: leaguesCache[cacheKey].data,
      cached: true
    });
  }

  try {
    const url = `https://flashscore4.p.rapidapi.com/api/flashscore/v1/general/${sport}/${country}/tournaments`;
    
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
    
    // Cache the result
    leaguesCache[cacheKey] = {
      data: data,
      timestamp: Date.now()
    };
    
    return res.status(200).json({
      leagues: data,
      cached: false
    });

  } catch (error) {
    console.error(`❌ Error fetching leagues for sport ${sport}, country ${country}:`, error.message);
    
    return res.status(500).json({ 
      error: 'Failed to fetch leagues',
      leagues: []
    });
  }
}
