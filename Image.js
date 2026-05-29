const mongoose = require('mongoose');

const ImageSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  source: {
    type: String,
    required: true,
    enum: ['hubble', 'mars_reconnaissance', 'lunar_orbiter', 'earth_observation', 'james_webb', 'other']
  },
  mission: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  coordinates: {
    lat: Number,
    lng: Number,
    zoom: Number
  },
  thumbnailUrl: {
    type: String,
    required: true
  },
  dimensions: {
    width: Number,
    height: Number,
    pixelCount: Number
  },
  imageUrl: {
    type: String,
    required: true
  },
  thumbnailUrl: {
    type: String,
    required: true
  },
  tileUrl: {
    type: String,
    required: true
  },
  metadata: {
    resolution: String,
    wavelength: String,
    instrument: String,
    processingLevel: String,
    additionalInfo: mongoose.Schema.Types.Mixed
  },
  tags: [String],
  isPublic: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0
  },
  annotations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Annotation'
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for search optimization
ImageSchema.index({ title: 'text', description: 'text', tags: 'text' });
ImageSchema.index({ source: 1, date: -1 });
ImageSchema.index({ coordinates: '2dsphere' });

module.exports = mongoose.model('Image', ImageSchema);
