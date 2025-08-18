'use client';

import { useState } from 'react';
import WebActivityDashboard from "@/components/web-activity/WebActivityDashboard";
import CoverageMatrix from "@/components/web-activity/CoverageMatrix";
import MarketHealthScore from "@/components/web-activity/MarketHealthScore";
import EnhancedTimeline from "@/components/web-activity/EnhancedTimeline";
import { Activity, Globe, Heart, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function WebActivityPage() {
  const [activeTab, setActiveTab] = useState<'timeline' | 'health' | 'activity' | 'coverage'>('timeline');

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Activity className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Web Activity Intelligence</h1>
            <p className="text-muted-foreground mt-1">
              Real-time monitoring across all Truth About Weight markets • Updated daily at 8 AM UTC
            </p>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Markets</p>
                  <p className="text-2xl font-bold">25+</p>
                </div>
                <Globe className="h-8 w-8 text-primary/20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pages Tracked</p>
                  <p className="text-2xl font-bold">500+</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500/20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Updates Today</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
                <AlertCircle className="h-8 w-8 text-blue-500/20" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Health</p>
                  <p className="text-2xl font-bold text-green-500">85%</p>
                </div>
                <Heart className="h-8 w-8 text-red-500/20" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'timeline'
              ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'text-gray-600 border-transparent hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
          }`}
        >
          <Clock className="h-4 w-4" />
          Timeline
        </button>
        <button
          onClick={() => setActiveTab('health')}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'health'
              ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'text-gray-600 border-transparent hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
          }`}
        >
          <Heart className="h-4 w-4" />
          Market Health
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`flex items-center gap-2 px-4 py-2 font-medium transition-colors border-b-2 ${
            activeTab === 'activity'
              ? 'text-blue-600 border-blue-600 dark:text-blue-400 dark:border-blue-400'
              : 'text-gray-600 border-transparent hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
          }`}
        >
          <Activity className="h-4 w-4" />
          Activity Details
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
      {activeTab === 'timeline' ? (
        <EnhancedTimeline />
      ) : activeTab === 'health' ? (
        <MarketHealthScore />
      ) : activeTab === 'activity' ? (
        <WebActivityDashboard />
      ) : (
        <CoverageMatrix />
      )}
    </div>
  );
}