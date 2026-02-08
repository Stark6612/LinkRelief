'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Users, Shield, MapPin, Phone, Activity, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function TeamPage() {
    const [volunteers, setVolunteers] = useState<any[]>([]);
    const [incidents, setIncidents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [orgId, setOrgId] = useState<string | null>(null);

    // Track which volunteer is being deployed to show incident selector
    const [deployingVolunteerId, setDeployingVolunteerId] = useState<string | null>(null);
    const [selectedIncidentId, setSelectedIncidentId] = useState<string>('');

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setOrgId(user.id);
                try {
                    // Fetch Volunteers
                    const volRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/organization/${user.id}/volunteers`);
                    const volJson = await volRes.json();
                    if (volJson.status === 'success') setVolunteers(volJson.data);

                    // Fetch Active Incidents
                    const incRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/incidents`);
                    const incJson = await incRes.json();
                    if (incJson.status === 'success') {
                        // Filter for active/unresolved if needed, for now take all
                        setIncidents(incJson.data);
                    }
                } catch (error) {
                    console.error("Failed to fetch data:", error);
                }
            }
            setLoading(false);
        };
        fetchData();
    }, []);

    const handleStatusChange = async (volunteerId: string, newStatus: string, incidentId?: string) => {
        // If deploying and no incident selected, trigger selector UI
        if (newStatus === 'DEPLOYED' && !incidentId) {
            setDeployingVolunteerId(volunteerId);
            return;
        }

        // Optimistic Update
        setVolunteers(prev => prev.map(v => v.id === volunteerId ? {
            ...v,
            status: newStatus,
            currentIncidentId: incidentId || null
        } : v));

        // Reset selector
        setDeployingVolunteerId(null);
        setSelectedIncidentId('');

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/volunteer/${volunteerId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    status: newStatus,
                    currentIncidentId: incidentId || null
                })
            });
            const json = await res.json();
            if (json.status === 'success') {
                toast.success(`Status updated to ${newStatus}`);
            } else {
                throw new Error(json.message);
            }
        } catch (error) {
            toast.error("Failed to update status");
            // Revert (Simplified)
            // In real app, re-fetch or rollback state
        }
    };

    const confirmDeployment = () => {
        if (deployingVolunteerId && selectedIncidentId) {
            handleStatusChange(deployingVolunteerId, 'DEPLOYED', selectedIncidentId);
        } else {
            toast.error("Please select a mission");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading team...</div>;

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
                    <Users className="w-8 h-8 text-brand-teal" />
                    My Response Team
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Manage and deploy your volunteer units.
                </p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {volunteers.map((volunteer) => (
                    <div key={volunteer.id} className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 transition-all hover:shadow-md relative overflow-hidden">

                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold ${volunteer.status === 'DEPLOYED' ? 'bg-amber-100 text-amber-600' :
                                        volunteer.status === 'RESTING' ? 'bg-gray-100 text-gray-600' :
                                            'bg-green-100 text-green-600'
                                    }`}>
                                    {volunteer.name?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-gray-100">{volunteer.name || 'Unnamed Volunteer'}</h3>
                                    <span className="text-xs text-brand-teal uppercase font-semibold">{volunteer.teamCategory || 'General'}</span>
                                </div>
                            </div>
                            <div className={`px-2 py-1 rounded-full text-xs font-bold ${volunteer.status === 'DEPLOYED' ? 'bg-amber-100 text-amber-600' :
                                    volunteer.status === 'RESTING' ? 'bg-gray-100 text-gray-600' :
                                        'bg-green-100 text-green-600'
                                }`}>
                                {volunteer.status || 'AVAILABLE'}
                            </div>
                        </div>

                        <div className="space-y-2 mb-6">
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <Phone className="w-4 h-4" />
                                {volunteer.phone || 'No contact info'}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                <Shield className="w-4 h-4" />
                                ID: {volunteer.id.substring(0, 8)}...
                            </div>
                            {volunteer.currentIncidentId && (
                                <div className="flex items-center gap-2 text-xs text-amber-600 font-medium bg-amber-50 dark:bg-amber-900/10 p-2 rounded">
                                    <AlertTriangle className="w-3 h-3" />
                                    Mission ID: {volunteer.currentIncidentId.substring(0, 8)}...
                                </div>
                            )}
                        </div>

                        {/* Deployment Controls */}
                        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                            {deployingVolunteerId === volunteer.id ? (
                                <div className="bg-gray-50 dark:bg-dark-700 p-3 rounded-lg animate-in fade-in slide-in-from-bottom-2">
                                    <label className="text-xs font-bold text-gray-500 mb-2 block">Select Mission</label>
                                    <select
                                        className="w-full text-sm p-2 rounded border mb-2 dark:bg-dark-800 dark:border-gray-600"
                                        value={selectedIncidentId}
                                        onChange={(e) => setSelectedIncidentId(e.target.value)}
                                        autoFocus
                                    >
                                        <option value="">-- Choose Incident --</option>
                                        {incidents.map(inc => (
                                            <option key={inc.id} value={inc.id}>
                                                {inc.severity} - {inc.category} ({new Date(inc.createdAt).toLocaleTimeString()})
                                            </option>
                                        ))}
                                    </select>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={confirmDeployment}
                                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold py-1.5 rounded"
                                        >
                                            Confirm
                                        </button>
                                        <button
                                            onClick={() => setDeployingVolunteerId(null)}
                                            className="flex-1 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold py-1.5 rounded"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">
                                        Command Status
                                    </label>
                                    <select
                                        value={volunteer.status || 'AVAILABLE'}
                                        onChange={(e) => handleStatusChange(volunteer.id, e.target.value)}
                                        className={`w-full p-2.5 rounded-lg text-sm font-medium outline-none border transition-colors ${volunteer.status === 'DEPLOYED'
                                                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
                                                : 'bg-gray-50 dark:bg-dark-700 border-gray-200 dark:border-gray-600 text-gray-900 dark:text-gray-100'
                                            }`}
                                    >
                                        <option value="AVAILABLE">🟢 Available (Ready)</option>
                                        <option value="DEPLOYED">🟠 Deployed (On Mission)</option>
                                        <option value="RESTING">⚪ Resting (Off Duty)</option>
                                    </select>
                                </>
                            )}

                            {volunteer.status === 'DEPLOYED' && !deployingVolunteerId && (
                                <div className="mt-2 text-xs text-amber-600 flex items-center gap-1 animate-pulse">
                                    <Activity className="w-3 h-3" />
                                    Unit is currently active on field
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
