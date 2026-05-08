const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const bookRoutes = require('./routes/bookRoutes');
const aiRoutes = require('./routes/aiRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const profileRoutes = require('./routes/profileRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const checkoutDataRoutes = require('./routes/checkoutDataRoutes');
const vnpayRoutes = require('./routes/vnpayRoutes');

const app = express();
app.use(cors());
app.use(express.json()); // Parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // Parse form-urlencoded request bodies for testing

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/order', orderRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/review', reviewRoutes);
app.use('/api/checkout-data', checkoutDataRoutes);
app.use('/api/vnpay', vnpayRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Bookstore backend is running at http://localhost:${PORT}`);
});