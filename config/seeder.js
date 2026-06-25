const User = require('../models/User');
const Tenant = require('../models/Tenant');
const Bill = require('../models/Bill');
const Payment = require('../models/Payment');
const bcrypt = require('bcryptjs');

const seedDemoData = async () => {
  try {
    // Check if users already exist
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      console.log('Database already has data. Skipping seeder...');
      return;
    }

    console.log('Seeding database with demo landlord and tenants data...');

    // 1. Create Landlord
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);
    
    const landlord = new User({
      name: 'Ramanand Sagar',
      email: 'landlord@example.com',
      password: hashedPassword,
      phone: '9876543210',
      address: 'Sagar Villa, Sector 12, Mumbai, Maharashtra - 400001'
    });
    const savedLandlord = await landlord.save();
    const userId = savedLandlord._id.toString();

    // 2. Create Tenants
    // Ramesh Patel - Room 101 - 6000
    const ramesh = new Tenant({
      tenantName: 'Ramesh Patel',
      mobile: '9812345678',
      alternateMobile: '9812345679',
      idProof: '1234-5678-9012',
      roomNumber: 'Room 101',
      address: 'Sagar Villa Room 101',
      rentStartDate: new Date('2026-01-01'),
      monthlyRent: 6000,
      securityDeposit: 12000,
      notes: 'First floor tenant. Prefer cash payment.',
      status: 'Active',
      createdBy: userId
    });
    const savedRamesh = await ramesh.save();
    const rameshId = savedRamesh._id.toString();

    // Suresh Kumar - Room 102 - 7500
    const suresh = new Tenant({
      tenantName: 'Suresh Kumar',
      mobile: '9823456789',
      alternateMobile: '',
      idProof: '2345-6789-0123',
      roomNumber: 'Room 102',
      address: 'Sagar Villa Room 102',
      rentStartDate: new Date('2026-02-01'),
      monthlyRent: 7500,
      securityDeposit: 15000,
      notes: 'Wants billing updates on alternate month. Pays via UPI.',
      status: 'Active',
      createdBy: userId
    });
    const savedSuresh = await suresh.save();
    const sureshId = savedSuresh._id.toString();

    // Mehul Shah - Room 201 - 5500
    const mehul = new Tenant({
      tenantName: 'Mehul Shah',
      mobile: '9834567890',
      alternateMobile: '9834567891',
      idProof: '3456-7890-1234',
      roomNumber: 'Room 201',
      address: 'Sagar Villa Room 201',
      rentStartDate: new Date('2026-03-01'),
      monthlyRent: 5500,
      securityDeposit: 11000,
      notes: 'Software engineer. Rent paid by company bank transfer.',
      status: 'Active',
      createdBy: userId
    });
    const savedMehul = await mehul.save();
    const mehulId = savedMehul._id.toString();

    // 3. Create Bills & Payments
    
    // Ramesh:
    // January Bill (Paid)
    const billRameshJan = new Bill({
      billNumber: 'RB-2026-001',
      tenantId: rameshId,
      billingMonth: '2026-01',
      rentAmount: 6000,
      electricityBill: 0,
      waterBill: 0,
      maintenanceCharge: 0,
      otherCharges: 0,
      previousPending: 0,
      discount: 0,
      advanceAdjustment: 0,
      totalAmount: 6000,
      amountPaid: 6000,
      pendingAmount: 0,
      paymentStatus: 'Paid',
      notes: 'First month rent',
      createdBy: userId
    });
    const savedBillR1 = await billRameshJan.save();

    const paymentR1 = new Payment({
      paymentNumber: 'PAY-2026-001',
      tenantId: rameshId,
      billId: savedBillR1._id.toString(),
      paymentDate: new Date('2026-01-05'),
      amountPaid: 6000,
      paymentMethod: 'Cash',
      transactionReference: 'Handed over cash',
      notes: 'Paid fully',
      createdBy: userId
    });
    await paymentR1.save();

    // February Bill (Paid)
    const billRameshFeb = new Bill({
      billNumber: 'RB-2026-002',
      tenantId: rameshId,
      billingMonth: '2026-02',
      rentAmount: 6000,
      electricityBill: 500,
      waterBill: 200,
      maintenanceCharge: 300,
      otherCharges: 0,
      previousPending: 0,
      discount: 0,
      advanceAdjustment: 0,
      totalAmount: 7000,
      amountPaid: 7000,
      pendingAmount: 0,
      paymentStatus: 'Paid',
      notes: 'Included utilities',
      createdBy: userId
    });
    const savedBillR2 = await billRameshFeb.save();

    const paymentR2 = new Payment({
      paymentNumber: 'PAY-2026-002',
      tenantId: rameshId,
      billId: savedBillR2._id.toString(),
      paymentDate: new Date('2026-02-05'),
      amountPaid: 7000,
      paymentMethod: 'UPI',
      transactionReference: 'upi-ref-9988223',
      notes: 'GPay payment',
      createdBy: userId
    });
    await paymentR2.save();

    // March Bill (Partially Paid)
    const billRameshMar = new Bill({
      billNumber: 'RB-2026-003',
      tenantId: rameshId,
      billingMonth: '2026-03',
      rentAmount: 6000,
      electricityBill: 400,
      waterBill: 200,
      maintenanceCharge: 0,
      otherCharges: 0,
      previousPending: 0,
      discount: 0,
      advanceAdjustment: 0,
      totalAmount: 6600,
      amountPaid: 3000,
      pendingAmount: 3600,
      paymentStatus: 'Partially Paid',
      notes: 'Paid partial, will pay balance next month',
      createdBy: userId
    });
    const savedBillR3 = await billRameshMar.save();

    const paymentR3 = new Payment({
      paymentNumber: 'PAY-2026-003',
      tenantId: rameshId,
      billId: savedBillR3._id.toString(),
      paymentDate: new Date('2026-03-05'),
      amountPaid: 3000,
      paymentMethod: 'UPI',
      transactionReference: 'upi-ref-4433112',
      notes: 'Partial payment',
      createdBy: userId
    });
    await paymentR3.save();


    // Suresh:
    // February Bill (Paid)
    const billSureshFeb = new Bill({
      billNumber: 'RB-2026-004',
      tenantId: sureshId,
      billingMonth: '2026-02',
      rentAmount: 7500,
      electricityBill: 600,
      waterBill: 0,
      maintenanceCharge: 300,
      otherCharges: 0,
      previousPending: 0,
      discount: 0,
      advanceAdjustment: 0,
      totalAmount: 8400,
      amountPaid: 8400,
      pendingAmount: 0,
      paymentStatus: 'Paid',
      notes: 'Fully paid',
      createdBy: userId
    });
    const savedBillS1 = await billSureshFeb.save();

    const paymentS1 = new Payment({
      paymentNumber: 'PAY-2026-004',
      tenantId: sureshId,
      billId: savedBillS1._id.toString(),
      paymentDate: new Date('2026-02-07'),
      amountPaid: 8400,
      paymentMethod: 'Bank Transfer',
      transactionReference: 'tx-hdfc-00998822',
      notes: 'Bank transfer receipt received',
      createdBy: userId
    });
    await paymentS1.save();

    // March Bill (Unpaid)
    const billSureshMar = new Bill({
      billNumber: 'RB-2026-005',
      tenantId: sureshId,
      billingMonth: '2026-03',
      rentAmount: 7500,
      electricityBill: 700,
      waterBill: 0,
      maintenanceCharge: 0,
      otherCharges: 0,
      previousPending: 0,
      discount: 0,
      advanceAdjustment: 0,
      totalAmount: 8200,
      amountPaid: 0,
      pendingAmount: 8200,
      paymentStatus: 'Unpaid',
      notes: 'Pending collection',
      createdBy: userId
    });
    await billSureshMar.save();


    // Mehul:
    // March Bill (Paid)
    const billMehulMar = new Bill({
      billNumber: 'RB-2026-006',
      tenantId: mehulId,
      billingMonth: '2026-03',
      rentAmount: 5500,
      electricityBill: 300,
      waterBill: 100,
      maintenanceCharge: 0,
      otherCharges: 0,
      previousPending: 0,
      discount: 0,
      advanceAdjustment: 0,
      totalAmount: 5900,
      amountPaid: 5900,
      pendingAmount: 0,
      paymentStatus: 'Paid',
      notes: 'First bill paid in full',
      createdBy: userId
    });
    const savedBillM1 = await billMehulMar.save();

    const paymentM1 = new Payment({
      paymentNumber: 'PAY-2026-005',
      tenantId: mehulId,
      billId: savedBillM1._id.toString(),
      paymentDate: new Date('2026-03-10'),
      amountPaid: 5900,
      paymentMethod: 'UPI',
      transactionReference: 'upi-ref-8877112',
      notes: 'UPI mobile transfer',
      createdBy: userId
    });
    await paymentM1.save();

    // April Bill (Unpaid)
    const billMehulApr = new Bill({
      billNumber: 'RB-2026-007',
      tenantId: mehulId,
      billingMonth: '2026-04',
      rentAmount: 5500,
      electricityBill: 400,
      waterBill: 0,
      maintenanceCharge: 0,
      otherCharges: 0,
      previousPending: 0,
      discount: 0,
      advanceAdjustment: 0,
      totalAmount: 5900,
      amountPaid: 0,
      pendingAmount: 5900,
      paymentStatus: 'Unpaid',
      notes: 'Pending payment',
      createdBy: userId
    });
    await billMehulApr.save();

    console.log('Database successfully seeded with demo data.');
  } catch (err) {
    console.error('Error seeding demo data:', err.message);
  }
};

module.exports = seedDemoData;
