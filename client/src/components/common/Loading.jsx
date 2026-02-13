import React from 'react';

const Loading = () => {
    return (
        <div className="min-h-screen bg-bg flex items-center justify-center">
            <div className="relative">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-tx-muted"></div>
            </div>
        </div>
    );
};

export default Loading;