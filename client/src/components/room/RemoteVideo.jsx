import React, { useRef, useState, useEffect } from 'react';


const RemoteVideo = ({ stream, socketId, username, audioOutput }) => {
    const videoRef = useRef();
    const [hasVideo, setHasVideo] = useState(true);
    const [hasAudio, setHasAudio] = useState(true);

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
        <div className="relative bg-slate-900 rounded-2xl overflow-hidden aspect-video border border-white/10 shadow-xl">
            {stream && hasVideo ? (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="absolute inset-0 bg-linear-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                    <div className="text-center">
                        <div className="w-20 h-20 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                            <svg className="w-10 h-10 text-purple-300" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                            </svg>
                        </div>
                        {!stream && (
                            <p className="text-white/60 text-sm animate-pulse">Connecting...</p>
                        )}
                    </div>
                </div>
            )}

            <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm px-3 py-2 rounded-xl text-white text-sm font-medium flex items-center gap-2">
                <span>{username || 'Participant'}</span>
                {!hasAudio && <span className="text-red-300">• Muted</span>}
                {!hasVideo && <span className="text-amber-300">• No Video</span>}
            </div>
        </div>
    );
};

export default RemoteVideo