import React, { useRef, useState, useEffect } from 'react';


const RemoteVideo = ({ stream, socketId, username, audioOutput, peerConnection }) => {
    const videoRef = useRef();
    const [hasVideo, setHasVideo] = useState(true);
    const [hasAudio, setHasAudio] = useState(true);
    const [stats, setStats] = useState(null);
    const [showStats, setShowStats] = useState(false);
    const hideTimerRef = useRef(null);

    const handleMouseEnter = () => {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        setShowStats(true);
        hideTimerRef.current = setTimeout(() => setShowStats(false), 5000);
    };

    const handleMouseLeave = () => {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        hideTimerRef.current = setTimeout(() => setShowStats(false), 1000);
    };

    useEffect(() => {
        return () => {
            if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
        };
    }, []);

    // Collect WebRTC stats periodically
    useEffect(() => {
        if (!peerConnection) return;

        const interval = setInterval(async () => {
            try {
                const report = await peerConnection.getStats();
                let videoInfo = {};
                let audioInfo = {};

                report.forEach((stat) => {
                    if (stat.type === 'inbound-rtp' && stat.kind === 'video') {
                        videoInfo = {
                            width: stat.frameWidth,
                            height: stat.frameHeight,
                            fps: stat.framesPerSecond,
                            bytesReceived: stat.bytesReceived,
                            packetsLost: stat.packetsLost || 0,
                            jitter: stat.jitter,
                        };
                    }
                    if (stat.type === 'inbound-rtp' && stat.kind === 'audio') {
                        audioInfo = {
                            bytesReceived: stat.bytesReceived,
                            packetsLost: stat.packetsLost || 0,
                            jitter: stat.jitter,
                        };
                    }
                });

                setStats(prev => {
                    const prevVideoBytes = prev?.video?.bytesReceived || 0;
                    const videoBitrate = prevVideoBytes > 0
                        ? Math.round(((videoInfo.bytesReceived - prevVideoBytes) * 8) / 2) // bits per second (2s interval)
                        : 0;

                    return {
                        video: { ...videoInfo, bitrate: videoBitrate },
                        audio: audioInfo,
                    };
                });
            } catch {
                // peer might be closed
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [peerConnection]);

    // Quality indicator color based on stats
    const getQualityColor = () => {
        if (!stats?.video?.bitrate) return 'bg-tx-muted';
        const bitrate = stats.video.bitrate;
        if (bitrate > 1_500_000) return 'bg-success';
        if (bitrate > 500_000) return 'bg-warning';
        return 'bg-danger';
    };

    const formatBitrate = (bps) => {
        if (!bps || bps <= 0) return '';
        if (bps > 1_000_000) return `${(bps / 1_000_000).toFixed(1)}Mbps`;
        return `${Math.round(bps / 1000)}kbps`;
    };

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;

            // Set audio output
            if (audioOutput && audioOutput !== 'default') {
                if (typeof videoRef.current.setSinkId !== 'undefined') {
                    videoRef.current.setSinkId(audioOutput).catch(err => {
                        console.error('Error setting audio output:', err);
                    });
                }
            }

            const videoTracks = stream.getVideoTracks();
            const audioTracks = stream.getAudioTracks();

            // eslint-disable-next-line react-hooks/set-state-in-effect
            setHasVideo(videoTracks.length > 0 && videoTracks[0].enabled);
            setHasAudio(audioTracks.length > 0 && audioTracks[0].enabled);

            const handleTrackUpdate = () => {
                const vTracks = stream.getVideoTracks();
                const aTracks = stream.getAudioTracks();
                setHasVideo(vTracks.length > 0 && vTracks[0].enabled);
                setHasAudio(aTracks.length > 0 && aTracks[0].enabled);
            };

            stream.getTracks().forEach(track => {
                track.addEventListener('mute', handleTrackUpdate);
                track.addEventListener('unmute', handleTrackUpdate);
                track.addEventListener('ended', handleTrackUpdate);
            });

            return () => {
                stream.getTracks().forEach(track => {
                    track.removeEventListener('mute', handleTrackUpdate);
                    track.removeEventListener('unmute', handleTrackUpdate);
                    track.removeEventListener('ended', handleTrackUpdate);
                });
            };
        }
    }, [stream, audioOutput]);

    return (
        <div
            className="relative bg-bg-elevated rounded-xl overflow-hidden aspect-video border border-border"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {stream && hasVideo ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="absolute inset-0 bg-bg-elevated flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-bg-hover rounded-full flex items-center justify-center mx-auto mb-2">
                            <svg className="w-8 h-8 text-tx-muted" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                        </div>
                        {!stream && (
                            <p className="text-tx-muted text-xs animate-pulse">Connecting...</p>
                        )}
                    </div>
                </div>
            )}

            <div className="absolute bottom-3 left-3 bg-black/60 px-2.5 py-1.5 rounded-lg text-white text-xs font-medium flex items-center gap-1.5">
                <span>{username || 'Participant'}</span>
                {!hasAudio && <span className="text-danger">·Muted</span>}
                {!hasVideo && <span className="text-warning">·Off</span>}
            </div>

            {/* Connection quality indicator - shown on hover */}
            {stats?.video?.bitrate > 0 && (
                <div className={`absolute top-2 right-2 flex items-center gap-1.5 bg-black/50 px-2 py-1 rounded-md transition-opacity duration-300 ${showStats ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${getQualityColor()}`}></div>
                    <span className="text-white/70 text-[10px] font-mono">
                        {stats.video.width && stats.video.height ? `${stats.video.width}×${stats.video.height}` : ''}
                        {stats.video.fps ? ` ${Math.round(stats.video.fps)}fps` : ''}
                        {stats.video.bitrate ? ` ${formatBitrate(stats.video.bitrate)}` : ''}
                    </span>
                </div>
            )}
        </div>
    );
};

export default RemoteVideo