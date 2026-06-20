const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  openid: {
    type: String,
    unique: true,
    sparse: true
  },
  phone: {
    type: String,
    unique: true,
    sparse: true
  },
  password: {
    type: String
  },
  name: {
    type: String,
    required: true
  },
  avatar: {
    type: String
  },
  role: {
    type: String,
    enum: ['owner', 'worker', 'admin', 'manager'],
    default: 'owner',
    required: true
  },
  building: {
    type: String
  },
  room: {
    type: String
  },
  skills: [{
    type: String
  }],
  workStatus: {
    type: String,
    enum: ['free', 'busy', 'offline'],
    default: 'free'
  },
  currentOrderCount: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('User', userSchema);
