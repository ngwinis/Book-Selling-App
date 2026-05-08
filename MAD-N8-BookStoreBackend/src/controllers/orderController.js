const supabase = require('../config/supabase');

const PAYMENT_PENDING_STATUS = 'Chờ thanh toán';
const PAYMENT_PROCESSING_STATUS = 'Đang xử lý';
const PAYMENT_COMPLETED_STATUS = 'Hoàn tất';
const PAYMENT_CANCELLED_STATUS = 'Đã hủy';

const normalizeText = (value = '') =>
  value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
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
    return 'Đặt hàng COD thành công';
  }

  if (isBankTransfer(payment)) {
    return 'Đơn hàng đã được tạo. Vui lòng chuyển khoản rồi xác nhận trong chi tiết đơn hàng';
  }

  return 'Đặt hàng thành công';
};

const mapOrderItems = (orderItems = []) =>
  orderItems.map((item) => {
    const images = item.Book?.BookImages || [];
    const primaryImage = images[0]?.imageURL || null;

    return {
      bookId: item.Book?.bookID || item.idBook || null,
      bookTitle: item.Book?.title || 'Sách',
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
      message: 'Phương thức thanh toán này chưa được hỗ trợ hoàn tất trong ứng dụng',
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
        return res.status(404).json({ message: 'Không tìm thấy phương thức thanh toán' });
      }
      if (!ensureSupportedPayment(payment, res)) return;

      const { cart, cartItems } = await checkoutSelectedCartItems({ customerId, selectedCartItemIds });
      if (!cart || cartItems.length === 0) {
        return res.status(400).json({ message: 'Giỏ hàng trống hoặc chưa chọn sản phẩm để thanh toán' });
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
      if (!bookResult.data) return res.status(404).json({ message: 'Không tìm thấy sách' });
      if (!paymentResult.data) return res.status(404).json({ message: 'Không tìm thấy phương thức thanh toán' });
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
        return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });
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
      if (!order) return res.status(404).json({ message: 'Đơn hàng không tồn tại' });

      if (order.status !== PAYMENT_PENDING_STATUS && order.status !== PAYMENT_PROCESSING_STATUS) {
        return res.status(400).json({
          message: "Chỉ có thể hủy đơn hàng ở trạng thái 'Chờ thanh toán' hoặc 'Đang xử lý'",
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

      res.status(200).json({ message: 'Đã hủy đơn hàng thành công', data });
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
      if (!order) return res.status(404).json({ message: 'Không tìm thấy đơn hàng' });

      if (isCashOnDelivery(order.Payment)) {
        return res.status(400).json({ message: 'Đơn COD không cần xác nhận thanh toán' });
      }

      if (!isBankTransfer(order.Payment)) {
        return res.status(400).json({
          message: 'Phương thức thanh toán của đơn hàng này chưa được hỗ trợ xác nhận trong ứng dụng',
        });
      }

      if (order.status !== PAYMENT_PENDING_STATUS) {
        return res.status(400).json({
          message: 'Chỉ đơn hàng ở trạng thái Chờ thanh toán mới có thể xác nhận chuyển khoản',
        });
      }

      const nextStatus = resolveConfirmedPaymentStatus();

      await supabase
        .from('Order')
        .update({ status: nextStatus })
        .eq('orderID', order.orderID);

      res.status(200).json({
        message: 'Đã xác nhận chuyển khoản. Đơn hàng đang được xử lý',
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
