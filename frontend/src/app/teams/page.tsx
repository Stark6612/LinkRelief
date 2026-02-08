'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { supabase } from '@/lib/supabaseClient';
import { Users, Activity, Truck, Radio, HeartPulse, Search } from 'lucide-react';

interface TeamStats {
    category: string;
    count: number;
}

interface Volunteer {
    id: string;
    name: string;
    status: string;
    teamCategory: string;
    organization?: { name: string };
}

// Icon Mapping
const teamIcons: Record<string, any> = {
    'MEDICAL': HeartPulse,
    'RESCUE': Search,
    'LOGISTICS': Truck,
    'COMMUNICATIONS': Radio,
    'GENERAL': Users
};

const teamColors: Record<string, string> = {
    'MEDICAL': 'text-red-500 bg-red-100 dark:bg-red-900/20',
    'RESCUE': 'text-orange-500 bg-orange-100 dark:bg-orange-900/20',
    'LOGISTICS': 'text-blue-500 bg-blue-100 dark:bg-blue-900/20',
    'COMMUNICATIONS': 'text-purple-500 bg-purple-100 dark:bg-purple-900/20',
    'GENERAL': 'text-gray-500 bg-gray-100 dark:bg-gray-800'
};

const teamNames: Record<string, string> = {
    'MEDICAL': 'Medical & Triage',
    'RESCUE': 'Search & Rescue',
    'LOGISTICS': 'Logistics',
    'COMMUNICATIONS': 'Comms Unit',
    'GENERAL': 'General Staff'
};

export default function TeamsPage() {
    const [stats, setStats] = useState<TeamStats[]>([]);
    const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
    const [loading, setLoading] = useState(true);
    const [orgName, setOrgName] = useState('Global');

    useEffect(() => {
        const fetchTeams = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            let query = '';

            // Check if Admin or Organization
            const adminEmail = process.env.NEXT_PUBLIC_ADMIN_IDENTIFIER;
            const isSystemAdmin = user.email === adminEmail;
            const role = user.user_metadata?.role;

            if (!isSystemAdmin && role === 'organization') {
                // Fetch ONLY for this org
                // Need to get Organization ID first. 
                // We can fetch it from our Profile API
                const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile/${user.id}?role=organization`);
                const json = await res.json();
                if (json.status === 'success') {
                    query = `?organizationId=${json.data.id}`;
                    setOrgName(json.data.name);
                }
            }

            // Fetch Teams Data
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/teams${query}`);
            const json = await res.json();
            if (json.status === 'success') {
                setStats(json.data.stats);
                setVolunteers(json.data.volunteers);
            }
            setLoading(false);
        };
        fetchTeams();
    }, []);

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-black">
            <Sidebar />
            <main className="flex-1 md:ml-64 p-4 md:p-8">
                <div className="max-w-6xl mx-auto space-y-8">

                    {/* Header */}
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <Users className="w-8 h-8 text-blue-500" />
                            Functional Teams
                        </h1>
                        <p className="text-gray-600 dark:text-gray-400 mt-2">
                            Real-time deployment status for <span className="font-semibold text-blue-600 dark:text-blue-400">{orgName}</span>
                        </p>
                    </div>

                    {/* Team Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {stats.map((stat) => {
                            const Icon = teamIcons[stat.category] || Users;
                            const colorClass = teamColors[stat.category] || teamColors['GENERAL'];

                            return (
                                <div key={stat.category} className="bg-white dark:bg-dark-900 border border-gray-100 dark:border-gray-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className={`p-3 rounded-lg ${colorClass}`}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <span className="text-3xl font-bold text-gray-900 dark:text-white">
                                            {stat.count}
                                        </span>
                                    </div>
                                    <h3 className="font-semibold text-gray-900 dark:text-white capitalize">
                                        {teamNames[stat.category] || stat.category}
                                    </h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Active Volunteers</p>
                                </div>
                            );
                        })}
                    </div>

                    {/* Recent Volunteers List */}
                    <div className="bg-white dark:bg-dark-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Deployments</h2>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 dark:bg-dark-800">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Organization</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                    {volunteers.map((vol) => (
                                        <tr key={vol.id} className="hover:bg-gray-50 dark:hover:bg-dark-800/50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                                {vol.name}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium border ${teamColors[vol.teamCategory]?.replace('text-', 'border-').split(' ')[0] || 'border-gray-200'
                                                    } ${teamColors[vol.teamCategory]}`}>
                                                    {teamNames[vol.teamCategory] || vol.teamCategory}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                {vol.organization?.name || 'Independent'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                <span className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                                                    {vol.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {volunteers.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                                                No volunteers found.
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
