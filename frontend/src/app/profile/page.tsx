'use client';

import { useEffect, useState, useMemo } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { supabase } from '@/lib/supabaseClient';
import { Shield, FileText, CheckCircle, AlertTriangle, Building2, UploadCloud, Lock, User, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import MapContainer from '@/components/MapContainer';

export default function ProfilePage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [showVerifyModal, setShowVerifyModal] = useState(false);

    // Form inputs
    const [formData, setFormData] = useState({
        name: '',
        officeNumber: '',
        publicEmail: '',
        registrationId: '',
        targetOrgId: '', // For affiliation update
        latitude: null as number | null,
        longitude: null as number | null
    });
    const [orgList, setOrgList] = useState<any[]>([]); // List of verified NGOs

    // Map State
    const [isPinning, setIsPinning] = useState(false);

    useEffect(() => {
        const fetchProfile = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                router.push('/login');
                return;
            }

            // Determine Role
            const role = user.user_metadata?.role || 'individual';
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/profile/${user.id}?role=${role}`);
            const json = await res.json();

            if (json.status === 'success') {
                setProfile(json.data);
                setFormData({
                    name: json.data.name || '',
                    officeNumber: json.data.officeNumber || '',
                    publicEmail: json.data.publicEmail || '',
                    registrationId: json.data.registrationId || '',
                    targetOrgId: json.data.organizationId || '',
                    latitude: json.data.latitude || null,
                    longitude: json.data.longitude || null
                });

                // If independent or organization data missing, fetch NGOs
                if (!json.data.organization) {
                    fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/organizations`)
                        .then(r => r.json())
                        .then(d => {
                            if (d.status === 'success') setOrgList(d.data);
                        })
                        .catch(e => console.error("Org Fetch Error:", e));
                }
            }
            setLoading(false);
        };
        fetchProfile();
    }, [router]);

    const handleUpdate = async () => {
        if (isPinning) {
            alert("Please confirm your location on the map first!");
            document.getElementById('ngo-map-section')?.scrollIntoView({ behavior: 'smooth' });
            return;
        }

        if (!profile) return;

        // For Volunteer: Check affiliation
        if (profile.type !== 'NGO' && !formData.targetOrgId) {
            // Volunteers might just update name, so we allow it if no org selected? 
            // Logic below enforces org selection for "Join", but maybe we want to allow name update?
            // Keeping as is for now based on previous logic.
            // alert("Please select an Organization first.");
            // return;
        }

        const isNGO = profile.type === 'NGO';
        const endpoint = isNGO ? `/api/organization/${profile.id}` : `/api/volunteer/${profile.id}`;

        const body = isNGO ? {
            name: formData.name,
            officeNumber: formData.officeNumber,
            publicEmail: formData.publicEmail,
            latitude: formData.latitude,
            longitude: formData.longitude
        } : {
            name: formData.name,
            organizationId: formData.targetOrgId
        };

        console.log("Sending Update Body:", body);

        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${endpoint}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const json = await res.json();
            console.log("Update Response:", json);

            if (res.ok) {
                alert("Profile updated successfully!");
                if (!isNGO) window.location.reload(); // Reload for volunteer to refresh sidebar/state
            } else {
                alert(`Update Failed: ${json.message}`);
            }
        } catch (error: any) {
            console.error("Network/Update Error:", error);
            alert(`Error: ${error.message}`);
        }
    };

    const handleLocationSelect = (lat: number, lng: number) => {
        console.log("Profile: handleLocationSelect", { lat, lng });
        setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
        setIsPinning(false);
    };

    const initialMapLocation = useMemo(() =>
        formData.latitude ? { lat: formData.latitude, lng: formData.longitude! } : undefined
        , [formData.latitude, formData.longitude]);

    const [uploadedFiles, setUploadedFiles] = useState<Record<string, string>>({});

    // Determine verification status safely
    const isNGO = profile?.type === 'NGO' || profile?.type === 'RESCUE'; // Better check
    const isVolunteer = profile && !isNGO;

    const verificationStatus = isNGO
        ? (profile.isVerified ? 'VERIFIED' : (profile.verificationDocs ? 'SUBMITTED' : 'PENDING'))
        : (profile ? ((profile.isVerifiedByNGO || profile.isVerifiedByAdmin) ? 'VERIFIED' : (profile.verificationDocs ? 'SUBMITTED' : 'PENDING')) : 'PENDING');

    // Submit handler
    const submitFinalDocs = async () => {
        if (!profile) return;

        try {
            const finalDocs = {
                paths: uploadedFiles,
                submittedAt: new Date().toISOString()
            };

            const endpoint = isNGO
                ? `/api/organization/${profile.id}/verify-docs`
                : `/api/volunteer/${profile.id}/verify-docs`;

            const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ docs: finalDocs })
            });

            const json = await res.json();

            if (res.ok) {
                setProfile({ ...profile, verificationDocs: finalDocs });
                setShowVerifyModal(false);
                alert("Documents submitted for review.");
            } else {
                alert(`Submission Failed: ${json.message || 'Unknown Error'}`);
                console.error("Submit Error:", json);
            }
        } catch (error) {
            console.error("Network Error:", error);
            alert("Network Error: Could not reach backend.");
        }
    };

    const handleFileUpload = (key: string, path: string) => {
        setUploadedFiles(prev => ({ ...prev, [key]: path }));
    };

    if (loading) return <div className="p-8 text-center text-white">Loading Profile...</div>;

    // Safety check if profile load failed
    if (!profile) return <div className="p-8 text-center text-white">Profile not found. Please log in again.</div>;

    return (
        <div className="flex min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-white">
            <Sidebar />
            <main className="flex-1 md:ml-64 p-4 md:p-8">
                <div className="max-w-4xl mx-auto space-y-8">

                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center border ${isNGO ? 'bg-brand-teal/10 border-brand-teal/20 text-brand-teal' : 'bg-orange-500/10 border-orange-500/20 text-orange-500'}`}>
                            {isNGO ? <Building2 className="w-8 h-8" /> : <User className="w-8 h-8" />}
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold">{isNGO ? 'Organization Profile' : 'Volunteer Profile'}</h1>
                            <p className="text-gray-600 dark:text-gray-400">Manage your {isNGO ? 'public identity' : 'qualifications'} and verification status.</p>
                        </div>
                    </div>

                    {/* Verification Status */}
                    <div className={`p-6 rounded-xl border ${verificationStatus === 'VERIFIED'
                        ? 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800'
                        : 'bg-white dark:bg-dark-900 border-gray-200 dark:border-gray-800'
                        }`}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <Shield className={`w-5 h-5 ${verificationStatus === 'VERIFIED' ? 'text-green-600' : 'text-gray-400'}`} />
                                    {isNGO ? 'Verification Vault' : 'Responder Credentials'}
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">
                                    {verificationStatus === 'VERIFIED'
                                        ? (isNGO ? "Your organization is fully verified." : "You are a Verified Responder.")
                                        : "Submit documents to verify your identity."}
                                </p>
                            </div>

                            {verificationStatus === 'VERIFIED' ? (
                                <div className="px-4 py-2 bg-green-100 text-green-700 rounded-full flex items-center gap-2 font-bold border border-green-200">
                                    <CheckCircle className="w-5 h-5" />
                                    Verified
                                </div>
                            ) : (
                                <button
                                    onClick={() => setShowVerifyModal(true)}
                                    disabled={verificationStatus === 'SUBMITTED'}
                                    className={`px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors ${verificationStatus === 'SUBMITTED'
                                        ? 'bg-yellow-100 text-yellow-700 cursor-not-allowed'
                                        : 'bg-blue-600 text-white hover:bg-blue-700'
                                        }`}
                                >
                                    <UploadCloud className="w-5 h-5" />
                                    {verificationStatus === 'SUBMITTED' ? 'Pending Review' : 'Get Verified'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Submitted Documents List */}
                    {profile.verificationDocs?.paths && (
                        <div className="bg-white dark:bg-dark-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-6">
                            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-gray-400" />
                                Submitted Documents
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {Object.entries(profile.verificationDocs.paths).map(([key, path]) => (
                                    <DocumentPreview key={key} docKey={key} path={path as string} />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* NGO Map Location Section */}
                    {isNGO && (
                        <div id="ngo-map-section" className="bg-white dark:bg-dark-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-brand-teal" />
                                    Headquarters Location
                                </h2>
                                {!isPinning ? (
                                    <button
                                        onClick={() => setIsPinning(true)}
                                        className="text-sm font-bold text-brand-teal hover:underline"
                                    >
                                        {formData.latitude ? 'Update Location' : 'Set Location'}
                                    </button>
                                ) : (
                                    <span className="text-sm font-bold text-orange-500 animate-pulse">Select on Map...</span>
                                )}
                            </div>

                            <div className="h-64 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 relative">
                                <MapContainer
                                    interactiveMode={isPinning}
                                    onLocationSelect={handleLocationSelect}
                                    onCancelSelection={() => setIsPinning(false)}
                                    initialLocation={initialMapLocation}
                                />
                                {!isPinning && !formData.latitude && (
                                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
                                        <p className="text-white font-bold opacity-80">Location Not Set</p>
                                    </div>
                                )}
                            </div>
                            {formData.latitude && (
                                <p className="text-xs text-gray-500 font-mono">
                                    Coordinates: {formData.latitude.toFixed(4)}, {formData.longitude?.toFixed(4)}
                                </p>
                            )}
                        </div>
                    )}

                    {/* Profile Fields (Shared/Conditional) */}
                    <div className="bg-white dark:bg-dark-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-6">
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
                            <h2 className="text-lg font-bold">Profile Details</h2>
                            <button onClick={handleUpdate} className="text-sm text-blue-600 font-medium hover:underline">Save Changes</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">Name</label>
                                <input
                                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            {isNGO && (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Public Email</label>
                                    <input
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent"
                                        value={formData.publicEmail}
                                        onChange={e => setFormData({ ...formData, publicEmail: e.target.value })}
                                    />
                                </div>
                            )}

                            {isNGO && (
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-gray-500 uppercase">Office Number</label>
                                    <input
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-transparent"
                                        value={formData.officeNumber}
                                        onChange={e => setFormData({ ...formData, officeNumber: e.target.value })}
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Role Specific Data */}
                    {isVolunteer && (
                        <div className="bg-white dark:bg-dark-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm p-6 space-y-6">
                            <h2 className="text-lg font-bold">Volunteering Stats & Affiliation</h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="p-4 bg-gray-50 dark:bg-dark-800 rounded-lg">
                                    <div className="text-xs text-gray-500 uppercase font-bold">Missions</div>
                                    <div className="text-2xl font-bold">{profile.missionsCount}</div>
                                </div>
                                <div className="p-4 bg-gray-50 dark:bg-dark-800 rounded-lg">
                                    <div className="text-xs text-gray-500 uppercase font-bold">Current Affiliation</div>

                                    {profile.organization ? (
                                        <>
                                            <div className="text-lg font-bold mt-1">
                                                {profile.organization.name}
                                            </div>
                                            <div className="text-xs text-brand-teal font-bold mt-1">
                                                {profile.isVerifiedByNGO ? 'Verified Member' : 'Pending Verification'}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="mt-2">
                                            <div className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Independent Volunteer</div>
                                            <div className="text-xs text-gray-500 mb-2">Select an NGO to join their relief team:</div>
                                            <div className="flex gap-2">
                                                <select
                                                    className="w-full px-2 py-1 text-sm border rounded bg-white dark:bg-dark-900"
                                                    value={formData.targetOrgId}
                                                    onChange={e => setFormData({ ...formData, targetOrgId: e.target.value })}
                                                >
                                                    <option value="">-- Stay Independent --</option>
                                                    {orgList.map(org => (
                                                        <option key={org.id} value={org.id}>{org.name}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={handleUpdate}
                                                    className="px-3 py-1 bg-brand-teal text-white text-xs font-bold rounded"
                                                >
                                                    Join
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}


                    {/* Vetting Modal */}
                    {showVerifyModal && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="bg-white dark:bg-dark-900 w-full max-w-lg rounded-2xl shadow-2xl p-6 border border-gray-200 dark:border-gray-800 animate-in zoom-in-95">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-xl font-bold flex items-center gap-2">
                                        <Shield className="w-6 h-6 text-blue-500" />
                                        Upload Verification Docs
                                    </h3>
                                    <button onClick={() => setShowVerifyModal(false)} className="text-gray-500 hover:text-gray-700">Cancel</button>
                                </div>

                                {isNGO ? (
                                    <>
                                        <FileUpload label="Registration Certificate" accept=".pdf,.jpg,.png" onUpload={(path) => handleFileUpload('registrationCert', path)} />
                                        <FileUpload label="80G & 12A Exemptions" accept=".pdf,.jpg,.png" onUpload={(path) => handleFileUpload('taxExemptions', path)} />
                                        <FileUpload label="Organization PAN Card" accept=".jpg,.png,.pdf" onUpload={(path) => handleFileUpload('panCard', path)} />
                                    </>
                                ) : (
                                    <>
                                        <FileUpload label="Government ID (Aadhaar/PAN)" accept=".jpg,.png,.pdf" onUpload={(path) => handleFileUpload('govId', path)} />
                                        <FileUpload label="Skill Certificate (First Aid/SAR)" accept=".jpg,.png,.pdf" onUpload={(path) => handleFileUpload('skillCert', path)} />
                                    </>
                                )}

                                <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 text-right">
                                    <button
                                        onClick={submitFinalDocs}
                                        disabled={Object.keys(uploadedFiles).length < (isNGO ? 3 : 2)}
                                        className={`w-full py-3 rounded-xl font-bold shadow-lg transition-all ${Object.keys(uploadedFiles).length < (isNGO ? 3 : 2)
                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-[1.02]'
                                            }`}
                                    >
                                        {Object.keys(uploadedFiles).length < (isNGO ? 3 : 2)
                                            ? `Upload All ${isNGO ? 3 : 2} Docs`
                                            : 'Submit for Verification'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </main>
        </div>
    );
}

// Helper Component for File Upload
function FileUpload({ label, accept, onUpload }: { label: string, accept: string, onUpload: (path: string) => void }) {
    const [uploading, setUploading] = useState(false);
    const [fileName, setFileName] = useState('');

    const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const userId = (await supabase.auth.getUser()).data.user?.id;
        const filePath = `${userId}/${Math.random()}.${fileExt}`;

        const { error } = await supabase.storage.from('verification-docs').upload(filePath, file);

        if (error) {
            alert('Upload failed: ' + error.message);
            setUploading(false);
        } else {
            setFileName(file.name);
            onUpload(filePath);
            setUploading(false);
        }
    };

    return (
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
            <div className="flex items-center gap-3">
                <label className={`flex-1 flex items-center justify-center border-2 border-dashed rounded-lg p-3 cursor-pointer transition-colors ${fileName ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-gray-300 dark:border-gray-700 hover:border-blue-500'}`}>
                    <input type="file" className="hidden" accept={accept} onChange={handleFile} disabled={uploading || !!fileName} />
                    {uploading ? (
                        <span className="text-sm text-gray-500 animate-pulse">Uploading...</span>
                    ) : fileName ? (
                        <div className="flex items-center gap-2 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            <span className="text-sm truncate max-w-[200px]">{fileName}</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-gray-500">
                            <UploadCloud className="w-4 h-4" />
                            <span className="text-sm">Choose File</span>
                        </div>
                    )}
                </label>
            </div>
        </div>
    );
}

function DocumentPreview({ docKey, path }: { docKey: string, path: string }) {
    const [url, setUrl] = useState('');

    useEffect(() => {
        const fetchUrl = async () => {
            if (path) {
                const { data } = await supabase.storage.from('verification-docs').createSignedUrl(path, 3600);
                if (data?.signedUrl) setUrl(data.signedUrl);
            }
        };
        fetchUrl();
    }, [path]);

    const formatLabel = (key: string) => {
        const labels: Record<string, string> = {
            registrationCert: "Registration Certificate",
            taxExemptions: "80G & 12A Exemptions",
            panCard: "Organization PAN Card",
            govId: "Government ID",
            skillCert: "Skill Certificate"
        };
        return labels[key] || key;
    };

    return (
        <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-dark-800 transition-colors group"
        >
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
                <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{formatLabel(docKey)}</p>
                <p className="text-xs text-gray-500 truncate">Click to view</p>
            </div>
            <div className="text-gray-400 group-hover:text-blue-500">
                <UploadCloud className="w-4 h-4 rotate-90" />
            </div>
        </a>
    );
}
