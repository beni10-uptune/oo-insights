'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MarketHealth {
  market: string;
  marketName: string;
  overallScore: number;
  contentFreshness: number;
  contentCoverage: number;
  updateFrequency: number;
  totalPages: number;
  recentUpdates: number;
  lastCrawled: string;
  trend: 'up' | 'down' | 'stable';
  alerts: string[];
}

export default function MarketHealthScore() {
  const [healthScores, setHealthScores] = useState<MarketHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);

  useEffect(() => {
    fetchHealthScores();
  }, []);

  const fetchHealthScores = async () => {
    try {
      const response = await fetch('/api/web-activity/health-scores');
      const data = await response.json();
      setHealthScores(data.scores || []);
    } catch (error) {
      console.error('Error fetching health scores:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 dark:text-green-400';
    if (score >= 60) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 40) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <CheckCircle className="h-5 w-5 text-green-600" />;
    if (score >= 60) return <Clock className="h-5 w-5 text-yellow-600" />;
    return <AlertCircle className="h-5 w-5 text-red-600" />;
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return 'bg-green-600';
    if (score >= 60) return 'bg-yellow-600';
    if (score >= 40) return 'bg-orange-600';
    return 'bg-red-600';
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="pb-3">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Sort markets by score for priority display
  const sortedMarkets = [...healthScores].sort((a, b) => {
    // Prioritize markets with alerts
    if (a.alerts.length > 0 && b.alerts.length === 0) return -1;
    if (a.alerts.length === 0 && b.alerts.length > 0) return 1;
    // Then by score
    return a.overallScore - b.overallScore;
  });

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Markets Monitored</p>
                <p className="text-2xl font-bold">{healthScores.length}</p>
              </div>
              <Globe className="h-8 w-8 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Healthy Markets</p>
                <p className="text-2xl font-bold text-green-600">
                  {healthScores.filter(m => m.overallScore >= 80).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Need Attention</p>
                <p className="text-2xl font-bold text-yellow-600">
                  {healthScores.filter(m => m.overallScore >= 40 && m.overallScore < 80).length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Critical</p>
                <p className="text-2xl font-bold text-red-600">
                  {healthScores.filter(m => m.overallScore < 40).length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-red-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Market Health Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {sortedMarkets.map((market) => (
          <Card 
            key={market.market}
            className={cn(
              "cursor-pointer transition-all hover:shadow-lg",
              selectedMarket === market.market && "ring-2 ring-blue-500",
              market.alerts.length > 0 && "border-red-500"
            )}
            onClick={() => setSelectedMarket(market.market === selectedMarket ? null : market.market)}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">
                  {market.marketName}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {getTrendIcon(market.trend)}
                  {getScoreIcon(market.overallScore)}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Overall Score */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold">
                    <span className={getScoreColor(market.overallScore)}>
                      {market.overallScore}
                    </span>
                    <span className="text-sm font-normal text-gray-500">/100</span>
                  </span>
                  <span className="text-xs text-gray-500">{market.totalPages} pages</span>
                </div>
                <Progress 
                  value={market.overallScore} 
                  className="h-2"
                  indicatorClassName={getProgressColor(market.overallScore)}
                />
              </div>

              {/* Component Scores */}
              {selectedMarket === market.market && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Content Freshness</span>
                    <span className={getScoreColor(market.contentFreshness)}>
                      {market.contentFreshness}%
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Coverage</span>
                    <span className={getScoreColor(market.contentCoverage)}>
                      {market.contentCoverage}%
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Update Frequency</span>
                    <span className={getScoreColor(market.updateFrequency)}>
                      {market.updateFrequency}%
                    </span>
                  </div>
                  
                  {/* Recent Activity */}
                  <div className="pt-2 border-t">
                    <p className="text-xs text-gray-500">
                      {market.recentUpdates} updates in last 7 days
                    </p>
                    <p className="text-xs text-gray-500">
                      Last crawled: {new Date(market.lastCrawled).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Alerts */}
                  {market.alerts.length > 0 && (
                    <div className="pt-2 border-t">
                      <p className="text-xs font-medium text-red-600 mb-1">Alerts:</p>
                      {market.alerts.map((alert, i) => (
                        <p key={i} className="text-xs text-red-500">• {alert}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// Import this for theme support
import { Globe } from 'lucide-react';