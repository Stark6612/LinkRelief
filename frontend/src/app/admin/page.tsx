export default function AdminPage() {
    return (
        <div className="p-8 space-y-6">
            <h1 className="text-3xl font-bold">Admin Portal</h1>
            <p className="text-gray-500">Manage NGO verifications and system settings.</p>

            <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold mb-4">Pending Verifications</h2>
                <div className="text-center py-12 text-gray-400">
                    No pending NGO applications.
                </div>
            </div>
        </div>
    );
}
