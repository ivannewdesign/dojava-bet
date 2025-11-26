// api/countries.js
import fetch from 'node-fetch';

const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;

export default async function handler(req, res) {
  // Dodaj CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
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
    res.status(200).json(data);
    
  } catch (error) {
    console.error('Error fetching countries:', error);
    res.status(500).json({ 
      error: 'Failed to fetch countries',
      message: error.message 
    });
  }
}
