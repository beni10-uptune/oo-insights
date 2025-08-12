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
    try {
      // Fetch trends series
      const trendsRes = await fetch(`/api/trends/series?market=${market}&window=${timeWindow}`);
      const trends = await trendsRes.json();
      if (trends.success) {
        setTrendsData(trends);
      }
      
      // Fetch drivers/themes
      const driversRes = await fetch(`/api/trends/drivers?market=${market}&window=${timeWindow}`);
      const drivers = await driversRes.json();
      if (drivers.success) {
        setDriversData(drivers);
      }
      
      // Fetch volume data from API
      const volumeRes = await fetch(`/api/trends/volume?market=${market}&window=${timeWindow}`);
      const volume = await volumeRes.json();
      if (volume.success) {
        setVolumeData(volume);
      } else {
        // Set empty data if API fails
        setVolumeData({ rising: [], highVolume: [] });
      }
    } catch (error) {
      console.error('Failed to load trends data:', error);
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
    // TODO: Implement CSV export
    console.log('Export clicked');
  };
  
  // Calculate KPIs
  const getKPIs = () => {
    if (!trendsData?.series) {
      return {
        topBrand: 'Loading...',
        biggestRiser: 'Loading...',
        topTheme: 'Loading...',
        totalQueries: 0,
      };
    }
    
    // Mock calculations - would be based on real data
    return {
      topBrand: 'Wegovy',
      biggestRiser: 'Mounjaro (+45%)',
      topTheme: driversData?.themes?.[0]?.theme || 'side_effects',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      totalQueries: driversData?.themes?.reduce((sum: number, t: any) => sum + t.query_count, 0) || 0,
    };
  };
  
  const kpis = getKPIs();
  
  return (
    <div className="space-y-6">
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
      
      {/* Brand Interest Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Brand Interest Over Time
          </CardTitle>
          <CardDescription>
            Normalized search interest (0-100 scale) for each brand
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[300px] flex items-center justify-center">
              <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
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
                      +{query.growth}%
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
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Top Volume Queries
          </CardTitle>
          <CardDescription>
            Highest search volume keywords in {MARKETS.find(m => m.value === market)?.label}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Query</th>
                  <th className="text-left py-2">Theme</th>
                  <th className="text-right py-2">Monthly Volume</th>
                  <th className="text-right py-2">Change</th>
                  <th className="text-left py-2 pl-4">Brand</th>
                </tr>
              </thead>
              <tbody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {volumeData?.highVolume?.map((query: any, idx: number) => (
                  <tr key={idx} className="border-b">
                    <td className="py-2 font-medium">{query.query}</td>
                    <td className="py-2">
                      <Badge variant="outline" className="text-xs">
                        {formatThemeName(query.theme)}
                      </Badge>
                    </td>
                    <td className="py-2 text-right">{formatNumber(query.volume)}</td>
                    <td className="py-2 text-right">
                      <span className={query.change > 0 ? 'text-green-600' : 'text-red-600'}>
                        {query.change > 0 ? '+' : ''}{query.change}%
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

