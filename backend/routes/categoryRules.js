const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/categoryRuleController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/',        ctrl.listRules);
router.post('/',       ctrl.createRule);
router.post('/apply',  ctrl.applyRules);
router.delete('/:id',  ctrl.deleteRule);

module.exports = router;
