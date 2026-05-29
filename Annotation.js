const mongoose = require('mongoose');

const AnnotationSchema = new mongoose.Schema({
  imageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Image',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['point', 'polygon', 'rectangle', 'circle', 'line', 'text']
  },
  coordinates: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  label: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    required: true,
    enum: ['geological', 'atmospheric', 'astronomical', 'biological', 'artificial', 'unknown']
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1,
    default: 1
  },
  verified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: Date,
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  tags: [String],
  metadata: {
    scientificName: String,
    commonName: String,
    size: String,
    color: String,
    additionalInfo: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Index for efficient queries
AnnotationSchema.index({ imageId: 1, type: 1 });
AnnotationSchema.index({ category: 1, verified: 1 });
AnnotationSchema.index({ label: 'text', description: 'text' });

module.exports = mongoose.model('Annotation', AnnotationSchema);
