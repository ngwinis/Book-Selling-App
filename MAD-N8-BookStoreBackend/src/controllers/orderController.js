const supabase = require('../config/supabase');

const PAYMENT_PENDING_STATUS = 'Pending payment';
const PAYMENT_PROCESSING_STATUS = 'Processing';
const PAYMENT_COMPLETED_STATUS = 'Completed';
const PAYMENT_CANCELLED_STATUS = 'Canceled';

const normalizeText = (value = '') =>
  value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\u0111/g, 'd')
    .replace(/\u0110/g, 'D')
    .trim()
    .toUpperCase();

const normalizePaymentMethod = (paymentMethod = '') => normalizeText(paymentMethod);

const isCashOnDelivery = (payment) => normalizePaymentMethod(payment?.paymentMethod).includes('COD');

const isBankTransfer = (payment) => {
  const normalized = normalizePaymentMethod(payment?.paymentMethod);
  return normalized.includes('CHUYEN KHOAN') || normalized.includes('BANK TRANSFER');
};

const isSupportedPaymentMethod = (payment) => isCashOnDelivery(payment) || isBankTransfer(payment);

const resolveCheckoutStatus = (payment) => (
  isCashOnDelivery(payment) ? PAYMENT_PROCESSING_STATUS : PAYMENT_PENDING_STATUS
);

const resolveConfirmedPaymentStatus = () => PAYMENT_PROCESSING_STATUS;

const buildCheckoutMessage = (payment) => {
  if (isCashOnDelivery(payment)) {
    return 'COD order placed successfully';
  }

  if (isBankTransfer(payment)) {
    return 'Order created. Please transfer the payment and confirm it in order details';
  }

  return 'Order placed successfully';
};

const mapOrderItems = (orderItems = []) =>
  orderItems.map((item) => {
    const images = item.Book?.BookImages || [];
    const primaryImage = images[0]?.imageURL || null;

    return {
      bookId: item.Book?.bookID || item.idBook || null,
      bookTitle: item.Book?.title || 'Book',
      bookPrice: item.Book?.price || 0,
      quantity: item.quantity || 0,
      bookImage: primaryImage,
    };
  });

const buildOrderSummary = (order) => ({
  orderID: order.orderID,
  orderDate: order.orderDate,
  totalAmount: order.totalAmount,
  finalAmount: order.finalAmount,
  status: order.status,
  items: mapOrderItems(order.OrderItem || []),
});

const buildOrderDetail = (order) => ({
  orderID: order.orderID,
  orderDate: order.orderDate,
  totalAmount: order.totalAmount,
  finalAmount: order.finalAmount,
  status: order.status,
  address: order.Address || null,
  payment: order.Payment || null,
  shipment: order.Shipment || null,
  voucher: order.Voucher || null,
  items: mapOrderItems(order.OrderItem || []),
});

const applyVoucher = async (voucherId, totalAmount) => {
  if (!voucherId) {
    return { finalAmount: totalAmount, usedVoucher: null };
  }

  const { data: voucher, error } = await supabase
    .from('Voucher')
    .select('*')
    .eq('voucherID', voucherId)
    .single();

  if (error) throw error;
  if (!voucher) return { finalAmount: totalAmount, usedVoucher: null };

  const discount = voucher.type === 'PERCENT'
    ? (totalAmount * Number(voucher.discountValue || 0)) / 100
    : Number(voucher.discountValue || 0);

  const finalAmount = Math.max(0, totalAmount - discount);

  if (voucher.usageLimit > 0) {
    await supabase
      .from('Voucher')
      .update({ usageLimit: voucher.usageLimit - 1 })
      .eq('voucherID', voucherId);
  }

  return { finalAmount, usedVoucher: voucher };
};

const checkoutSelectedCartItems = async ({ customerId, selectedCartItemIds }) => {
  const { data: cart, error: cartError } = await supabase
    .from('Cart')
    .select('cartID')
    .eq('idCustomer', customerId)
    .maybeSingle();

  if (cartError) throw cartError;
  if (!cart) {
    return { cart: null, cartItems: [] };
  }

  let query = supabase
    .from('CartItem')
    .select('cartItemID, idBook, quantity, Book(price)')
    .eq('idCart', cart.cartID);

  if (Array.isArray(selectedCartItemIds) && selectedCartItemIds.length > 0) {
    query = query.in('cartItemID', selectedCartItemIds);
  }

  const { data: cartItems, error: cartItemsError } = await query;
  if (cartItemsError) throw cartItemsError;

  return { cart, cartItems: cartItems || [] };
};

