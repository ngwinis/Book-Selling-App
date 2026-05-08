const { VNPay } = require('vnpay');
const dotenv = require('dotenv');
dotenv.config();

async function runTest() {
    const customerId = 1;
    const ipAddr = '127.0.0.1';

    const tokenVnpay = new VNPay({
        tmnCode: (process.env.VNP_TMNCODE || '').trim(),
        secureSecret: (process.env.VNP_HASHSECRET || '').trim(),
        vnpayHost: 'https://sandbox.vnpayment.vn/token_ui/create-token.html',
        testMode: true,
        hashAlgorithm: 'SHA512',
    });

    const date = new Date();
    const createDate = date.getFullYear().toString() +
                       (date.getMonth() + 1).toString().padStart(2, '0') +
                       date.getDate().toString().padStart(2, '0') +
                       date.getHours().toString().padStart(2, '0') +
                       date.getMinutes().toString().padStart(2, '0') +
                       date.getSeconds().toString().padStart(2, '0');

    const url = await tokenVnpay.buildPaymentUrl({
      vnp_Version: '2.1.0',
      vnp_Command: 'token_create', 
      vnp_Amount: 10000, 
      vnp_CreateDate: createDate, 
      vnp_IpAddr: ipAddr || '127.0.0.1',
      vnp_TxnRef: `TK${customerId}X${Math.floor(Date.now() / 1000)}`, 
      vnp_OrderInfo: `LuuTheBookstore${customerId}`, 
      vnp_OrderType: 'other',
      vnp_ReturnUrl: process.env.VNP_RETURNURL,
      vnp_AppUserId: customerId.toString(),
      vnp_Locale: 'vn',
    });

    console.log('--- URL GENERATED ---');
    console.log(url);
    console.log('--- END ---');
}

runTest();
