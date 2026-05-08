const supabase = require('../config/supabase');

const DEFAULT_PAYMENT_METHODS = [
  { paymentMethod: 'Cash on Delivery (COD)', status: 'Active' },
  { paymentMethod: 'Bank transfer', status: 'Active' },
  { paymentMethod: 'Momo wallet', status: 'Unsupported' },
  { paymentMethod: 'ZaloPay', status: 'Unsupported' },
  { paymentMethod: 'VNPay', status: 'Unsupported' },
  { paymentMethod: 'Debit / credit card', status: 'Unsupported' },
];

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

const isSupportedPaymentMethod = (paymentMethod = '') => {
  const normalized = normalizePaymentMethod(paymentMethod);
  return normalized.includes('COD') || normalized.includes('CHUYEN KHOAN');
};

const resolvePaymentStatus = (paymentMethod = '') => (
  isSupportedPaymentMethod(paymentMethod) ? 'Active' : 'Unsupported'
);

const sortPayments = (payments = []) => {
  const orderMap = new Map(
    DEFAULT_PAYMENT_METHODS.map((item, index) => [normalizePaymentMethod(item.paymentMethod), index])
  );

  return [...payments].sort((left, right) => {
    const leftOrder = orderMap.get(normalizePaymentMethod(left.paymentMethod));
    const rightOrder = orderMap.get(normalizePaymentMethod(right.paymentMethod));

    if (leftOrder != null && rightOrder != null) return leftOrder - rightOrder;
    if (leftOrder != null) return -1;
    if (rightOrder != null) return 1;
    return (left.paymentID || 0) - (right.paymentID || 0);
  });
};

const ensureDefaultPaymentMethods = async (customerId, existingPayments = []) => {
  const existingSet = new Set(existingPayments.map((payment) => normalizePaymentMethod(payment.paymentMethod)));

  const missingPayload = DEFAULT_PAYMENT_METHODS
    .filter((item) => !existingSet.has(normalizePaymentMethod(item.paymentMethod)))
    .map((item) => ({
      idCustomer: customerId,
      paymentMethod: item.paymentMethod,
      status: item.status,
    }));

  if (missingPayload.length === 0) {
    return existingPayments;
  }

  const { data, error } = await supabase
    .from('Payment')
    .insert(missingPayload)
    .select('*');

  if (error) throw error;
  return [...existingPayments, ...(data || [])];
};

const decoratePayments = (payments = []) =>
  sortPayments(
    payments.map((payment) => ({
      ...payment,
      status: resolvePaymentStatus(payment.paymentMethod),
    }))
  );

const profileController = {
  getProfile: async (req, res) => {
    const { customerId } = req.query;

    try {
      const { data, error } = await supabase
        .from('Customer')
        .select('customerID, fullName, email, phoneNumber, joinDay')
        .eq('customerID', customerId)
        .single();

      if (error) throw error;
      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateProfile: async (req, res) => {
    const { customerId, fullName, phoneNumber } = req.body;

    try {
      const { data, error } = await supabase
        .from('Customer')
        .update({ fullName, phoneNumber })
        .eq('customerID', customerId)
        .select('customerID, fullName, email, phoneNumber')
        .single();

      if (error) throw error;
      res.status(200).json({ message: 'Profile updated successfully!', user: data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getAddresses: async (req, res) => {
    const { customerId } = req.query;

    try {
      const { data, error } = await supabase
        .from('Address')
        .select('*')
        .eq('idCustomer', customerId)
        .order('addressID', { ascending: false });

      if (error) throw error;
      res.status(200).json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  addAddress: async (req, res) => {
    const { customerId, receiverName, addressString } = req.body;

    try {
      const { data, error } = await supabase
        .from('Address')
        .insert([{ idCustomer: customerId, receiverName, addressString }])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json({ message: 'Address added successfully!', address: data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updateAddress: async (req, res) => {
    const { addressId } = req.params;
    const { receiverName, addressString } = req.body;

    try {
      const { data, error } = await supabase
        .from('Address')
        .update({ receiverName, addressString })
        .eq('addressID', addressId)
        .select()
        .single();

      if (error) throw error;
      res.status(200).json({ message: 'Address updated successfully', address: data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  deleteAddress: async (req, res) => {
    const { addressId } = req.params;

    try {
      const { error } = await supabase.from('Address').delete().eq('addressID', addressId);
      if (error) throw error;
      res.status(200).json({ message: 'Address deleted successfully.' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getPaymentMethods: async (req, res) => {
    const { customerId } = req.query;

    try {
      const { data, error } = await supabase
        .from('Payment')
        .select('*')
        .eq('idCustomer', customerId)
        .order('paymentID', { ascending: true });

      if (error) throw error;

      const payments = await ensureDefaultPaymentMethods(customerId, data || []);
      res.status(200).json(decoratePayments(payments));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  addPaymentMethod: async (req, res) => {
    const { customerId, paymentMethod } = req.body;
    const status = resolvePaymentStatus(paymentMethod);

    try {
      const { data, error } = await supabase
        .from('Payment')
        .insert([{ idCustomer: customerId, paymentMethod, status }])
        .select()
        .single();

      if (error) throw error;
      res.status(201).json({
        message: 'Payment method added successfully!',
        payment: { ...data, status },
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  updatePaymentMethod: async (req, res) => {
    const { paymentId } = req.params;
    const { paymentMethod } = req.body;
    const status = resolvePaymentStatus(paymentMethod);

    try {
      const { data, error } = await supabase
        .from('Payment')
        .update({ paymentMethod, status })
        .eq('paymentID', paymentId)
        .select()
        .single();

      if (error) throw error;
      res.status(200).json({
        message: 'Payment method updated successfully',
        payment: { ...data, status },
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  deletePaymentMethod: async (req, res) => {
    const { paymentId } = req.params;

    try {
      const { error } = await supabase.from('Payment').delete().eq('paymentID', paymentId);
      if (error) throw error;
      res.status(200).json({ message: 'Payment method deleted successfully.' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = profileController;
