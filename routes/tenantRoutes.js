const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const auth = require('../middleware/auth');

router.post('/', auth, tenantController.createTenant);
router.get('/', auth, tenantController.getTenants);
router.get('/:id', auth, tenantController.getTenantById);
router.put('/:id', auth, tenantController.updateTenant);
router.delete('/:id', auth, tenantController.deleteTenant);

module.exports = router;
