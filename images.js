const express = require('express');
const router = express.Router();
const axios = require('axios');

// ── In-memory store (used when MongoDB is unavailable) ──────────────────────
let memoryImages = [];
let nextId = 1;

function makeId() { return String(nextId++); }

// Try to load Mongoose models; if DB isn't ready operations still work via memoryImages
let Image, Annotation;
try {
  Image = require('../models/Image');
  Annotation = require('../models/Annotation');
} catch(e) {}

// ── Helper: decide whether to use DB or memory ──────────────────────────────
function useDb(req) { return req.dbConnected && Image; }

// ── Seed with NASA images on first request ───────────────────────────────────
let seeded = false;
async function seedNasaImages() {
  if (seeded) return;
  seeded = true;
  try {
    const missions = ['Hubble', 'Mars', 'Apollo', 'Webb'];
    for (const m of missions) {
      const url = `https://images-api.nasa.gov/search?q=${m}&media_type=image&page_size=10`;
      const { data } = await axios.get(url, { timeout: 8000 });
      const items = (data.collection?.items || []).slice(0, 10);
      for (const item of items) {
        const d = item.data?.[0] || {};
        const href = item.links?.[0]?.href || '';
        if (!href) continue;
        memoryImages.push({
          _id: makeId(),
          title: d.title || `${m} Image`,
          description: d.description || `Image from ${m} mission`,
          source: d.center || 'NASA',
          mission: m,
          date: d.date_created ? new Date(d.date_created) : new Date(),
          imageUrl: href,
          thumbnailUrl: href,
          tags: d.keywords || ['nasa', m.toLowerCase()],
          views: Math.floor(Math.random() * 10000),
          annotations: [],
          isPublic: true,
          metadata: { nasa_id: d.nasa_id, center: d.center }
        });
      }
    }
    console.log(`Seeded ${memoryImages.length} NASA images in memory`);
  } catch (e) {
    console.warn('Could not seed NASA images:', e.message);
    // Fallback static data so UI always has something to show
    const sources = ['Hubble', 'Mars Rover', 'James Webb', 'Apollo'];
    for (let i = 0; i < 20; i++) {
      memoryImages.push({
        _id: makeId(),
        title: `${sources[i % 4]} Image ${i + 1}`,
        description: `A stunning image captured by the ${sources[i % 4]} mission.`,
        source: 'NASA',
        mission: sources[i % 4],
        date: new Date(2020 + (i % 4), i % 12, (i % 28) + 1),
        imageUrl: `https://images-assets.nasa.gov/image/PIA${String(10000 + i).padStart(5,'0')}/PIA${String(10000 + i).padStart(5,'0')}~orig.jpg`,
        thumbnailUrl: `https://images-assets.nasa.gov/image/PIA${String(10000 + i).padStart(5,'0')}/PIA${String(10000 + i).padStart(5,'0')}~thumb.jpg`,
        tags: ['nasa', 'space', sources[i % 4].toLowerCase()],
        views: Math.floor(Math.random() * 50000),
        annotations: [],
        isPublic: true,
        metadata: { nasa_id: `NASA_${i}`, center: 'JPL' }
      });
    }
  }
}

// Simple heuristic to assign coordinates to images lacking them
function heuristicCoordsForImage(img, idx = 0) {
  // Common place keywords to fallback coordinates (Earth-centric)
  const map = {
    'hubble': [38.883, -77.016], // Washington DC (STScI/JHU)
    'jpl': [34.200, -118.172], // JPL Pasadena
    'apollo': [0.6741, 23.4729], // Sea of Tranquility (Moon mapped to Earth proxy)
    'mars': [4.5, 137.4], // Gale crater proxy
    'webb': [34.200, -118.172], // use JPL as proxy
    'earth': [20.0, 0.0]
  };

  const title = (img.title || '').toLowerCase();
  const mission = (img.mission || '').toLowerCase();
  const source = (img.source || '').toLowerCase();

  for (const k of Object.keys(map)) {
    if (title.includes(k) || mission.includes(k) || source.includes(k)) {
      const [lat, lng] = map[k];
      return { lat, lng, zoom: 4 };
    }
  }

  // Fallback deterministic placement around globe
  const lat = ((idx * 37) % 180) - 90;
  const lng = ((idx * 73) % 360) - 180;
  return { lat, lng, zoom: 3 };
}

