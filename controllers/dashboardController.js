const Tenant = require('../models/Tenant');
const Bill = require('../models/Bill');
const Payment = require('../models/Payment');

exports.getStats = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get all tenants
    const tenants = await Tenant.find({ createdBy: userId });
    const activeTenants = tenants.filter(t => t.status === 'Active');
    const totalTenantsCount = activeTenants.length;

    // Calculate monthly expected rent from active tenants
    const expectedRent = activeTenants.reduce((acc, t) => acc + (t.monthlyRent || 0), 0);

    // Get all bills
    const bills = await Bill.find({ createdBy: userId });

    // Calculate totals
    const totalCollected = bills.reduce((acc, b) => acc + (b.amountPaid || 0), 0);
    const totalPending = bills.reduce((acc, b) => acc + (b.pendingAmount || 0), 0);

    // Unpaid or partially paid bills count
    const unpaidOrPartialBillsCount = bills.filter(b => b.paymentStatus !== 'Paid').length;

    // Build tenant map for fast lookups
    const tenantMap = {};
    tenants.forEach(t => {
      tenantMap[t._id.toString()] = {
        name: t.tenantName,
        room: t.roomNumber
      };
    });

    // Recent bills (limit 5)
    const recentBills = bills.slice(0, 5).map(b => {
      const bObj = b._doc || b;
      const tenantInfo = tenantMap[b.tenantId.toString()] || { name: 'Deleted Tenant', room: 'N/A' };
      return {
        ...bObj,
        tenantName: tenantInfo.name,
        roomNumber: tenantInfo.room
      };
    });

    // Recent payments (limit 5)
    const payments = await Payment.find({ createdBy: userId });
    const recentPayments = payments.slice(0, 5).map(p => {
      const pObj = p._doc || p;
      const tenantInfo = tenantMap[p.tenantId.toString()] || { name: 'Deleted Tenant', room: 'N/A' };
      return {
        ...pObj,
        tenantName: tenantInfo.name,
        roomNumber: tenantInfo.room
      };
    });

    // Aggregate monthly data for chart (last 6 months)
    const monthlyAggregations = {};
    bills.forEach(b => {
      const month = b.billingMonth; // "YYYY-MM"
      if (!month) return;
      
      if (!monthlyAggregations[month]) {
        monthlyAggregations[month] = { month, expected: 0, collected: 0, pending: 0 };
      }
      monthlyAggregations[month].expected += b.totalAmount || 0;
      monthlyAggregations[month].collected += b.amountPaid || 0;
      monthlyAggregations[month].pending += b.pendingAmount || 0;
    });

    // Sort chronological and pick last 6
    const sortedMonths = Object.keys(monthlyAggregations).sort().slice(-6);
    const chartData = sortedMonths.map(m => monthlyAggregations[m]);

    res.json({
      totalActiveTenants: totalTenantsCount,
      monthlyExpectedRent: expectedRent,
      totalCollected,
      totalPending,
      unpaidBillsCount: unpaidOrPartialBillsCount,
      recentBills,
      recentPayments,
      chartData
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};
