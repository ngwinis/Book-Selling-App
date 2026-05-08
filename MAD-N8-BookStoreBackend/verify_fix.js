const vnpayController = require('./src/controllers/vnpayController');
const dotenv = require('dotenv');
dotenv.config();

async function verify() {
    console.log('Generating URL with NEW manual logic...');
    try {
        const url = await vnpayController.createTokenUrl(1, '127.0.0.1');
        console.log('--- FINAL URL ---');
        console.log(url);
        console.log('--- END ---');
    } catch (e) {
        console.error(e);
    }
}

verify();
