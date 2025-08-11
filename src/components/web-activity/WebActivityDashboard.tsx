'use client';

import { useState, useEffect } from 'react';
import { Clock, Globe, Activity, TrendingUp, FileText, Link, Search, Calendar, Filter, RefreshCw, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface WebActivityEvent {
  id: string;
  url: string;
  title: string;
  market?: string;
  language?: string;
  changeType: 'created' | 'updated';
  changeDescription?: string;
  crawledAt: string;
  contentHash?: string;
}

interface ActivityStats {
  totalPages: number;
  totalChanges: number;
  marketsTracked: number;
  lastCrawl?: string;
  changesByMarket: Record<string, number>;
  changesByType: {
    created: number;
    updated: number;
  };
}

// Core markets first, then others
const MARKETS = [
  // Core Markets (Priority)
  { value: 'UK', label: '🇬🇧 United Kingdom', isCore: true },
  { value: 'IT', label: '🇮🇹 Italy', isCore: true },
  { value: 'ES', label: '🇪🇸 Spain', isCore: true },
  { value: 'FR', label: '🇫🇷 France', isCore: true },
  { value: 'DE', label: '🇩🇪 Germany', isCore: true },
  { value: 'PL', label: '🇵🇱 Poland', isCore: true },
  { value: 'CA', label: '🇨🇦 Canada', isCore: true },
  
  // Global
  { value: 'Global', label: '🌍 Global' },
  
  // Additional European Markets
  { value: 'BE-NL', label: '🇧🇪 Belgium (NL)' },
  { value: 'BE-FR', label: '🇧🇪 Belgium (FR)' },
  { value: 'CH-DE', label: '🇨🇭 Switzerland (DE)' },
  { value: 'CH-FR', label: '🇨🇭 Switzerland (FR)' },
  { value: 'CH-IT', label: '🇨🇭 Switzerland (IT)' },
  { value: 'NL', label: '🇳🇱 Netherlands' },
  { value: 'AT', label: '🇦🇹 Austria' },
  { value: 'PT', label: '🇵🇹 Portugal' },
  { value: 'SE', label: '🇸🇪 Sweden' },
  { value: 'DK', label: '🇩🇰 Denmark' },
  { value: 'NO', label: '🇳🇴 Norway' },
  { value: 'FI', label: '🇫🇮 Finland' },
];

export default function WebActivityDashboard() {
  const [events, setEvents] = useState<WebActivityEvent[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [crawling, setCrawling] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [timeRange, setTimeRange] = useState('30');
  const [crawlStatus, setCrawlStatus] = useState<string>('');

  useEffect(() => {
    loadData();
  }, [selectedMarket, selectedType, timeRange]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load events
      const eventsParams = new URLSearchParams();
      if (selectedMarket) eventsParams.append('market', selectedMarket);
      if (selectedType) eventsParams.append('eventType', selectedType);
      eventsParams.append('limit', '50');
      
      const eventsRes = await fetch(`/api/web-activity/events?${eventsParams}`);
      const eventsData = await eventsRes.json();
      if (eventsData.success) {
        setEvents(eventsData.events || []);
      }

      // Load stats
      const statsRes = await fetch(`/api/web-activity/stats?days=${timeRange}`);
      const statsData = await statsRes.json();
      if (statsData.success) {
        setStats(statsData.stats);
      }
    } catch (error) {
      console.error('Failed to load web activity data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCrawlCore = async () => {
    if (crawling) return;
    
    setCrawling(true);
    setCrawlStatus('Crawling core markets...');
    
    try {
      // Crawl only core markets
      const coreMarkets = ['uk', 'it', 'es', 'fr', 'de', 'pl', 'ca'];
      const response = await fetch('/api/crawl/all-markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          markets: coreMarkets
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setCrawlStatus(`✅ Crawled ${data.marketsCrawled} core markets successfully`);
        // Reload data after crawl
        await loadData();
      } else {
        setCrawlStatus('❌ Crawl failed. Check console for details.');
      }
    } catch (error) {
      console.error('Failed to crawl sites:', error);
      setCrawlStatus('❌ Crawl failed. Check console for details.');
    } finally {
      setCrawling(false);
      setTimeout(() => setCrawlStatus(''), 5000);
    }
  };

  const handleCrawlAll = async () => {
    if (crawling) return;
    
    setCrawling(true);
    setCrawlStatus('Crawling all markets...');
    
    try {
      const response = await fetch('/api/crawl/all-markets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      
      const data = await response.json();
      if (data.success) {
        setCrawlStatus(`✅ Crawled ${data.marketsCrawled} markets successfully`);
        await loadData();
      } else {
        setCrawlStatus('❌ Crawl failed. Check console for details.');
      }
    } catch (error) {
      console.error('Failed to crawl sites:', error);
      setCrawlStatus('❌ Crawl failed. Check console for details.');
    } finally {
      setCrawling(false);
      setTimeout(() => setCrawlStatus(''), 5000);
    }
  };

  const getMarketFlag = (market: string) => {
    const marketData = MARKETS.find(m => m.value === market);
    if (marketData) {
      const flag = marketData.label.split(' ')[0];
      return flag;
    }
    return '🌐';
  };

  const getCoreMarketBadge = (market: string) => {
    const marketData = MARKETS.find(m => m.value === market);
    return marketData?.isCore ? '⭐' : '';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Web Activity Tracker
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Monitor changes across truthaboutweight sites • Core markets: UK, IT, ES, FR, DE, PL, CA
          </p>
        </div>
        
        <div className="flex gap-2">
          <button
            onClick={handleCrawlCore}
            disabled={crawling}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${crawling ? 'animate-spin' : ''}`} />
            {crawling ? 'Crawling...' : 'Crawl Core Markets'}
          </button>
          
          <button
            onClick={handleCrawlAll}
            disabled={crawling}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Globe className="h-4 w-4" />
            All Markets
          </button>
        </div>
      </div>

      {/* Crawl Status */}
      {crawlStatus && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm">{crawlStatus}</span>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Pages</p>
                <p className="text-2xl font-bold">{stats.totalPages}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Changes</p>
                <p className="text-2xl font-bold">{stats.totalChanges}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Markets</p>
                <p className="text-2xl font-bold">{stats.marketsTracked}</p>
                <p className="text-xs text-gray-500 mt-1">7 core markets</p>
              </div>
              <Globe className="h-8 w-8 text-purple-500" />
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Last Crawl</p>
                <p className="text-sm font-medium">
                  {stats.lastCrawl ? formatDistanceToNow(new Date(stats.lastCrawl), { addSuffix: true }) : 'Never'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Auto-crawls every 6h</p>
              </div>
              <Clock className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-2">Market</label>
            <select
              value={selectedMarket}
              onChange={(e) => setSelectedMarket(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="">All Markets</option>
              <optgroup label="Core Markets ⭐">
                {MARKETS.filter(m => m.isCore).map(market => (
                  <option key={market.value} value={market.value}>
                    {market.label}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Other Markets">
                {MARKETS.filter(m => !m.isCore).map(market => (
                  <option key={market.value} value={market.value}>
                    {market.label}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-2">Change Type</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="">All Types</option>
              <option value="created">New Pages</option>
              <option value="updated">Updated Pages</option>
            </select>
          </div>
          
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium mb-2">Time Range</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Activity Timeline */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Activity Timeline
          </h3>
        </div>
        
        <div className="divide-y divide-gray-200 dark:divide-gray-700">
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center gap-2 text-gray-500">
                <RefreshCw className="h-5 w-5 animate-spin" />
                Loading activity...
              </div>
            </div>
          ) : events.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-gray-500 mb-4">
                <Globe className="h-12 w-12 mx-auto mb-3 opacity-50" />
                No activity found. Click "Crawl Core Markets" to start tracking.
              </div>
              <div className="text-sm text-gray-400">
                This will monitor: UK 🇬🇧, Italy 🇮🇹, Spain 🇪🇸, France 🇫🇷, Germany 🇩🇪, Poland 🇵🇱, Canada 🇨🇦
              </div>
            </div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      event.changeType === 'created' 
                        ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400'
                    }`}>
                      {event.changeType === 'created' ? '+' : '↻'}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-medium flex items-center gap-2">
                          {event.market && (
                            <>
                              <span>{getMarketFlag(event.market)}</span>
                              {getCoreMarketBadge(event.market) && (
                                <span className="text-yellow-500" title="Core Market">⭐</span>
                              )}
                            </>
                          )}
                          {event.title || 'Untitled Page'}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                          <Link className="h-3 w-3" />
                          <a 
                            href={event.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:text-blue-600 dark:hover:text-blue-400 truncate max-w-md"
                          >
                            {event.url}
                          </a>
                        </div>
                        {event.changeDescription && (
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            {event.changeDescription}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex-shrink-0 text-right">
                        <p className="text-sm text-gray-500">
                          {formatDistanceToNow(new Date(event.crawledAt), { addSuffix: true })}
                        </p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                          event.changeType === 'created'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        }`}>
                          {event.changeType === 'created' ? 'New' : 'Updated'}
                        </span>
                        {event.market && MARKETS.find(m => m.value === event.market)?.isCore && (
                          <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                            Core Market
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}