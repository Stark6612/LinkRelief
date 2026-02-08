'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Package, Smartphone, Mail, MapPin, Filter, AlertTriangle } from 'lucide-react';

interface Resource {
    id: string;
    item: string;
    category: string;
    quantity: number;
    status: string;
    location: string;
    organization: {
        id: string;
        name: string;
        publicEmail?: string;
        officeNumber?: string;
        isVerified?: boolean;
    };
    updatedAt: string;
    isSurplus: boolean;
}

const CATEGORIES = ['MEDICAL', 'NUTRITION', 'SHELTER', 'TOOLS_TECH', 'TRANSPORT', 'OTHER'];

export default function MarketplacePage() {
    const [resources, setResources] = useState<Resource[]>([]);
    const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('ALL');

    useEffect(() => {
        fetchSurplusResources();
    }, []);

    useEffect(() => {
        if (activeFilter === 'ALL') {
            setFilteredResources(resources);
        } else {
            setFilteredResources(resources.filter(r => r.category === activeFilter));
        }
    }, [activeFilter, resources]);

    const fetchSurplusResources = async () => {
        try {
            const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/resources?surplus=true`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const json = await res.json();
            if (json.status === 'success') {
                setResources(json.data);
            }
        } catch (error) {
            console.error("MarketplacePage: Failed to fetch market data", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-black">
            <Sidebar />
            <main className="flex-1 md:ml-64 p-4 md:p-8">
                <div className="max-w-6xl mx-auto space-y-8">

                    {/* Header */}
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <AlertTriangle className="w-8 h-8 text-amber-500" />
                            Exchange Market
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-2">
                            Connect with other NGOs to trade surplus resources. Items listed here are flagged as available for exchange.
                        </p>
                    </div>

                    {/* Filter Bar */}
                    <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
                        <button
                            onClick={() => setActiveFilter('ALL')}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeFilter === 'ALL'
                                ? 'bg-gray-900 text-white dark:bg-white dark:text-black'
                                : 'bg-white text-gray-600 hover:bg-gray-100 dark:bg-dark-800 dark:text-gray-400 dark:hover:bg-dark-700'
                                }`}
                        >
                            All Offers
                        </button>
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveFilter(cat)}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeFilter === cat
                                    ? 'bg-amber-500 text-white shadow-md'
                                    : 'bg-white text-gray-600 hover:bg-gray-100 dark:bg-dark-800 dark:text-gray-400 dark:hover:bg-dark-700'
                                    }`}
                            >
                                {cat.replace('_', ' ')}
                            </button>
                        ))}
                    </div>

                    {/* Grid */}
                    {loading ? (
                        <div className="text-center py-12 text-gray-500">Loading Market Data...</div>
                    ) : filteredResources.length === 0 ? (
                        <div className="text-center py-12 bg-white dark:bg-dark-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                            <p className="text-gray-500">No surplus items listed currently.</p>
                            <a href="/resources" className="text-blue-500 hover:underline mt-2 inline-block">List your own surplus</a>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredResources.map((res) => (
                                <div key={res.id} className="bg-white dark:bg-dark-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                                    <div className="p-5">
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-xs font-bold tracking-wider text-gray-500 uppercase">{res.category}</span>
                                            <span className="bg-amber-100 text-amber-800 text-[10px] px-2 py-0.5 rounded-full font-bold">SURPLUS</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{res.item}</h3>
                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-4">
                                            <span className="font-semibold text-gray-900 dark:text-white">Qty: {res.quantity}</span>
                                            <span>•</span>
                                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {res.location}</span>
                                        </div>

                                        <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="text-sm">
                                                    <p className="font-medium text-gray-900 dark:text-white">{res.organization?.name}</p>
                                                    {res.organization?.isVerified && (
                                                        <span className="text-[10px] text-blue-500 flex items-center gap-0.5">Verified NGO</span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                {res.organization?.officeNumber && (
                                                    <a href={`tel:${res.organization.officeNumber}`} className="flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-dark-800 dark:hover:bg-dark-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 transition-colors">
                                                        <Smartphone className="w-4 h-4" /> Call
                                                    </a>
                                                )}
                                                {res.organization?.publicEmail && (
                                                    <a href={`mailto:${res.organization.publicEmail}?subject=Interest in ${res.item} (Surplus)`} className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:hover:bg-blue-900/30 rounded-lg text-sm transition-colors">
                                                        <Mail className="w-4 h-4" /> Email
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
