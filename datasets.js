const express = require('express');
const router = express.Router();
const axios = require('axios');

// ── In-memory store for datasets ─────────────────────────────────────────────
const NASA_DATASETS = [
  {
    source: 'Hubble Space Telescope',
    mission: 'Hubble',
    count: 150000,
    dateRange: { start: '1990-04-24', end: '2024-01-01' },
    totalViews: 2500000,
    totalAnnotations: 15000,
    description: 'High-resolution images of deep space objects, galaxies, and nebulae.'
  },
  {
    source: 'Mars Exploration',
    mission: 'Mars Rover',
    count: 80000,
    dateRange: { start: '2004-01-04', end: '2024-01-01' },
    totalViews: 1800000,
    totalAnnotations: 9000,
    description: 'Surface imagery of Mars including craters, canyons, and seasonal changes.'
  },
  {
    source: 'Lunar Exploration',
    mission: 'Apollo',
    count: 30000,
    dateRange: { start: '1969-07-16', end: '1972-12-14' },
    totalViews: 4000000,
    totalAnnotations: 22000,
    description: 'Historic lunar surface and Earth photos from the Apollo program.'
  },
  {
    source: 'James Webb Space Telescope',
    mission: 'Webb',
    count: 5000,
    dateRange: { start: '2022-07-12', end: '2024-01-01' },
    totalViews: 3500000,
    totalAnnotations: 7000,
    description: 'Infrared images of the early universe, exoplanets, and star-forming regions.'
  },
  {
    source: 'Earth Observation',
    mission: 'Landsat',
    count: 200000,
    dateRange: { start: '1972-07-23', end: '2024-01-01' },
    totalViews: 1200000,
    totalAnnotations: 18000,
    description: 'Multi-spectral Earth surface imagery used for environmental monitoring.'
  }
];

let Image, Annotation;
try { Image = require('../models/Image'); Annotation = require('../models/Annotation'); } catch(e) {}
function useDb(req) { return req.dbConnected && Image; }

// GET /api/datasets
router.get('/', async (req, res) => {
  try {
    if (useDb(req)) {
      const datasets = await Image.aggregate([
        { $group: { _id: { source: '$source', mission: '$mission' }, count: { $sum: 1 }, totalViews: { $sum: '$views' }, totalAnnotations: { $sum: { $size: { $ifNull: ['$annotations', []] } } } } },
        { $project: { source: '$_id.source', mission: '$_id.mission', count: 1, totalViews: 1, totalAnnotations: 1, dateRange: { start: new Date('2000-01-01'), end: new Date() } } },
        { $sort: { count: -1 } }
      ]);
      if (datasets.length > 0) return res.json(datasets);
    }
    res.json(NASA_DATASETS);
  } catch (error) {
    res.json(NASA_DATASETS);
  }
});

// GET /api/datasets/stats/overview
router.get('/stats/overview', async (req, res) => {
  try {
    if (useDb(req)) {
      const totalImages = await Image.countDocuments();
      if (totalImages > 0) {
        const totalAnnotations = await Annotation.countDocuments();
        const totalViewsAgg = await Image.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]);
        return res.json({ totalImages, totalAnnotations, totalViews: totalViewsAgg[0]?.total || 0, recentActivity: [] });
      }
    }
    // Memory mode – aggregate from static dataset info
    const totalImages = NASA_DATASETS.reduce((s, d) => s + d.count, 0);
    const totalViews = NASA_DATASETS.reduce((s, d) => s + d.totalViews, 0);
    const totalAnnotations = NASA_DATASETS.reduce((s, d) => s + d.totalAnnotations, 0);
    res.json({ totalImages, totalViews, totalAnnotations, recentActivity: [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/datasets/import  – fetch from NASA Image API
router.post('/import', async (req, res) => {
  try {
    const { mission = 'hubble' } = req.body;
    const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(mission)}&media_type=image&page_size=20`;
    const { data } = await axios.get(url, { timeout: 15000 });
    const items = (data.collection?.items || []).slice(0, 20);
    const imported = [];

    for (const item of items) {
      const d = item.data?.[0] || {};
      const href = item.links?.[0]?.href;
      if (!href) continue;
      const imgData = {
        title: d.title || `${mission} Image`,
        description: d.description || '',
        source: d.center || 'NASA',
        mission,
        date: d.date_created ? new Date(d.date_created) : new Date(),
        imageUrl: href,
        thumbnailUrl: href,
        tags: d.keywords || ['nasa'],
        isPublic: true,
        metadata: { nasa_id: d.nasa_id, center: d.center }
      };
      if (useDb(req)) {
        const img = new Image(imgData);
        await img.save();
        imported.push(img);
      } else {
        imported.push({ _id: String(Date.now()), ...imgData, views: 0 });
      }
    }
    res.json({ message: `Imported ${imported.length} images from NASA`, count: imported.length });
  } catch (error) {
    res.status(500).json({ message: 'NASA API error: ' + error.message });
  }
});

// GET /api/datasets/:source/:mission
router.get('/:source/:mission', async (req, res) => {
  const { mission } = req.params;
  const ds = NASA_DATASETS.find(d => d.mission.toLowerCase() === mission.toLowerCase()) || NASA_DATASETS[0];
  res.json({ dataset: ds, annotationStats: [] });
});

module.exports = router;
