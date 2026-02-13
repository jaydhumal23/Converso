import React, { useState, useEffect } from 'react';

const QUALITY_OPTIONS = [
    { value: 'low', label: '360p', desc: '640×360 · 15fps · 400kbps' },
    { value: 'medium', label: '540p', desc: '960×540 · 24fps · 1Mbps' },
    { value: 'high', label: '720p', desc: '1280×720 · 30fps · 2.5Mbps' },
    { value: 'hd', label: '1080p', desc: '1920×1080 · 30fps · 4Mbps' },
];

const DeviceSettingsModal = ({ onClose, currentDevices, onDeviceChange, currentQuality, onQualityChange }) => {
    const [audioInputs, setAudioInputs] = useState([]);
    const [audioOutputs, setAudioOutputs] = useState([]);
    const [videoInputs, setVideoInputs] = useState([]);
    const [selectedAudioInput, setSelectedAudioInput] = useState(currentDevices.audioInput);
    const [selectedAudioOutput, setSelectedAudioOutput] = useState(currentDevices.audioOutput);
    const [selectedVideoInput, setSelectedVideoInput] = useState(currentDevices.videoInput);
    const [selectedQuality, setSelectedQuality] = useState(currentQuality || 'high');

    useEffect(() => {
        // eslint-disable-next-line react-hooks/immutability
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
        if (onQualityChange && selectedQuality !== currentQuality) {
            onQualityChange(selectedQuality);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-xl p-6 w-full max-w-md border border-border shadow-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-semibold text-tx">Settings</h2>
                    <button onClick={onClose} className="text-tx-muted hover:text-tx transition p-2 hover:bg-bg-hover rounded-lg cursor-pointer">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <div className="space-y-5">
                    {/* Quality Preset */}
                    <div>
                        <label className="block text-tx-secondary mb-3 text-sm font-medium">Streaming Quality</label>
                        <div className="grid grid-cols-2 gap-2">
                            {QUALITY_OPTIONS.map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setSelectedQuality(opt.value)}
                                    className={`p-3 rounded-lg border text-left transition-all cursor-pointer ${selectedQuality === opt.value
                                        ? 'border-accent bg-accent-subtle'
                                        : 'border-border bg-bg-elevated hover:border-border-hover hover:bg-bg-hover'
                                        }`}
                                >
                                    <div className="text-tx text-sm font-medium">{opt.label}</div>
                                    <div className="text-tx-muted text-xs mt-0.5">{opt.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Microphone */}
                    <div>
                        <label className="block text-tx-secondary mb-2 text-sm font-medium">Microphone</label>
                        <select
                            value={selectedAudioInput}
                            onChange={(e) => setSelectedAudioInput(e.target.value)}
                            className="w-full px-4 py-2.5 bg-bg-elevated border border-border rounded-lg text-tx focus:outline-none focus:border-border-hover text-sm"
                        >
                            {audioInputs.map(device => (
                                <option key={device.deviceId} value={device.deviceId} className="bg-surface">
                                    {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Speaker */}
                    <div>
                        <label className="block text-tx-secondary mb-2 text-sm font-medium">Speaker</label>
                        <select
                            value={selectedAudioOutput}
                            onChange={(e) => setSelectedAudioOutput(e.target.value)}
                            className="w-full px-4 py-2.5 bg-bg-elevated border border-border rounded-lg text-tx focus:outline-none focus:border-border-hover text-sm"
                        >
                            {audioOutputs.map(device => (
                                <option key={device.deviceId} value={device.deviceId} className="bg-surface">
                                    {device.label || `Speaker ${device.deviceId.slice(0, 5)}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Camera */}
                    <div>
                        <label className="block text-tx-secondary mb-2 text-sm font-medium">Camera</label>
                        <select
                            value={selectedVideoInput}
                            onChange={(e) => setSelectedVideoInput(e.target.value)}
                            className="w-full px-4 py-2.5 bg-bg-elevated border border-border rounded-lg text-tx focus:outline-none focus:border-border-hover text-sm"
                        >
                            {videoInputs.map(device => (
                                <option key={device.deviceId} value={device.deviceId} className="bg-surface">
                                    {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex gap-3 pt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 bg-bg-elevated text-tx rounded-lg font-medium hover:bg-bg-hover transition cursor-pointer text-sm"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApply}
                        className="flex-1 py-2.5 bg-accent text-bg rounded-lg font-medium hover:bg-accent-hover transition cursor-pointer text-sm"
                    >
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeviceSettingsModal