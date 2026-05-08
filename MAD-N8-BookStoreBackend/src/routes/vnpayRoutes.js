const express = require('express');
const router = express.Router();
const vnpayController = require('../controllers/vnpayController');

// Route này nhận redirect từ VNPay (Browser)
router.get('/vnpay-return', vnpayController.vnpayReturn);

// Route này nhận thông báo ngầm từ VNPay (Server-to-Server)
router.get('/vnpay-ipn', vnpayController.vnpayIpn);

// Route yêu cầu link đăng ký lưu thẻ (Tokenization)
router.post('/create-token-url', vnpayController.handleCreateTokenUrl);

module.exports = router;
