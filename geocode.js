const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const CACHE_PATH = path.join(__dirname, '..', 'data', 'geocode_cache.json');
let cache = {};
try {
  const raw = fs.readFileSync(CACHE_PATH, 'utf8');
  cache = JSON.parse(raw || '{}');
} catch (e) {
  cache = {};
}

async function saveCache() {
  try {
    fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
    fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8');
  } catch (e) { console.warn('Could not save geocode cache:', e.message); }
}

// POST /api/geocode { query, provider }
// provider: 'osm' (default) | 'google' | 'bing'
router.post('/', async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) return res.status(400).json({ message: 'Query required' });
    const cacheKey = `osm:${String(query).toLowerCase().trim()}`;
    if (cache[cacheKey]) return res.json(cache[cacheKey]);

    // Only support OpenStreetMap Nominatim to avoid third-party API requirements
    const url = `https://nominatim.openstreetmap.org/search`;
    const { data } = await axios.get(url, {
      params: { q: query, format: 'json', limit: 5 },
      headers: { 'User-Agent': 'NASA-Explorer/1.0 (+https://example.local)' }
    });
    const results = (data || []).map(r => ({ display_name: r.display_name, lat: parseFloat(r.lat), lon: parseFloat(r.lon), type: r.type }));

    cache[cacheKey] = results;
    saveCache();
    res.json(results);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
