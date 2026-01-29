import React, { useState, useEffect, useRef, useContext, createContext } from 'react';
import io from 'socket.io-client';

// ============================================================================
// CONFIGURATION
// ============================================================================
const API_URL = '/api';
const SOCKET_URL = '';

// ============================================================================
// CONTEXTS
// ============================================================================
const AuthContext = createContext();
const SocketContext = createContext();

// ============================================================================
// API SERVICE
// ============================================================================
const api = {
    request: async (endpoint, options = {}) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                'ngrok-skip-browser-warning': 'true',
                ...(token && { Authorization: `Bearer ${token}` }),
                ...options.headers,
            },
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.reload();
        }

        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Request failed');
        return data;
    },

    auth: {
        register: (userData) => api.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData),
        }),
        login: (credentials) => api.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        }),
        logout: () => api.request('/auth/logout', { method: 'POST' }),
    },

    rooms: {
        getAll: () => api.request('/rooms'),
        create: (roomData) => api.request('/rooms/create', {
            method: 'POST',
            body: JSON.stringify(roomData),
        }),
        get: (roomId) => api.request(`/rooms/${roomId}`),
        delete: (roomId) => api.request(`/rooms/${roomId}`, {
            method: 'DELETE',
        }),
    },
};

// ============================================================================
// AUTH PROVIDER
// ============================================================================
const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        const token = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');
        return (token && storedUser) ? JSON.parse(storedUser) : null;
    });
    const [loading, setLoading] = useState(false);

    const register = async (userData) => {
        const data = await api.auth.register(userData);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
    };

    const login = async (credentials) => {
        const data = await api.auth.login(credentials);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
    };

    const logout = async () => {
        await api.auth.logout();
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, register, login, logout, isAuthenticated: !!user }}>
            {children}
        </AuthContext.Provider>
    );
};

// ============================================================================
// SOCKET PROVIDER
// ============================================================================
const SocketProvider = ({ children }) => {
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const { user } = useContext(AuthContext);

    useEffect(() => {
        if (!user) return;

        const newSocket = io(SOCKET_URL);

        const handleConnect = () => {
            console.log('✅ Socket connected');
            setConnected(true);
            const token = localStorage.getItem('token');
            newSocket.emit('authenticate', { userId: user.id, token });
        };

        const handleDisconnect = () => {
            console.log('❌ Socket disconnected');
            setConnected(false);
        };

        const handleAuthenticated = () => {
            console.log('✅ Socket authenticated');
        };

        newSocket.on('connect', handleConnect);
        newSocket.on('disconnect', handleDisconnect);
        newSocket.on('authenticated', handleAuthenticated);

        setSocket(newSocket);

        return () => {
            newSocket.off('connect', handleConnect);
            newSocket.off('disconnect', handleDisconnect);
            newSocket.off('authenticated', handleAuthenticated);
            newSocket.close();
        };
    }, [user]);

    return (
        <SocketContext.Provider value={{ socket, connected }}>
            {children}
        </SocketContext.Provider>
    );
};

// ============================================================================
// LOGIN COMPONENT
// ============================================================================
const Login = ({ onRegisterClick }) => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useContext(AuthContext);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(formData);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md shadow-2xl">
                <h2 className="text-3xl font-bold text-white mb-6 text-center">Welcome Back</h2>

                {error && (
                    <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-white/80 mb-2">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-400"
                            placeholder="your@email.com"
                        />
                    </div>

                    <div>
                        <label className="block text-white/80 mb-2">Password</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-400"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50"
                    >
                        {loading ? 'Logging in...' : 'Login'}
                    </button>
                </form>

                <p className="text-white/60 text-center mt-6">
                    Don't have an account?{' '}
                    <button onClick={onRegisterClick} className="text-purple-300 hover:text-purple-200 font-semibold">
                        Register
                    </button>
                </p>
            </div>
        </div>
    );
};

