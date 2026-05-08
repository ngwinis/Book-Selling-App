const crypto = require('crypto');
const supabase = require('../config/supabase');
const qs = require('qs');

const vnpayController = {
  // --- HMAC-SHA512 signing helper ---
  signParams: (params) => {
    const secret = (process.env.VNP_HASHSECRET || '').trim();
    const sorted = {};
    Object.keys(params).sort().forEach(key => {
        if (key !== 'vnp_SecureHash' && key !== 'vnp_SecureHashType' && key !== 'vnp_secure_hash') {
            sorted[key] = params[key];
        }
    });

    const signData = qs.stringify(sorted, { encode: true });
    const hmac = crypto.createHmac('sha512', secret);
    return hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
  },

  // 1. Create payment URL for checkout/buy-now using CamelCase for vpcpay.html
  createUrl: async (orderId, amount, ipAddr, orderInfo = 'Bookstore order payment') => {
    const tmnCode = (process.env.VNP_TMNCODE || '').trim();
    const returnUrl = (process.env.VNP_RETURNURL || '').trim();
    const date = new Date();
    const createDate = date.getFullYear().toString() +
                       (date.getMonth() + 1).toString().padStart(2, '0') +
                       date.getDate().toString().padStart(2, '0') +
                       date.getHours().toString().padStart(2, '0') +
                       date.getMinutes().toString().padStart(2, '0') +
                       date.getSeconds().toString().padStart(2, '0');

    const params = {
        vnp_Version: '2.1.0',
        vnp_Command: 'pay',
        vnp_TmnCode: tmnCode,
        vnp_Amount: amount * 100,
        vnp_CreateDate: createDate,
        vnp_CurrCode: 'VND',
        vnp_IpAddr: ipAddr || '127.0.0.1',
        vnp_Locale: 'vn',
        vnp_OrderInfo: orderInfo.replace(/\s/g, ''),
        vnp_OrderType: 'billpayment',
        vnp_ReturnUrl: returnUrl,
        vnp_TxnRef: orderId.toString(),
    };

    const sorted = {};
    Object.keys(params).sort().forEach(key => sorted[key] = params[key]);

    const signData = qs.stringify(sorted, { encode: true });
    // Standard pay (vpcpay.html) REQUIRES UPPERCASE SecureHash
    const secureHash = vnpayController.signParams(params).toUpperCase();
    const baseUrl = process.env.VNP_URL;

    return baseUrl + '?' + signData + '&vnp_SecureHash=' + secureHash;
  },

  // 2. Handle return URL
  vnpayReturn: async (req, res) => {
    try {
      const vnp_Params = req.query;
      // Support both vnp_SecureHash and vnp_secure_hash
      const secureHash = vnp_Params['vnp_SecureHash'] || vnp_Params['vnp_secure_hash'];
      const checkHash = vnpayController.signParams(vnp_Params);

      // Compare case-insensitively for compatibility
      if (secureHash && checkHash && secureHash.toLowerCase() === checkHash.toLowerCase()) {
        if (vnp_Params['vnp_ResponseCode'] === '00' || vnp_Params['vnp_response_code'] === '00' || vnp_Params['vnp_Token'] || vnp_Params['vnp_token']) {
           
           // --- Case 1: return from tokenization flow ---
           const token = vnp_Params['vnp_Token'] || vnp_Params['vnp_token'];
           if (token) {
              const appUserId = vnp_Params['vnp_AppUserId'] || vnp_Params['vnp_app_user_id'];
              const cardType = vnp_Params['vnp_card_type'] || vnp_Params['vnp_CardType'] || 'ATM';
              const maskedCard = vnp_Params['vnp_CardNumber'] || vnp_Params['vnp_card_number'] || '****';

              // Check whether the card is already saved to avoid duplicates when both IPN and return run
              const { data: existing } = await supabase.from('Payment').select('id').eq('vnpToken', token).single();
              
              if (!existing && appUserId) {
                await supabase.from('Payment').insert([{
                    idCustomer: appUserId,
                    paymentMethod: `VNPay Card (${cardType})`,
                    vnpToken: token,
                    maskedCardNumber: maskedCard,
                    vnpCardType: cardType,
                    status: 'Active'
                }]);
                console.log(`[VNPay] Saved card successfully from return URL for customer #${appUserId}`);
              }

              return res.status(200).send(`
               <html>
                 <head>
                   <title>Success</title>
                   <meta name="viewport" content="width=device-width, initial-scale=1">
                 </head>
                 <body style="text-align:center; padding-top:100px; font-family:sans-serif; background:#f4f7f6;">
                   <div style="background:white; max-width:400px; margin:0 auto; padding:30px; border-radius:15px; box-shadow:0 10px 25px rgba(0,0,0,0.1);">
                    <h1 style="color:#2ecc71; font-size:60px; margin:0;">💳</h1>
                    <h2 style="color:#2c3e50;">Card linked successfully!</h2>
                    <p style="color:#7f8c8d;">Your card has been saved safely in the Bookstore system.</p>
                    <hr style="border:0; border-top:1px solid #eee; margin:20px 0;">
                    <p style="font-weight:bold; color:#34495e;">Please return to the app to continue.</p>
                   </div>
                 </body>
               </html>
             `);
           }

           // --- Case 2: order payment ---
           const orderId = vnp_Params['vnp_TxnRef'] || vnp_Params['vnp_txn_ref'];
           if (orderId) {
             const { data: order } = await supabase
               .from('Order')
               .select('orderID, status')
               .eq('orderID', orderId)
               .single();

             if (order && order.status === 'Pending payment') {
               await supabase
                 .from('Order')
                 .update({
                   status: 'Completed',
                   vnpTransactionNo: vnp_Params['vnp_TransactionNo'] || vnp_Params['vnp_transaction_no'],
                   vnpResponseCode: vnp_Params['vnp_ResponseCode'] || vnp_Params['vnp_response_code'],
                 })
                 .eq('orderID', orderId);
             }
           }

           return res.status(200).send(`
             <html>
               <body style="text-align:center; padding-top:100px; font-family:sans-serif;">
                 <h1 style="color:#2ecc71;">✅ Transaction successful!</h1>
                 <p>Order ID: ${vnp_Params['vnp_TxnRef'] || vnp_Params['vnp_txn_ref']}</p>
                 <p>You can return to the app.</p>
               </body>
             </html>
           `);
        }
      }
      res.status(200).send(`<html><body style="text-align:center; padding-top:50px;"><h1>❌ Transaction failed</h1><p>Error code: ${vnp_Params['vnp_ResponseCode'] || vnp_Params['vnp_response_code']}</p></body></html>`);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // 3. Handle IPN
  vnpayIpn: async (req, res) => {
    try {
      const vnp_Params = req.query;
      const secureHash = vnp_Params['vnp_SecureHash'] || vnp_Params['vnp_secure_hash'];
      const checkHash = vnpayController.signParams(vnp_Params);

      if (!secureHash || !checkHash || secureHash.toLowerCase() !== checkHash.toLowerCase()) {
        return res.status(200).json({ RspCode: '97', Message: 'Checksum failed' });
      }

      const responseCode = vnp_Params['vnp_ResponseCode'] || vnp_Params['vnp_response_code'];
      const token = vnp_Params['vnp_Token'] || vnp_Params['vnp_token'];
      const appUserId = vnp_Params['vnp_AppUserId'] || vnp_Params['vnp_app_user_id'];

      if (token && appUserId) {
        if (responseCode === '00') {
           await supabase.from('Payment').insert([{
              idCustomer: appUserId,
              paymentMethod: `VNPay Card (${vnp_Params['vnp_card_type'] || vnp_Params['vnp_CardType'] || 'ATM'})`,
              vnpToken: token,
              maskedCardNumber: vnp_Params['vnp_CardNumber'] || vnp_Params['vnp_card_number'] || '****',
              vnpCardType: vnp_Params['vnp_CardType'] || vnp_Params['vnp_card_type'] || 'ATM',
              status: 'Active'
           }]);
        }
        return res.status(200).json({ RspCode: '00', Message: 'Token confirmed' });
      }

      const orderId = vnp_Params['vnp_TxnRef'] || vnp_Params['vnp_txn_ref'];
      const amount = (vnp_Params['vnp_Amount'] || vnp_Params['vnp_amount']) / 100;
      const { data: order } = await supabase.from('Order').select('*').eq('orderID', orderId).single();
      
      if (!order) return res.status(200).json({ RspCode: '01', Message: 'Order not found' });
      if (order.status !== 'Pending payment') return res.status(200).json({ RspCode: '02', Message: 'Order already confirmed' });

      const newStatus = (responseCode === '00') ? 'Processing' : 'Canceled';
      await supabase.from('Order').update({ 
        status: responseCode === '00' ? 'Completed' : 'Canceled',
        vnpTransactionNo: vnp_Params['vnp_TransactionNo'] || vnp_Params['vnp_transaction_no'],
        vnpResponseCode: responseCode
      }).eq('orderID', orderId);

      res.status(200).json({ RspCode: '00', Message: 'Confirm success' });
    } catch (error) {
      res.status(200).json({ RspCode: '99', Message: 'Unknown error' });
    }
  },

  // 4. Refund
  refundOrder: async (orderId, amount, transactionNo, createBy = 'System') => {
     const { VNPay } = require('vnpay');
     const vnpayLib = new VNPay({
        tmnCode: (process.env.VNP_TMNCODE || '').trim(),
        secureSecret: (process.env.VNP_HASHSECRET || '').trim(),
        vnpayHost: (process.env.VNP_URL || '').trim(),
        testMode: true,
     });
     return vnpayLib.refund({
        vnp_TxnRef: orderId.toString(),
        vnp_Amount: amount,
        vnp_TransactionNo: transactionNo,
        vnp_TransactionDate: new Date().toISOString(),
        vnp_CreateBy: createBy,
        vnp_TransactionType: '02',
     });
  },

  // 5. Create card-link URL using snake_case
  createTokenUrl: async (customerId, ipAddr, cardType = '01') => {
    const tmnCode = (process.env.VNP_TMNCODE || '').trim();
    const returnUrl = (process.env.VNP_RETURNURL || '').trim();
    const date = new Date();
    const createDate = date.getFullYear().toString() +
                       (date.getMonth() + 1).toString().padStart(2, '0') +
                       date.getDate().toString().padStart(2, '0') +
                       date.getHours().toString().padStart(2, '0') +
                       date.getMinutes().toString().padStart(2, '0') +
                       date.getSeconds().toString().padStart(2, '0');

    // Use snake_case for create-token.html
    const params = {
        vnp_version: '2.1.0',
        vnp_command: 'token_create',
        vnp_tmn_code: tmnCode,
        vnp_app_user_id: customerId.toString(),
        vnp_txn_ref: `TK${customerId}X${Math.floor(Date.now() / 1000)}`,
        vnp_txn_desc: `SaveCardBK${customerId}`, 
        vnp_card_type: cardType, // 01: Domestic, 02: International
        vnp_return_url: returnUrl,
        vnp_ip_addr: ipAddr || '127.0.0.1',
        vnp_create_date: createDate,
        vnp_locale: 'vn',
    };

    const secureHash = vnpayController.signParams(params);
    const baseUrl = 'https://sandbox.vnpayment.vn/token_ui/create-token.html';
    
    // Ensure URL parameters are sorted correctly
    const sorted = {};
    Object.keys(params).sort().forEach(key => sorted[key] = params[key]);

    return baseUrl + '?' + qs.stringify(sorted, { encode: true }) + '&vnp_secure_hash=' + secureHash;
  },

  // 6. Create payment URL with saved token using token_ui snake_case
  createTokenPayUrl: async (orderId, amount, customerId, token, ipAddr) => {
    const tmnCode = (process.env.VNP_TMNCODE || '').trim();
    const returnUrl = (process.env.VNP_RETURNURL || '').trim();
    const date = new Date();
    const createDate = date.getFullYear().toString() +
                       (date.getMonth() + 1).toString().padStart(2, '0') +
                       date.getDate().toString().padStart(2, '0') +
                       date.getHours().toString().padStart(2, '0') +
                       date.getMinutes().toString().padStart(2, '0') +
                       date.getSeconds().toString().padStart(2, '0');

    // Use lowercase snake_case and no spaces to avoid encoding issues
    const params = {
        vnp_version: '2.1.0',
        vnp_command: 'token_pay',
        vnp_tmn_code: tmnCode,
        vnp_amount: amount * 100,
        vnp_app_user_id: customerId.toString(), 
        vnp_create_date: createDate,
        vnp_curr_code: 'VND',
        vnp_ip_addr: ipAddr || '127.0.0.1',
        vnp_locale: 'vn',
        vnp_txn_desc: `PayOrder${orderId}`, // Remove spaces for safest encoding
        vnp_return_url: returnUrl,
        vnp_token: token, 
        vnp_txn_ref: orderId.toString(),
    };

    const secureHash = vnpayController.signParams(params); // Lowercase hex
    const baseUrl = 'https://sandbox.vnpayment.vn/token_ui/payment-token.html'; 
    
    const sortedParams = {};
    Object.keys(params).sort().forEach(key => sortedParams[key] = params[key]);

    // Token Pay (token_ui) REQUIRES lowercase vnp_secure_hash
    return baseUrl + '?' + qs.stringify(sortedParams, { encode: true }) + '&vnp_secure_hash=' + secureHash;
  },

  handleCreateTokenUrl: async (req, res) => {
    const { customerId, ipAddr, cardType = '01' } = req.body;
    try {
      const url = await vnpayController.createTokenUrl(customerId, ipAddr, cardType);
      res.status(200).json({ tokenUrl: url });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = vnpayController;
