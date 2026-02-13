import React, { useState, useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { SocketContext } from '../../context/SocketContext';
import RemoteVideo from './RemoteVideo';
import DeviceSettingsModal from './DeviceSettingsModal';
// Quality presets for video streaming
const QUALITY_PRESETS = {
    low: { width: 640, height: 360, frameRate: 15, videoBitrate: 400_000, audioBitrate: 32_000, label: 'Low (360p)' },
    medium: { width: 960, height: 540, frameRate: 24, videoBitrate: 1_000_000, audioBitrate: 64_000, label: 'Medium (540p)' },
    high: { width: 1280, height: 720, frameRate: 30, videoBitrate: 2_500_000, audioBitrate: 128_000, label: 'High (720p)' },
    hd: { width: 1920, height: 1080, frameRate: 30, videoBitrate: 4_000_000, audioBitrate: 128_000, label: 'Full HD (1080p)' },
};

const VideoRoom = ({ roomId, onLeave }) => {
    const [localStream, setLocalStream] = useState(null);
    const [peers, setPeers] = useState({});
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [quality, setQuality] = useState('high');
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

    const { user } = useContext(AuthContext);
    const { socket, connected } = useContext(SocketContext);

    useEffect(() => {
        socketRef.current = socket;
    }, [socket]);

    useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
    useEffect(() => { isVideoOffRef.current = isVideoOff; }, [isVideoOff]);

    // Initialize media stream with enhanced quality
    useEffect(() => {
        if (!socket || !connected) return;
        const initStream = async () => {
            try {
                if (localStreamRef.current) {
                    localStreamRef.current.getTracks().forEach(t => t.stop());
                }

                const preset = QUALITY_PRESETS[quality] || QUALITY_PRESETS.high;

                const videoConstraints = {
                    width: { ideal: preset.width, max: preset.width },
                    height: { ideal: preset.height, max: preset.height },
                    frameRate: { ideal: preset.frameRate, max: preset.frameRate },
                };
                if (devices.videoInput !== 'default') {
                    videoConstraints.deviceId = { exact: devices.videoInput };
                } else {
                    videoConstraints.facingMode = 'user';
                }

                const audioConstraints = {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: { ideal: 48000 },
                    channelCount: { ideal: 1 },
                };
                if (devices.audioInput !== 'default') {
                    audioConstraints.deviceId = { exact: devices.audioInput };
                }

                const constraints = {
                    video: videoConstraints,
                    audio: audioConstraints,
                };

                const stream = await navigator.mediaDevices.getUserMedia(constraints);

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

                if (localVideoRef.current && devices.audioOutput !== 'default') {
                    if (typeof localVideoRef.current.setSinkId !== 'undefined') {
                        await localVideoRef.current.setSinkId(devices.audioOutput);
                    }
                }

                // Replace tracks in existing connections and apply bitrate limits
                if (roomJoinedRef.current && Object.keys(peersRef.current).length > 0) {
                    console.log(' Replacing tracks in existing connections...');
                    for (const [socketId, peer] of Object.entries(peersRef.current)) {
                        try {
                            const senders = peer.getSenders();
                            for (const track of stream.getTracks()) {
                                const sender = senders.find(s => s.track?.kind === track.kind);
                                if (sender) {
                                    await sender.replaceTrack(track);
                                    console.log(` Replaced ${track.kind} track for peer ${socketId}`);
                                }
                            }
                            // Re-apply bitrate limits after track replacement
                            applyBitrateLimits(peer, preset);
                        } catch (error) {
                            console.error(` Error replacing tracks for peer ${socketId}:`, error);
                        }
                    }
                }
            } catch (error) {
                console.error(' Media error:', error);
                alert('Could not access camera/microphone: ' + error.message);
            }
        };

        initStream();

        return () => {
            if (localStreamRef.current && !roomJoinedRef.current) {
                localStreamRef.current.getTracks().forEach(t => t.stop());
            }
        };
    }, [devices, quality, socket, connected]);


    useEffect(() => {
        if (!socket || !localStream || roomJoinedRef.current) return;

        console.log(' SETTING UP WEBRTC');
        roomJoinedRef.current = true;

        // Store pending ICE candidates
        const pendingCandidates = {};

        const createPeer = (socketId, shouldOffer) => {
            // Close existing peer properly
            if (peersRef.current[socketId]) {
                console.log(` Closing existing peer ${socketId}`);
                try {
                    peersRef.current[socketId].close();
                } catch (e) {
                    console.log(e)
                }
                delete peersRef.current[socketId];
            }

            console.log(` Creating peer: ${socketId}, shouldOffer=${shouldOffer}`);

            const peer = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:stun1.l.google.com:19302' },
                    { urls: 'stun:stun2.l.google.com:19302' },
                    { urls: 'stun:stun3.l.google.com:19302' },
                    { urls: 'stun:stun4.l.google.com:19302' },
                    // Free TURN relay for NAT traversal
                    {
                        urls: 'turn:openrelay.metered.ca:80',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    },
                    {
                        urls: 'turn:openrelay.metered.ca:443',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    },
                    {
                        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                        username: 'openrelayproject',
                        credential: 'openrelayproject'
                    }
                ],
                iceCandidatePoolSize: 10,
                bundlePolicy: 'max-bundle',
                rtcpMuxPolicy: 'require'
            });

            // CRITICAL: Add all local tracks
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => {
                    console.log(` Adding ${track.kind} track to peer ${socketId}`);
                    peer.addTrack(track, localStreamRef.current);
                });
            }

            // Handle incoming tracks - CRITICAL FIX
            peer.ontrack = (e) => {
                console.log(` Received ${e.track.kind} track from ${socketId}`);
                if (e.streams && e.streams[0]) {
                    console.log(` Setting stream for peer ${socketId}`);
                    // Use functional update to ensure we don't lose other peer data
                    setPeers(prev => ({
                        ...prev,
                        [socketId]: {
                            ...(prev[socketId] || {}),
                            stream: e.streams[0]
                        }
                    }));
                }
            };

            // ICE candidate handling
            peer.onicecandidate = (e) => {
                if (e.candidate && socketRef.current) {
                    socketRef.current.emit('ice-candidate', {
                        candidate: e.candidate,
                        to: socketId,
                        roomId
                    });
                }
            };

            // Connection state monitoring
            peer.oniceconnectionstatechange = () => {
                console.log(` ICE ${socketId}: ${peer.iceConnectionState}`);

                if (peer.iceConnectionState === 'connected') {
                    console.log(` Successfully connected to ${socketId}`);
                    // Apply bitrate limits once connected
                    const preset = QUALITY_PRESETS[quality] || QUALITY_PRESETS.high;
                    applyBitrateLimits(peer, preset);
                }

                if (peer.iceConnectionState === 'failed') {
                    console.log(` Connection failed for ${socketId}`);
                    setTimeout(() => {
                        if (peer.iceConnectionState === 'failed' && shouldOffer) {
                            console.log(` Attempting ICE restart for ${socketId}`);
                            createOffer(peer, socketId, true);
                        }
                    }, 2000);
                }
            };

            // Negotiation needed
            peer.onnegotiationneeded = async () => {
                if (shouldOffer && peer.signalingState === 'stable') {
                    console.log(` Negotiation needed for ${socketId}`);
                    await createOffer(peer, socketId, false);
                }
            };

            peersRef.current[socketId] = peer;
            pendingCandidates[socketId] = [];

            // Create initial offer with small delay for stability
            if (shouldOffer && socketRef.current) {
                setTimeout(() => {
                    if (peersRef.current[socketId]) {
                        createOffer(peer, socketId, false);
                    }
                }, 100);
            }

            return peer;
        };

        const createOffer = async (peer, socketId, iceRestart = false) => {
            if (!peer || peer.signalingState === 'closed') {
                console.log(` Cannot create offer for ${socketId} - invalid state`);
                return;
            }

            try {
                console.log(` Creating ${iceRestart ? 'ICE restart ' : ''}offer for ${socketId}`);
                const offer = await peer.createOffer({ iceRestart });

                if (peer.signalingState !== 'stable' && !iceRestart) {
                    console.log(` Peer ${socketId} not stable: ${peer.signalingState}`);
                    return;
                }

                await peer.setLocalDescription(offer);

                if (socketRef.current) {
                    socketRef.current.emit('offer', {
                        offer: peer.localDescription,
                        to: socketId,
                        roomId
                    });
                    console.log(` Offer sent to ${socketId}`);
                }
            } catch (error) {
                console.error(` Error creating offer for ${socketId}:`, error);
            }
        };

        // Join room
        socket.emit('join-room', {
            roomId,
            userId: user.id,
            username: user.username
        });

        // ===== EVENT HANDLERS =====

        const onUserJoined = ({ socketId, username, userId }) => {
            console.log(` NEW USER: ${username} (${socketId})`);

            // Initialize peer state
            setPeers(prev => ({
                ...prev,
                [socketId]: { username, userId, stream: null }
            }));

            // Create connection and send offer
            createPeer(socketId, true);
        };

        const onUserReconnected = ({ socketId, username, userId }) => {
            console.log(` RECONNECTED: ${username} (${socketId})`);

            // Close old connection
            if (peersRef.current[socketId]) {
                try {
                    peersRef.current[socketId].close();
                } catch (e) {
                    console.log(e)
                }
                delete peersRef.current[socketId];
            }

            // Update state
            setPeers(prev => ({
                ...prev,
                [socketId]: { username, userId, stream: null }
            }));

            // Create new connection
            createPeer(socketId, true);
        };

        const onExisting = (participants) => {
            console.log(` EXISTING USERS:`, participants.map(p => p.username));

            // Initialize all peer states
            const newPeers = {};
            participants.forEach(p => {
                newPeers[p.socketId] = {
                    username: p.username,
                    userId: p.userId,
                    stream: null
                };
            });

            setPeers(prev => ({ ...prev, ...newPeers }));

            // Create connections (they will send offers to us)
            participants.forEach(p => {
                createPeer(p.socketId, false);
            });
        };

        const onOffer = async ({ offer, from }) => {
            console.log(` OFFER from: ${from}`);

            let peer = peersRef.current[from];

            // Create peer if doesn't exist
            if (!peer) {
                console.log(`Creating new peer for ${from}`);
                peer = createPeer(from, false);
            }

            if (!peer) {
                console.error(`Failed to create peer for ${from}`);
                return;
            }

            try {
                // CRITICAL: Handle signaling collision
                if (peer.signalingState === 'have-local-offer') {
                    console.log(` Collision with ${from}, rolling back`);
                    await peer.setLocalDescription({ type: 'rollback' });
                }

                await peer.setRemoteDescription(new RTCSessionDescription(offer));
                console.log(` Remote description set for ${from}`);

                // Process any pending ICE candidates
                if (pendingCandidates[from] && pendingCandidates[from].length > 0) {
                    console.log(` Processing ${pendingCandidates[from].length} pending candidates for ${from}`);
                    for (const candidate of pendingCandidates[from]) {
                        try {
                            await peer.addIceCandidate(new RTCIceCandidate(candidate));
                        } catch (e) {
                            console.error(`Error adding pending candidate:`, e);
                        }
                    }
                    pendingCandidates[from] = [];
                }

                const answer = await peer.createAnswer();
                await peer.setLocalDescription(answer);

                if (socketRef.current) {
                    socketRef.current.emit('answer', { answer, to: from, roomId });
                    console.log(` Answer sent to ${from}`);
                }
            } catch (err) {
                console.error(` Error handling offer from ${from}:`, err);
            }
        };

        const onAnswer = async ({ answer, from }) => {
            console.log(` ANSWER from: ${from}`);
            const peer = peersRef.current[from];

            if (!peer) {
                console.error(`No peer for answer from ${from}`);
                return;
            }

            try {
                if (peer.signalingState === 'have-local-offer') {
                    await peer.setRemoteDescription(new RTCSessionDescription(answer));
                    console.log(` Answer processed from ${from}`);

                    // Process pending candidates
                    if (pendingCandidates[from] && pendingCandidates[from].length > 0) {
                        console.log(` Processing ${pendingCandidates[from].length} pending candidates for ${from}`);
                        for (const candidate of pendingCandidates[from]) {
                            try {
                                await peer.addIceCandidate(new RTCIceCandidate(candidate));
                            } catch (e) {
                                console.error(`Error adding pending candidate:`, e);
                            }
                        }
                        pendingCandidates[from] = [];
                    }
                } else {
                    console.log(` Unexpected state for ${from}: ${peer.signalingState}`);
                }
            } catch (err) {
                console.error(` Error processing answer from ${from}:`, err);
            }
        };

        const onIce = async ({ candidate, from }) => {
            const peer = peersRef.current[from];

            if (!peer) {
                console.log(` No peer for ICE from ${from}`);
                return;
            }

            // CRITICAL FIX: Queue candidates if no remote description yet
            if (!peer.remoteDescription || !peer.remoteDescription.type) {
                console.log(` Queueing ICE candidate for ${from} (no remote description)`);
                if (!pendingCandidates[from]) {
                    pendingCandidates[from] = [];
                }
                pendingCandidates[from].push(candidate);
                return;
            }

            try {
                await peer.addIceCandidate(new RTCIceCandidate(candidate));
                console.log(` ICE candidate added for ${from}`);
            } catch (err) {
                console.error(` Error adding ICE from ${from}:`, err);
            }
        };

        const onLeft = ({ socketId }) => {
            console.log(` USER LEFT: ${socketId}`);

            // Close connection
            if (peersRef.current[socketId]) {
                try {
                    peersRef.current[socketId].close();
                } catch (e) {
                    console.log(e)
                }
                delete peersRef.current[socketId];
            }

            // Clean up pending candidates
            delete pendingCandidates[socketId];

            // Remove from state
            setPeers(prev => {
                const newPeers = { ...prev };
                delete newPeers[socketId];
                return newPeers;
            });
        };

        // Register all event listeners
        socket.on('user-joined', onUserJoined);
        socket.on('user-reconnected', onUserReconnected);
        socket.on('existing-participants', onExisting);
        socket.on('offer', onOffer);
        socket.on('answer', onAnswer);
        socket.on('ice-candidate', onIce);
        socket.on('user-left', onLeft);
        socket.on('user-left-timeout', onLeft);

        return () => {
            console.log(' CLEANUP WEBRTC');
            roomJoinedRef.current = false;

            // Unregister listeners
            socket.off('user-joined', onUserJoined);
            socket.off('user-reconnected', onUserReconnected);
            socket.off('existing-participants', onExisting);
            socket.off('offer', onOffer);
            socket.off('answer', onAnswer);
            socket.off('ice-candidate', onIce);
            socket.off('user-left', onLeft);
            socket.off('user-left-timeout', onLeft);

            // Leave room
            socket.emit('leave-room', { roomId, userId: user.id });

            // Close all peers
            Object.entries(peersRef.current).forEach(([sid, peer]) => {
                try {
                    peer.close();
                } catch (e) {
                    console.log(e)
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

    const handleQualityChange = (newQuality) => {
        setQuality(newQuality);
    };

    // Apply bitrate limits to peer connection senders
    const applyBitrateLimits = (peer, preset) => {
        try {
            const senders = peer.getSenders();
            senders.forEach(sender => {
                if (!sender.track) return;
                const params = sender.getParameters();
                if (!params.encodings || params.encodings.length === 0) {
                    params.encodings = [{}];
                }
                if (sender.track.kind === 'video') {
                    params.encodings[0].maxBitrate = preset.videoBitrate;
                    params.encodings[0].maxFramerate = preset.frameRate;
                    // Prefer maintain-resolution to keep sharpness
                    params.degradationPreference = 'maintain-resolution';
                } else if (sender.track.kind === 'audio') {
                    params.encodings[0].maxBitrate = preset.audioBitrate;
                }
                sender.setParameters(params).catch(err => {
                    console.warn('Could not set sender parameters:', err);
                });
            });
        } catch (err) {
            console.warn('applyBitrateLimits error:', err);
        }
    };

    const handleLeave = () => {
        if (localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(t => t.stop());
        }
        onLeave();
    };

    const participantCount = Object.keys(peers).length + 1;

    if (!socket || !connected) {
        return (
            <div className="min-h-screen bg-bg flex items-center justify-center">
                <div className="text-center">
                    <div className="mb-6">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-tx-muted mx-auto"></div>
                    </div>
                    <p className="text-tx-secondary text-sm">Connecting to room...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg flex flex-col">
            {/* Header */}
            <div className="bg-surface border-b border-border px-3 sm:px-6 py-3 sm:py-4">
                <div className="flex flex-wrap justify-between items-center gap-2">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0">
                        <h2 className="text-sm sm:text-base font-semibold text-tx truncate tracking-tight">Room: {roomId}</h2>
                        <div className="text-xs text-tx-muted flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                            {participantCount}
                        </div>
                        <div className="hidden sm:block text-xs text-tx-muted border border-border px-2 py-0.5 rounded font-medium">
                            {QUALITY_PRESETS[quality]?.label || '720p'}
                        </div>
                    </div>
                    <button
                        onClick={handleLeave}
                        className="bg-danger cursor-pointer text-white px-3 py-1.5 rounded-lg hover:bg-danger-hover transition text-xs sm:text-sm font-medium whitespace-nowrap"
                    >
                        Leave
                    </button>
                </div>
            </div>

            {/* Video Grid */}
            <div className="flex-1 p-2 sm:p-4 md:p-5">
                <div className={`grid gap-3 h-full ${participantCount === 1 ? 'grid-cols-1 md:grid-cols-2' :
                    participantCount === 2 ? 'grid-cols-1 md:grid-cols-2' :
                        participantCount <= 4 ? 'grid-cols-1 md:grid-cols-3' :
                            'grid-cols-1 md:grid-cols-3 lg:grid-cols-4'
                    }`}>
                    {/* Local Video */}
                    <div className="relative bg-bg-secondary rounded-xl overflow-hidden aspect-video border border-border">
                        {isVideoOff ? (
                            <div className="absolute inset-0 bg-bg-elevated flex items-center justify-center">
                                <div className="text-center">
                                    <div className="w-16 h-16 bg-accent-subtle rounded-full flex items-center justify-center mx-auto mb-2">
                                        <svg className="w-8 h-8 text-tx-muted" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                        </svg>
                                    </div>
                                    <p className="text-tx-secondary text-sm font-medium">{user?.username}</p>
                                </div>
                            </div>
                        ) : (
                            <video
                                ref={localVideoRef}
                                autoPlay
                                muted
                                playsInline
                                className="w-full h-full object-cover"
                            />
                        )}
                        <div className="absolute bottom-3 left-3 bg-black/60 px-2.5 py-1.5 rounded-lg text-white text-xs font-medium flex items-center gap-1.5">
                            <span>You</span>
                            {isMuted && <span className="text-danger">·</span>}
                            {isVideoOff && <span className="text-warning">·</span>}
                        </div>
                    </div>

                    {/* Remote Videos */}
                    {Object.entries(peers).map(([sid, data]) => (
                        <RemoteVideo
                            key={sid}
                            stream={data?.stream}
                            socketId={sid}
                            username={data?.username}
                            audioOutput={devices.audioOutput}
                            peerConnection={peersRef.current[sid]}
                        />
                    ))}
                </div>
            </div>

            {/* Controls */}
            <div className="bg-surface border-t border-border px-3 sm:px-6 py-3 sm:py-4">
                <div className="flex justify-center gap-2 sm:gap-3">
                    <button
                        onClick={toggleMic}
                        className={`p-3 rounded-xl cursor-pointer transition ${isMuted ? 'bg-danger hover:bg-danger-hover text-white' : 'bg-bg-elevated hover:bg-bg-hover text-tx'
                            }`}
                        title={isMuted ? 'Unmute' : 'Mute'}
                    >
                        {isMuted ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" clipRule="evenodd" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                            </svg>
                        )}
                    </button>

                    <button
                        onClick={toggleVideo}
                        className={`p-3 rounded-xl cursor-pointer transition ${isVideoOff ? 'bg-danger hover:bg-danger-hover text-white' : 'bg-bg-elevated hover:bg-bg-hover text-tx'
                            }`}
                        title={isVideoOff ? 'Start Video' : 'Stop Video'}
                    >
                        {isVideoOff ? (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3l18 18" />
                            </svg>
                        ) : (
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                        )}
                    </button>

                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-3 rounded-xl cursor-pointer bg-bg-elevated hover:bg-bg-hover text-tx transition"
                        title="Settings"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </button>

                    <button
                        onClick={handleLeave}
                        className="p-3 rounded-xl cursor-pointer bg-danger hover:bg-danger-hover text-white transition"
                        title="Leave Room"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                    </button>
                </div>
            </div>

            {showSettings && (
                <DeviceSettingsModal
                    onClose={() => setShowSettings(false)}
                    currentDevices={devices}
                    onDeviceChange={handleDeviceChange}
                    currentQuality={quality}
                    onQualityChange={handleQualityChange}
                />
            )}
        </div>
    );
};
export default VideoRoom