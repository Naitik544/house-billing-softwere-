const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const auth = require('../middleware/auth');

router.post('/', auth, billController.createBill);
router.get('/', auth, billController.getBills);
router.get('/suggest-dues/:tenantId', auth, billController.getSuggestDues);
router.get('/:id', auth, billController.getBillById);
router.put('/:id', auth, billController.updateBill);
router.delete('/:id', auth, billController.deleteBill);

module.exports = router;
