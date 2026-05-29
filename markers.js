const express = require('express');
const router = express.Router();

let Marker, Image;
try {
  Marker = require('../models/Marker');
  Image = require('../models/Image');
} catch (e) {}

function useDb(req) { return req.dbConnected && Marker; }

// GET /api/markers
router.get('/', async (req, res) => {
  try {
    if (useDb(req)) {
      const markers = await Marker.find({});
      return res.json(markers);
    }
    // memory fallback
    if (!global.memoryMarkers) global.memoryMarkers = [];
    res.json(global.memoryMarkers);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST /api/markers
router.post('/', async (req, res) => {
  try {
    const { imageId, title, description, lat, lng, zoom } = req.body;
    if (useDb(req)) {
      const mk = new Marker({ imageId, title, description, lat, lng, zoom });
      await mk.save();
      // optionally update image coordinates
      if (Image && imageId) {
        await Image.findByIdAndUpdate(imageId, { coordinates: { lat, lng, zoom } });
      }
      return res.status(201).json(mk);
    }
    if (!global.memoryMarkers) global.memoryMarkers = [];
    const id = String(Date.now());
    const mk = { _id: id, imageId, title, description, lat, lng, zoom, createdAt: new Date() };
    global.memoryMarkers.push(mk);
    // update memory image coords if image exists
    if (imageId && global.memoryImages) {
      const img = global.memoryImages.find(i => i._id === imageId);
      if (img) img.coordinates = { lat, lng, zoom };
    }
    res.status(201).json(mk);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PUT /api/markers/:id
router.put('/:id', async (req, res) => {
  try {
    const body = req.body;
    if (useDb(req)) {
      const mk = await Marker.findByIdAndUpdate(req.params.id, body, { new: true });
      if (!mk) return res.status(404).json({ message: 'Marker not found' });
      return res.json(mk);
    }
    if (!global.memoryMarkers) global.memoryMarkers = [];
    const idx = global.memoryMarkers.findIndex(m => m._id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Marker not found' });
    global.memoryMarkers[idx] = { ...global.memoryMarkers[idx], ...body };
    res.json(global.memoryMarkers[idx]);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// DELETE /api/markers/:id
router.delete('/:id', async (req, res) => {
  try {
    if (useDb(req)) {
      const mk = await Marker.findByIdAndDelete(req.params.id);
      if (!mk) return res.status(404).json({ message: 'Marker not found' });
      return res.json({ message: 'Deleted' });
    }
    if (!global.memoryMarkers) global.memoryMarkers = [];
    const idx = global.memoryMarkers.findIndex(m => m._id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Marker not found' });
    global.memoryMarkers.splice(idx, 1);
    res.json({ message: 'Deleted' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
