const express = require('express');
const router = express.Router();
const bankController = require('../controllers/bankController');
const authMiddleware = require('../middleware/auth');

// Callback from TrueLayer — no JWT, connection identified via state param
router.get('/callback', bankController.handleCallback);

router.use(authMiddleware);

router.get('/', bankController.listConnections);
router.post('/connect', bankController.initiateConnection);
router.post('/:id/sync', bankController.syncTransactions);
router.delete('/:id', bankController.deleteConnection);

module.exports = router;
