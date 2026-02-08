"use client";

import { useState, useEffect } from "react";
import { Flame, Droplets, HeartPulse, AlertTriangle, Loader2 } from "lucide-react";
import { useRelayLink } from "@/hooks/useRelayLink";

const reportTypes = [
    { id: "fire", label: "Fire", icon: Flame, color: "bg-red-500/10 text-red-500 hover:bg-red-500/20" },
    { id: "flood", label: "Flood", icon: Droplets, color: "bg-blue-500/10 text-blue-500 hover:bg-blue-500/20" },
    { id: "medical", label: "Medical", icon: HeartPulse, color: "bg-green-500/10 text-green-500 hover:bg-green-500/20" },
    { id: "other", label: "Other", icon: AlertTriangle, color: "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20" },
];

export function ReportCard() {
    const { sendReport, isOnline } = useRelayLink();
    const [loading, setLoading] = useState<string | null>(null);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleReport = async (type: string) => {
        setLoading(type);
        try {
            // Mock Geolocation - In real app use navigator.geolocation
            const lat = 37.7749;
            const lng = -122.4194;

            const result = await sendReport({
                category: type,
                description: `Emergency reported via Quick Tap (${type})`,
                latitude: lat,
                longitude: lng,
                timestamp: Date.now()
            });

            if (result?.status === 'queued') {
                alert("⚠️ " + result.message);
            } else {
                // Success
                // Optional: Trigger a refresh of the list or show a toast
                console.log("Report success:", result);
            }
        } catch (e: any) {
            alert("Failed to report: " + e.message);
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="bg-white dark:bg-dark-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 h-full">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Quick Report</h3>
                {mounted ? (
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${isOnline ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                        {isOnline ? 'GPS: Active' : 'Offline Mode'}
                    </span>
                ) : (
                    <span className="text-xs px-2 py-1 rounded-full font-bold bg-gray-500/10 text-gray-500">
                        Loading...
                    </span>
                )}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Select an emergency type to broadcast an alert immediately.</p>

            <div className="grid grid-cols-2 gap-4">
                {reportTypes.map((type) => (
                    <button
                        key={type.id}
                        onClick={() => handleReport(type.label)}
                        disabled={!!loading}
                        className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all ${type.color} border border-transparent hover:border-current disabled:opacity-50 relative`}
                    >
                        {loading === type.label ? <Loader2 className="w-8 h-8 mb-2 animate-spin" /> : <type.icon className="w-8 h-8 mb-2" />}
                        <span className="font-medium">{type.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
