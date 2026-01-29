// models/Room.js
const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
    roomId: {
        type: String,
        required: true,
        unique: true
    },
    roomName: {
        type: String,
        required: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    participants: [{
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        username: String,
        socketId: String,
        joinedAt: {
            type: Date,
            default: Date.now
        },
        isMuted: {
            type: Boolean,
            default: false
        },
        isVideoOff: {
            type: Boolean,
            default: false
        }
    }],
    maxParticipants: {
        type: Number,
        default: 6
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);