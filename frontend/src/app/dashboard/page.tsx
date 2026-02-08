"use client";

import { useState } from "react";
import { QuickReport } from "@/components/QuickReport";
import { ResourceGrid } from "@/components/ResourceGrid";
import { IncidentList } from "@/components/IncidentList";
import MapContainer from "@/components/MapContainer";

export default function DashboardPage() {
    const [isPinning, setIsPinning] = useState(false);
    const [reportLocation, setReportLocation] = useState<{ lat: number, lng: number } | null>(null);

    const handleBeginReport = (category: string) => {
        setIsPinning(true);
        // Note: We don't need to store category here, QuickReport keeps it. 
        // We just need to tell Map to start pinning.
    };

    const handleLocationConfirm = (lat: number, lng: number) => {
        // DEBUG ALERT
        console.log(`Dashboard Received: ${lat}, ${lng}`);
        // alert(`DEBUG: Map Confirmed Location: ${lat}, ${lng}`); 
        setIsPinning(false);
        setReportLocation({ lat, lng });
    };

    const handleCancelReport = () => {
        setIsPinning(false);
        setReportLocation(null);
    };

    return (
        <div className="space-y-6">
            {/* Top Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-gray-100 dark:bg-dark-800 rounded-xl h-96 flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 relative overflow-hidden group shadow-sm z-0">
                    <MapContainer
                        interactiveMode={isPinning}
                        onLocationSelect={handleLocationConfirm}
                        onCancelSelection={handleCancelReport}
                    />
                </div>
                <div className="md:col-span-1">
                    <QuickReport
                        onBeginReport={handleBeginReport}
                        onCancel={handleCancelReport}
                        manualLocation={reportLocation}
                    />
                </div>
            </div>

            {/* Resources Row */}
            <ResourceGrid />

            {/* Activity Feed */}
            <IncidentList />
        </div>
    );
}
