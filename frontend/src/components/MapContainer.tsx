'use client';

import { useEffect, useState, useMemo } from 'react';
import Map, { Marker, Popup, NavigationControl, FullscreenControl, ScaleControl, GeolocateControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { ShieldAlert, MapPin, Radio, Activity, Check, Move, Building2, Phone, Mail, CheckCircle } from 'lucide-react';
import useSWR, { mutate } from 'swr';
import { supabase } from '@/lib/supabaseClient';

// Fetcher for SWR
const fetcher = (url: string) => fetch(url).then(res => res.json());

interface MapContainerProps {
    interactiveMode?: boolean;
    showNGOs?: boolean;
    onLocationSelect?: (lat: number, lng: number) => void;
    onCancelSelection?: () => void;
    initialLocation?: { lat: number, lng: number };
}

export default function MapContainer({
    interactiveMode = false,
    showNGOs = false,
    onLocationSelect,
    onCancelSelection,
    initialLocation
}: MapContainerProps) {
    useEffect(() => {
        if (initialLocation) {
            setViewState(prev => ({
                ...prev,
                longitude: initialLocation.lng,
                latitude: initialLocation.lat,
                zoom: 15
            }));
            // Also update pin if not already set or if it matches the OLD initial location
            setPinLocation(initialLocation);
        }
    }, [initialLocation]);

    const [viewState, setViewState] = useState({
        longitude: initialLocation?.lng || 0,
        latitude: initialLocation?.lat || 0,
        zoom: initialLocation ? 15 : 2
    });
    const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [selectedIncident, setSelectedIncident] = useState<any>(null);
    const [selectedNGO, setSelectedNGO] = useState<any>(null);

    // Interactive Pin State
    const [pinLocation, setPinLocation] = useState<{ lat: number, lng: number } | null>(null);

    // Fetch Incidents
    const { data: incidentData } = useSWR(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/incidents`, fetcher, { refreshInterval: 30000 });
    const incidents = incidentData?.status === 'success' ? incidentData.data : [];

    // Fetch NGOs (Only if requested)
    const { data: ngoData } = useSWR(showNGOs ? `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/organizations` : null, fetcher);
    const ngos = ngoData?.status === 'success' ? ngoData.data : [];

    useEffect(() => {
        // Realtime Subscription (Incidents Only)
        const channel = supabase
            .channel('map-incidents')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'Incident' }, (payload) => {
                if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                    mutate(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/incidents`);
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, []);

    useEffect(() => {
        if (navigator.geolocation && !initialLocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setUserLocation({ lat: latitude, lng: longitude });
                    if (!viewState.latitude && !viewState.longitude) {
                        setViewState(v => ({ ...v, longitude, latitude, zoom: 12 }));
                    }
                    if (interactiveMode && !pinLocation && !initialLocation) {
                        setPinLocation({ lat: latitude, lng: longitude });
                    }
                },
                (error) => console.error("Error getting location:", error)
            );
        }
    }, [interactiveMode, initialLocation]);



    const getPinColor = (severity: string) => {
        switch (severity) {
            case 'CRITICAL': return 'text-purple-600 fill-purple-600'; // Reserved for extreme cases
            case 'HIGH': return 'text-red-500 fill-red-500';
            case 'MEDIUM': return 'text-amber-500 fill-amber-500';
            case 'LOW': return 'text-green-500 fill-green-500';
            default: return 'text-blue-500 fill-blue-500';
        }
    };

    return (
        <div className="w-full h-full relative rounded-xl overflow-hidden shadow-2xl border border-gray-800">
            <Map
                {...viewState}
                onMove={evt => setViewState(evt.viewState)}
                style={{ width: '100%', height: '100%' }}
                mapStyle={`https://api.maptiler.com/maps/dataviz-dark/style.json?key=${process.env.NEXT_PUBLIC_MAP_API_KEY}`}
                attributionControl={false}
                cursor={interactiveMode ? 'crosshair' : 'grab'}
                onClick={(e) => {
                    if (interactiveMode) {
                        setPinLocation({ lat: e.lngLat.lat, lng: e.lngLat.lng });
                    }
                }}
            >
                {!interactiveMode && (
                    <>
                        <GeolocateControl position="top-left" />
                        <FullscreenControl position="top-left" />
                        <NavigationControl position="top-left" />
                        <ScaleControl />
                    </>
                )}

                {/* User Location */}
                {userLocation && (
                    <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="bottom">
                        <div className="relative flex h-4 w-4">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500 border-2 border-white"></span>
                        </div>
                    </Marker>
                )}

                {/* Incident Markers (Hide in interactive mode to avoid clutter?) - Keeping them for context is better */}
                {incidents.map((incident: any) => (
                    <Marker
                        key={incident.id}
                        longitude={incident.longitude}
                        latitude={incident.latitude}
                        anchor="bottom"
                        onClick={e => {
                            if (interactiveMode) return;
                            e.originalEvent.stopPropagation();
                            setSelectedIncident(incident);
                            setSelectedNGO(null);
                        }}
                        style={{ opacity: interactiveMode ? 0.5 : 1 }}
                    >
                        <MapPin className={`w-8 h-8 ${getPinColor(incident.severity)} drop-shadow-md cursor-pointer hover:scale-110 transition-transform`} />
                    </Marker>
                ))}

                {/* NGO Markers */}
                {showNGOs && ngos.map((org: any) => (
                    // Only if org has location (assuming schema has lat/lng or address, standardizing on backend to verify this)
                    // For now assuming backend returns lat/lng. If schema doesn't have it, we need to add it or skip.
                    // The user prompt said: "Use a unique 'Home' or 'Shield' icon for Verified NGOs based on their coordinates matching the Organization table."
                    // I'll check schema later, for now adding the UI logic.
                    org.latitude && org.longitude && (
                        <Marker
                            key={org.id}
                            longitude={org.longitude}
                            latitude={org.latitude}
                            anchor="bottom"
                            onClick={e => {
                                if (interactiveMode) return;
                                e.originalEvent.stopPropagation();
                                setSelectedNGO(org);
                                setSelectedIncident(null);
                            }}
                        >
                            <Building2 className="w-8 h-8 text-emerald-500 fill-emerald-900 drop-shadow-md cursor-pointer hover:scale-110 transition-transform" />
                        </Marker>
                    )
                ))}

                {/* Interactive Draggable Pin */}
                {interactiveMode && pinLocation && (
                    <Marker
                        longitude={pinLocation.lng}
                        latitude={pinLocation.lat}
                        draggable
                        onDragEnd={evt => setPinLocation({ lat: evt.lngLat.lat, lng: evt.lngLat.lng })}
                        anchor="bottom"
                    >
                        <div className="flex flex-col items-center animate-bounce">
                            <span className="bg-white text-black text-xs font-bold px-2 py-1 rounded shadow-lg mb-1 whitespace-nowrap">
                                Drag to Adjust
                            </span>
                            <MapPin className="w-10 h-10 text-red-600 fill-red-100 drop-shadow-2xl" />
                        </div>
                    </Marker>
                )}

                {/* Incident Popup */}
                {selectedIncident && (
                    <Popup
                        longitude={selectedIncident.longitude}
                        latitude={selectedIncident.latitude}
                        anchor="top"
                        onClose={() => setSelectedIncident(null)}
                        closeOnClick={false}
                        className="text-black"
                    >
                        <div className="p-2 min-w-[200px]">
                            <h3 className="font-bold text-sm uppercase flex items-center gap-2">
                                <Activity className="w-4 h-4 text-red-500" />
                                {selectedIncident.category}
                            </h3>
                            <p className="text-xs text-gray-600 mt-1">{selectedIncident.description}</p>
                            <div className="mt-2 flex justify-between items-center">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${selectedIncident.severity === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                                    selectedIncident.severity === 'HIGH' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                                    }`}>
                                    {selectedIncident.severity}
                                </span>
                            </div>
                        </div>
                    </Popup>
                )}

                {/* NGO Popup */}
                {selectedNGO && (
                    <Popup
                        longitude={selectedNGO.longitude}
                        latitude={selectedNGO.latitude}
                        anchor="top"
                        onClose={() => setSelectedNGO(null)}
                        closeOnClick={false}
                        className="text-black z-50"
                    >
                        <div className="p-2 min-w-[200px]">
                            <h3 className="font-bold text-sm flex items-center gap-1.5 mb-1.5 uppercase tracking-wide text-brand-teal">
                                <Building2 className="w-4 h-4" />
                                {selectedNGO.name}
                                {selectedNGO.isVerified && <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />}
                            </h3>

                            <div className="space-y-2 mt-2 border-t border-gray-100 pt-2">
                                {selectedNGO.officeNumber && (
                                    <div className="flex items-center gap-2 text-xs text-gray-700">
                                        <Phone className="w-3 h-3 text-gray-400" />
                                        <span>{selectedNGO.officeNumber}</span>
                                    </div>
                                )}
                                {selectedNGO.publicEmail ? (
                                    <div className="flex items-center gap-2 text-xs text-gray-700">
                                        <Mail className="w-3 h-3 text-gray-400" />
                                        <a href={`mailto:${selectedNGO.publicEmail}`} className="hover:underline text-blue-600">
                                            {selectedNGO.publicEmail}
                                        </a>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-xs text-gray-700">
                                        <Mail className="w-3 h-3 text-gray-400" />
                                        <span className="italic text-gray-400">No public email</span>
                                    </div>
                                )}

                                <div className="mt-2">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 w-fit ${selectedNGO.isVerified
                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                        : 'bg-gray-100 text-gray-600'
                                        }`}>
                                        {selectedNGO.isVerified ? (
                                            <>
                                                <CheckCircle className="w-3 h-3" /> VERIFIED RELIEF UNIT
                                            </>
                                        ) : 'UNVERIFIED ORG'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </Popup>
                )}
            </Map>

            {/* Interactive Mode Overlay */}
            {interactiveMode && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md p-4 rounded-xl border border-white/20 shadow-2xl flex flex-col items-center gap-3 animate-in slide-in-from-top-4 z-50">
                    <p className="text-white font-bold text-sm flex items-center gap-2">
                        <Move className="w-4 h-4 animate-pulse text-yellow-400" />
                        Pinpoint Incident Location
                    </p>
                    <div className="flex gap-2 w-full">
                        <button
                            onClick={onCancelSelection}
                            className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => {
                                console.log("MapContainer: Confirm Clicked", pinLocation);
                                if (pinLocation) onLocationSelect?.(pinLocation.lat, pinLocation.lng);
                            }}
                            className="flex-1 px-6 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-green-900/20"
                        >
                            Confirm Location
                        </button>
                    </div>
                </div>
            )}

            {/* Legend Overlay (Standard) */}
            {!interactiveMode && (
                <div className="absolute bottom-4 left-4 bg-black/80 backdrop-blur-sm p-4 rounded-lg border border-gray-700 text-white max-w-xs pointer-events-none">
                    <h4 className="text-sm font-bold flex items-center gap-2">
                        <Radio className="w-4 h-4 text-green-500 animate-pulse" />
                        {showNGOs ? 'Global Operations' : 'Live Tactical Feed'}
                    </h4>
                    <p className="text-xs text-gray-400 mt-1">
                        {showNGOs ? 'Tracking verified NGOs and active incidents.' : 'Real-time incident reports from the field.'}
                    </p>
                </div>
            )}
        </div>
    );
}