// ============================================================================
// REGISTER COMPONENT
// ============================================================================
const Register = ({ onLoginClick }) => {
    const [formData, setFormData] = useState({ username: '', email: '', password: '', confirmPassword: '' });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useContext(AuthContext);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            await register({
                username: formData.username,
                email: formData.email,
                password: formData.password,
            });
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md shadow-2xl">
                <h2 className="text-3xl font-bold text-white mb-6 text-center">Create Account</h2>

                {error && (
                    <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-white/80 mb-2">Username</label>
                        <input
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            required
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-400"
                            placeholder="johndoe"
                        />
                    </div>

                    <div>
                        <label className="block text-white/80 mb-2">Email</label>
                        <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-400"
                            placeholder="your@email.com"
                        />
                    </div>

                    <div>
                        <label className="block text-white/80 mb-2">Password</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            required
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-400"
                            placeholder="••••••••"
                        />
                    </div>

                    <div>
                        <label className="block text-white/80 mb-2">Confirm Password</label>
                        <input
                            type="password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                            required
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-400"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50"
                    >
                        {loading ? 'Creating Account...' : 'Register'}
                    </button>
                </form>

                <p className="text-white/60 text-center mt-6">
                    Already have an account?{' '}
                    <button onClick={onLoginClick} className="text-purple-300 hover:text-purple-200 font-semibold">
                        Login
                    </button>
                </p>
            </div>
        </div>
    );
};

// ============================================================================
// LOBBY COMPONENT
// ============================================================================
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
        <div className="min-h-screen bg-zinc-950">
            <nav className="bg-zinc-900 border-b border-white/10 px-6 py-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-white">🎥 Video Conference</h1>
                        {!connected && (
                            <span className="text-xs text-yellow-400 flex items-center gap-1">
                                <div className="animate-pulse w-2 h-2 bg-yellow-400 rounded-full"></div>
                                Connecting...
                            </span>
                        )}
                        {connected && (
                            <span className="text-xs text-green-400 flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                Connected
                            </span>
                        )}
                    </div>
                    <button
                        onClick={logout}
                        className="text-white/60 hover:text-white transition"
                    >
                        Logout
                    </button>
                </div>
            </nav>

            <div className="container mx-auto px-4 py-8">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">
                            Welcome, {user?.username}! 👋
                        </h1>
                        <p className="text-gray-400">
                            Join an existing room or create your own
                        </p>
                    </div>

                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition"
                    >
                        + Create Room
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
                    </div>
                ) : rooms.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="text-6xl mb-4">🎥</div>
                        <h3 className="text-2xl font-semibold text-white mb-2">No active rooms</h3>
                        <p className="text-gray-400 mb-6">Be the first to create a room!</p>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-purple-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-600 transition"
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

