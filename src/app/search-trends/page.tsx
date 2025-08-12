'use client';

import { useState } from 'react';
import SearchTrendsDashboard from '@/components/search-trends/SearchTrendsDashboard';
import MarketComparison from '@/components/search-trends/MarketComparison';
import { TrendingUp, Globe } from 'lucide-react';

export default function SearchTrendsPage() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'compare'>('dashboard');
  const [selectedMarket, setSelectedMarket] = useState<string>('UK');

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Search Trends Intelligence</h1>
        <p className="text-gray-600 dark:text-gray-400">
          DataForSEO-powered insights for Wegovy, Ozempic, and Mounjaro across EUCAN markets
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'dashboard'
              ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'text-gray-600 border-transparent hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Market Dashboard
        </button>
        <button
          onClick={() => setActiveTab('compare')}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'compare'
              ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'text-gray-600 border-transparent hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
          }`}
        >
          <Globe className="h-4 w-4" />
          Compare Markets
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'dashboard' ? (
        <SearchTrendsDashboard 
          market={selectedMarket} 
          onMarketChange={setSelectedMarket}
        />
      ) : (
        <MarketComparison />
      )}
    </div>
  );
}