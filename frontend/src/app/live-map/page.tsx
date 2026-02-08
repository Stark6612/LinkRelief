'use client';

import { Sidebar } from '@/components/Sidebar';
import MapContainer from '@/components/MapContainer';
import { Map as MapIcon, RefreshCw } from 'lucide-react';

export default function LiveMapPage() {
    return (
        <div className="flex min-h-screen bg-gray-900 text-white overflow-hidden">
            <Sidebar />
            <main className="flex-1 md:ml-64 relative flex flex-col h-screen">
                {/* Header Overlay */}
                <div className="absolute top-0 left-0 right-0 z-10 p-4 pointer-events-none">
                    <div className="flex justify-between items-start pointer-events-auto">
                        <div className="bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-xl">
                            <h1 className="text-2xl font-bold flex items-center gap-3 text-white">
                                <MapIcon className="w-6 h-6 text-brand-teal" />
                                Tactical Map
                            </h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                <p className="text-xs text-gray-300 font-mono">SYSTEM ONLINE • LIVE FEED</p>
                            </div>
                        </div>

                        <button onClick={() => window.location.reload()} className="bg-black/60 backdrop-blur-md p-3 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                            <RefreshCw className="w-5 h-5 text-gray-400" />
                        </button>
                    </div>
                </div>

                {/* Fullscreen Map */}
                <div className="flex-1 w-full h-full bg-gray-800">
                    <MapContainer showNGOs={true} />
                </div>
            </main>
        </div>
    );
}
