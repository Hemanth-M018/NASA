const express = require('express');
const router = express.Router();

let Image;
try { Image = require('../models/Image'); } catch (e) {}

// local heuristic (copied from images.js)
function heuristicCoordsForImage(img, idx = 0) {
  const map = {
    'hubble': [38.883, -77.016],
    'jpl': [34.200, -118.172],
    'apollo': [0.6741, 23.4729],
    'mars': [4.5, 137.4],
    'webb': [34.200, -118.172],
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
  const lat = ((idx * 37) % 180) - 90;
  const lng = ((idx * 73) % 360) - 180;
  return { lat, lng, zoom: 3 };
}

// GET proposals
router.get('/proposals', async (req, res) => {
  try {
    if (req.dbConnected && Image) {
      const imgs = await Image.find({});
      const proposals = [];
      for (let i = 0; i < imgs.length; i++) {
        const img = imgs[i];
        if (!img.coordinates || img.coordinates.lat == null || img.coordinates.lng == null) {
          const coords = heuristicCoordsForImage(img, i);
          proposals.push({ image: img, proposed: coords });
        }
      }
      return res.json(proposals);
    }
    // memory mode
    const memoryImages = global.memoryImages || [];
    const proposals = [];
    for (let i = 0; i < memoryImages.length; i++) {
      const img = memoryImages[i];
      if (!img.coordinates || img.coordinates.lat == null || img.coordinates.lng == null) {
        const coords = heuristicCoordsForImage(img, i);
        proposals.push({ image: img, proposed: coords });
      }
    }
    res.json(proposals);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// POST apply a proposal for an image
router.post('/apply', async (req, res) => {
  try {
    const { imageId } = req.body;
    if (!imageId) return res.status(400).json({ message: 'imageId required' });
    if (req.dbConnected && Image) {
      const img = await Image.findById(imageId);
      if (!img) return res.status(404).json({ message: 'Image not found' });
      const coords = heuristicCoordsForImage(img);
      img.coordinates = coords;
      await img.save();
      return res.json(img);
    }
    const memoryImages = global.memoryImages || [];
    const idx = memoryImages.findIndex(i => i._id === imageId);
    if (idx === -1) return res.status(404).json({ message: 'Image not found' });
    const coords = heuristicCoordsForImage(memoryImages[idx], idx);
    memoryImages[idx].coordinates = coords;
    res.json(memoryImages[idx]);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;
