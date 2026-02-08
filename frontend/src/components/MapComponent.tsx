"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabaseClient";

export function MapComponent() {
    const mapContainer = useRef<HTMLDivElement>(null);
    const map = useRef<maplibregl.Map | null>(null);
    const [lng] = useState(-122.4194);
    const [lat] = useState(37.7749);
    const [zoom] = useState(12);
    const { theme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [heatmapMode, setHeatmapMode] = useState(false);

    // Store GeoJSON for Heatmap
    const incidentsData = useRef<any>({
        type: 'FeatureCollection',
        features: []
    });

    // Subscribe to Realtime & Fetch Initial
    useEffect(() => {
        if (!map.current) return;

        const fetchInitialData = async () => {
            const { data } = await supabase.from('Incident').select('*');
            if (data) {
                // Populate GeoJSON
                const features = data.map((inc: any) => ({
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [inc.longitude, inc.latitude] },
                    properties: { ...inc } // Keep properties 
                }));
                incidentsData.current.features = features;
                updateHeatmapSource();

                // Markers (Existing Logic)
                data.forEach((inc: any) => {
                    const el = document.createElement('div');
                    el.className = 'w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg';

                    if (map.current) {
                        new maplibregl.Marker(el)
                            .setLngLat([inc.longitude, inc.latitude])
                            .addTo(map.current);
                    }
                });
            }
        };

        fetchInitialData();

        const channel = supabase
            .channel('realtime incidents')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'Incident' }, (payload: any) => {
                console.log('New incident received!', payload);
                const newIncident = payload.new;

                // Add to GeoJSON
                const feature = {
                    type: 'Feature',
                    geometry: { type: 'Point', coordinates: [newIncident.longitude, newIncident.latitude] },
                    properties: { ...newIncident }
                };
                incidentsData.current.features.push(feature);
                updateHeatmapSource();

                if (map.current) {
                    const markerEl = document.createElement('div');
                    markerEl.className = 'w-6 h-6 bg-red-500 rounded-full border-2 border-white shadow-lg animate-bounce';

                    new maplibregl.Marker(markerEl)
                        .setLngLat([newIncident.longitude, newIncident.latitude])
                        .addTo(map.current);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [map.current]);

    // Wait for hydration to avoid theme mismatch
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        if (!mounted || !mapContainer.current || map.current) return;

        // Initialize map with a blank style that we will populate
        map.current = new maplibregl.Map({
            container: mapContainer.current,
            style: {
                version: 8,
                sources: {},
                layers: []
            },
            center: [lng, lat],
            zoom: zoom,
        });

        map.current.addControl(new maplibregl.NavigationControl(), "top-right");

        map.current.on('load', () => {
            updateMapStyle(theme === 'dark' || resolvedTheme === 'dark');
        });

        return () => {
            map.current?.remove();
            map.current = null;
        };
    }, [mounted]);

    // Update style when theme changes
    useEffect(() => {
        if (!map.current || !map.current.loaded()) return;
        updateMapStyle(theme === 'dark' || resolvedTheme === 'dark');
    }, [theme, resolvedTheme]);

    // Handle Heatmap Toggle
    useEffect(() => {
        if (!map.current) return;
        const layerId = 'incidents-heat';
        if (map.current.getLayer(layerId)) {
            map.current.setLayoutProperty(layerId, 'visibility', heatmapMode ? 'visible' : 'none');
        }
    }, [heatmapMode]);

    const updateHeatmapSource = () => {
        if (!map.current) return;
        const source = map.current.getSource('incidents-data') as maplibregl.GeoJSONSource;
        if (source) {
            source.setData(incidentsData.current);
        }
    };

    const updateMapStyle = (isDark: boolean) => {
        if (!map.current) return;

        const sourceId = 'osm-raster';
        const layerId = 'osm-raster-layer';

        // Check if source exists, if not add it
        if (!map.current.getSource(sourceId)) {
            map.current.addSource(sourceId, {
                type: 'raster',
                tiles: [
                    'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                    'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                    'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
                ],
                tileSize: 256,
                attribution: '&copy; OpenStreetMap Contributors'
            });
        }

        // Check if layer exists, if so remove it to re-add (easier for paint updates in some versions) 
        // or just update paint properties.
        if (!map.current.getLayer(layerId)) {
            map.current.addLayer({
                id: layerId,
                type: 'raster',
                source: sourceId,
                paint: {}
            });
        }

        // Apply Dark Mode Filters
        if (isDark) {
            map.current.setPaintProperty(layerId, 'raster-saturation', -1); // Grayscale
            map.current.setPaintProperty(layerId, 'raster-brightness-max', 0.6); // Dim
            map.current.setPaintProperty(layerId, 'raster-contrast', 0.1); // Low contrast for background
        } else {
            // Standard Light (Postal/High Contrast)
            map.current.setPaintProperty(layerId, 'raster-saturation', 0);
            map.current.setPaintProperty(layerId, 'raster-brightness-max', 1);
            map.current.setPaintProperty(layerId, 'raster-contrast', 0);
        }

        // Initialize Heatmap Layer if not exists
        if (!map.current.getSource('incidents-data')) {
            map.current.addSource('incidents-data', {
                type: 'geojson',
                data: incidentsData.current
            });

            map.current.addLayer({
                id: 'incidents-heat',
                type: 'heatmap',
                source: 'incidents-data',
                maxzoom: 15,
                paint: {
                    // Increase the heatmap weight based on frequency and property magnitude
                    'heatmap-weight': {
                        property: 'mag', // Could use 'severity' if mapped to number
                        type: 'exponential',
                        stops: [
                            [1, 0],
                            [62, 1]
                        ]
                    },
                    // Increase the heatmap color weight weight by zoom level
                    // heatmap-intensity is a multiplier on top of heatmap-weight
                    'heatmap-intensity': {
                        stops: [
                            [11, 1],
                            [15, 3]
                        ]
                    },
                    // Color ramp for heatmap.  Domain is 0 (low) to 1 (high).
                    // Begin color ramp at 0-stop with a 0-transparancy color
                    // to create a blur-like effect.
                    'heatmap-color': [
                        'interpolate',
                        ['linear'],
                        ['heatmap-density'],
                        0, 'rgba(33,102,172,0)',
                        0.2, 'rgb(103,169,207)',
                        0.4, 'rgb(209,229,240)',
                        0.6, 'rgb(253,219,199)',
                        0.8, 'rgb(239,138,98)',
                        1, 'rgb(178,24,43)'
                    ],
                    // Adjust the heatmap radius by zoom level
                    'heatmap-radius': {
                        stops: [
                            [11, 15],
                            [15, 20]
                        ]
                    },
                    // Transition from heatmap to circle layer by zoom level
                    'heatmap-opacity': {
                        default: 1,
                        stops: [
                            [14, 1],
                            [15, 0.5] // Fade out at high zoom
                        ]
                    },
                } as any,
                layout: {
                    visibility: heatmapMode ? 'visible' : 'none'
                }
            });
        }
    };

    if (!mounted) return <div className="w-full h-full bg-gray-100 dark:bg-dark-900 animate-pulse" />;

    return (
        <div className="w-full h-full relative group">
            <div ref={mapContainer} className="absolute inset-0" />

            <div className="absolute top-4 left-4 pointer-events-none z-10 space-y-2">
                {(theme === 'dark' || resolvedTheme === 'dark') ? (
                    <div className="bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-white shadow-xl">
                        <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">Mode</div>
                        <div className="text-sm font-bold flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            TACTICAL / NIGHT
                        </div>
                    </div>
                ) : (
                    <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-gray-200 text-dark-900 shadow-xl">
                        <div className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Mode</div>
                        <div className="text-sm font-bold flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                            POSTAL / DAY
                        </div>
                    </div>
                )}
            </div>

            {/* Heatmap Toggle */}
            <button
                onClick={() => setHeatmapMode(!heatmapMode)}
                className={`absolute top-20 left-4 z-10 px-3 py-2 rounded-lg font-bold text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 transition-all ${heatmapMode
                    ? 'bg-red-600 text-white shadow-red-500/50'
                    : 'bg-white dark:bg-black/50 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10'
                    }`}
            >
                <div className={`w-2 h-2 rounded-full ${heatmapMode ? 'bg-white animate-pulse' : 'bg-gray-400'}`} />
                Heatmap {heatmapMode ? 'ON' : 'OFF'}
            </button>
        </div>
    );
}
