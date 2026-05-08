const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const authMiddleware = require('../middlewares/authMiddleware');

router.get('/book/:bookId', reviewController.getReviewsByBook);
router.post('/', authMiddleware, reviewController.addReview);

module.exports = router;
