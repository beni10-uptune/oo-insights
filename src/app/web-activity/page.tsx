'use client';

import { useState } from 'react';
import WebActivityDashboard from "@/components/web-activity/WebActivityDashboard";
import CoverageMatrix from "@/components/web-activity/CoverageMatrix";
import { Activity, Globe } from 'lucide-react';

export default function WebActivityPage() {
  const [activeTab, setActiveTab] = useState<'activity' | 'coverage'>('activity');

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Web Activity Intelligence</h1>
        <p className="text-gray-600 dark:text-gray-400">
          Monitor truthaboutweight sites across 26 EUCAN markets • Crawled daily at 9 AM CET
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'activity'
              ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'text-gray-600 border-transparent hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
          }`}
        >
          <Activity className="h-4 w-4" />
          Activity Timeline
        </button>
        <button
          onClick={() => setActiveTab('coverage')}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'coverage'
              ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'text-gray-600 border-transparent hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
          }`}
        >
          <Globe className="h-4 w-4" />
          Coverage Matrix
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'activity' ? (
        <WebActivityDashboard />
      ) : (
        <CoverageMatrix />
      )}
    </div>
  );
}