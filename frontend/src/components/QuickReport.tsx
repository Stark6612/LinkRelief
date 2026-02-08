import { useState, useEffect } from 'react';
import { mutate } from 'swr';
import { useRelayLink } from '@/hooks/useRelayLink';
import { AlertCircle, Flame, Droplets, HeartPulse, HelpCircle, Navigation, CheckCircle, XCircle, MapPin } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface QuickReportProps {
    onBeginReport?: (category: string) => void;
    onCancel?: () => void;
    manualLocation?: { lat: number, lng: number } | null;
}

export function QuickReport({ onBeginReport, onCancel, manualLocation }: QuickReportProps) {
    const { sendReport, isOnline } = useRelayLink();
    const [step, setStep] = useState<'CATEGORY' | 'SEVERITY' | 'SENDING' | 'SENT'>('CATEGORY');
    const [category, setCategory] = useState<string | null>(null);
    const [severity, setSeverity] = useState<string>('MEDIUM');
    const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const categories = [
        { id: 'FIRE', label: 'Fire', color: 'bg-red-500 hover:bg-red-600', icon: Flame },
        { id: 'FLOOD', label: 'Flood', color: 'bg-blue-500 hover:bg-blue-600', icon: Droplets },
        { id: 'MEDICAL', label: 'Medical', color: 'bg-green-500 hover:bg-green-600', icon: HeartPulse },
        { id: 'OTHER', label: 'Other', color: 'bg-amber-500 hover:bg-amber-600', icon: HelpCircle },
    ];

    // Watch for manual location updates from Parent (Map)
    useEffect(() => {
        if (manualLocation) {
            setLocation(manualLocation);
            setStep('SEVERITY');
        }
    }, [manualLocation]);

    const handleCategorySelect = (catId: string) => {
        setCategory(catId);

        // Notify parent to start pinning
        if (onBeginReport) {
            onBeginReport(catId);
        } else {
            // Fallback to internal auto-GPS if no parent handler
            setStep('SEVERITY');
            navigator.geolocation.getCurrentPosition(
                (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                (err) => setError("Location access denied. Please enable GPS."),
                { enableHighAccuracy: true, timeout: 5000 }
            );
        }
    };

    const handleSend = async (sev: string) => {
        setSeverity(sev);
        setStep('SENDING');

        // Ensure location is ready
        if (!location) {
            setError("No location selected. Please try again.");
            setStep('CATEGORY');
            return;
        }

        const { data: { user } } = await supabase.auth.getUser();

        // DEBUG ALERT
        // alert(`DEBUG: Sending Report: ${location.lat}, ${location.lng}`);

        const reportData = {
            category,
            description: `Quick Alert: ${sev} Priority`,
            severity: sev,
            latitude: location.lat,
            longitude: location.lng,
            isQuickAlert: true,
            reporterId: user?.id,
            verifiedStatus: 'UNVERIFIED'
        };

        try {
            await sendReport(reportData);
            setStep('SENT');
            // Immediate refresh
            mutate(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/incidents`);

            // Reset after 3 seconds
            setTimeout(() => {
                setStep('CATEGORY');
                setCategory(null);
                setLocation(null);
                if (onCancel) onCancel(); // Reset parent state too
            }, 3000);
        } catch (e: any) {
            setError(e.message);
            setStep('CATEGORY');
            if (onCancel) onCancel();
        }
    };

    const cancelReport = () => {
        setStep('CATEGORY');
        setCategory(null);
        setLocation(null);
        if (onCancel) onCancel();
    }

    if (step === 'SENT') {
        return (
            <div className="bg-green-600 text-white rounded-2xl p-8 text-center animate-pulse flex flex-col items-center justify-center h-64 shadow-xl">
                <CheckCircle className="w-16 h-16 mb-4" />
                <h2 className="text-3xl font-bold">SOS SENT</h2>
                <p className="opacity-90 mt-2">Help is on the way.</p>
            </div>
        );
    }

    if (step === 'SEVERITY') {
        return (
            <div className="bg-white dark:bg-dark-900 rounded-2xl p-6 shadow-xl border border-gray-200 dark:border-gray-800 h-64 flex flex-col">
                <h3 className="text-xl font-bold text-center mb-2 flex items-center justify-center gap-2">
                    <MapPin className="w-5 h-5 text-red-500" />
                    Confirm Location & {category}
                </h3>
                <p className="text-xs text-center text-gray-500 mb-4">Location pinned. Select urgency.</p>
                <div className="grid grid-cols-3 gap-2 flex-1">
                    <button
                        onClick={() => handleSend('LOW')}
                        className="bg-green-100 hover:bg-green-200 text-green-800 border-2 border-green-200 rounded-xl font-bold text-sm flex flex-col items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <CheckCircle className="w-6 h-6" />
                        Minor
                        <span className="text-[10px] font-normal opacity-80 leading-tight">Observation only</span>
                    </button>

                    <button
                        onClick={() => handleSend('MEDIUM')}
                        className="bg-amber-100 hover:bg-amber-200 text-amber-800 border-2 border-amber-200 rounded-xl font-bold text-sm flex flex-col items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <Navigation className="w-6 h-6" />
                        Assist
                        <span className="text-[10px] font-normal opacity-80 leading-tight">Help Needed</span>
                    </button>

                    <button
                        onClick={() => handleSend('HIGH')}
                        className="bg-red-100 hover:bg-red-200 text-red-800 border-2 border-red-200 rounded-xl font-bold text-sm flex flex-col items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <AlertCircle className="w-6 h-6" />
                        Rescue
                        <span className="text-[10px] font-normal opacity-80 leading-tight">URGENT</span>
                    </button>
                </div>
                <button
                    onClick={cancelReport}
                    className="mt-4 text-sm text-gray-500 hover:text-gray-700 text-center w-full"
                >
                    Cancel
                </button>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-dark-900 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold flex items-center gap-2 text-red-600">
                    <AlertCircle className="w-5 h-5" />
                    Quick SOS
                </h2>
                {isOnline ? (
                    <span className="text-xs text-green-600 font-bold bg-green-100 px-2 py-1 rounded-full">ONLINE</span>
                ) : (
                    <span className="text-xs text-amber-600 font-bold bg-amber-100 px-2 py-1 rounded-full">OFFLINE MODE</span>
                )}
            </div>

            {error && (
                <div className="mb-4 bg-red-100 text-red-700 p-3 rounded-lg text-sm flex items-center justify-between">
                    {error}
                    <button onClick={() => setError(null)}><XCircle className="w-4 h-4" /></button>
                </div>
            )}

            <div className="grid grid-cols-2 gap-3">
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => handleCategorySelect(cat.label)}
                        className={`${cat.color} text-white p-4 rounded-xl flex flex-col items-center justify-center gap-2 transition-all hover:shadow-lg active:scale-95 h-32`}
                        disabled={!!manualLocation} // Disable selection if already in flow (optional, but handled by step)
                    >
                        <cat.icon className="w-8 h-8" />
                        <span className="font-bold text-lg">{cat.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
