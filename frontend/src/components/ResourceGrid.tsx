"use client";

import { useState, useEffect } from "react";
import { Bed, Utensils, Zap, Shield } from "lucide-react";

export function ResourceGrid() {
    const [resources, setResources] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchResources() {
            try {
                const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/resources`;
                console.log("ResourceGrid: Fetching from", url);
                const res = await fetch(url);
                if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
                const data = await res.json();
                if (data.status === 'success') {
                    // Map Icon based on category
                    const mapped = data.data.map((r: any) => ({
                        ...r,
                        icon: getIcon(r.category)
                    }));
                    setResources(mapped.slice(0, 4)); // Top 4
                }
            } catch (e) {
                console.error("ResourceGrid: Failed to fetch resources", e);
            } finally {
                setLoading(false);
            }
        }
        fetchResources();
    }, []);

    const getIcon = (category: string) => {
        switch (category) {
            case 'MEDICAL': return Shield;
            case 'NUTRITION': return Utensils;
            case 'SHELTER': return Bed;
            case 'TOOLS_TECH': return Zap;
            default: return Bed;
        }
    };

    return (
        <div className="bg-white dark:bg-dark-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="font-semibold text-lg mb-4">Nearby Resources</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {loading ? (
                    <p className="text-sm text-gray-500 italic col-span-4 text-center py-4">Loading resources...</p>
                ) : resources.length === 0 ? (
                    <p className="text-sm text-gray-500 italic col-span-4 text-center py-4">No resources available nearby.</p>
                ) : (
                    resources.map((res, idx) => (
                        <div key={idx} className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg flex items-center space-x-4 border border-gray-100 dark:border-gray-800">
                            <div className="p-2 bg-gray-200 dark:bg-gray-800 rounded-full">
                                <res.icon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                            </div>
                            <div>
                                <p className="font-medium text-sm truncate max-w-[120px]">{res.item}</p>
                                <div className="flex items-center text-xs text-gray-500 mt-1 space-x-2">
                                    <span>{res.category}</span>
                                    <span className={`px-1.5 py-0.5 rounded-full ${res.status === 'AVAILABLE' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'}`}>
                                        {res.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
