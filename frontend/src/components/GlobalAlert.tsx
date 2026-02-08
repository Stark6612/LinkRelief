'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import { AlertTriangle, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function GlobalAlert() {
    const router = useRouter();

    useEffect(() => {
        const channel = supabase
            .channel('global-alerts')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Incident' }, (payload) => {
                const incident = payload.new;

                // Play Sound
                const audio = new Audio('/sounds/alert.mp3'); // We'll need to add this file or use a CDN/Encoded string
                audio.play().catch(e => console.log("Audio play failed (user interaction needed first)", e));

                // Toast UI
                toast.custom((t) => (
                    <div className={`w-full max-w-md bg-white dark:bg-dark-900 border-l-4 rounded-lg shadow-xl p-4 pointer-events-auto flex items-start gap-4 ${incident.severity === 'CRITICAL' ? 'border-purple-600' :
                            incident.severity === 'HIGH' ? 'border-red-600' :
                                incident.severity === 'MEDIUM' ? 'border-orange-500' : 'border-blue-500'
                        }`}>
                        <div className={`p-2 rounded-full shrink-0 ${incident.severity === 'CRITICAL' || incident.severity === 'HIGH' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                            }`}>
                            <AlertTriangle className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-900 dark:text-gray-100 uppercase tracking-wide text-sm">
                                {incident.severity} PRIORITY: {incident.type}
                            </h3>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                                {incident.description || "New incident reported. Response units needed."}
                            </p>
                            <div className="mt-3 flex gap-2">
                                <button
                                    onClick={() => {
                                        toast.dismiss(t);
                                        router.push('/dashboard'); // Go to live map
                                    }}
                                    className="text-xs font-bold px-3 py-1.5 bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded hover:opacity-90 transition-opacity flex items-center gap-1"
                                >
                                    <MapPin className="w-3 h-3" />
                                    VIEW ON MAP
                                </button>
                                <button
                                    onClick={() => toast.dismiss(t)}
                                    className="text-xs font-medium px-3 py-1.5 text-gray-500 hover:text-gray-700"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </div>
                ), { duration: 10000, position: 'top-center' }); // 10s duration for visibility
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [router]);

    return null; // Invisible component
}
