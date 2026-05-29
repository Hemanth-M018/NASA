const express = require('express');
const router = express.Router();

// ── In-memory annotation store ────────────────────────────────────────────────
let memoryAnnotations = [];
let nextId = 1;
function makeId() { return `ann_${nextId++}`; }

let Annotation, Image;
try { Annotation = require('../models/Annotation'); Image = require('../models/Image'); } catch(e) {}
function useDb(req) { return req.dbConnected && Annotation; }

// GET /api/annotations/stats/overview
router.get('/stats/overview', async (req, res) => {
  try {
    if (useDb(req)) {
      const total = await Annotation.countDocuments();
      const verified = await Annotation.countDocuments({ verified: true });
      return res.json({ totalAnnotations: total, verifiedAnnotations: verified, categories: [], verificationRate: total > 0 ? (verified / total) * 100 : 0 });
    }
    const total = memoryAnnotations.length;
    const verified = memoryAnnotations.filter(a => a.verified).length;
    res.json({ totalAnnotations: total, verifiedAnnotations: verified, categories: [], verificationRate: total > 0 ? (verified / total) * 100 : 0 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/annotations/image/:imageId
router.get('/image/:imageId', async (req, res) => {
  try {
    if (useDb(req)) {
      const annotations = await Annotation.find({ imageId: req.params.imageId }).sort({ createdAt: -1 });
      return res.json(annotations);
    }
    const annotations = memoryAnnotations.filter(a => a.imageId === req.params.imageId);
    res.json(annotations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/annotations/category/:category
router.get('/category/:category', async (req, res) => {
  try {
    if (useDb(req)) {
      const { limit = 50, page = 1 } = req.query;
      const annotations = await Annotation.find({ category: req.params.category }).limit(Number(limit)).skip((page - 1) * limit);
      const total = await Annotation.countDocuments({ category: req.params.category });
      return res.json({ annotations, total, totalPages: Math.ceil(total / limit), currentPage: Number(page) });
    }
    const annotations = memoryAnnotations.filter(a => a.category === req.params.category);
    res.json({ annotations, total: annotations.length, totalPages: 1, currentPage: 1 });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/annotations/:id
router.get('/:id', async (req, res) => {
  try {
    if (useDb(req)) {
      const annotation = await Annotation.findById(req.params.id);
      if (!annotation) return res.status(404).json({ message: 'Annotation not found' });
      return res.json(annotation);
    }
    const annotation = memoryAnnotations.find(a => a._id === req.params.id);
    if (!annotation) return res.status(404).json({ message: 'Annotation not found' });
    res.json(annotation);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/annotations
router.post('/', async (req, res) => {
  try {
    if (useDb(req)) {
      const annotation = new Annotation(req.body);
      await annotation.save();
      if (Image) await Image.findByIdAndUpdate(annotation.imageId, { $push: { annotations: annotation._id } });
      return res.status(201).json(annotation);
    }
    const annotation = { _id: makeId(), ...req.body, verified: false, createdAt: new Date() };
    memoryAnnotations.unshift(annotation);
    res.status(201).json(annotation);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT /api/annotations/:id
router.put('/:id', async (req, res) => {
  try {
    if (useDb(req)) {
      const annotation = await Annotation.findByIdAndUpdate(req.params.id, req.body, { new: true });
      if (!annotation) return res.status(404).json({ message: 'Annotation not found' });
      return res.json(annotation);
    }
    const idx = memoryAnnotations.findIndex(a => a._id === req.params.id);
    if (idx === -1) return res.status(404).json({ message: 'Annotation not found' });
    memoryAnnotations[idx] = { ...memoryAnnotations[idx], ...req.body };
    res.json(memoryAnnotations[idx]);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PATCH /api/annotations/:id/verify
router.patch('/:id/verify', async (req, res) => {
  try {
    const { verified } = req.body;
    if (useDb(req)) {
      const annotation = await Annotation.findByIdAndUpdate(req.params.id, { verified, verifiedAt: verified ? new Date() : null }, { new: true });
      if (!annotation) return res.status(404).json({ message: 'Annotation not found' });
      return res.json(annotation);
    }
    const idx = memoryAnnotations.findIndex(a => a._id === req.params.id);
    if (idx !== -1) memoryAnnotations[idx].verified = verified;
    res.json(memoryAnnotations[idx] || {});
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE /api/annotations/:id
router.delete('/:id', async (req, res) => {
  try {
    if (useDb(req)) {
      const annotation = await Annotation.findByIdAndDelete(req.params.id);
      if (!annotation) return res.status(404).json({ message: 'Annotation not found' });
      if (Image) await Image.findByIdAndUpdate(annotation.imageId, { $pull: { annotations: annotation._id } });
      return res.json({ message: 'Annotation deleted successfully' });
    }
    const idx = memoryAnnotations.findIndex(a => a._id === req.params.id);
    if (idx !== -1) memoryAnnotations.splice(idx, 1);
    res.json({ message: 'Annotation deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
