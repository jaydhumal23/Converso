import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const RoomCard = ({ room, onJoin, onDelete }) => {
    const { user } = useContext(AuthContext);
    const isFull = room.participants.length >= room.maxParticipants;
    // Handle createdBy as populated object OR raw string ID
    const creatorId = typeof room.createdBy === 'string'
        ? room.createdBy
        : (room.createdBy?._id || room.createdBy?.id);
    const isOwner = creatorId === user?.id;
    const creatorName = typeof room.createdBy === 'string'
        ? (creatorId === user?.id ? user?.username : 'Unknown')
        : (room.createdBy?.username || 'Unknown');
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
        <div className="bg-surface border border-border rounded-xl p-5 hover:border-border-hover transition-all">
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-tx mb-0.5 truncate">
                        {room.roomName}
                    </h3>
                    <p className="text-xs text-tx-muted">
                        by {creatorName}
                        {isOwner && <span className="ml-1.5 text-tx-secondary">(You)</span>}
                    </p>
                </div>

                <div className="flex items-center gap-2 ml-3">
                    <div className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${isFull
                        ? 'bg-danger/10 text-danger border-danger/20'
                        : 'bg-success/10 text-success border-success/20'
                        }`}>
                        {isFull ? 'Full' : 'Open'}
                    </div>

                    {isOwner && (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="p-1.5 text-tx-muted cursor-pointer hover:text-danger hover:bg-danger/10 rounded-lg transition"
                            title="Delete room"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-3 text-sm text-tx-secondary mb-4 pb-4 border-b border-border">
                <div className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-tx-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span className="font-medium text-xs">{room.participants.length} / {room.maxParticipants}</span>
                </div>
            </div>

            <button
                onClick={onJoin}
                disabled={isFull}
                className={`w-full py-2.5 rounded-lg font-medium transition-all text-sm ${isFull
                    ? 'bg-bg-elevated text-tx-muted cursor-not-allowed'
                    : 'bg-accent text-bg hover:bg-accent-hover cursor-pointer'
                    }`}
            >
                {isFull ? 'Room Full' : 'Join Room'}
            </button>

            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
                    <div className="bg-surface rounded-xl p-6 w-full max-w-sm border border-border shadow-lg">
                        <h3 className="text-lg font-semibold text-tx mb-3">Delete Room?</h3>
                        <p className="text-tx-secondary text-sm mb-5">
                            Are you sure you want to delete "{room.roomName}"?
                            {room.participants.length > 0 && (
                                <span className="block mt-2 text-danger text-xs">
                                    {room.participants.length} participant(s) will be disconnected.
                                </span>
                            )}
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={deleting}
                                className="flex-1 py-2.5 bg-bg-elevated text-tx cursor-pointer rounded-lg font-medium hover:bg-bg-hover transition text-sm disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex-1 py-2.5 bg-danger cursor-pointer text-white rounded-lg font-medium hover:bg-danger-hover transition text-sm disabled:opacity-50"
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

export default RoomCard