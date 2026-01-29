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
        const room = await Room.findOne({ roomId });

        if (!room) {
          return socket.emit('error', { message: 'Room not found' });
        }

        // Check if room is full
        if (room.participants.length >= room.maxParticipants) {
          return socket.emit('error', { message: 'Room is full' });
        }

        // Check if user already in room
        const existingParticipant = room.participants.find(
          p => p.userId.toString() === userId
        );

        if (!existingParticipant) {
          // Add participant
          room.participants.push({
            userId,
            username,
            socketId: socket.id,
            joinedAt: new Date(),
            isMuted: false,
            isVideoOff: false
          });
          await room.save();
        } else {
          // Update socket ID if reconnecting
          existingParticipant.socketId = socket.id;
          await room.save();
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

        // Update room list for lobby
        io.emit('room-updated', {
          roomId: room.roomId,
          participantCount: room.participants.length
        });

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
        const room = await Room.findOne({ roomId });
        const participant = room.participants.find(p => p.userId.toString() === userId);

        if (participant) {
          participant.isMuted = isMuted;
          await room.save();

          socket.to(roomId).emit('user-mic-toggled', {
            socketId: socket.id,
            userId,
            isMuted
          });
        }
      } catch (error) {
        console.error(' Toggle mic error:', error);
      }
    });

    // Toggle video
    socket.on('toggle-video', async ({ roomId, userId, isVideoOff }) => {
      try {
        const room = await Room.findOne({ roomId });
        const participant = room.participants.find(p => p.userId.toString() === userId);

        if (participant) {
          participant.isVideoOff = isVideoOff;
          await room.save();

          socket.to(roomId).emit('user-video-toggled', {
            socketId: socket.id,
            userId,
            isVideoOff
          });
        }
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
    const room = await Room.findOne({ roomId });

    if (room) {
      // Find the participant to get their info before removing
      const leavingParticipant = room.participants.find(
        p => p.userId.toString() === userId
      );

      // Remove participant
      room.participants = room.participants.filter(
        p => p.userId.toString() !== userId
      );

      // Delete room if empty
      if (room.participants.length === 0) {
        await room.deleteOne();
        io.emit('room-deleted', { roomId });
        console.log(` Room ${roomId} deleted (empty)`);
      } else {
        await room.save();

        //  CRITICAL FIX: Send socketId with user-left event
        socket.to(roomId).emit('user-left', { 
          socketId: leavingParticipant ? leavingParticipant.socketId : socket.id,
          userId 
        });

        // Update room list
        io.emit('room-updated', {
          roomId: room.roomId,
          participantCount: room.participants.length
        });
      }

      socket.leave(roomId);
      console.log(` User ${userId} left room ${roomId}`);
    }
  } catch (error) {
    console.error(' Leave room error:', error);
  }
}