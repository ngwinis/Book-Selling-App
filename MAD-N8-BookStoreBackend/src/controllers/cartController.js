const supabase = require('../config/supabase');

const getOrCreateCart = async (customerId) => {
  let { data: cart, error: cartError } = await supabase
    .from('Cart')
    .select('cartID')
    .eq('idCustomer', customerId)
    .maybeSingle();

  if (cartError) throw cartError;

  if (!cart) {
    const { data: newCart, error: createError } = await supabase
      .from('Cart')
      .insert([{ idCustomer: customerId, updateAt: new Date() }])
      .select('cartID')
      .single();

    if (createError) throw createError;
    cart = newCart;
  }

  return cart;
};

const cartController = {
  getCart: async (req, res) => {
    const { customerId } = req.query; 

    try {
      const cart = await getOrCreateCart(customerId);

      const { data: cartItems, error: itemsError } = await supabase
        .from('CartItem')
        .select(`cartItemID, quantity, Book (bookID, title, price, BookImages(imageURL))`)
        .eq('idCart', cart.cartID)
        .order('cartItemID', { ascending: true });

      if (itemsError) throw itemsError;

      const totalAmount = (cartItems || []).reduce((sum, item) => sum + (item.quantity * item.Book.price), 0);

      res.status(200).json({ cartID: cart.cartID, items: cartItems || [], totalAmount });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  addToCart: async (req, res) => {
    const { customerId, bookId, quantity } = req.body;

    try {
      if (!customerId || customerId <= 0) {
        return res.status(400).json({ message: 'Please log in to add items to the cart' });
      }

      const cart = await getOrCreateCart(customerId);
      
      const { data: existingItem, error: existingItemError } = await supabase
        .from('CartItem')
        .select('*')
        .eq('idCart', cart.cartID)
        .eq('idBook', bookId)
        .maybeSingle();

      if (existingItemError) throw existingItemError;

      if (existingItem) {
        const { data, error } = await supabase.from('CartItem')
          .update({ quantity: existingItem.quantity + quantity })
          .eq('cartItemID', existingItem.cartItemID)
          .select();
        if (error) throw error;
        res.status(200).json({ message: "Cart quantity updated!", data });
      } else {
        const { data, error } = await supabase.from('CartItem').insert([{ idCart: cart.cartID, idBook: bookId, quantity }]).select();
        if (error) throw error;
        res.status(201).json({ message: "New book added to cart!", data });
      }
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Update quantity for one cart row
  updateCartItemQuantity: async (req, res) => {
    const { cartItemId } = req.params;
    const { quantity } = req.body;

    try {
      if (quantity <= 0) {
        // Treat quantity <= 0 as delete
        const { error } = await supabase.from('CartItem').delete().eq('cartItemID', cartItemId);
        if (error) throw error;
        return res.status(200).json({ message: "Product removed from cart." });
      }

      const { data, error } = await supabase.from('CartItem').update({ quantity }).eq('cartItemID', cartItemId).select();
      if (error) throw error;
      res.status(200).json({ message: "Quantity updated", data });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  // Manually remove one cart row
  removeCartItem: async (req, res) => {
    const { cartItemId } = req.params;
    try {
      const { error } = await supabase.from('CartItem').delete().eq('cartItemID', cartItemId);
      if (error) throw error;
      res.status(200).json({ message: "Product removed from cart." });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
};

module.exports = cartController;
