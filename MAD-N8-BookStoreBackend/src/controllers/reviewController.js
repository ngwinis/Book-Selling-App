const supabase = require('../config/supabase');

const attachCustomerToReviews = async (reviews = []) => {
  if (!reviews.length) return [];

  const customerIds = [...new Set(reviews.map((review) => review.idCustomer).filter(Boolean))];
  if (!customerIds.length) {
    return reviews.map((review) => ({ ...review, Customer: null }));
  }

  const { data: customers, error } = await supabase
    .from('Customer')
    .select('customerID, fullName')
    .in('customerID', customerIds);

  if (error) {
    return reviews.map((review) => ({ ...review, Customer: null }));
  }

  const customerMap = new Map((customers || []).map((customer) => [customer.customerID, customer.fullName]));
  return reviews.map((review) => ({
    ...review,
    Customer: customerMap.has(review.idCustomer)
      ? { fullName: customerMap.get(review.idCustomer) }
      : null,
  }));
};

const reviewController = {
  getReviewsByBook: async (req, res) => {
    const { bookId } = req.params;
    const numericBookId = Number(bookId);

    try {
      const { data, error } = await supabase
        .from('Review')
        .select('reviewID, rating, comment, createdAt, idCustomer')
        .eq('idBook', numericBookId)
        .order('createdAt', { ascending: false });

      if (error) throw error;
      res.status(200).json(await attachCustomerToReviews(data || []));
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  addReview: async (req, res) => {
    const { bookId, rating, comment } = req.body;
    const customerId = req.user?.customerID;
    const numericBookId = Number(bookId);

    if (!customerId) {
      return res.status(401).json({ message: 'Vui long dang nhap de gui danh gia' });
    }

    try {
      const { data: existingReview, error: existingReviewError } = await supabase
        .from('Review')
        .select('reviewID')
        .eq('idBook', numericBookId)
        .eq('idCustomer', customerId)
        .maybeSingle();

      if (existingReviewError) throw existingReviewError;

      let review;
      let error;
      let updated = false;

      if (existingReview) {
        updated = true;
        ({ data: review, error } = await supabase
          .from('Review')
          .update({ rating, comment, createdAt: new Date().toISOString() })
          .eq('reviewID', existingReview.reviewID)
          .select('reviewID, rating, comment, createdAt, idCustomer')
          .single());
      } else {
        ({ data: review, error } = await supabase
          .from('Review')
          .insert([
            {
              idBook: numericBookId,
              idCustomer: customerId,
              rating,
              comment,
              createdAt: new Date().toISOString(),
            },
          ])
          .select('reviewID, rating, comment, createdAt, idCustomer')
          .single());
      }

      if (error) throw error;

      const [decoratedReview] = await attachCustomerToReviews(review ? [review] : []);

      res.status(updated ? 200 : 201).json({
        message: updated ? 'Da cap nhat danh gia thanh cong' : 'Da gui danh gia thanh cong',
        updated,
        review: decoratedReview || null,
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },
};

module.exports = reviewController;