const buildOrderPayload = ({
  customerId,
  addressId,
  paymentId,
  shipmentId,
  voucherId,
  totalAmount,
  finalAmount,
  status,
}) => ({
  orderDate: new Date(),
  totalAmount,
  finalAmount,
  status,
  idCustomer: customerId,
  idAddress: addressId,
  idPayment: paymentId,
  idShipment: shipmentId,
  idVoucher: voucherId || null,
});

const ensureSupportedPayment = (payment, res) => {
  if (!isSupportedPaymentMethod(payment)) {
    res.status(400).json({
      message: 'This payment method is not supported for in-app completion',
    });
    return false;
  }

  return true;
};

const orderController = {
  checkout: async (req, res) => {
    const {
      customerId,
      addressId,
      paymentId,
      shipmentId,
      voucherId,
      selectedCartItemIds,
    } = req.body;

    try {
      const { data: payment, error: paymentError } = await supabase
        .from('Payment')
        .select('*')
        .eq('paymentID', paymentId)
        .single();

      if (paymentError) throw paymentError;
      if (!payment) {
        return res.status(404).json({ message: 'Payment method was not found' });
      }
      if (!ensureSupportedPayment(payment, res)) return;

      const { cart, cartItems } = await checkoutSelectedCartItems({ customerId, selectedCartItemIds });
      if (!cart || cartItems.length === 0) {
        return res.status(400).json({ message: 'The cart is empty or no products were selected for checkout' });
      }

      const totalAmount = cartItems.reduce(
        (sum, item) => sum + Number(item.quantity || 0) * Number(item.Book?.price || 0),
        0
      );

      const { finalAmount } = await applyVoucher(voucherId, totalAmount);
      const status = resolveCheckoutStatus(payment);

      const { data: newOrder, error: orderError } = await supabase
        .from('Order')
        .insert([
          buildOrderPayload({
            customerId,
            addressId,
            paymentId,
            shipmentId,
            voucherId,
            totalAmount,
            finalAmount,
            status,
          }),
        ])
        .select('orderID, status')
        .single();

      if (orderError) throw orderError;

      const { error: orderItemError } = await supabase.from('OrderItem').insert(
        cartItems.map((item) => ({
          idOrder: newOrder.orderID,
          idBook: item.idBook,
          quantity: item.quantity,
        }))
      );

      if (orderItemError) throw orderItemError;

      const { error: cartDeleteError } = await supabase
        .from('CartItem')
        .delete()
        .in('cartItemID', cartItems.map((item) => item.cartItemID));

      if (cartDeleteError) throw cartDeleteError;

      res.status(200).json({
        message: buildCheckoutMessage(payment),
        orderId: newOrder.orderID,
        orderID: newOrder.orderID,
        status,
        paymentUrl: null,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  buyNow: async (req, res) => {
    const { customerId, bookId, quantity, addressId, paymentId, shipmentId, voucherId } = req.body;

    try {
      const [bookResult, paymentResult] = await Promise.all([
        supabase.from('Book').select('price').eq('bookID', bookId).single(),
        supabase.from('Payment').select('*').eq('paymentID', paymentId).single(),
      ]);

      if (bookResult.error) throw bookResult.error;
      if (paymentResult.error) throw paymentResult.error;
      if (!bookResult.data) return res.status(404).json({ message: 'Book was not found' });
      if (!paymentResult.data) return res.status(404).json({ message: 'Payment method was not found' });
      if (!ensureSupportedPayment(paymentResult.data, res)) return;

      const totalAmount = Number(bookResult.data.price || 0) * Number(quantity || 0);
      const { finalAmount } = await applyVoucher(voucherId, totalAmount);
      const status = resolveCheckoutStatus(paymentResult.data);

      const { data: newOrder, error: orderError } = await supabase
        .from('Order')
        .insert([
          buildOrderPayload({
            customerId,
            addressId,
            paymentId,
            shipmentId,
            voucherId,
            totalAmount,
            finalAmount,
            status,
          }),
        ])
        .select('orderID, status')
        .single();

      if (orderError) throw orderError;

      const { error: orderItemError } = await supabase
        .from('OrderItem')
        .insert([{ idOrder: newOrder.orderID, idBook: bookId, quantity }]);

      if (orderItemError) throw orderItemError;

      res.status(200).json({
        message: buildCheckoutMessage(paymentResult.data),
        orderId: newOrder.orderID,
        orderID: newOrder.orderID,
        status,
        paymentUrl: null,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getOrderHistory: async (req, res) => {
    const { customerId, status } = req.query;

    try {
      let query = supabase
        .from('Order')
        .select('orderID, orderDate, totalAmount, finalAmount, status, OrderItem(quantity, idBook, Book(bookID, title, price, BookImages(imageURL)))')
        .eq('idCustomer', customerId)
        .order('orderDate', { ascending: false });

      if (status) query = query.eq('status', status);

      const { data: orders, error } = await query;
      if (error) throw error;

      res.status(200).json((orders || []).map(buildOrderSummary));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getOrderDetail: async (req, res) => {
    const { orderId } = req.params;

    try {
      const { data: order, error } = await supabase
        .from('Order')
        .select(`
          orderID, orderDate, totalAmount, finalAmount, status,
          Address(receiverName, addressString),
          Payment(paymentID, paymentMethod, status),
          Shipment(shipmentID, shipmentMethod, estimatedDate),
          Voucher(voucherID, code, description, discountValue, type),
          OrderItem(quantity, idBook, Book(bookID, title, price, BookImages(imageURL)))
        `)
        .eq('orderID', orderId)
        .single();

      if (error || !order) {
        return res.status(404).json({ message: 'Order was not found' });
      }

      res.status(200).json(buildOrderDetail(order));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  cancelOrder: async (req, res) => {
    const { orderId } = req.params;

    try {
      const { data: order, error: orderFetchError } = await supabase
        .from('Order')
        .select('*')
        .eq('orderID', orderId)
        .single();

      if (orderFetchError) throw orderFetchError;
      if (!order) return res.status(404).json({ message: 'Order does not exist' });

      if (order.status !== PAYMENT_PENDING_STATUS && order.status !== PAYMENT_PROCESSING_STATUS) {
        return res.status(400).json({
          message: "Orders can only be canceled in 'Pending payment' or 'Processing' status",
        });
      }

      if (order.vnpTransactionNo) {
        const vnpayController = require('./vnpayController');
        await vnpayController.refundOrder(order.orderID, order.finalAmount, order.vnpTransactionNo);
      }

      const { data, error } = await supabase
        .from('Order')
        .update({ status: PAYMENT_CANCELLED_STATUS })
        .eq('orderID', orderId)
        .select()
        .single();

      if (error) throw error;

      if (order.idVoucher) {
        const { data: voucher, error: voucherError } = await supabase
          .from('Voucher')
          .select('usageLimit')
          .eq('voucherID', order.idVoucher)
          .single();

        if (voucherError) throw voucherError;
        if (voucher) {
          await supabase
            .from('Voucher')
            .update({ usageLimit: Number(voucher.usageLimit || 0) + 1 })
            .eq('voucherID', order.idVoucher);
        }
      }

      res.status(200).json({ message: 'Order canceled successfully', data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  repayOrder: async (req, res) => {
    const { orderId } = req.body;

    try {
      const { data: order, error } = await supabase
        .from('Order')
        .select('*, Payment(*)')
        .eq('orderID', orderId)
        .single();

      if (error) throw error;
      if (!order) return res.status(404).json({ message: 'Order was not found' });

      if (isCashOnDelivery(order.Payment)) {
        return res.status(400).json({ message: 'COD orders do not require payment confirmation' });
      }

      if (!isBankTransfer(order.Payment)) {
        return res.status(400).json({
          message: 'This order payment method does not support in-app confirmation',
        });
      }

      if (order.status !== PAYMENT_PENDING_STATUS) {
        return res.status(400).json({
          message: 'Only pending-payment orders can confirm bank transfer',
        });
      }

      const nextStatus = resolveConfirmedPaymentStatus();

      await supabase
        .from('Order')
        .update({ status: nextStatus })
        .eq('orderID', order.orderID);

      res.status(200).json({
        message: 'Bank transfer confirmed. The order is now processing',
        orderId: order.orderID,
        orderID: order.orderID,
        status: nextStatus,
        paymentUrl: null,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = orderController;
