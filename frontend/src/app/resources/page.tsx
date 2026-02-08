'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { supabase } from '@/lib/supabaseClient';
import { Package, Plus, Trash2, Edit2, AlertTriangle, CheckCircle, XCircle, Search, Filter } from 'lucide-react';

interface Resource {
    id: string;
    item: string;
    category: string;
    quantity: number;
    status: string;
    location: string;
    organization?: { name: string };
    updatedAt: string;
    isSurplus?: boolean;
}

// 1. Taxonomy Definition
const TAXONOMY: Record<string, string[]> = {
    'MEDICAL': ['Oxygen Tanks', 'First Aid Kits', 'Stretchers', 'Defibrillators', 'Essential Meds'],
    'NUTRITION': ['Bottled Water (Ltrs)', 'Food Rations (MREs)', 'Baby Formula', 'Purification Tablets'],
    'SHELTER': ['Tents', 'Blankets', 'Sleeping Bags', 'Hygiene Kits', 'Portable Toilets'],
    'TOOLS_TECH': ['Generators', 'Flashlights', 'Batteries', 'Relay Link Hubs', 'Power Banks'],
    'TRANSPORT': ['Fuel (Diesel/Gas)', 'Life Vests', 'Inflatable Boats', 'Tool Kits'],
    'OTHER': [] // Dynamic Input
};

const CATEGORIES = Object.keys(TAXONOMY);

