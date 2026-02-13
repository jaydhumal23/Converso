const Room = require('../models/Room');
const User = require('../models/User');

// Store socket-to-user mapping
const userSockets = new Map(); // userId -> socketId
const socketUsers = new Map(); // socketId -> userId

exports.handleSocketConnection = (io) => {
  // Make io accessible in routes
  io.on('connection', (socket) => {
    console.log(' User connected:', socket.id);

    // Authenticate socket connection
    socket.on('authenticate', async ({ userId, token }) => {
      try {
        // Verify token here if needed
        userSockets.set(userId, socket.id);
        socketUsers.set(socket.id, userId);

        // Update user online status
        await User.findByIdAndUpdate(userId, { isOnline: true });

        socket.userId = userId;
        socket.emit('authenticated', { success: true });
      } catch (error) {
        socket.emit('authentication-error', { message: error.message });
      }
    });

    // Join room
    socket.on('join-room', async ({ roomId, userId, username }) => {
      try {
        // Use atomic findOneAndUpdate to avoid version conflicts
        const existingRoom = await Room.findOne({ roomId });

        if (!existingRoom) {
          return socket.emit('error', { message: 'Room not found' });
        }

        if (existingRoom.participants.length >= existingRoom.maxParticipants) {
          return socket.emit('error', { message: 'Room is full' });
        }

        const alreadyIn = existingRoom.participants.some(
          p => p.userId.toString() === userId
        );

        let room;
        if (alreadyIn) {
          // Update socket ID atomically
          room = await Room.findOneAndUpdate(
            { roomId, 'participants.userId': userId },
            { $set: { 'participants.$.socketId': socket.id } },
            { returnDocument: 'after' }
          );
        } else {
          // Add participant atomically
          room = await Room.findOneAndUpdate(
            { roomId, $expr: { $lt: [{ $size: '$participants' }, '$maxParticipants'] } },
            { $push: { participants: { userId, username, socketId: socket.id, joinedAt: new Date(), isMuted: false, isVideoOff: false } } },
            { returnDocument: 'after' }
          );
        }

        if (!room) {
          return socket.emit('error', { message: 'Could not join room' });
        }

        // Join socket room
        socket.join(roomId);
        socket.roomId = roomId;
        socket.username = username; // Store username for disconnect handling

        // Send current participants to NEW user FIRST
        const otherParticipants = room.participants
          .filter(p => p.userId.toString() !== userId)
          .map(p => ({
            userId: p.userId,
            username: p.username,
            socketId: p.socketId,
            isMuted: p.isMuted,
            isVideoOff: p.isVideoOff
          }));

        socket.emit('existing-participants', otherParticipants);

        // THEN notify EXISTING users that a new user joined
        socket.to(roomId).emit('user-joined', {
          userId,
          username,
          socketId: socket.id,
          isMuted: false,
          isVideoOff: false
        });

        // Update room list for lobby - send full room data
        const updatedRoom = await Room.findOne({ roomId })
          .populate('createdBy', 'username')
          .populate('participants.userId', 'username');
        if (updatedRoom) {
          io.emit('room-updated', updatedRoom.toObject({ virtuals: true }));
        }

        console.log(` ${username} joined room ${roomId} (${room.participants.length}/${room.maxParticipants})`);
      } catch (error) {
        console.error(' Join room error:', error);
        socket.emit('error', { message: error.message });
      }
    });

    // WebRTC signaling
    socket.on('offer', ({ offer, to, roomId }) => {
      console.log(` Forwarding offer: ${socket.id} → ${to}`);
      socket.to(to).emit('offer', { offer, from: socket.id });
    });

    socket.on('answer', ({ answer, to, roomId }) => {
      console.log(` Forwarding answer: ${socket.id} → ${to}`);
      socket.to(to).emit('answer', { answer, from: socket.id });
    });

    socket.on('ice-candidate', ({ candidate, to, roomId }) => {
      socket.to(to).emit('ice-candidate', { candidate, from: socket.id });
    });

    // Toggle mic
    socket.on('toggle-mic', async ({ roomId, userId, isMuted }) => {
      try {
        await Room.findOneAndUpdate(
          { roomId, 'participants.userId': userId },
          { $set: { 'participants.$.isMuted': isMuted } }
        );

        socket.to(roomId).emit('user-mic-toggled', {
          socketId: socket.id,
          userId,
          isMuted
        });
      } catch (error) {
        console.error(' Toggle mic error:', error);
      }
    });

    // Toggle video
    socket.on('toggle-video', async ({ roomId, userId, isVideoOff }) => {
      try {
        await Room.findOneAndUpdate(
          { roomId, 'participants.userId': userId },
          { $set: { 'participants.$.isVideoOff': isVideoOff } }
        );

        socket.to(roomId).emit('user-video-toggled', {
          socketId: socket.id,
          userId,
          isVideoOff
        });
      } catch (error) {
        console.error(' Toggle video error:', error);
      }
    });

    // Leave room
    socket.on('leave-room', async ({ roomId, userId }) => {
      await handleLeaveRoom(socket, io, roomId, userId);
    });

    // Disconnect
    socket.on('disconnect', async () => {
      console.log('User disconnected:', socket.id);

      const userId = socketUsers.get(socket.id);

      if (userId) {
        // Update user offline status
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: new Date()
        });

        userSockets.delete(userId);
        socketUsers.delete(socket.id);
      }

      // Remove from any rooms
      if (socket.roomId) {
        await handleLeaveRoom(socket, io, socket.roomId, userId);
      }
    });
  });
};

// Helper function to handle leaving room
async function handleLeaveRoom(socket, io, roomId, userId) {
  try {
    // Atomically remove participant and return the updated document
    const room = await Room.findOneAndUpdate(
      { roomId },
      { $pull: { participants: { userId } } },
      { returnDocument: 'after' }
    );

    if (!room) return; // Room already deleted

    if (room.participants.length === 0) {
      // Delete empty room
      await Room.deleteOne({ roomId });
      io.emit('room-deleted', { roomId });
      console.log(` Room ${roomId} deleted (empty)`);
    } else {
      // Notify remaining participants
      socket.to(roomId).emit('user-left', {
        socketId: socket.id,
        userId
      });

      // Update room list for lobby
      const updatedRoom = await Room.findOne({ roomId })
        .populate('createdBy', 'username')
        .populate('participants.userId', 'username');
      if (updatedRoom) {
        io.emit('room-updated', updatedRoom.toObject({ virtuals: true }));
      }
    }

    socket.leave(roomId);
    console.log(` User ${userId} left room ${roomId}`);
  } catch (error) {
    console.error(' Leave room error:', error);
  }
}