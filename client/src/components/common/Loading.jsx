import React from 'react';

const Loading = () => {
    return (
        <div className="min-h-screen bg-linear-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
            <div className="relative">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
                <div className="absolute inset-0 animate-ping rounded-full h-16 w-16 border border-purple-500/20"></div>
            </div>
        </div>
    );
};

export default Loading;