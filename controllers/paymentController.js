const Payment = require('../models/Payment');
const Bill = require('../models/Bill');

// Helper to recalculate bill payment aggregation status
const recalculateBillPayments = async (billId) => {
  const bill = await Bill.findById(billId);
  if (!bill) return;
  
  const payments = await Payment.find({ billId: bill._id.toString() });
  const totalPaid = payments.reduce((sum, p) => sum + (parseFloat(p.amountPaid) || 0), 0);
  
  bill.amountPaid = totalPaid;
  bill.pendingAmount = Math.max(0, bill.totalAmount - totalPaid);
  
  if (bill.pendingAmount <= 0) {
    bill.paymentStatus = 'Paid';
  } else if (bill.amountPaid > 0) {
    bill.paymentStatus = 'Partially Paid';
  } else {
    bill.paymentStatus = 'Unpaid';
  }
  
  await bill.save();
};

// Helper to generate next payment number
const generatePaymentNumber = async (userId) => {
  const currentYear = new Date().getFullYear();
  const prefix = `PAY-${currentYear}-`;
  
  const payments = await Payment.find({ createdBy: userId });
  let maxSeq = 0;
  payments.forEach(p => {
    if (p.paymentNumber && p.paymentNumber.startsWith(prefix)) {
      const seqStr = p.paymentNumber.replace(prefix, '');
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  });
  
  const nextSeq = (maxSeq + 1).toString().padStart(3, '0');
  return `${prefix}${nextSeq}`;
};

exports.createPayment = async (req, res) => {
  const {
    tenantId,
    billId,
    paymentDate,
    amountPaid,
    paymentMethod,
    transactionReference = '',
    notes = ''
  } = req.body;

  try {
    const bill = await Bill.findById(billId);
    if (!bill) {
      return res.status(404).json({ msg: 'Bill not found' });
    }

    const paymentNumber = await generatePaymentNumber(req.user.id);

    const newPayment = new Payment({
      paymentNumber,
      tenantId,
      billId,
      paymentDate,
      amountPaid: parseFloat(amountPaid) || 0,
      paymentMethod,
      transactionReference,
      notes,
      createdBy: req.user.id
    });

    const payment = await newPayment.save();
    
    // Recalculate bill dues
    await recalculateBillPayments(billId);
    
    res.json(payment);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ createdBy: req.user.id });
    res.json(payments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment || payment.createdBy.toString() !== req.user.id.toString()) {
      return res.status(404).json({ msg: 'Payment record not found' });
    }
    res.json(payment);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.updatePayment = async (req, res) => {
  try {
    let payment = await Payment.findById(req.params.id);
    if (!payment || payment.createdBy.toString() !== req.user.id.toString()) {
      return res.status(404).json({ msg: 'Payment record not found' });
    }

    const { amountPaid, paymentMethod, transactionReference, notes, paymentDate } = req.body;
    const oldBillId = payment.billId;

    payment = await Payment.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          amountPaid: parseFloat(amountPaid) || 0,
          paymentMethod,
          transactionReference: transactionReference || '',
          notes: notes || '',
          paymentDate
        }
      },
      { new: true }
    );

    // Recalculate bill amounts
    await recalculateBillPayments(oldBillId);

    res.json(payment);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.deletePayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id);
    if (!payment || payment.createdBy.toString() !== req.user.id.toString()) {
      return res.status(404).json({ msg: 'Payment record not found' });
    }

    const billId = payment.billId;
    await Payment.findByIdAndDelete(req.params.id);

    // Recalculate bill amounts after deletion
    await recalculateBillPayments(billId);

    res.json({ msg: 'Payment record deleted and bill balance updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};
