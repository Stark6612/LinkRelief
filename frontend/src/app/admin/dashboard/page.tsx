'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { supabase } from '@/lib/supabaseClient';
import { ShieldAlert, Users, CheckCircle, XCircle, FileText, Search, Building2, User, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function AdminDashboard() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'organizations' | 'volunteers'>('organizations');

    const [organizations, setOrganizations] = useState<any[]>([]);
    const [volunteers, setVolunteers] = useState<any[]>([]);
    const [pendingVolunteers, setPendingVolunteers] = useState<any[]>([]);
    const [selectedNGO, setSelectedNGO] = useState<any | null>(null);
    const [approvalData, setApprovalData] = useState({ officeNumber: '', publicEmail: '' });

    useEffect(() => {
        checkAdmin();
        fetchData();
    }, []);

    const checkAdmin = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        const adminEmail = process.env.NEXT_PUBLIC_ADMIN_IDENTIFIER;
        if (!user || user.email !== adminEmail) {
            router.push('/dashboard');
        }
        setLoading(false);
    };

    const fetchData = async () => {
        // Fetch Orgs
        const orgRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/organizations`);
        const orgJson = await orgRes.json();
        if (orgJson.status === 'success') setOrganizations(orgJson.data);

        // Fetch Volunteers
        const volRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/volunteers`);
        const volJson = await volRes.json();
        if (volJson.status === 'success') setVolunteers(volJson.data);

        // Fetch Pending Independent Volunteers
        const pendingRes = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/pending-independents`);
        const pendingJson = await pendingRes.json();
        if (pendingJson.status === 'success') setPendingVolunteers(pendingJson.data);
    };

    const handleApprove = async () => {
        if (!selectedNGO) return;

        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/approve-ngo/${selectedNGO.id}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(approvalData)
        });

        if (res.ok) {
            alert(`NGO ${selectedNGO.name} Verified!`);
            setSelectedNGO(null);
            setApprovalData({ officeNumber: '', publicEmail: '' });
            fetchData(); // Refresh list
        } else {
            alert("Failed to approve NGO");
        }
    };

    const verifyVolunteer = async (volId: string) => {
        if (!confirm("Confirm verification for this Independent Volunteer?")) return;

        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/admin/verify-volunteer/${volId}`, {
            method: 'POST'
        });

        if (res.ok) {
            alert("Volunteer Verified!");
            fetchData();
        } else {
            alert("Verification Failed");
        }
    };

    if (loading) return null;

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-black">
            <Sidebar />
            <main className="flex-1 md:ml-64 p-4 md:p-8">
                <div className="max-w-6xl mx-auto space-y-8">

                    {/* Header */}
                    <div className="bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500 p-6 rounded-r-xl">
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                            <ShieldAlert className="w-10 h-10 text-red-500" />
                            Master Command Center
                        </h1>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-4 border-b border-gray-200 dark:border-gray-800">
                        <button onClick={() => setActiveTab('organizations')} className={`pb-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 ${activeTab === 'organizations' ? 'border-brand-teal text-brand-teal' : 'border-transparent text-gray-500'}`}>
                            <Building2 className="w-4 h-4" /> Organizations <span className="bg-gray-100 text-gray-600 px-2 rounded-full text-xs">{organizations.length}</span>
                        </button>
                        <button onClick={() => setActiveTab('volunteers')} className={`pb-3 px-4 text-sm font-bold border-b-2 flex items-center gap-2 ${activeTab === 'volunteers' ? 'border-brand-teal text-brand-teal' : 'border-transparent text-gray-500'}`}>
                            <User className="w-4 h-4" /> Volunteers <span className="bg-gray-100 text-gray-600 px-2 rounded-full text-xs">{volunteers.length}</span>
                        </button>
                    </div>

                    {/* Queue: Pending Independent Volunteers */}
                    {pendingVolunteers.length > 0 && (
                        <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 rounded-xl p-6">
                            <h3 className="text-lg font-bold text-orange-800 dark:text-orange-200 flex items-center gap-2 mb-4">
                                <AlertTriangle className="w-5 h-5" /> Pending Independent Verifications
                            </h3>
                            <div className="space-y-3">
                                {pendingVolunteers.map(vol => (
                                    <div key={vol.id} className="bg-white dark:bg-dark-900 p-4 rounded-lg shadow-sm border border-orange-100 flex items-center justify-between">
                                        <div>
                                            <div className="font-bold text-gray-900 dark:text-white">{vol.name}</div>
                                            <div className="text-xs text-gray-500">Submitted: {new Date().toLocaleDateString()}</div>
                                            <div className="flex gap-2 mt-2">
                                                <DocViewer label="Gov ID" path={vol.verificationDocs?.paths?.govId} />
                                                <DocViewer label="Skill Cert" path={vol.verificationDocs?.paths?.skillCert} />
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => verifyVolunteer(vol.id)}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg"
                                        >
                                            Verify User
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Content Area */}
                    <div className="bg-white dark:bg-dark-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                        {/* ORGANIZATIONS TABLE */}
                        {activeTab === 'organizations' && (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-dark-800 text-left text-xs font-bold text-gray-500 uppercase">
                                        <tr>
                                            <th className="px-6 py-4">NGO Name</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Docs</th>
                                            <th className="px-6 py-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {organizations.map((ngo) => (
                                            <tr key={ngo.id} className="hover:bg-gray-50 dark:hover:bg-dark-800/50">
                                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{ngo.name}</td>
                                                <td className="px-6 py-4">
                                                    {ngo.isVerified ? <span className="text-green-600 font-bold text-xs flex gap-1"><CheckCircle className="w-4 h-4" /> Verified</span> : <span className="text-yellow-600 font-bold text-xs">Pending</span>}
                                                </td>
                                                <td className="px-6 py-4 text-sm">{ngo.verificationDocs?.paths ? 'Uploaded' : '-'}</td>
                                                <td className="px-6 py-4 text-right">
                                                    {!ngo.isVerified && ngo.verificationDocs?.paths && (
                                                        <button onClick={() => { setSelectedNGO(ngo); setApprovalData({ ...approvalData, publicEmail: `${ngo.name.toLowerCase().replace(/\s/g, '')}@linkrelief.org` }); }} className="text-blue-600 font-bold text-sm">Review</button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}

                        {/* VOLUNTEERS TABLE */}
                        {activeTab === 'volunteers' && (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 dark:bg-dark-800 text-left text-xs font-bold text-gray-500 uppercase">
                                        <tr>
                                            <th className="px-6 py-4">Name</th>
                                            <th className="px-6 py-4">Affiliation</th>
                                            <th className="px-6 py-4">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {volunteers.map((vol) => (
                                            <tr key={vol.id} className="hover:bg-gray-50 dark:hover:bg-dark-800/50">
                                                <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">{vol.name}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{vol.organization?.name || 'Independent'}</td>
                                                <td className="px-6 py-4">
                                                    {(vol.isVerifiedByNGO || vol.isVerifiedByAdmin)
                                                        ? <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">Verified</span>
                                                        : <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded text-xs">Unverified</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* Vetting Modal (Re-used) */}
                    {selectedNGO && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-white dark:bg-dark-900 w-full max-w-2xl rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-gray-800 animate-in zoom-in-95">
                                <h3 className="text-xl font-bold mb-4">Vetting: {selectedNGO.name}</h3>
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold text-gray-500">Documents</h4>
                                        <DocViewer label="Registration" path={selectedNGO.verificationDocs?.paths?.registrationCert} />
                                        <DocViewer label="Tax Exemptions" path={selectedNGO.verificationDocs?.paths?.taxExemptions} />
                                        <DocViewer label="PAN Card" path={selectedNGO.verificationDocs?.paths?.panCard} />
                                    </div>
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold text-gray-500">Action</h4>
                                        <input className="w-full px-3 py-2 border rounded" placeholder="Office Number" value={approvalData.officeNumber} onChange={e => setApprovalData({ ...approvalData, officeNumber: e.target.value })} />
                                        <input className="w-full px-3 py-2 border rounded" placeholder="Public Email" value={approvalData.publicEmail} onChange={e => setApprovalData({ ...approvalData, publicEmail: e.target.value })} />
                                        <button onClick={handleApprove} className="w-full py-3 bg-green-600 text-white rounded font-bold">Approve</button>
                                    </div>
                                </div>
                                <button onClick={() => setSelectedNGO(null)} className="mt-4 text-gray-500 w-full text-center hover:underline">Cancel</button>
                            </div>
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
}

// Helper to fetch Signed URL
function DocViewer({ label, path }: { label: string, path: string | undefined }) {
    const [url, setUrl] = useState('');

    useEffect(() => {
        if (!path) return;
        const fetchUrl = async () => {
            const { data } = await supabase.storage.from('verification-docs').createSignedUrl(path, 3600); // 1 hour link
            if (data) setUrl(data.signedUrl);
        };
        fetchUrl();
    }, [path]);

    if (!path) return <div className="text-xs text-gray-400">Missing: {label}</div>;

    return (
        <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{label}:</span>
            {url ? (
                <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">View</a>
            ) : (
                <span className="text-xs text-gray-400">Loading...</span>
            )}
        </div>
    );
}
