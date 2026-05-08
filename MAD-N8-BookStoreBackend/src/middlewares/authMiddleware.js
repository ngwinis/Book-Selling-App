const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: "Please log in to access this feature." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'bookstore_secret_dev');
    req.user = decoded; // VD: { customerID, email }
    next();
  } catch (error) {
    res.status(401).json({ message: "The login session has expired or is invalid." });
  }
};

module.exports = authMiddleware;
