const mongoose = require('mongoose');
const { getModel } = require('../config/db');

const BillSchema = new mongoose.Schema({
  billNumber: { type: String, required: true, unique: true },
  tenantId: { type: String, required: true },
  billingMonth: { type: String, required: true },
  rentAmount: { type: Number, required: true },
  electricityBill: { type: Number, default: 0 },
  waterBill: { type: Number, default: 0 },
  maintenanceCharge: { type: Number, default: 0 },
  otherCharges: { type: Number, default: 0 },
  previousPending: { type: Number, default: 0 },
  discount: { type: Number, default: 0 },
  advanceAdjustment: { type: Number, default: 0 },
  totalAmount: { type: Number, required: true },
  amountPaid: { type: Number, default: 0 },
  pendingAmount: { type: Number, required: true },
  paymentStatus: { type: String, enum: ['Paid', 'Partially Paid', 'Unpaid'], default: 'Unpaid' },
  notes: { type: String, default: '' },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = getModel('Bill', BillSchema);
