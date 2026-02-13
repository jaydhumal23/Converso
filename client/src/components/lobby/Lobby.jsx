import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { SocketContext } from '../../context/SocketContext';
import { ThemeContext } from '../../context/ThemeContext';
import api from '../../services/api';
import RoomCard from './RoomCard';
import CreateRoomModal from './CreateRoomModal';

const Lobby = ({ onJoinRoom }) => {
    const [rooms, setRooms] = useState([]);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const { user, logout } = useContext(AuthContext);
    const { socket, connected } = useContext(SocketContext);
    const { theme, toggleTheme } = useContext(ThemeContext);

    useEffect(() => {
        fetchRooms();
    }, []);

    // Re-fetch rooms when socket reconnects (in case events were missed)
    useEffect(() => {
        if (connected) {
            fetchRooms();
        }
    }, [connected]);

    useEffect(() => {
        if (!socket) return;

        socket.on('room-created', (room) => {
            setRooms(prev => {
                const exists = prev.some(r => r.roomId === room.roomId);
                return exists ? prev : [room, ...prev];
            });
        });

        socket.on('room-deleted', ({ roomId }) => {
            setRooms(prev => prev.filter(room => room.roomId !== roomId));
        });

        // room-updated now receives a full room object from the server
        socket.on('room-updated', (updatedRoom) => {
            setRooms(prev => prev.map(room =>
                room.roomId === updatedRoom.roomId
                    ? updatedRoom
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
            const data = await api.rooms.create(roomData);
            const room = data.room;
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
        <div className="min-h-screen bg-bg">
            {/* Header */}
            <nav className="bg-surface border-b border-border px-4 sm:px-6 py-3 sm:py-4 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto flex justify-between items-center gap-2">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <h1 className="text-base sm:text-lg font-semibold text-tx truncate tracking-tight">WebRTC</h1>
                        {connected ? (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border">
                                <div className="w-1.5 h-1.5 bg-success rounded-full"></div>
                                <span className="text-xs text-tx-secondary font-medium hidden sm:inline">Connected</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border">
                                <div className="w-1.5 h-1.5 bg-warning rounded-full animate-pulse"></div>
                                <span className="text-xs text-tx-secondary font-medium hidden sm:inline">Connecting</span>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-1 sm:gap-2">
                        <button
                            onClick={toggleTheme}
                            className="text-tx-muted cursor-pointer hover:text-tx transition-colors p-2 rounded-lg hover:bg-bg-hover"
                            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
                        >
                            {theme === 'dark' ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                            )}
                        </button>
                        <button
                            onClick={logout}
                            className="text-tx-muted cursor-pointer hover:text-tx transition-colors px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg hover:bg-bg-hover text-sm whitespace-nowrap"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-12">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 sm:mb-10">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-semibold text-tx mb-1">
                            Welcome, {user?.username}
                        </h1>
                        <p className="text-tx-secondary text-sm">
                            Join an existing room or create your own
                        </p>
                    </div>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-accent cursor-pointer text-bg px-5 sm:px-6 py-2.5 rounded-lg font-medium hover:bg-accent-hover transition-all text-sm whitespace-nowrap w-full sm:w-auto text-center"
                    >
                        + Create Room
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-tx-muted"></div>
                    </div>
                ) : rooms.length === 0 ? (
                    <div className="text-center py-20 bg-surface rounded-2xl border border-border">
                        <h3 className="text-xl font-semibold text-tx mb-2">No active rooms</h3>
                        <p className="text-tx-secondary mb-6 text-sm">Be the first to create a room</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-accent text-bg px-6 py-2.5 rounded-lg font-medium hover:bg-accent-hover transition-all inline-flex items-center gap-2 cursor-pointer text-sm"
                        >
                            Create First Room
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
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