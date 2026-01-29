const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { updateUsername } = require('../controllers/userController');

router.patch('/update-username', protect, updateUsername);

module.exports = router;