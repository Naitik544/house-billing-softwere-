const mongoose = require('mongoose');
const { getModel } = require('../config/db');

const TenantSchema = new mongoose.Schema({
  tenantName: { type: String, required: true },
  mobile: { type: String, required: true },
  alternateMobile: { type: String, default: '' },
  idProof: { type: String, default: '' },
  roomNumber: { type: String, required: true },
  address: { type: String, required: true },
  rentStartDate: { type: Date, required: true },
  monthlyRent: { type: Number, required: true },
  securityDeposit: { type: Number, default: 0 },
  notes: { type: String, default: '' },
  status: { type: String, enum: ['Active', 'Left'], default: 'Active' },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = getModel('Tenant', TenantSchema);
