import React, { useState, useEffect } from "react";
import { Database, HardDrive, FileText, RefreshCw } from "lucide-react";

interface CacheStatsData {
  size: number;
  sizeFormatted: string;
  files: number;
  limit: number;
  limitFormatted: string;
  usagePercent: number;
}

export const CacheStats: React.FC = () => {
  const [stats, setStats] = useState<CacheStatsData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/cache-stats");
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error("Error fetching cache stats:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && !stats) return <div className="animate-pulse h-24 bg-gray-100 dark:bg-gray-800 rounded-2xl" />;
  if (!stats) return null;

  return (
    <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-colors duration-300">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-emerald-600" />
          <h3 className="font-bold text-gray-900 dark:text-white">Image Cache</h3>
        </div>
        <button 
          onClick={fetchStats}
          disabled={loading}
          className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 text-gray-400 dark:text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
          <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 mb-1">
            <HardDrive className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Size</span>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.sizeFormatted}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">of {stats.limitFormatted}</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
          <div className="flex items-center gap-2 text-gray-400 dark:text-gray-500 mb-1">
            <FileText className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Files</span>
          </div>
          <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.files.toLocaleString()}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">cached images</p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
          <span>Storage Usage</span>
          <span>{stats.usagePercent}%</span>
        </div>
        <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              stats.usagePercent > 90 ? 'bg-red-500' : stats.usagePercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${stats.usagePercent}%` }}
          />
        </div>
      </div>
    </div>
  );
};
