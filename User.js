const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'researcher', 'admin'],
    default: 'user'
  },
  profile: {
    firstName: String,
    lastName: String,
    affiliation: String,
    bio: String,
    avatar: String
  },
  preferences: {
    defaultView: {
      type: String,
      enum: ['grid', 'list', 'timeline'],
      default: 'grid'
    },
    theme: {
      type: String,
      enum: ['light', 'dark'],
      default: 'light'
    },
    notifications: {
      email: { type: Boolean, default: true },
      annotations: { type: Boolean, default: true },
      discoveries: { type: Boolean, default: true }
    }
  },
  statistics: {
    annotationsCreated: { type: Number, default: 0 },
    imagesViewed: { type: Number, default: 0 },
    discoveries: { type: Number, default: 0 }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: Date
}, {
  timestamps: true
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Index for efficient queries
UserSchema.index({ email: 1 });
UserSchema.index({ username: 1 });
UserSchema.index({ role: 1, isActive: 1 });

module.exports = mongoose.model('User', UserSchema);
