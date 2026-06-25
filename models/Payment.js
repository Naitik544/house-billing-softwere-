const mongoose = require('mongoose');
const { getModel } = require('../config/db');

const PaymentSchema = new mongoose.Schema({
  paymentNumber: { type: String, default: '' },
  tenantId: { type: String, required: true },
  billId: { type: String, required: true },
  paymentDate: { type: Date, required: true },
  amountPaid: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['Cash', 'UPI', 'Bank Transfer'], required: true },
  transactionReference: { type: String, default: '' },
  notes: { type: String, default: '' },
  createdBy: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = getModel('Payment', PaymentSchema);
