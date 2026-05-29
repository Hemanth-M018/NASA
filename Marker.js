const mongoose = require('mongoose');

const MarkerSchema = new mongoose.Schema({
  imageId: { type: String },
  title: { type: String },
  description: { type: String },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  zoom: { type: Number, default: 3 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });

module.exports = mongoose.model('Marker', MarkerSchema);
