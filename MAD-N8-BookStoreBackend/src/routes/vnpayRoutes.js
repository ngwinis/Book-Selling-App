const express = require('express');
const router = express.Router();
const vnpayController = require('../controllers/vnpayController');

// Receives browser redirects from VNPay
router.get('/vnpay-return', vnpayController.vnpayReturn);

// Receives VNPay server-to-server notifications
router.get('/vnpay-ipn', vnpayController.vnpayIpn);

// Requests a saved-card registration link
router.post('/create-token-url', vnpayController.handleCreateTokenUrl);

module.exports = router;
