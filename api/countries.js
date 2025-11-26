import fetch from 'node-fetch';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

let cachedCountries = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 sata

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    const now = Date.now();
    
    // Ako ima cache i nije istekao, vrati cache
    if (cachedCountries && (now - cacheTimestamp) < CACHE_DURATION) {
      console.log('✅ Countries iz cache-a');
      return res.status(200).json(cachedCountries);
    }
    
    // Povuci iz API-ja
    console.log('🔄 Povlačim countries iz FlashScore API...');
    const response = await fetch(
      'https://flashscore4.p.rapidapi.com/api/flashscore/v1/general/1/countries',
      {
        headers: {
          'x-rapidapi-host': 'flashscore4.p.rapidapi.com',
          'x-rapidapi-key': RAPIDAPI_KEY
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    // Sačuvaj u cache
    cachedCountries = data;
    cacheTimestamp = now;
    
    res.status(200).json(data);
    
  } catch (error) {
    console.error('Error fetching countries:', error);
    
    // Ako ima stari cache, vrati ga
    if (cachedCountries) {
      console.log('⚠️ Koristim stari cache zbog greške');
      return res.status(200).json(cachedCountries);
    }
    
    res.status(500).json({ 
      error: 'Failed to fetch countries',
      message: error.message 
    });
  }
}
