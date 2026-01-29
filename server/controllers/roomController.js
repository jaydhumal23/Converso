const Room = require('../models/Room');
const { nanoid } = require('nanoid');

// @desc    Create new room
// @route   POST /api/rooms/create
exports.createRoom = async (req, res) => {
    try {
        const { roomName, maxParticipants } = req.body;
        const roomId = nanoid(10); // Generate unique room ID

        const room = await Room.create({
            roomId,
            roomName,
            createdBy: req.user.userId,
            maxParticipants: maxParticipants || 6,
            participants: []
        });

        // Populate creator info
        await room.populate('createdBy', 'username email');

        // Emit to all connected clients (handled in socket)
        req.app.get('io').emit('room-created', room);

        res.status(201).json({
            success: true,
            room
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get all active rooms
// @route   GET /api/rooms
exports.getAllRooms = async (req, res) => {
    try {
        const rooms = await Room.find({ isActive: true })
            .populate('createdBy', 'username')
            .populate('participants.userId', 'username')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: rooms.length,
            rooms
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Get single room
// @route   GET /api/rooms/:roomId
exports.getRoom = async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId })
            .populate('createdBy', 'username email')
            .populate('participants.userId', 'username email');

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        res.json({ success: true, room });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Delete room
// @route   DELETE /api/rooms/:roomId
exports.deleteRoom = async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId });

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        // Check if user is room creator
        if (room.createdBy.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized to delete this room' });
        }

        await room.deleteOne();

        // Emit to all clients
        req.app.get('io').emit('room-deleted', { roomId: req.params.roomId });

        res.json({ success: true, message: 'Room deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Update room settings
// @route   PATCH /api/rooms/:roomId
exports.updateRoomSettings = async (req, res) => {
    try {
        const room = await Room.findOne({ roomId: req.params.roomId });

        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        // Check if user is room creator
        if (room.createdBy.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const { roomName, maxParticipants } = req.body;

        if (roomName) room.roomName = roomName;
        if (maxParticipants) room.maxParticipants = maxParticipants;

        await room.save();

        res.json({ success: true, room });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};