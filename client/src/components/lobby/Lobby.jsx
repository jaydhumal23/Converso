import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { SocketContext } from '../../context/SocketContext';
import api from '../../services/api';
import RoomCard from './RoomCard';
import CreateRoomModal from './CreateRoomModal';

const Lobby = ({ onJoinRoom }) => {
    const [rooms, setRooms] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const { user, logout } = useContext(AuthContext);
    const { socket, connected } = useContext(SocketContext);

    useEffect(() => {
        fetchRooms();
    }, []);

    useEffect(() => {
        if (!socket) return;

        socket.on('room-created', (room) => {
            setRooms(prev => [room, ...prev]);
        });

        socket.on('room-deleted', ({ roomId }) => {
            setRooms(prev => prev.filter(room => room.roomId !== roomId));
        });

        socket.on('room-updated', ({ roomId, participantCount }) => {
            setRooms(prev => prev.map(room =>
                room.roomId === roomId
                    ? { ...room, participants: Array(participantCount).fill({}) }
                    : room
            ));
        });

        return () => {
            socket.off('room-created');
            socket.off('room-deleted');
            socket.off('room-updated');
        };
    }, [socket]);

    const fetchRooms = async () => {
        try {
            const data = await api.rooms.getAll();
            setRooms(data.rooms);
        } catch (error) {
            console.error('Error fetching rooms:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRoom = async (roomData) => {
        try {
            const room = await api.rooms.create(roomData);
            setShowCreateModal(false);

            setRooms(prev => {
                const exists = prev.some(r => r.roomId === room.roomId);
                return exists ? prev : [room, ...prev];
            });

            onJoinRoom(room.roomId);
        } catch (error) {
            alert(error.message);
        }
    };

    const handleDeleteRoom = async (roomId) => {
        try {
            await api.rooms.delete(roomId);
            setRooms(prev => prev.filter(room => room.roomId !== roomId));
        } catch (error) {
            throw new Error(error.message || 'Failed to delete room');
        }
    };

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950">
            {/* Modern Header */}
            <nav className="bg-slate-900/50 backdrop-blur-xl border-b border-white/5 px-6 py-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-3">

                            <h1 className="text-xl font-bold text-white">webRTC-Jay-project</h1>
                        </div>
                        {connected ? (
                            <div className="flex items-center gap-1.5 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                                <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                                <span className="text-xs text-emerald-400 font-medium">Connected</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
                                <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse"></div>
                                <span className="text-xs text-amber-400 font-medium">Connecting...</span>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={logout}
                        className="text-gray-400 hover:text-white transition-colors px-4 py-2 rounded-xl hover:bg-white/5"
                    >
                        Logout
                    </button>
                </div>
            </nav>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="flex justify-between items-center mb-12">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">
                            Welcome, <span className="bg-linear-to-rrom-purple-400 to-pink-400 bg-clip-text text-transparent">{user?.username}</span>! 👋
                        </h1>
                        <p className="text-gray-400">
                            Join an existing room or create your own
                        </p>
                    </div>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-linear-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg hover:shadow-purple-500/50 transform hover:scale-105 active:scale-95"
                    >
                        + Create Room
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="relative">
                            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
                            <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border border-purple-500/20"></div>
                        </div>
                    </div>
                ) : rooms.length === 0 ? (
                    <div className="text-center py-20 bg-white/5 backdrop-blur-sm rounded-3xl border border-white/10">
                        <div className="text-7xl mb-4">🎥</div>
                        <h3 className="text-2xl font-semibold text-white mb-2">No active rooms</h3>
                        <p className="text-gray-400 mb-6">Be the first to create a room!</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-linear-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg inline-flex items-center gap-2"
                        >
                            Create First Room
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {rooms.map(room => (
                            <RoomCard
                                key={room.roomId}
                                room={room}
                                onJoin={() => onJoinRoom(room.roomId)}
                                onDelete={handleDeleteRoom}
                            />
                        ))}
                    </div>
                )}
            </div>

            {showCreateModal && (
                <CreateRoomModal
                    onClose={() => setShowCreateModal(false)}
                    onCreate={handleCreateRoom}
                />
            )}
        </div>
    );
};
export default Lobby