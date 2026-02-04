import React, { useState, useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

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
        <div className="group bg-gray-600/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6 hover:border-purple-500/50 transition-all hover:shadow-xl hover:shadow-purple-500/10 transform hover:-translate-y-1">
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-1">
                        {room.roomName}
                    </h3>
                    <p className="text-sm text-gray-400">
                        Created by {room.createdBy?.username || 'Unknown'}
                        {isOwner && <span className="ml-2 text-purple-400">(You)</span>}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${isFull
                        ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}>
                        {isFull ? 'Full' : 'Available'}
                    </div>

                    {isOwner && (
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="p-2 text-red-400 cursor-pointer hover:text-red-300 hover:bg-red-500/10 rounded-xl transition"
                            title="Delete room"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-400 mb-5 pb-5 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <span>👥</span>
                    <span className="font-semibold">{room.participants.length} / {room.maxParticipants}</span>
                </div>
            </div>

            <button
                onClick={onJoin}
                disabled={isFull}
                className={`w-full py-3 rounded-xl font-semibold transition-all ${isFull
                    ? 'bg-gray-600/20 text-gray-500 cursor-not-allowed'
                    : 'bg-linear-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-lg hover:shadow-purple-500/50 cursor-pointer transform hover:scale-105 active:scale-95'
                    }`}
            >
                {isFull ? 'Room Full' : 'Join Room'}
            </button>

            {showDeleteConfirm && (
                <div className="fixed inset-0 bg-gray-950/20 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-white/10 shadow-2xl">
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
                                className="flex-1 py-3 bg-white/5 text-white cursor-pointer rounded-xl font-semibold hover:bg-white/10 transition disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="flex-1 py-3 bg-red-500 cursor-pointer text-white rounded-xl font-semibold hover:bg-red-600 transition  disabled:opacity-50"
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