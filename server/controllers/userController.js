const User = require('../models/User');

// @desc    Update username
// @route   PATCH /api/users/update-username
exports.updateUsername = async (req, res) => {
  try {
    const { username } = req.body;

    // Check if username is taken
    const existingUser = await User.findOne({ 
      username,
      _id: { $ne: req.user.userId }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Username already taken' });
    }

    const user = await User.findByIdAndUpdate(
      req.user.userId,
      { username },
      { new: true }
    ).select('-password');

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};