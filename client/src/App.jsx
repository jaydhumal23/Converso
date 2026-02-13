import React, { useState } from 'react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import Lobby from './components/lobby/Lobby';
import VideoRoom from './components/room/VideoRoom';
import Loading from './components/common/Loading';

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
                                <div className="min-h-screen bg-bg flex items-center justify-center">
                                    <div className="relative">
                                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tx-muted"></div>
                                    </div>
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