// ============================================================================
// ROOM CARD COMPONENT
// ============================================================================
const RoomCard = ({ room, onJoin, onDelete }) => {
    const { user } = useContext(AuthContext);
    const isFull = room.participants.length >= room.maxParticipants;
    const isOwner = room.createdBy?._id === user?.id || room.createdBy?.id === user?.id;
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await onDelete(room.roomId);
            setShowDeleteConfirm(false);
        } catch (error) {
            alert(error.message);
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-xl p-6 hover:border-purple-500/50 transition">
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-1">
                        {room.roomName}
                    </h3>
                    <p className="text-sm text-gray-400">
                        Created by {room.createdBy?.username || 'Unknown'}
                        {isOwner && <span className="ml-2 text-purple-400">(You)</span>}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${isFull ? 'bg-red-500/20 text-red-300' : 'bg-green-500/20 text-green-300'
                        }`}>
                        {isFull ? 'Full' : 'Available'}
                    </div>

                    {isOwner && (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition"
                            title="Delete room"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-400 mb-4">
                <div className="flex items-center gap-2">
                    <span>👥</span>
                    <span>{room.participants.length} / {room.maxParticipants}</span>
                </div>
            </div>

            <button
                onClick={onJoin}
                disabled={isFull}
                className={`w-full py-2 rounded-lg font-semibold transition ${isFull
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-purple-500 text-white hover:bg-purple-600'
                    }`}
            >
                {isFull ? 'Room Full' : 'Join Room'}
            </button>

            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-md border border-white/10">
                        <h3 className="text-xl font-bold text-white mb-4">Delete Room?</h3>
                        <p className="text-gray-400 mb-6">
                            Are you sure you want to delete "{room.roomName}"? This action cannot be undone.
                            {room.participants.length > 0 && (
                                <span className="block mt-2 text-red-400">
                                    Warning: {room.participants.length} participant(s) will be disconnected.
                                </span>
                            )}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={deleting}
                                className="flex-1 py-3 bg-white/5 text-white rounded-lg font-semibold hover:bg-white/10 transition disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex-1 py-3 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition disabled:opacity-50"
                            >
                                {deleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================================================
// CREATE ROOM MODAL
// ============================================================================
const CreateRoomModal = ({ onClose, onCreate }) => {
    const [roomName, setRoomName] = useState('');
    const [maxParticipants, setMaxParticipants] = useState(6);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await onCreate({ roomName, maxParticipants });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-md border border-white/10">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Create New Room</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition">
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-white/80 mb-2">Room Name</label>
                        <input
                            type="text"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            required
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-purple-400"
                            placeholder="My Awesome Room"
                        />
                    </div>

                    <div>
                        <label className="block text-white/80 mb-2">
                            Max Participants: {maxParticipants}
                        </label>
                        <input
                            type="range"
                            min="2"
                            max="10"
                            value={maxParticipants}
                            onChange={(e) => setMaxParticipants(Number(e.target.value))}
                            className="w-full"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>2</span>
                            <span>10</span>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 bg-white/5 text-white rounded-lg font-semibold hover:bg-white/10 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create Room'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// ============================================================================
// DEVICE SETTINGS MODAL
// ============================================================================
const DeviceSettingsModal = ({ onClose, currentDevices, onDeviceChange }) => {
    const [audioInputs, setAudioInputs] = useState([]);
    const [audioOutputs, setAudioOutputs] = useState([]);
    const [videoInputs, setVideoInputs] = useState([]);
    const [selectedAudioInput, setSelectedAudioInput] = useState(currentDevices.audioInput);
    const [selectedAudioOutput, setSelectedAudioOutput] = useState(currentDevices.audioOutput);
    const [selectedVideoInput, setSelectedVideoInput] = useState(currentDevices.videoInput);

    useEffect(() => {
        loadDevices();
    }, []);

    const loadDevices = async () => {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            setAudioInputs(devices.filter(d => d.kind === 'audioinput'));
            setAudioOutputs(devices.filter(d => d.kind === 'audiooutput'));
            setVideoInputs(devices.filter(d => d.kind === 'videoinput'));
        } catch (error) {
            console.error('Error loading devices:', error);
        }
    };

    const handleApply = () => {
        onDeviceChange({
            audioInput: selectedAudioInput,
            audioOutput: selectedAudioOutput,
            videoInput: selectedVideoInput,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-zinc-900 rounded-2xl p-6 w-full max-w-md border border-white/10">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Device Settings</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition">
                        ✕
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-white/80 mb-2">🎤 Microphone</label>
                        <select
                            value={selectedAudioInput}
                            onChange={(e) => setSelectedAudioInput(e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-400"
                        >
                            {audioInputs.map(device => (
                                <option key={device.deviceId} value={device.deviceId}>
                                    {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-white/80 mb-2">🔊 Speaker / Headphones</label>
                        <select
                            value={selectedAudioOutput}
                            onChange={(e) => setSelectedAudioOutput(e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-400"
                        >
                            {audioOutputs.map(device => (
                                <option key={device.deviceId} value={device.deviceId}>
                                    {device.label || `Speaker ${device.deviceId.slice(0, 5)}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-white/80 mb-2">📷 Camera</label>
                        <select
                            value={selectedVideoInput}
                            onChange={(e) => setSelectedVideoInput(e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-400"
                        >
                            {videoInputs.map(device => (
                                <option key={device.deviceId} value={device.deviceId}>
                                    {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex gap-3 pt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-white/5 text-white rounded-lg font-semibold hover:bg-white/10 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApply}
                        className="flex-1 py-3 bg-purple-500 text-white rounded-lg font-semibold hover:bg-purple-600 transition"
                    >
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
};

// ============================================================================
// VIDEO ROOM COMPONENT
// ============================================================================

// ============================================================================
// IMPROVED VIDEO ROOM COMPONENT - REPLACE YOUR CURRENT VIDEOROOM
// ============================================================================

const VideoRoom = ({ roomId, onLeave }) => {
    const [localStream, setLocalStream] = useState(null);
    const [peers, setPeers] = useState({});
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [devices, setDevices] = useState({
        audioInput: 'default',
        audioOutput: 'default',
        videoInput: 'default',
    });

    const localVideoRef = useRef();
    const peersRef = useRef({});
    const localStreamRef = useRef(null);
    const isMutedRef = useRef(false);
    const isVideoOffRef = useRef(false);
    const socketRef = useRef(null);
    const roomJoinedRef = useRef(false);
    const isChangingDeviceRef = useRef(false);

    const { user } = useContext(AuthContext);
    const { socket, connected } = useContext(SocketContext);

    useEffect(() => {
        socketRef.current = socket;
    }, [socket]);

    useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
    useEffect(() => { isVideoOffRef.current = isVideoOff; }, [isVideoOff]);

    if (!socket || !connected) {
        return (
            <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
                    <p className="text-white text-lg">Connecting to room...</p>
                </div>
            </div>
        );
    }

    // Initialize media stream
    useEffect(() => {
        const initStream = async () => {
            try {
                isChangingDeviceRef.current = true;

                // Stop old tracks
                if (localStreamRef.current) {
                    localStreamRef.current.getTracks().forEach(t => t.stop());
                }

                const constraints = {
                    video: devices.videoInput !== 'default'
                        ? { deviceId: { exact: devices.videoInput } }
                        : { facingMode: 'user' },
                    audio: devices.audioInput !== 'default'
                        ? { deviceId: { exact: devices.audioInput } }
                        : true
                };

                const stream = await navigator.mediaDevices.getUserMedia(constraints);

                // Apply current mute/video states
                if (stream.getAudioTracks()[0]) {
                    stream.getAudioTracks()[0].enabled = !isMutedRef.current;
                }
                if (stream.getVideoTracks()[0]) {
                    stream.getVideoTracks()[0].enabled = !isVideoOffRef.current;
                }

                localStreamRef.current = stream;
                setLocalStream(stream);

                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }

                // Set audio output
                if (localVideoRef.current && devices.audioOutput !== 'default') {
                    if (typeof localVideoRef.current.setSinkId !== 'undefined') {
                        await localVideoRef.current.setSinkId(devices.audioOutput);
                    }
                }

                // Replace tracks in ALL existing peer connections
                if (roomJoinedRef.current && Object.keys(peersRef.current).length > 0) {
                    console.log('🔄 Replacing tracks in existing connections...');

                    const replacementPromises = Object.entries(peersRef.current).map(async ([socketId, peer]) => {
                        try {
                            const senders = peer.getSenders();

                            for (const track of stream.getTracks()) {
                                const sender = senders.find(s => s.track?.kind === track.kind);
                                if (sender) {
                                    await sender.replaceTrack(track);
                                    console.log(`✅ Replaced ${track.kind} track for peer ${socketId}`);
                                }
                            }

                            // Trigger renegotiation if needed
                            if (socketRef.current) {
                                socketRef.current.emit('renegotiate', {
                                    roomId,
                                    to: socketId
                                });
                            }
                        } catch (error) {
                            console.error(`❌ Error replacing tracks for peer ${socketId}:`, error);
                        }
                    });

                    await Promise.all(replacementPromises);
                }

                isChangingDeviceRef.current = false;
            } catch (error) {
                console.error('❌ Media error:', error);
                isChangingDeviceRef.current = false;
                alert('Could not access camera/microphone: ' + error.message);
            }
        };

        initStream();

        return () => {
            if (localStreamRef.current && !roomJoinedRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, [devices]);

    // WebRTC peer connection logic
    useEffect(() => {
        if (!socket || !localStream || roomJoinedRef.current) return;

        console.log('🚀 SETTING UP WEBRTC');
        roomJoinedRef.current = true;

        const createPeer = (socketId, shouldOffer) => {
            // Close existing peer if it exists
            if (peersRef.current[socketId]) {
                console.log(`⚠️ Closing existing peer ${socketId} before recreating`);
                peersRef.current[socketId].close();
                delete peersRef.current[socketId];
            }

            console.log(`🔄 Creating peer: ${socketId}, offer=${shouldOffer}`);

            const peer = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' }
                ]
            });

            // Add local tracks
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => {
                    peer.addTrack(track, localStreamRef.current);
                });
            }

            // Handle incoming tracks
            peer.ontrack = (e) => {
                console.log(`📥 Track from ${socketId}:`, e.track.kind);
                setPeers(prev => ({
                    ...prev,
                    [socketId]: { ...prev[socketId], stream: e.streams[0] }
                }));
            };

            // Handle ICE candidates
            peer.onicecandidate = (e) => {
                if (e.candidate && socketRef.current) {
                    socketRef.current.emit('ice-candidate', {
                        candidate: e.candidate,
                        to: socketId,
                        roomId
                    });
                }
            };

            // Monitor connection state
            peer.oniceconnectionstatechange = () => {
                console.log(`🔌 ${socketId}: ${peer.iceConnectionState}`);

                // Handle failed/disconnected connections
                if (peer.iceConnectionState === 'failed' || peer.iceConnectionState === 'disconnected') {
                    console.log(`❌ Connection failed for ${socketId}, will attempt recovery`);
                    // Don't immediately close - ICE might recover
                    setTimeout(() => {
                        if (peer.iceConnectionState === 'failed') {
                            // Try ICE restart
                            if (shouldOffer) {
                                createOffer(peer, socketId, true);
                            }
                        }
                    }, 3000);
                }
            };

            peer.onnegotiationneeded = async () => {
                if (shouldOffer && peer.signalingState === 'stable') {
                    console.log(`📡 Negotiation needed for ${socketId}`);
                    await createOffer(peer, socketId, false);
                }
            };

            peersRef.current[socketId] = peer;

            // Create initial offer if needed
            if (shouldOffer && socketRef.current) {
                createOffer(peer, socketId, false);
            }

            return peer;
        };

        const createOffer = async (peer, socketId, iceRestart = false) => {
            try {
                const offer = await peer.createOffer({ iceRestart });
                await peer.setLocalDescription(offer);
                socketRef.current.emit('offer', {
                    offer: peer.localDescription,
                    to: socketId,
                    roomId
                });
                console.log(`📤 Offer sent to ${socketId}${iceRestart ? ' (ICE restart)' : ''}`);
            } catch (error) {
                console.error(`❌ Error creating offer for ${socketId}:`, error);
            }
        };

        // Join room
        socket.emit('join-room', {
            roomId,
            userId: user.id,
            username: user.username
        });

        // Event handlers
        const onUserJoined = ({ socketId, username, userId }) => {
            console.log(`👤 JOINED: ${username} (${socketId})`);
            setPeers(prev => ({
                ...prev,
                [socketId]: { ...prev[socketId], username, userId }
            }));
            createPeer(socketId, true);
        };

        const onUserReconnected = ({ socketId, username, userId }) => {
            console.log(`🔄 RECONNECTED: ${username} (${socketId})`);
            // Close old connection and create new one
            if (peersRef.current[socketId]) {
                peersRef.current[socketId].close();
            }
            setPeers(prev => ({
                ...prev,
                [socketId]: { ...prev[socketId], username, userId }
            }));
            createPeer(socketId, true);
        };

        const onExisting = (participants) => {
            console.log(`📋 Existing participants:`, participants.map(p => p.socketId));
            const map = {};
            participants.forEach(p => {
                map[p.socketId] = { username: p.username, userId: p.userId };
                createPeer(p.socketId, false); // They will send offers to us
            });
            setPeers(prev => ({ ...prev, ...map }));
        };

        const onOffer = async ({ offer, from }) => {
            console.log(`📥 Offer from: ${from}`);
            let peer = peersRef.current[from];

            if (!peer) {
                peer = createPeer(from, false);
            }

            try {
                await peer.setRemoteDescription(new RTCSessionDescription(offer));
                const answer = await peer.createAnswer();
                await peer.setLocalDescription(answer);
                socket.emit('answer', { answer, to: from, roomId });
                console.log(`📤 Answer sent to ${from}`);
            } catch (err) {
                console.error(`❌ Offer error from ${from}:`, err);
            }
        };

        const onAnswer = async ({ answer, from }) => {
            console.log(`📥 Answer from: ${from}`);
            const peer = peersRef.current[from];
            if (peer && peer.signalingState !== 'stable') {
                try {
                    await peer.setRemoteDescription(new RTCSessionDescription(answer));
                    console.log(`✅ Answer processed from ${from}`);
                } catch (err) {
                    console.error(`❌ Answer error from ${from}:`, err);
                }
            }
        };

        const onIce = async ({ candidate, from }) => {
            const peer = peersRef.current[from];
            if (peer && peer.remoteDescription) {
                try {
                    await peer.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (err) {
                    console.error(`❌ ICE error from ${from}:`, err);
                }
            }
        };

        const onRenegotiate = async ({ from }) => {
            console.log(`🔄 Renegotiate request from ${from}`);
            const peer = peersRef.current[from];
            if (peer && peer.signalingState === 'stable') {
                // They changed their tracks, we need to handle the new offer
                // The offer will come in via onOffer handler
            }
        };

        const onLeft = ({ socketId, userId }) => {
            console.log(`👋 LEFT: ${socketId}`);
            if (peersRef.current[socketId]) {
                peersRef.current[socketId].close();
                delete peersRef.current[socketId];
            }
            setPeers(prev => {
                const newPeers = { ...prev };
                delete newPeers[socketId];
                return newPeers;
            });
        };

        const onDisconnectedTemp = ({ socketId }) => {
            console.log(`⏳ TEMP DISCONNECT: ${socketId}`);
            // Don't remove peer yet, they might reconnect
        };

        socket.on('user-joined', onUserJoined);
        socket.on('user-reconnected', onUserReconnected);
        socket.on('existing-participants', onExisting);
        socket.on('offer', onOffer);
        socket.on('answer', onAnswer);
        socket.on('ice-candidate', onIce);
        socket.on('renegotiate', onRenegotiate);
        socket.on('user-left', onLeft);
        socket.on('user-left-timeout', onLeft);
        socket.on('user-disconnected-temp', onDisconnectedTemp);

        return () => {
            console.log('🧹 Cleanup WebRTC');
            roomJoinedRef.current = false;

            socket.off('user-joined', onUserJoined);
            socket.off('user-reconnected', onUserReconnected);
            socket.off('existing-participants', onExisting);
            socket.off('offer', onOffer);
            socket.off('answer', onAnswer);
            socket.off('ice-candidate', onIce);
            socket.off('renegotiate', onRenegotiate);
            socket.off('user-left', onLeft);
            socket.off('user-left-timeout', onLeft);
            socket.off('user-disconnected-temp', onDisconnectedTemp);

            socket.emit('leave-room', { roomId, userId: user.id });

            Object.values(peersRef.current).forEach(p => {
                try {
                    p.close();
                } catch (e) {
                    console.error('Error closing peer:', e);
                }
            });
            peersRef.current = {};
            setPeers({});
        };
    }, [socket, localStream, roomId, user.id, user.username]);

    const toggleMic = () => {
        if (localStreamRef.current?.getAudioTracks()[0]) {
            const track = localStreamRef.current.getAudioTracks()[0];
            track.enabled = !track.enabled;
            setIsMuted(!track.enabled);
            socket?.emit('toggle-mic', { roomId, userId: user.id, isMuted: !track.enabled });
        }
    };

    const toggleVideo = () => {
        if (localStreamRef.current?.getVideoTracks()[0]) {
            const track = localStreamRef.current.getVideoTracks()[0];
            track.enabled = !track.enabled;
            setIsVideoOff(!track.enabled);
            socket?.emit('toggle-video', { roomId, userId: user.id, isVideoOff: !track.enabled });
        }
    };

    const handleDeviceChange = (newDevices) => {
        setDevices(newDevices);
    };

    const handleLeave = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop());
        }
        onLeave();
    };

    return (
        <div className="min-h-screen bg-zinc-950 flex flex-col">
            {/* Header */}
            <div className="bg-zinc-900 border-b border-white/10 px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-white">Room: {roomId}</h2>
                    <div className="text-sm text-gray-400">
                        {Object.keys(peers).length + 1} participant(s)
                    </div>
                </div>
                <button
                    onClick={handleLeave}
                    className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition"
                >
                    Leave Room
                </button>
            </div>

            {/* Video Grid */}
            <div className="flex-1 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
                    {/* Local Video */}
                    <div className="relative bg-zinc-900 rounded-lg overflow-hidden aspect-video">
                        <video
                            ref={localVideoRef}
                            autoPlay
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-full text-white text-sm">
                            You {isMuted && '🔇'} {isVideoOff && '📹'}
                        </div>
                        {isVideoOff && (
                            <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center">
                                <div className="text-6xl">👤</div>
                            </div>
                        )}
                    </div>

                    {/* Remote Videos */}
                    {Object.entries(peers).map(([sid, data]) => (
                        <RemoteVideo key={sid} stream={data?.stream} socketId={sid} username={data?.username} />
                    ))}
                </div>
            </div>

            {/* Controls */}
            <div className="bg-zinc-900 border-t border-white/10 px-6 py-4">
                <div className="flex justify-center gap-4">
                    <button
                        onClick={toggleMic}
                        className={`p-4 rounded-full transition ${isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'}`}
                        title={isMuted ? 'Unmute' : 'Mute'}
                    >
                        <span className="text-2xl">{isMuted ? '🔇' : '🎤'}</span>
                    </button>

                    <button
                        onClick={toggleVideo}
                        className={`p-4 rounded-full transition ${isVideoOff ? 'bg-red-500 hover:bg-red-600' : 'bg-white/10 hover:bg-white/20'}`}
                        title={isVideoOff ? 'Start Video' : 'Stop Video'}
                    >
                        <span className="text-2xl">{isVideoOff ? '📹' : '📷'}</span>
                    </button>

                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-4 rounded-full bg-white/10 hover:bg-white/20 transition"
                        title="Settings"
                    >
                        <span className="text-2xl">⚙️</span>
                    </button>

                    <button
                        onClick={handleLeave}
                        className="p-4 rounded-full bg-red-500 hover:bg-red-600 transition"
                        title="Leave Room"
                    >
                        <span className="text-2xl">📞</span>
                    </button>
                </div>
            </div>

            {showSettings && (
                <DeviceSettingsModal
                    onClose={() => setShowSettings(false)}
                    currentDevices={devices}
                    onDeviceChange={handleDeviceChange}
                />
            )}
        </div>
    );
};
// ============================================================================
// REMOTE VIDEO COMPONENT
// ============================================================================
const RemoteVideo = ({ stream, socketId, username }) => {
    const videoRef = useRef();
    const [hasVideo, setHasVideo] = useState(true);
    const [hasAudio, setHasAudio] = useState(true);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;

            // Check if stream has video/audio tracks
            const videoTracks = stream.getVideoTracks();
            const audioTracks = stream.getAudioTracks();

            setHasVideo(videoTracks.length > 0 && videoTracks[0].enabled);
            setHasAudio(audioTracks.length > 0 && audioTracks[0].enabled);

            // Listen for track changes
            stream.getTracks().forEach(track => {
                track.addEventListener('mute', () => {
                    if (track.kind === 'video') setHasVideo(false);
                    if (track.kind === 'audio') setHasAudio(false);
                });
                track.addEventListener('unmute', () => {
                    if (track.kind === 'video') setHasVideo(true);
                    if (track.kind === 'audio') setHasAudio(true);
                });
            });
        }
    }, [stream]);

    return (
        <div className="relative bg-zinc-900 rounded-lg overflow-hidden aspect-video">
            {stream ? (
                <>
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                    />
                    {!hasVideo && (
                        <div className="absolute inset-0 bg-zinc-800 flex items-center justify-center">
                            <div className="text-6xl">👤</div>
                        </div>
                    )}
                    <div className="absolute bottom-4 left-4 bg-black/50 px-3 py-1 rounded-full text-white text-sm flex items-center gap-2">
                        <span>{username || 'Participant'}</span>
                        {!hasAudio && <span>🔇</span>}
                        {!hasVideo && <span>📹</span>}
                    </div>
                </>
            ) : (
                <div className="w-full h-full flex items-center justify-center bg-zinc-800">
                    <div className="text-center">
                        <div className="text-6xl mb-2">👤</div>
                        <div className="text-white/60 text-sm">Connecting...</div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
const App = () => {
    const [view, setView] = useState('login');
    const [currentRoomId, setCurrentRoomId] = useState(null);

    const handleJoinRoom = (roomId) => {
        setCurrentRoomId(roomId);
        setView('room');
    };

    const handleLeaveRoom = () => {
        setCurrentRoomId(null);
        setView('lobby');
    };

    return (
        <AuthProvider>
            <SocketProvider>
                <AuthContext.Consumer>
                    {({ isAuthenticated, loading }) => {
                        if (loading) {
                            return (
                                <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
                                    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
                                </div>
                            );
                        }

                        if (!isAuthenticated) {
                            return view === 'register' ? (
                                <Register onLoginClick={() => setView('login')} />
                            ) : (
                                <Login onRegisterClick={() => setView('register')} />
                            );
                        }

                        if (view === 'room' && currentRoomId) {
                            return <VideoRoom roomId={currentRoomId} onLeave={handleLeaveRoom} />;
                        }

                        return <Lobby onJoinRoom={handleJoinRoom} />;
                    }}
                </AuthContext.Consumer>
            </SocketProvider>
        </AuthProvider>
    );
};

export default App;