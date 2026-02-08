"use client";

import { useEffect, useState } from "react";
import { Check, ShieldAlert, Loader2, Building2 } from "lucide-react";

interface Organization {
    id: string;
    name: string;
    type: string;
    createdAt: string;
}

export function AdminVetting() {
    const [orgs, setOrgs] = useState<Organization[]>([]);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState<string | null>(null);

    const fetchOrgs = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/organizations`);
            const json = await res.json();
            if (json.status === 'success') {
                setOrgs(json.data);
            }
        } catch (e) {
            console.error("Failed to fetch organizations", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrgs();
    }, []);

    const handleVerify = async (id: string) => {
        setVerifying(id);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/verify/${id}`, {
                method: 'POST'
            });
            const json = await res.json();
            if (json.status === 'success') {
                // Remove from list
                setOrgs(current => current.filter(org => org.id !== id));
            }
        } catch (e) {
            alert("Verification failed");
        } finally {
            setVerifying(null);
        }
    };

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-brand-teal" /></div>;

    return (
        <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-gray-800 shadow-sm">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <ShieldAlert className="w-6 h-6 text-orange-500" />
                Pending Vetting ({orgs.length})
            </h2>

            {orgs.length === 0 ? (
                <div className="text-center p-8 text-gray-500">
                    <Check className="w-12 h-12 mx-auto mb-2 text-green-500 opacity-20" />
                    <p>All organizations verified.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {orgs.map(org => (
                        <div key={org.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-900 rounded-lg border border-gray-100 dark:border-gray-800">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <Building2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-dark-900 dark:text-gray-100">{org.name}</h4>
                                    <p className="text-xs text-gray-500 uppercase tracking-wide">{org.type} • {new Date(org.createdAt).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleVerify(org.id)}
                                disabled={!!verifying}
                                className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
                            >
                                {verifying === org.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                                Verify
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
