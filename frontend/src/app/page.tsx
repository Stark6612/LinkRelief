import { ReportCard } from "@/components/ReportCard";
import { ResourceGrid } from "@/components/ResourceGrid";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-gray-100 dark:bg-dark-800 rounded-xl h-64 flex items-center justify-center border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 relative overflow-hidden group">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <span className="font-mono text-sm">Real-time Operations Map Preview</span>
        </div>
        <div className="md:col-span-1">
          <ReportCard />
        </div>
      </div>

      {/* Resources Row */}
      <ResourceGrid />

      {/* Activity Feed */}
      <div className="bg-white dark:bg-dark-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
        <h3 className="font-semibold text-lg mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-0 hover:bg-gray-50 dark:hover:bg-dark-900/50 transition-colors px-2 rounded-lg cursor-pointer">
              <span className="text-sm">New volunteer registered nearby</span>
              <span className="text-xs text-gray-400 font-mono">2m ago</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
