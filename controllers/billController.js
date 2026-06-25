const Bill = require('../models/Bill');
const Tenant = require('../models/Tenant');

// Helper to generate next bill number
const generateBillNumber = async (userId) => {
  const currentYear = new Date().getFullYear();
  const prefix = `RB-${currentYear}-`;
  
  const bills = await Bill.find({ createdBy: userId });
  let maxSeq = 0;
  bills.forEach(b => {
    if (b.billNumber && b.billNumber.startsWith(prefix)) {
      const seqStr = b.billNumber.replace(prefix, '');
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  });
  
  const nextSeq = (maxSeq + 1).toString().padStart(3, '0');
  return `${prefix}${nextSeq}`;
};

exports.getSuggestDues = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ msg: 'Tenant not found' });
    }

    // Sum of all outstanding bills for this tenant
    const bills = await Bill.find({ tenantId, createdBy: req.user.id });
    const pendingAmount = bills.reduce((acc, b) => acc + (b.pendingAmount || 0), 0);

    const nextBillNumber = await generateBillNumber(req.user.id);

    res.json({
      monthlyRent: tenant.monthlyRent,
      previousPending: pendingAmount,
      nextBillNumber
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.createBill = async (req, res) => {
  const {
    tenantId,
    billingMonth,
    rentAmount,
    electricityBill = 0,
    waterBill = 0,
    maintenanceCharge = 0,
    otherCharges = 0,
    previousPending = 0,
    discount = 0,
    advanceAdjustment = 0,
    notes = '',
    overwrite = false
  } = req.body;

  try {
    // Check for duplicate bill in the same month
    const existingBill = await Bill.findOne({ tenantId, billingMonth, createdBy: req.user.id });
    if (existingBill && !overwrite) {
      return res.status(409).json({
        msg: `A bill already exists for this tenant for ${billingMonth}. Do you want to update it instead?`,
        billId: existingBill._id
      });
    }

    const rent = parseFloat(rentAmount) || 0;
    const elec = parseFloat(electricityBill) || 0;
    const water = parseFloat(waterBill) || 0;
    const maint = parseFloat(maintenanceCharge) || 0;
    const other = parseFloat(otherCharges) || 0;
    const prev = parseFloat(previousPending) || 0;
    const disc = parseFloat(discount) || 0;
    const adv = parseFloat(advanceAdjustment) || 0;

    const totalAmount = rent + elec + water + maint + other + prev - disc - adv;

    if (existingBill && overwrite) {
      const amountPaid = existingBill.amountPaid || 0;
      const pendingAmount = Math.max(0, totalAmount - amountPaid);
      
      let paymentStatus = 'Unpaid';
      if (pendingAmount <= 0) paymentStatus = 'Paid';
      else if (amountPaid > 0) paymentStatus = 'Partially Paid';

      const updatedBill = await Bill.findByIdAndUpdate(
        existingBill._id,
        {
          rentAmount: rent,
          electricityBill: elec,
          waterBill: water,
          maintenanceCharge: maint,
          otherCharges: other,
          previousPending: prev,
          discount: disc,
          advanceAdjustment: adv,
          totalAmount,
          pendingAmount,
          paymentStatus,
          notes
        },
        { new: true }
      );
      return res.json(updatedBill);
    }

    const billNumber = await generateBillNumber(req.user.id);

    const newBill = new Bill({
      billNumber,
      tenantId,
      billingMonth,
      rentAmount: rent,
      electricityBill: elec,
      waterBill: water,
      maintenanceCharge: maint,
      otherCharges: other,
      previousPending: prev,
      discount: disc,
      advanceAdjustment: adv,
      totalAmount,
      amountPaid: 0,
      pendingAmount: totalAmount,
      paymentStatus: 'Unpaid',
      notes,
      createdBy: req.user.id
    });

    const bill = await newBill.save();
    res.json(bill);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getBills = async (req, res) => {
  try {
    const bills = await Bill.find({ createdBy: req.user.id });
    res.json(bills);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getBillById = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill || bill.createdBy.toString() !== req.user.id.toString()) {
      return res.status(404).json({ msg: 'Bill not found' });
    }
    res.json(bill);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.updateBill = async (req, res) => {
  try {
    let bill = await Bill.findById(req.params.id);
    if (!bill || bill.createdBy.toString() !== req.user.id.toString()) {
      return res.status(404).json({ msg: 'Bill not found' });
    }

    const {
      rentAmount,
      electricityBill = 0,
      waterBill = 0,
      maintenanceCharge = 0,
      otherCharges = 0,
      previousPending = 0,
      discount = 0,
      advanceAdjustment = 0,
      notes = ''
    } = req.body;

    const rent = parseFloat(rentAmount) || 0;
    const elec = parseFloat(electricityBill) || 0;
    const water = parseFloat(waterBill) || 0;
    const maint = parseFloat(maintenanceCharge) || 0;
    const other = parseFloat(otherCharges) || 0;
    const prev = parseFloat(previousPending) || 0;
    const disc = parseFloat(discount) || 0;
    const adv = parseFloat(advanceAdjustment) || 0;

    const totalAmount = rent + elec + water + maint + other + prev - disc - adv;
    const amountPaid = bill.amountPaid || 0;
    const pendingAmount = Math.max(0, totalAmount - amountPaid);

    let paymentStatus = 'Unpaid';
    if (pendingAmount <= 0) paymentStatus = 'Paid';
    else if (amountPaid > 0) paymentStatus = 'Partially Paid';

    bill = await Bill.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          rentAmount: rent,
          electricityBill: elec,
          waterBill: water,
          maintenanceCharge: maint,
          otherCharges: other,
          previousPending: prev,
          discount: disc,
          advanceAdjustment: adv,
          totalAmount,
          pendingAmount,
          paymentStatus,
          notes
        }
      },
      { new: true }
    );

    res.json(bill);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.deleteBill = async (req, res) => {
  try {
    const bill = await Bill.findById(req.params.id);
    if (!bill || bill.createdBy.toString() !== req.user.id.toString()) {
      return res.status(404).json({ msg: 'Bill not found' });
    }

    await Bill.findByIdAndDelete(req.params.id);
    
    // Also clean up any payments associated with this deleted bill
    const payments = await Payment.find({ billId: req.params.id });
    for (const payment of payments) {
      await Payment.findByIdAndDelete(payment._id);
    }

    res.json({ msg: 'Bill and associated payments deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};
