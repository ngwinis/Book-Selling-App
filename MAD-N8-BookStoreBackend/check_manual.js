const crypto = require('crypto');
const dotenv = require('dotenv');
const querystring = require('qs');
dotenv.config();

function signParams(params, secret) {
    const sortedParams = {};
    Object.keys(params).sort().forEach(key => {
        sortedParams[key] = params[key];
    });

    const signData = querystring.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac('sha512', secret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    return signed;
}

async function runTest() {
    const tmnCode = (process.env.VNP_TMNCODE || '').trim();
    const secret = (process.env.VNP_HASHSECRET || '').trim();
    const customerId = 1;
    const ipAddr = '127.0.0.1';

    const date = new Date();
    const createDate = date.getFullYear().toString() +
                       (date.getMonth() + 1).toString().padStart(2, '0') +
                       date.getDate().toString().padStart(2, '0') +
                       date.getHours().toString().padStart(2, '0') +
                       date.getMinutes().toString().padStart(2, '0') +
                       date.getSeconds().toString().padStart(2, '0');

    const params = {
        vnp_Amount: 1000000, 
        vnp_AppUserId: customerId.toString(),
        vnp_BankCode: 'NCB',
        vnp_Command: 'token_create',
        vnp_CreateDate: createDate,
        vnp_CurrCode: 'VND', // This is required to avoid NOT ENOUGH PARAMS
        vnp_IpAddr: ipAddr,
        vnp_Locale: 'vn',
        vnp_OrderInfo: `SaveCardBookstore${customerId}`,
        vnp_OrderType: 'other',
        vnp_ReturnUrl: process.env.VNP_RETURNURL,
        vnp_TmnCode: tmnCode,
        vnp_TxnRef: `TK${customerId}X${Math.floor(Date.now() / 1000)}`,
        vnp_Version: '2.1.0'
    };

    const secureHash = signParams(params, secret);
    
    // Build final URL
    const baseUrl = 'https://sandbox.vnpayment.vn/token_ui/create-token.html';
    const finalUrl = baseUrl + '?' + querystring.stringify(params, { encode: true }) + '&vnp_SecureHash=' + secureHash;

    console.log('--- MANUAL URL ---');
    console.log(finalUrl);
}

runTest();
