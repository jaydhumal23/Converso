import React, { useState, useEffect } from 'react';
const DeviceSettingsModal = ({ onClose, currentDevices, onDeviceChange }) => {
    const [audioInputs, setAudioInputs] = useState([]);
    const [audioOutputs, setAudioOutputs] = useState([]);
    const [videoInputs, setVideoInputs] = useState([]);
    const [selectedAudioInput, setSelectedAudioInput] = useState(currentDevices.audioInput);
    const [selectedAudioOutput, setSelectedAudioOutput] = useState(currentDevices.audioOutput);
    const [selectedVideoInput, setSelectedVideoInput] = useState(currentDevices.videoInput);

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
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-white/10 shadow-2xl animate-in zoom-in duration-200">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">Device Settings</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition p-2 hover:bg-white/5 rounded-xl">
                        ✕
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-white/80 mb-2 text-sm font-medium">🎤 Microphone</label>
                        <select
                            value={selectedAudioInput}
                            onChange={(e) => setSelectedAudioInput(e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
                        >
                            {audioInputs.map(device => (
                                <option key={device.deviceId} value={device.deviceId} className="bg-slate-800">
                                    {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-white/80 mb-2 text-sm font-medium">🔊 Speaker / Headphones</label>
                        <select
                            value={selectedAudioOutput}
                            onChange={(e) => setSelectedAudioOutput(e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
                        >
                            {audioOutputs.map(device => (
                                <option key={device.deviceId} value={device.deviceId} className="bg-slate-800">
                                    {device.label || `Speaker ${device.deviceId.slice(0, 5)}`}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-white/80 mb-2 text-sm font-medium">📷 Camera</label>
                        <select
                            value={selectedVideoInput}
                            onChange={(e) => setSelectedVideoInput(e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:outline-none focus:border-purple-500/50"
                        >
                            {videoInputs.map(device => (
                                <option key={device.deviceId} value={device.deviceId} className="bg-slate-800">
                                    {device.label || `Camera ${device.deviceId.slice(0, 5)}`}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="flex gap-3 pt-6">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 bg-white/5 text-white rounded-xl font-semibold hover:bg-white/10 transition"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleApply}
                        className="flex-1 py-3 bg-linear-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition shadow-lg"
                    >
                        Apply
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeviceSettingsModal