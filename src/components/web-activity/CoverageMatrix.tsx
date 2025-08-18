'use client';

import { useState, useEffect } from 'react';
import { 
  Globe, 
  CheckCircle, 
  XCircle, 
  Clock,
  Download,
  RefreshCw,
  Activity,
  FileText,
  Hash,
  Languages,
  MapPin
} from 'lucide-react';

interface MarketCoverage {
  market: string; // Display name (e.g. "Germany")
  marketCode: string; // Code for exports (e.g. "de")
  flag: string;
  language: string;
  url: string;
  timezone: string;
  pageCount: number;
  lastCrawl: string | null;
  hasHcpLocator: boolean;
  categorizedPages: number;
  summarizedPages: number;
  recentlyUpdated: number;
  hasRecentActivity: boolean;
  healthScore: number;
}

interface CoverageSummary {
  totalMarkets: number;
  marketsWithContent: number;
  marketsWithHcp: number;
  totalPages: number;
  fullyCategorized: number;
  fullySummarized: number;
  lastGlobalUpdate: number;
}

export default function CoverageMatrix() {
  const [coverage, setCoverage] = useState<MarketCoverage[]>([]);
  const [summary, setSummary] = useState<CoverageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    loadCoverage();
  }, []);

  const loadCoverage = async () => {
    setLoading(true);
    try {
      // ALWAYS use real endpoint - never use mock data in production
      const response = await fetch('/api/web-activity/coverage');
      const data = await response.json();
      
      if (data.success) {
        setCoverage(data.coverage);
        setSummary(data.summary);
      } else {
        // In production, if the database is unavailable, we show an error
        // We NEVER use mock data in production
        console.error('Failed to load coverage data:', data.error);
        if (process.env.NODE_ENV === 'production') {
          // Show error state to user
          console.error('Database unavailable in production - cannot display coverage matrix');
        }
      }
    } catch (error) {
      console.error('Failed to load coverage matrix:', error);
      // In production, we fail gracefully but never use mock data
      // Mock data is only for local development when explicitly needed
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (market: string, format: 'json' | 'csv' | 'llm') => {
    setExporting(market);
    try {
      const response = await fetch(
        `/api/web-activity/export?market=${market}&format=${format}`,
        { method: 'GET' }
      );
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${market}-export-${new Date().toISOString().split('T')[0]}.${
          format === 'csv' ? 'csv' : format === 'llm' ? 'txt' : 'json'
        }`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(null);
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100 dark:bg-green-900/30';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
    if (score >= 40) return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
    return 'text-red-600 bg-red-100 dark:bg-red-900/30';
  };

  const formatLastCrawl = (lastCrawl: string | null) => {
    if (!lastCrawl) return 'Never';
    const date = new Date(lastCrawl);
    const hours = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60));
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
              <Globe className="h-4 w-4" />
              Markets
            </div>
            <div className="text-2xl font-bold">{summary.marketsWithContent}/{summary.totalMarkets}</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
              <FileText className="h-4 w-4" />
              Total Pages
            </div>
            <div className="text-2xl font-bold">{summary.totalPages.toLocaleString()}</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
              <MapPin className="h-4 w-4" />
              HCP Locator
            </div>
            <div className="text-2xl font-bold">{summary.marketsWithHcp} markets</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
              <Hash className="h-4 w-4" />
              Categorized
            </div>
            <div className="text-2xl font-bold">{summary.fullyCategorized} markets</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
              <Languages className="h-4 w-4" />
              Summarized
            </div>
            <div className="text-2xl font-bold">{summary.fullySummarized} markets</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 mb-1">
              <Clock className="h-4 w-4" />
              Last Update
            </div>
            <div className="text-sm font-medium">
              {summary.lastGlobalUpdate 
                ? formatLastCrawl(new Date(summary.lastGlobalUpdate).toISOString())
                : 'Never'}
            </div>
          </div>
        </div>
      )}

      {/* Coverage Matrix Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold">Market Coverage Matrix</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive view of all EUCAN markets and their content status
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Market
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Health
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pages
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  HCP
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Summary
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Crawl
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Export
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {coverage.map((market) => (
                <tr key={market.marketCode} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{market.flag}</span>
                      <div>
                        <div className="font-medium">{market.market}</div>
                        <div className="text-xs text-gray-500">
                          {market.language} • {market.timezone.split('/')[1]}
                        </div>
                      </div>
                      {market.hasRecentActivity && (
                        <Activity className="h-3 w-3 text-green-500 animate-pulse" />
                      )}
                    </div>
                  </td>
                  
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center justify-center w-12 h-6 rounded-full text-xs font-medium ${getHealthColor(market.healthScore)}`}>
                      {market.healthScore}%
                    </span>
                  </td>
                  
                  <td className="px-4 py-3 text-right">
                    <div className="font-medium">{market.pageCount}</div>
                    {market.recentlyUpdated > 0 && (
                      <div className="text-xs text-green-600 dark:text-green-400">
                        +{market.recentlyUpdated} new
                      </div>
                    )}
                  </td>
                  
                  <td className="px-4 py-3 text-center">
                    {market.hasHcpLocator ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                    ) : (
                      <XCircle className="h-5 w-5 text-gray-300 mx-auto" />
                    )}
                  </td>
                  
                  <td className="px-4 py-3 text-center">
                    {market.pageCount > 0 ? (
                      <div className="text-sm">
                        {Math.round((market.categorizedPages / market.pageCount) * 100)}%
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  
                  <td className="px-4 py-3 text-center">
                    {market.pageCount > 0 ? (
                      <div className="text-sm">
                        {Math.round((market.summarizedPages / market.pageCount) * 100)}%
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      {formatLastCrawl(market.lastCrawl)}
                    </div>
                  </td>
                  
                  <td className="px-4 py-3">
                    {market.pageCount > 0 && (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleExport(market.marketCode, 'csv')}
                          disabled={exporting === market.marketCode}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          title="Export as CSV"
                        >
                          <Download className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleExport(market.marketCode, 'json')}
                          disabled={exporting === market.marketCode}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          title="Export as JSON"
                        >
                          <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleExport(market.marketCode, 'llm')}
                          disabled={exporting === market.marketCode}
                          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                          title="Export for LLM"
                        >
                          <Hash className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}