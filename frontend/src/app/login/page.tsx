'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Shield, User, Building2, CheckCircle2 } from 'lucide-react';

interface Organization {
    id: string;
    name: string;
}

export default function LoginPage() {
    const router = useRouter();
    const [isLogin, setIsLogin] = useState(true);
    const [role, setRole] = useState<'individual' | 'organization'>('individual');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    // Volunteer Affiliation State
    const [isAffiliated, setIsAffiliated] = useState(false);
    const [selectedOrg, setSelectedOrg] = useState('');
    const [teamCategory, setTeamCategory] = useState('GENERAL');
    const [orgList, setOrgList] = useState<Organization[]>([]);

    useEffect(() => {
        // Fetch verified NGOs for dropdown
        if (role === 'individual' && !isLogin) {
            fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/organizations`)
                .then(res => res.json())
                .then(json => {
                    if (json.status === 'success') setOrgList(json.data);
                })
                .catch(err => console.error("Failed to load NGOs", err));
        }
    }, [role, isLogin]);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // 1. Admin Backdoor
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_IDENTIFIER;

        if (email === adminEmail) {
            console.log("Admin Access Detected");
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (!error) {
                router.push('/admin/dashboard');
                return;
            }
        }

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;

                // Check role (optional, or just redirect)
                router.push(role === 'organization' ? '/dashboard' : '/live-map');
            } else {
                const metadata: any = { role };

                if (role === 'individual') {
                    if (isAffiliated && selectedOrg) {
                        metadata.organizationId = selectedOrg;
                    }
                    metadata.status = 'AVAILABLE';
                    metadata.teamCategory = teamCategory;
                }

                const { error, data } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: metadata,
                        emailRedirectTo: `${location.origin}/auth/callback`,
                    }
                });
                if (error) throw error;

                // Backend Sync
                await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/sync`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        id: data.user?.id,
                        email: data.user?.email,
                        role: role,
                        organizationId: metadata.organizationId,
                        teamCategory: teamCategory
                    })
                });

                if (data.session) {
                    router.push(role === 'organization' ? '/dashboard' : '/live-map');
                } else {
                    alert("Signup successful! Please check your email for the confirmation link.");
                }
            }
        } catch (err: any) {
            alert(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg overflow-hidden border border-gray-100 dark:border-gray-700">

                {/* Header */}
                <div className="bg-slate-900 p-6 text-center">
                    <h1 className="text-2xl font-bold text-white mb-2">LinkRelief</h1>
                    <p className="text-slate-400 text-sm">Disaster Coordination System</p>
                </div>

                {/* Role Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button
                        onClick={() => setRole('individual')}
                        className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${role === 'individual'
                            ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50 dark:bg-blue-900/20'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                            }`}
                    >
                        <User className="w-4 h-4" />
                        Volunteer
                    </button>
                    <button
                        onClick={() => setRole('organization')}
                        className={`flex-1 py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${role === 'organization'
                            ? 'text-orange-600 border-b-2 border-orange-600 bg-orange-50/50 dark:bg-orange-900/20'
                            : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                            }`}
                    >
                        <Shield className="w-4 h-4" />
                        NGO / Org
                    </button>
                </div>

                {/* Form */}
                <div className="p-8">
                    <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">
                        {isLogin ? 'Welcome Back' : `Join as ${role === 'organization' ? 'Organization' : 'Volunteer'}`}
                    </h2>

                    <form onSubmit={handleAuth} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                placeholder="name@example.com"
                            />
                        </div>

                        <div className="relative">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Password</label>
                            <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-white"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        {/* Volunteer Logic */}
                        {!isLogin && role === 'individual' && (
                            <div className="space-y-4">
                                {/* Affiliation */}
                                <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={isAffiliated}
                                            onChange={(e) => setIsAffiliated(e.target.checked)}
                                            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300 select-none">Affiliate with verified NGO?</span>
                                    </label>

                                    {isAffiliated && (
                                        <div className="animate-in fade-in slide-in-from-top-2">
                                            <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Select Organization</label>
                                            <select
                                                value={selectedOrg}
                                                onChange={(e) => setSelectedOrg(e.target.value)}
                                                required={isAffiliated}
                                                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                            >
                                                <option value="">-- Choose NGO --</option>
                                                {orgList.map(org => (
                                                    <option key={org.id} value={org.id}>{org.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {/* Team Specialization */}
                                <div className="p-4 bg-gray-50 dark:bg-slate-900 rounded-lg border border-gray-200 dark:border-gray-700 mt-4">
                                    <label className="block text-xs uppercase text-gray-500 font-bold mb-1">Functional Team</label>
                                    <select
                                        value={teamCategory}
                                        onChange={(e) => setTeamCategory(e.target.value)}
                                        required
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-slate-800 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    >
                                        <option value="GENERAL">General Support</option>
                                        <option value="MEDICAL">Medical & Triage</option>
                                        <option value="RESCUE">Search & Rescue (SAR)</option>
                                        <option value="LOGISTICS">Logistics & Supply</option>
                                        <option value="COMMUNICATIONS">Technical & Comms</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className={`w-full py-3 rounded-lg font-semibold text-white transition-all transform active:scale-95 ${role === 'organization'
                                ? 'bg-orange-600 hover:bg-orange-700 focus:ring-orange-500'
                                : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
                                } focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md`}
                        >
                            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                        </button>
                    </form>

                    <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
                        {isLogin ? "Don't have an account? " : "Already have an account? "}
                        <button
                            onClick={() => setIsLogin(!isLogin)}
                            className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 transition-colors"
                        >
                            {isLogin ? 'Sign up' : 'Log in'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
