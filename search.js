const express = require('express');
const router = express.Router();
const axios = require('axios');

let Image, Annotation;
try { Image = require('../models/Image'); Annotation = require('../models/Annotation'); } catch(e) {}
function useDb(req) { return req.dbConnected && Image; }

// POST /api/search/semantic – search NASA API directly
router.post('/semantic', async (req, res) => {
  try {
    const { query = 'space', filters = {} } = req.body;

    if (useDb(req)) {
      const q = { $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { tags: { $in: [new RegExp(query, 'i')] } }
      ]};
      if (filters.source) q.source = filters.source;
      const images = await Image.find(q).sort({ views: -1 }).limit(20);
      if (images.length > 0) return res.json(images);
    }

    // Live NASA search
    const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(query)}&media_type=image&page_size=20`;
    const { data } = await axios.get(url, { timeout: 10000 });
    const results = (data.collection?.items || []).map((item, i) => {
      const d = item.data?.[0] || {};
      const href = item.links?.[0]?.href || '';
      return {
        _id: `nasa_${i}_${Date.now()}`,
        title: d.title || query,
        description: d.description || '',
        source: d.center || 'NASA',
        mission: d.keywords?.[0] || 'NASA',
        date: d.date_created || new Date(),
        thumbnailUrl: href,
        imageUrl: href,
        views: 0,
        tags: d.keywords || ['nasa'],
        annotations: []
      };
    }).filter(i => i.imageUrl);
    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/search/advanced
router.post('/advanced', async (req, res) => {
  try {
    const { text = '', sources, missions, dateRange, sortBy = 'date', sortOrder = 'desc', limit = 20, page = 1 } = req.body;

    if (useDb(req)) {
      const q = {};
      if (text) q.$or = [{ title: { $regex: text, $options: 'i' } }, { description: { $regex: text, $options: 'i' } }];
      if (sources?.length) q.source = { $in: sources };
      if (missions?.length) q.mission = { $in: missions };
      if (dateRange?.start || dateRange?.end) {
        q.date = {};
        if (dateRange.start) q.date.$gte = new Date(dateRange.start);
        if (dateRange.end) q.date.$lte = new Date(dateRange.end);
      }
      const sortOpts = {}; sortOpts[sortBy] = sortOrder === 'desc' ? -1 : 1;
      const images = await Image.find(q).sort(sortOpts).limit(Number(limit)).skip((page - 1) * limit);
      const total = await Image.countDocuments(q);
      return res.json({ images, total, totalPages: Math.ceil(total / limit), currentPage: Number(page) });
    }

    // NASA API search
    const searchTerm = text || (missions?.[0]) || 'space';
    const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(searchTerm)}&media_type=image&page_size=${limit}`;
    const { data } = await axios.get(url, { timeout: 10000 });
    const images = (data.collection?.items || []).map((item, i) => {
      const d = item.data?.[0] || {};
      const href = item.links?.[0]?.href || '';
      return {
        _id: `nasa_${i}`,
        title: d.title || searchTerm,
        description: d.description || '',
        source: d.center || 'NASA',
        mission: d.keywords?.[0] || 'NASA',
        date: d.date_created || new Date(),
        thumbnailUrl: href,
        imageUrl: href,
        views: 0,
        tags: d.keywords || [],
        annotations: []
      };
    }).filter(i => i.imageUrl);
    res.json({ images, total: images.length, totalPages: 1, currentPage: 1 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/search/suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const { q = '' } = req.query;
    if (q.length < 2) return res.json([]);
    const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(q)}&media_type=image&page_size=8`;
    const { data } = await axios.get(url, { timeout: 5000 });
    const suggestions = (data.collection?.items || []).map(item => ({
      title: item.data?.[0]?.title || q,
      source: item.data?.[0]?.center || 'NASA',
      mission: item.data?.[0]?.keywords?.[0] || ''
    }));
    res.json(suggestions);
  } catch (error) {
    res.json([]);
  }
});

// GET /api/search/coordinates
router.get('/coordinates', async (req, res) => {
  try {
    if (useDb(req)) {
      const { lat, lng, radius = 1 } = req.query;
      const images = await Image.find({}).limit(10);
      return res.json(images);
    }
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/search/timeseries
router.get('/timeseries', async (req, res) => {
  try {
    if (useDb(req)) {
      const { mission = 'hubble' } = req.query;
      const images = await Image.find({ mission: new RegExp(mission, 'i') }).sort({ date: 1 }).limit(50);
      return res.json({ images, timeSeries: {}, totalImages: images.length });
    }
    res.json({ images: [], timeSeries: {}, totalImages: 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/search/features
router.get('/features', async (req, res) => {
  try {
    if (useDb(req)) {
      const annotations = await Annotation.find({}).limit(20);
      return res.json(annotations);
    }
    res.json([]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
