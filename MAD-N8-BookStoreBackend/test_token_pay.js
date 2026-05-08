const vnpayController = require('./src/controllers/vnpayController');
const supabase = require('./src/config/supabase');
const dotenv = require('dotenv');
const fs = require('fs');
dotenv.config();

async function test() {
    try {
        const { data: payment } = await supabase.from('Payment').select('*').eq('paymentID', 2).single();
        if (!payment) { console.log('Payment 2 not found'); return; }
        
        console.log('--- EXECUTING createTokenPayUrl ---');
        const url = await vnpayController.createTokenPayUrl(999, 10000, payment.idCustomer, payment.vnpToken, '127.0.0.1');
        console.log('URL generated.');
    } catch (e) {
        console.error(e);
    }
}
test();
