const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/creditCardController');
const authMiddleware = require('../middleware/auth');

router.use(authMiddleware);

router.get('/',    ctrl.getAll);
router.post('/',   ctrl.create);
router.get('/:id', ctrl.getById);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

router.get('/:id/transactions',    ctrl.getTransactions);
router.get('/:id/history',         ctrl.getMonthlyHistory);
router.get('/:id/subscriptions',   ctrl.getSubscriptions);

router.get('/:id/payments',              ctrl.getPayments);
router.post('/:id/payments',             ctrl.recordPayment);
router.delete('/:id/payments/:paymentId', ctrl.deletePayment);

router.post('/:id/import/preview', ctrl.importPreview);
router.post('/:id/import/confirm', ctrl.importConfirm);

module.exports = router;
