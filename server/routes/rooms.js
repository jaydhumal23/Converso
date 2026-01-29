const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    createRoom,
    getAllRooms,
    getRoom,
    deleteRoom,
    updateRoomSettings
} = require('../controllers/roomController');

router.post('/create', protect, createRoom);
router.get('/', protect, getAllRooms);
router.get('/:roomId', protect, getRoom);
router.delete('/:roomId', protect, deleteRoom);
router.patch('/:roomId', protect, updateRoomSettings);

module.exports = router;