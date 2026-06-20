const mongoose = require('mongoose');

const repairOrderSchema = new mongoose.Schema({
  orderNo: {
    type: String,
    unique: true,
    required: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  repairType: {
    type: String,
    enum: ['water_electric', 'access_control', 'elevator', 'public_facility', 'other'],
    required: true
  },
  repairTypeName: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  images: [{
    type: String
  }],
  location: {
    building: String,
    room: String,
    address: String
  },
  contact: {
    name: String,
    phone: String
  },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'processing', 'completed', 'cancelled', 'closed'],
    default: 'pending',
    required: true
  },
  worker: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  assignedAt: {
    type: Date
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  startedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  },
  closedAt: {
    type: Date
  },
  repairResult: {
    description: String,
    images: [{
      type: String
    }]
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  responseTime: {
    type: Number
  },
  completionTime: {
    type: Number
  },
  totalTime: {
    type: Number
  },
  rating: {
    score: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    ratedAt: Date
  },
  timeline: [{
    status: String,
    title: String,
    description: String,
    operator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    operatorName: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  remark: String,
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

repairOrderSchema.index({ owner: 1, createdAt: -1 });
repairOrderSchema.index({ worker: 1, status: 1 });
repairOrderSchema.index({ status: 1, createdAt: -1 });
repairOrderSchema.index({ repairType: 1, createdAt: -1 });

module.exports = mongoose.model('RepairOrder', repairOrderSchema);
