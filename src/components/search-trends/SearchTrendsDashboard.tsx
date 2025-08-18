'use client';

import { useState, useEffect } from 'react';
import { 
  Search, 
  BarChart3, 
  Download,
  RefreshCw,
  ArrowUp,
  Activity,
  Zap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import GoogleTrendsEmbed from './GoogleTrendsEmbed';

const MARKETS = [
  { value: 'UK', label: '🇬🇧 United Kingdom', language: 'en' },
  { value: 'CA', label: '🇨🇦 Canada (EN)', language: 'en' },
  { value: 'CA_FR', label: '🇨🇦 Canada (FR)', language: 'fr' },
  { value: 'FR', label: '🇫🇷 France', language: 'fr' },
  { value: 'ES', label: '🇪🇸 Spain', language: 'es' },
  { value: 'IT', label: '🇮🇹 Italy', language: 'it' },
  { value: 'DE', label: '🇩🇪 Germany', language: 'de' },
  { value: 'PL', label: '🇵🇱 Poland', language: 'pl' },
];

const TIME_WINDOWS = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '12m', label: 'Last 12 months' },
];

interface SearchTrendsDashboardProps {
  market: string;
  onMarketChange: (market: string) => void;
}

export default function SearchTrendsDashboard({ market, onMarketChange }: SearchTrendsDashboardProps) {
  const [timeWindow, setTimeWindow] = useState('30d');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'volume' | 'change'>('volume');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [authBlocked, setAuthBlocked] = useState(false);
  
  // State for data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [trendsData, setTrendsData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [driversData, setDriversData] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [volumeData, setVolumeData] = useState<any>(null);
  
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [market, timeWindow]);
  
  const loadData = async () => {
    setLoading(true);
    setAuthBlocked(false);
    let hasAuthIssue = false;
    
    try {
      // Helper function to fetch with auth handling
      const fetchWithAuth = async (url: string) => {
        const res = await fetch(url, {
          credentials: 'include', // Include cookies for authentication
          headers: {
            'Accept': 'application/json',
          },
        });
        
        // Check if response is JSON
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          console.warn(`API endpoint ${url} returned non-JSON response (likely auth page)`);
          hasAuthIssue = true;
          return null;
        }
        
        return res.json();
      };
      
      // Fetch trends series
      const trends = await fetchWithAuth(`/api/trends/series?market=${market}&window=${timeWindow}`);
      if (trends?.success) {
        setTrendsData(trends);
      } else {
        // Use fallback empty data structure
        setTrendsData({ series: [] });
      }
      
      // Fetch drivers/themes
      const drivers = await fetchWithAuth(`/api/trends/drivers?market=${market}&window=${timeWindow}`);
      if (drivers?.success) {
        setDriversData(drivers);
      } else {
        // Use fallback empty data structure
        setDriversData({ themes: [], queries: [] });
      }
      
      // Fetch volume data from API
      const volume = await fetchWithAuth(`/api/trends/volume?market=${market}&window=${timeWindow}`);
      if (volume?.success) {
        setVolumeData(volume);
      } else {
        // Set empty data if API fails
        setVolumeData({ rising: [], highVolume: [] });
      }
      
      // Set auth blocked flag if we detected authentication issues
      setAuthBlocked(hasAuthIssue);
    } catch (error) {
      console.error('Failed to load trends data:', error);
      // Set fallback empty data
      setTrendsData({ series: [] });
      setDriversData({ themes: [], queries: [] });
      setVolumeData({ rising: [], highVolume: [] });
    } finally {
      setLoading(false);
    }
  };
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };
  
  const handleExport = () => {
    // Export data as CSV
    const csvData = [];
    
    // Add headers
    csvData.push(['Market', 'Time Window', 'Data Type', 'Metric', 'Value']);
    
    // Add KPI data
    csvData.push([market, timeWindow, 'KPI', 'Top Brand', kpis.topBrand]);
    csvData.push([market, timeWindow, 'KPI', 'Biggest Riser', kpis.biggestRiser]);
    csvData.push([market, timeWindow, 'KPI', 'Top Theme', kpis.topTheme]);
    csvData.push([market, timeWindow, 'KPI', 'Total Queries', kpis.totalQueries]);
    
    // Add trends data
    if (trendsData?.series) {
      trendsData.series.forEach((brand: any) => {
        brand.points?.forEach((point: any) => {
          csvData.push([market, timeWindow, 'Trend', `${brand.brand} - ${point.date}`, point.value]);
        });
      });
    }
    
    // Add volume data
    if (volumeData?.highVolume) {
      volumeData.highVolume.forEach((query: any) => {
        csvData.push([market, timeWindow, 'Volume', query.query, query.volume]);
      });
    }
    
    // Convert to CSV string
    const csv = csvData.map(row => row.join(',')).join('\n');
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `search-trends-${market}-${timeWindow}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };
  
  // Calculate KPIs based on actual data
  const getKPIs = () => {
    // If no data yet, show loading state
    if (loading) {
      return {
        topBrand: 'Loading...',
        biggestRiser: 'Loading...',
        topTheme: 'Loading...',
        totalQueries: 0,
      };
    }
    
    // If auth is blocked, show appropriate message
    if (authBlocked) {
      return {
        topBrand: 'Auth Required',
        biggestRiser: 'Auth Required',
        topTheme: 'Auth Required',
        totalQueries: 0,
      };
    }
    
    // Calculate top brand from series data
    let topBrand = 'No data';
    let topBrandValue = 0;
    if (trendsData?.series && trendsData.series.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      trendsData.series.forEach((s: any) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const avgValue = s.points?.reduce((sum: number, p: any) => sum + p.value, 0) / (s.points?.length || 1);
        if (avgValue > topBrandValue) {
          topBrandValue = avgValue;
          topBrand = s.brand;
        }
      });
    }
    
    // Calculate biggest riser from volume data
    let biggestRiser = 'No data';
    if (volumeData?.rising?.[0]) {
      const top = volumeData.rising[0];
      biggestRiser = `${top.brand} (+${Math.round(top.growth)}%)`;
    }
    
    // Get top theme from drivers data
    const topTheme = driversData?.themes?.[0]?.theme ? formatThemeName(driversData.themes[0].theme) : 'No data';
    
    // Calculate total queries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const totalQueries = driversData?.themes?.reduce((sum: number, t: any) => sum + t.query_count, 0) || 0;
    
    return {
      topBrand,
      biggestRiser,
      topTheme,
      totalQueries,
    };
  };
  
  const kpis = getKPIs();
  
  // Handle sorting
  const handleSort = (field: 'volume' | 'change') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };
  
  // Filter and sort queries
  const getFilteredAndSortedQueries = () => {
    if (!volumeData?.highVolume) return [];
    
    // Filter by brand
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filtered = volumeData.highVolume.filter((q: any) => 
      brandFilter === 'all' || q.brand === brandFilter
    );
    
    // Sort
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    filtered.sort((a: any, b: any) => {
      const aVal = sortField === 'volume' ? a.volume : a.change;
      const bVal = sortField === 'volume' ? b.volume : b.change;
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
    
    return filtered;
  };
  
  return (
    <div className="space-y-6">
      {/* Authentication Warning */}
      {authBlocked && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>Authentication Required:</strong> The data API is protected by Vercel authentication. 
                Please ensure you&apos;re logged in to view live data. Currently showing placeholder values.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Controls */}
      <div className="flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2">
          <Select value={market} onValueChange={onMarketChange}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select market" />
            </SelectTrigger>
            <SelectContent>
              {MARKETS.map(m => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={timeWindow} onValueChange={setTimeWindow}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              {TIME_WINDOWS.map(w => (
                <SelectItem key={w.value} value={w.value}>
                  {w.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Top Brand (Interest)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.topBrand}</div>
            <p className="text-xs text-muted-foreground mt-1">Last {timeWindow}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Biggest Riser</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              {kpis.biggestRiser}
              <ArrowUp className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">Growth rate</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Top Rising Theme</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatThemeName(kpis.topTheme)}</div>
            <p className="text-xs text-muted-foreground mt-1">Most queries</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Rising Queries</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.totalQueries}</div>
            <p className="text-xs text-muted-foreground mt-1">Above threshold</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Google Trends Embed */}
      <GoogleTrendsEmbed 
        market={market}
        keywords={['wegovy', 'ozempic', 'mounjaro']}
        timeRange={timeWindow}
        widgetType="TIMESERIES"
      />
      
      {/* Brand Interest Chart from API */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Brand Interest Over Time (DataForSEO)
          </CardTitle>
          <CardDescription>
            Normalized search interest (0-100 scale) for each brand from our API
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : trendsData?.series && trendsData.series.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={formatChartData(trendsData?.series)}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Wegovy" stroke="#8b5cf6" strokeWidth={2} />
                <Line type="monotone" dataKey="Ozempic" stroke="#3b82f6" strokeWidth={2} />
                <Line type="monotone" dataKey="Mounjaro" stroke="#10b981" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No data available. Click Refresh to fetch latest trends.
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Drivers Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Top Rising Themes
            </CardTitle>
            <CardDescription>
              Query themes driving search growth
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {driversData?.themes?.slice(0, 5).map((theme: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-8 bg-blue-500 rounded" 
                         style={{ opacity: 1 - idx * 0.15 }} />
                    <div>
                      <div className="font-medium">{formatThemeName(theme.theme)}</div>
                      <div className="text-sm text-muted-foreground">
                        {theme.query_count} queries • {formatNumber(theme.volume_sum)} searches
                      </div>
                    </div>
                  </div>
                  <Badge variant={idx === 0 ? 'default' : 'secondary'}>
                    +{Math.round(theme.rising_score)}%
                  </Badge>
                </div>
              )) || (
                <div className="text-center text-muted-foreground py-8">
                  No theme data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Top Rising Queries
            </CardTitle>
            <CardDescription>
              Fastest growing search queries
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {volumeData?.rising?.slice(0, 5).map((query: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <div className="flex-1">
                    <div className="font-medium">{query.query}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatNumber(query.volume)} searches/mo • {query.brand}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {query.growth > 100 ? (
                      <Badge variant="destructive" className="text-xs">
                        Breakout
                      </Badge>
                    ) : query.growth > 30 ? (
                      <Badge className="text-xs">
                        Rising
                      </Badge>
                    ) : null}
                    <span className="text-green-600 font-medium">
                      +{Math.round(query.growth)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* High Volume Queries */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top Volume Queries
              </CardTitle>
              <CardDescription>
                Highest search volume keywords in {MARKETS.find(m => m.value === market)?.label}
              </CardDescription>
            </div>
            <Select value={brandFilter} onValueChange={setBrandFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter by brand" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Brands</SelectItem>
                <SelectItem value="Wegovy">Wegovy</SelectItem>
                <SelectItem value="Ozempic">Ozempic</SelectItem>
                <SelectItem value="Mounjaro">Mounjaro</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Query</th>
                  <th className="text-left py-2">Theme</th>
                  <th className="text-right py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => handleSort('volume')}>
                    Monthly Volume {sortField === 'volume' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th className="text-right py-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                      onClick={() => handleSort('change')}>
                    Change {sortField === 'change' && (sortOrder === 'desc' ? '↓' : '↑')}
                  </th>
                  <th className="text-left py-2 pl-4">Brand</th>
                </tr>
              </thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {getFilteredAndSortedQueries()?.map((query: any, idx: number) => (
                  <tr key={idx} className="border-b">
                    <td className="py-2 font-medium">{query.query}</td>
                    <td className="py-2">
                      <Badge variant="outline" className="text-xs">
                        {formatThemeName(query.theme)}
                      </Badge>
                    </td>
                    <td className="py-2 text-right">{formatNumber(query.volume)}</td>
                    <td className="py-2 text-right">
                      <span className={query.change > 0 ? 'text-green-600' : query.change < 0 ? 'text-red-600' : 'text-gray-500'}>
                        {query.change > 0 ? '+' : ''}{Math.round(query.change)}%
                      </span>
                    </td>
                    <td className="py-2 pl-4">
                      <Badge variant="secondary" className="text-xs">
                        {query.brand}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper functions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function formatChartData(series: any) {
  if (!series || series.length === 0) return [];
  
  // Combine all brand data points by date
  const dataMap = new Map();
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  series.forEach((brand: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    brand.points?.forEach((point: any) => {
      if (!dataMap.has(point.date)) {
        dataMap.set(point.date, { date: point.date });
      }
      dataMap.get(point.date)[brand.brand] = point.value;
    });
  });
  
  return Array.from(dataMap.values()).sort((a, b) => 
    a.date.localeCompare(b.date)
  );
}

function formatThemeName(theme: string): string {
  if (!theme) return 'Unknown';
  return theme.split('_').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join(' ');
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