export default function ResourcesPage() {
    const [resources, setResources] = useState<Resource[]>([]);
    const [filteredResources, setFilteredResources] = useState<Resource[]>([]);
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState('individual');
    const [userId, setUserId] = useState('');
    const [showForm, setShowForm] = useState(false);

    // Filters
    const [activeFilter, setActiveFilter] = useState('ALL');

    // Form State
    const [formData, setFormData] = useState({
        item: '',
        category: 'MEDICAL',
        subcategory: '', // Helper for dropdown
        customItem: '', // Helper for "Other" input
        quantity: 0,
        location: '',
        isSurplus: false
    });

    useEffect(() => {
        checkUser();
        fetchResources();
    }, []);

    useEffect(() => {
        if (activeFilter === 'ALL') {
            setFilteredResources(resources);
        } else {
            setFilteredResources(resources.filter(r => r.category === activeFilter));
        }
    }, [activeFilter, resources]);

    const checkUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUserId(user.id);
            const adminEmail = process.env.NEXT_PUBLIC_ADMIN_IDENTIFIER;
            const isSystemAdmin = user.email === adminEmail;
            const userRole = isSystemAdmin ? 'admin' : (user.user_metadata?.role || 'individual');
            setRole(userRole);
        }
    };

    const fetchResources = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/resources`);
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            const json = await res.json();
            if (json.status === 'success') {
                setResources(json.data);
            }
        } catch (error) {
            console.error("ResourcesPage: Failed to fetch resources", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();

        // 2. Determine Item Name logic
        let finalItemName = formData.item;
        if (formData.category === 'OTHER') {
            finalItemName = formData.customItem;
        } else {
            finalItemName = formData.subcategory;
        }

        if (!finalItemName) {
            alert("Please specify the item name.");
            return;
        }

        // Get Org ID if NGO
        let organizationId = null;
        if (role === 'organization') {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile/${userId}?role=organization`);
            const json = await res.json();
            if (json.status === 'success') organizationId = json.data.id;
        }

        const payload = {
            item: finalItemName,
            category: formData.category,
            quantity: formData.quantity,
            location: formData.location || 'Main Office',
            organizationId,
            isSurplus: formData.isSurplus
        };

        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/resources`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            setShowForm(false);
            setFormData({ item: '', category: 'MEDICAL', subcategory: '', customItem: '', quantity: 0, location: '', isSurplus: false });
            fetchResources();
        } else {
            alert("Failed to add resource");
        }
    };

    const deleteResource = async (id: string) => {
        if (!confirm("Are you sure?")) return;
        await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/resources/${id}`, { method: 'DELETE' });
        fetchResources();
    };

    const canEdit = role === 'admin' || role === 'organization';

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-black">
            <Sidebar />
            <main className="flex-1 md:ml-64 p-4 md:p-8">
                <div className="max-w-6xl mx-auto space-y-8">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                                <Package className="w-8 h-8 text-blue-500" />
                                Resource Inventory
                            </h1>
                            <p className="text-gray-600 dark:text-gray-400 mt-2">
                                Curated logistics tracking across {activeFilter === 'ALL' ? 'all categories' : activeFilter.toLowerCase()}.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <a href="/resources/market" className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
                                <AlertTriangle className="w-4 h-4" />
                                Exchange Market
                            </a>
                            {canEdit && (
                                <button
                                    onClick={() => setShowForm(!showForm)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors self-start md:self-auto"
                                >
                                    <Plus className="w-4 h-4" />
                                    Add Resource
                                </button>
                            )}
                        </div>
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
                            All Resources
                        </button>
                        {CATEGORIES.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveFilter(cat)}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeFilter === cat
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-white text-gray-600 hover:bg-gray-100 dark:bg-dark-800 dark:text-gray-400 dark:hover:bg-dark-700'
                                    }`}
                            >
                                {cat.replace('_', ' ')}
                            </button>
                        ))}
                    </div>

                    {/* Add Resource Form */}
                    {showForm && (
                        <div className="bg-white dark:bg-dark-900 p-6 rounded-xl shadow-lg border border-gray-100 dark:border-gray-800 animate-in fade-in slide-in-from-top-4">
                            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Add New Inventory Item</h3>
                            <form onSubmit={handleAdd} className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Category Selection */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Category</label>
                                        <select
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent dark:text-white"
                                            value={formData.category}
                                            onChange={e => setFormData({ ...formData, category: e.target.value, subcategory: '', customItem: '' })}
                                        >
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
                                        </select>
                                    </div>

                                    {/* Dynamic Item Input */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Item Name</label>
                                        {formData.category === 'OTHER' ? (
                                            <input
                                                placeholder="Specify Item Name (e.g., Snow Shovel)"
                                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent dark:text-white"
                                                value={formData.customItem}
                                                onChange={e => setFormData({ ...formData, customItem: e.target.value })}
                                                required
                                            />
                                        ) : (
                                            <select
                                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent dark:text-white"
                                                value={formData.subcategory}
                                                onChange={e => setFormData({ ...formData, subcategory: e.target.value })}
                                                required
                                            >
                                                <option value="">-- Select Item --</option>
                                                {TAXONOMY[formData.category]?.map(item => (
                                                    <option key={item} value={item}>{item}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Quantity</label>
                                        <input
                                            type="number"
                                            placeholder="0"
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent dark:text-white"
                                            value={formData.quantity}
                                            onChange={e => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
                                            min="0"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Location</label>
                                        <input
                                            placeholder="e.g., Warehouse A"
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent dark:text-white"
                                            value={formData.location}
                                            onChange={e => setFormData({ ...formData, location: e.target.value })}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 pt-2">
                                    <input
                                        type="checkbox"
                                        id="isSurplus"
                                        checked={formData.isSurplus}
                                        onChange={e => setFormData({ ...formData, isSurplus: e.target.checked })}
                                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <label htmlFor="isSurplus" className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                        Mark as Surplus
                                        <span className="text-xs text-amber-500 font-normal">(Visible in Exchange Market)</span>
                                    </label>
                                </div>

                                <div className="flex justify-end gap-2 pt-4">
                                    <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400">Cancel</button>
                                    <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm">Save to Inventory</button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* Resources Table */}
                    <div className="bg-white dark:bg-dark-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-dark-800">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Qty</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organization</th>
                                        {canEdit && <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {filteredResources.map((res) => (
                                        <tr key={res.id} className="hover:bg-gray-50 dark:hover:bg-dark-800/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900 dark:text-white">
                                                {res.item}
                                                {res.isSurplus && <span className="ml-2 text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">SURPLUS</span>}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{res.category}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">{res.quantity}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs rounded-full ${res.status === 'AVAILABLE' ? 'bg-green-100 text-green-800' :
                                                    res.status === 'LOW_STOCK' ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
                                                    }`}>
                                                    {res.status.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{res.location}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{res.organization?.name || 'Unknown'}</td>
                                            {canEdit && (
                                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                    <button onClick={() => deleteResource(res.id)} className="text-red-500 hover:text-red-700 ml-4">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                    {filteredResources.length === 0 && (
                                        <tr>
                                            <td colSpan={canEdit ? 7 : 6} className="px-6 py-8 text-center text-gray-500">
                                                No resources found in this category.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
