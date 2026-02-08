import { FileText, Download, BarChart2 } from "lucide-react";

export default function ReportsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <FileText className="w-6 h-6 text-orange-500" />
                    Post-Disaster Analysis
                </h1>
                <button className="flex items-center gap-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">
                    <Download className="w-4 h-4" />
                    Export CSV
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-dark-800 p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-gray-400" />
                        Incident Frequency
                    </h3>
                    <div className="h-48 bg-gray-50 dark:bg-dark-900/50 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                        Chart Visualization Placeholder
                    </div>
                </div>
                <div className="bg-white dark:bg-dark-800 p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-gray-400" />
                        Response Times
                    </h3>
                    <div className="h-48 bg-gray-50 dark:bg-dark-900/50 rounded-lg flex items-center justify-center text-gray-400 text-sm">
                        Chart Visualization Placeholder
                    </div>
                </div>
            </div>
        </div>
    );
}
