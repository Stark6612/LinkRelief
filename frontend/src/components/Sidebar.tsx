"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
    LayoutDashboard, Map as MapIcon, Users, FileText,
    LogOut, Menu, X, Shield, Activity, Wifi, WifiOff, ShieldAlert, Crown, User
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

import { useRelayLink } from "@/hooks/useRelayLink";

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { isOnline, queueLength } = useRelayLink(); // Initialize globally

    const [isOpen, setIsOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [profile, setProfile] = useState<any>(null);
    const [userRole, setUserRole] = useState<string>('individual');
    const [userId, setUserId] = useState<string | null>(null);
    const [currentStatus, setCurrentStatus] = useState<string>('AVAILABLE');
    // Removed internal isOnline state to use hook
    const [loading, setLoading] = useState(true);

    const toggleSidebar = () => setIsOpen(!isOpen);

    // Online Listener moved to hook
    // Fetch User & Profile
    useEffect(() => {
        const fetchUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUser(user);
                setUserId(user.id);

                // Determine Role
                const adminEmail = process.env.NEXT_PUBLIC_ADMIN_IDENTIFIER;
                const isSystemAdmin = user?.email === adminEmail;
                const role = isSystemAdmin ? 'admin' : (user.user_metadata?.role || 'individual');
                setUserRole(role);

                // Fetch Profile from Backend
                try {
                    const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile/${user.id}?role=${role}`;
                    const res = await fetch(url);

                    if (res.ok) {
                        const json = await res.json();
                        if (json.status === 'success') {
                            setProfile(json.data);
                            if (json.data.status) {
                                setCurrentStatus(json.data.status);
                            }
                        }
                    }
                } catch (e) {
                    console.error("Profile fetch failed:", e);
                }
            }
            setLoading(false);
        };
        fetchUser();
    }, []);

    const handleLogout = async () => {
        localStorage.clear();
        await supabase.auth.signOut();
        router.push('/login');
    };

    const handleStatusChange = async (newStatus: string) => {
        if (!userId) return;
        setCurrentStatus(newStatus); // Optimistic UI update

        try {
            await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/volunteer/${userId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
        } catch (e) {
            console.error("Failed to update status", e);
            // Revert on failure? (Optional)
        }
    };

    const navItems = [
        { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['organization'] },
        { href: '/organization/team', label: 'My Team', icon: Users, roles: ['organization'] },
        { href: '/admin/dashboard', label: 'System Admin', icon: ShieldAlert, roles: ['admin'] },
        { href: '/live-map', label: 'Live Map', icon: MapIcon, roles: ['individual', 'organization', 'admin'] },
        { href: '/teams', label: 'Teams', icon: Users, roles: ['individual', 'organization', 'admin'] },
        { href: '/resources', label: 'Resources', icon: FileText, roles: ['individual', 'organization', 'admin'] },
    ];

    const filteredNav = navItems.filter(item => item.roles.includes(userRole));

    if (loading) return null; // Or a skeleton loader

    return (
        <>
            {/* Mobile Toggle */}
            <button
                onClick={toggleSidebar}
                className="md:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-dark-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
            >
                {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

            {/* Sidebar Container */}
            <aside className={`
                fixed top-0 left-0 z-40 h-screen w-64 bg-white dark:bg-dark-900 border-r border-gray-200 dark:border-gray-800
                transform transition-transform duration-300 ease-in-out
                ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
                md:translate-x-0 flex flex-col
            `}>
                <div className="flex-1 flex flex-col p-6 overflow-y-auto">
                    {/* Brand */}
                    <div className="flex items-center gap-2 mb-10 pl-2 shrink-0">
                        <Activity className="w-6 h-6 text-brand-teal" />
                        <span className="font-bold text-xl tracking-tight text-dark-900 dark:text-white">
                            Link<span className="text-brand-teal">Relief</span>
                        </span>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 space-y-2">
                        {filteredNav.map((item) => {
                            const isActive = pathname === item.href;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsOpen(false)}
                                    className={`
                                        flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm
                                        ${isActive
                                            ? 'bg-brand-teal text-white shadow-lg shadow-brand-teal/20'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-800'
                                        }
                                    `}
                                >
                                    <item.icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                                    {item.label}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* Profile & Status Section */}
                    <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800 shrink-0">
                        {/* Status Toggle (Volunteers/Rescue Only) */}
                        {(userRole === 'individual' || userRole === 'rescue') && (
                            <div className="mb-4">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Current Status</label>
                                <div className="grid grid-cols-3 gap-1 bg-gray-100 dark:bg-dark-800 p-1 rounded-lg">
                                    {[
                                        { value: 'AVAILABLE', label: 'Ready', color: 'bg-green-500', text: 'text-green-600' },
                                        { value: 'DEPLOYED', label: 'Busy', color: 'bg-amber-500', text: 'text-amber-600' },
                                        { value: 'RESTING', label: 'Off', color: 'bg-gray-400', text: 'text-gray-500' }
                                    ].map((status) => (
                                        <button
                                            key={status.value}
                                            onClick={() => handleStatusChange(status.value)}
                                            className={`
                                                px-1 py-1.5 rounded-md text-[10px] font-bold transition-all
                                                ${currentStatus === status.value
                                                    ? `${status.color} text-white shadow-sm`
                                                    : 'text-gray-500 hover:bg-white dark:hover:bg-dark-700'}
                                            `}
                                        >
                                            {status.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <Link
                            href="/profile"
                            onClick={() => setIsOpen(false)}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-dark-800 mb-4"
                        >
                            <div className={`relative shrink-0`}>
                                <div className={`w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-2 ${currentStatus === 'AVAILABLE' ? 'border-green-500' :
                                    currentStatus === 'DEPLOYED' ? 'border-amber-500' : 'border-gray-300'
                                    }`}>
                                    <User className="w-4 h-4 text-gray-500" />
                                </div>
                                {currentStatus === 'DEPLOYED' && (
                                    <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-amber-500 border-2 border-white rounded-full animate-pulse"></span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">
                                    {profile?.name || user?.email || 'User'}
                                </p>
                                <p className="text-xs text-brand-teal truncate capitalize flex items-center gap-1">
                                    {userRole}
                                    {userRole === 'admin' && <Crown className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                                    {profile?.isVerified && userRole !== 'admin' && (
                                        <Shield className="w-3 h-3 text-green-500 fill-green-500" />
                                    )}
                                </p>
                            </div>
                        </Link>

                        {/* Logout Button */}
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/10 text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors group"
                        >
                            <div className="flex items-center gap-2 text-xs font-semibold">
                                <LogOut className="w-4 h-4" />
                                Sign Out
                            </div>
                            <div title={isOnline ? "Relay Link: Online" : "Relay Link: Offline (Queued)"} className="flex items-center gap-2">
                                {isOnline ? (
                                    <Wifi className="w-4 h-4 text-green-500" />
                                ) : (
                                    <>
                                        <div className="flex flex-col items-end">
                                            <WifiOff className="w-4 h-4 text-orange-500 animate-pulse" />
                                            {queueLength > 0 && (
                                                <span className="text-[10px] text-orange-500 font-bold">{queueLength} Cached</span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Overlay for Mobile */}
            {isOpen && (
                <div
                    onClick={() => setIsOpen(false)}
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
                />
            )}
        </>
    );
}
