const Tenant = require('../models/Tenant');
const Bill = require('../models/Bill');
const Payment = require('../models/Payment');

exports.createTenant = async (req, res) => {
  try {
    const newTenant = new Tenant({
      ...req.body,
      createdBy: req.user.id
    });
    const tenant = await newTenant.save();
    res.json(tenant);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getTenants = async (req, res) => {
  try {
    const tenants = await Tenant.find({ createdBy: req.user.id });
    res.json(tenants);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getTenantById = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant || tenant.createdBy.toString() !== req.user.id.toString()) {
      return res.status(404).json({ msg: 'Tenant not found' });
    }

    const bills = await Bill.find({ tenantId: tenant._id.toString() });
    const payments = await Payment.find({ tenantId: tenant._id.toString() });
    const totalPending = bills.reduce((acc, bill) => acc + (bill.pendingAmount || 0), 0);

    res.json({
      tenant,
      bills,
      payments,
      totalPending
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.updateTenant = async (req, res) => {
  try {
    let tenant = await Tenant.findById(req.params.id);
    if (!tenant || tenant.createdBy.toString() !== req.user.id.toString()) {
      return res.status(404).json({ msg: 'Tenant not found' });
    }

    tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true }
    );
    res.json(tenant);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.deleteTenant = async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant || tenant.createdBy.toString() !== req.user.id.toString()) {
      return res.status(404).json({ msg: 'Tenant not found' });
    }

    await Tenant.findByIdAndDelete(req.params.id);
    
    // Clean up associated bills and payments
    const bills = await Bill.find({ tenantId: req.params.id });
    for (const bill of bills) {
      await Bill.findByIdAndDelete(bill._id);
    }
    
    const payments = await Payment.find({ tenantId: req.params.id });
    for (const payment of payments) {
      await Payment.findByIdAndDelete(payment._id);
    }

    res.json({ msg: 'Tenant and associated records deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};
