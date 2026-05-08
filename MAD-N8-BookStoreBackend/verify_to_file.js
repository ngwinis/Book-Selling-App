const vnpayController = require('./src/controllers/vnpayController');
const dotenv = require('dotenv');
const fs = require('fs');
dotenv.config();

async function verify() {
    try {
        const url = await vnpayController.createTokenUrl(1, '127.0.0.1');
        fs.writeFileSync('vnpay_url.txt', url);
        console.log('URL has been written to vnpay_url.txt');
    } catch (e) {
        console.error(e);
    }
}

verify();