// GET /api/images
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, source, mission, search, sortBy = 'date', sortOrder = 'desc' } = req.query;

    if (useDb(req)) {
      const query = {};
      if (source) query.source = source;
      if (mission) query.mission = new RegExp(mission, 'i');
      if (search) query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
      const sortOpts = {};
      sortOpts[sortBy] = sortOrder === 'desc' ? -1 : 1;
      const images = await Image.find(query).sort(sortOpts).limit(Number(limit)).skip((page - 1) * limit);
      const total = await Image.countDocuments(query);
      return res.json({ images, total, totalPages: Math.ceil(total / limit), currentPage: Number(page) });
    }

    // Memory mode
    await seedNasaImages();
    let imgs = [...memoryImages];
    if (source) imgs = imgs.filter(i => i.source?.toLowerCase().includes(source.toLowerCase()));
    if (mission) imgs = imgs.filter(i => i.mission?.toLowerCase().includes(mission.toLowerCase()));
    if (search) imgs = imgs.filter(i => i.title?.toLowerCase().includes(search.toLowerCase()) || i.description?.toLowerCase().includes(search.toLowerCase()));
    imgs.sort((a, b) => sortOrder === 'desc' ? new Date(b[sortBy] || b.date) - new Date(a[sortBy] || a.date) : new Date(a[sortBy] || a.date) - new Date(b[sortBy] || b.date));
    const start = (page - 1) * limit;
    const paginated = imgs.slice(start, start + Number(limit));
    res.json({ images: paginated, total: imgs.length, totalPages: Math.ceil(imgs.length / limit), currentPage: Number(page) });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/images/:id
router.get('/:id', async (req, res) => {
  try {
    if (useDb(req)) {
      const image = await Image.findById(req.params.id);
      if (!image) return res.status(404).json({ message: 'Image not found' });
      await Image.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } });
      return res.json(image);
    }
    await seedNasaImages();
    const image = memoryImages.find(i => i._id === req.params.id);
    if (!image) return res.status(404).json({ message: 'Image not found' });
    image.views = (image.views || 0) + 1;
    res.json(image);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/images
router.post('/', async (req, res) => {
  try {
    if (useDb(req)) {
      const image = new Image(req.body);
      await image.save();
      return res.status(201).json(image);
    }
    const image = { _id: makeId(), ...req.body, views: 0, annotations: [], createdAt: new Date() };
    memoryImages.unshift(image);
    res.status(201).json(image);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/images/:id
router.put('/:id', async (req, res) => {
  try {
    if (useDb(req)) {
      const image = await Image.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!image) return res.status(404).json({ message: 'Image not found' });
      return res.json(image);
    }
    const idx = memoryImages.findIndex(i => i._id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Image not found' });
    memoryImages[idx] = { ...memoryImages[idx], ...req.body };
    res.json(memoryImages[idx]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/images/:id
router.delete('/:id', async (req, res) => {
  try {
    if (useDb(req)) {
      const image = await Image.findByIdAndDelete(req.params.id);
      if (!image) return res.status(404).json({ message: 'Image not found' });
      return res.json({ message: 'Image deleted successfully' });
    }
    const idx = memoryImages.findIndex(i => i._id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Image not found' });
    memoryImages.splice(idx, 1);
    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/images/:id/stats
router.get('/:id/stats', async (req, res) => {
  try {
    await seedNasaImages();
    const image = memoryImages.find(i => i._id === req.params.id) || {};
    res.json({ views: image.views || 0, annotations: 0, verifiedAnnotations: 0, source: image.source, mission: image.mission });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/images/:id/coords  — set image coordinates (persist)
router.post('/:id/coords', async (req, res) => {
  try {
    const { lat, lng, zoom } = req.body;
    if (useDb(req)) {
      const image = await Image.findById(req.params.id);
      if (!image) return res.status(404).json({ message: 'Image not found' });
      image.coordinates = { lat, lng, zoom };
      await image.save();
      return res.json(image);
    }
    await seedNasaImages();
    const idx = memoryImages.findIndex(i => i._id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Image not found' });
    memoryImages[idx].coordinates = { lat, lng, zoom };
    res.json(memoryImages[idx]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/images/assign-coords  — apply heuristic coords for images missing coordinates
router.post('/assign-coords', async (req, res) => {
  try {
    if (useDb(req)) {
      const images = await Image.find({});
      const updated = [];
      for (let i = 0; i < images.length; i++) {
        const img = images[i];
        if (!img.coordinates || img.coordinates.lat == null || img.coordinates.lng == null) {
          const coords = heuristicCoordsForImage(img, i);
          img.coordinates = coords;
          await img.save();
          updated.push(img);
        }
      }
      return res.json({ updatedCount: updated.length, updated });
    }

    await seedNasaImages();
    const updated = [];
    for (let i = 0; i < memoryImages.length; i++) {
      const img = memoryImages[i];
      if (!img.coordinates || img.coordinates.lat == null || img.coordinates.lng == null) {
        const coords = heuristicCoordsForImage(img, i);
        img.coordinates = coords;
        updated.push(img);
      }
    }
    res.json({ updatedCount: updated.length, updated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
