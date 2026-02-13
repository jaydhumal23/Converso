import React, { useState } from 'react';

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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
            <div className="bg-surface rounded-xl p-6 w-full max-w-md border border-border shadow-lg">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-tx">Create Room</h2>
                    <button onClick={onClose} className="text-tx-muted hover:text-tx transition p-2 hover:bg-bg-hover rounded-lg cursor-pointer">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-tx-secondary mb-2 text-sm font-medium">Room Name</label>
                        <input
                            type="text"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            required
                            className="w-full px-4 py-2.5 bg-bg-elevated border border-border rounded-lg text-tx placeholder-tx-muted focus:outline-none focus:border-border-hover transition text-sm"
                            placeholder="My Room"
                        />
                    </div>

                    <div>
                        <label className="block text-tx-secondary mb-2 text-sm font-medium">
                            Max Participants: <span className="text-tx font-semibold">{maxParticipants}</span>
                        </label>
                        <input
                            type="range"
                            min="2"
                            max="10"
                            value={maxParticipants}
                            onChange={(e) => setMaxParticipants(Number(e.target.value))}
                            className="w-full h-1.5 bg-bg-elevated rounded-lg appearance-none cursor-pointer accent-tx-muted"
                        />
                        <div className="flex justify-between text-xs text-tx-muted mt-1">
                            <span>2</span>
                            <span>10</span>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2.5 bg-bg-elevated text-tx cursor-pointer rounded-lg font-medium hover:bg-bg-hover transition text-sm"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2.5 bg-accent text-bg rounded-lg font-medium hover:bg-accent-hover transition disabled:opacity-50 cursor-pointer text-sm"
                        >
                            {loading ? 'Creating...' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateRoomModal