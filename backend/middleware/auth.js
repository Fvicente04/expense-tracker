const jwt = require('jsonwebtoken');
const { User } = require('../models');

module.exports = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id, { attributes: ['id', 'passwordChangedAt'] });
    if (!user) return res.status(401).json({ message: 'Token is not valid' });

    // Tokens issued before the last password change are revoked.
    // Compared in whole seconds because jwt iat has no sub-second precision.
    if (user.passwordChangedAt && decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};
