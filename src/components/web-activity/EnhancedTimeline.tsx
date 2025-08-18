'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FileText, Edit, Plus, TrendingUp, AlertCircle, 
  Calendar, Filter, Search, ChevronRight, Globe,
  BarChart, Clock, Eye, X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimelineEvent {
  id: string;
  type: 'created' | 'updated' | 'pattern' | 'alert';
  timestamp: string;
  publishedAt?: string;
  crawledAt?: string;
  market: string;
  marketName: string;
  title: string;
  description: string;
  originalLanguage?: string;
  url?: string;
  changePercent?: number;
  relatedCount?: number;
  tags?: string[];
  impact?: 'high' | 'medium' | 'low';
}

interface FilterState {
  markets: string[];
  eventTypes: string[];
  timeRange: string;
  searchQuery: string;
  minChangePercent: number;
}

export default function EnhancedTimeline() {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterState>({
    markets: [],
    eventTypes: [],
    timeRange: '7d',
    searchQuery: '',
    minChangePercent: 0
  });
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);
  const [marketList, setMarketList] = useState<{code: string, name: string, displayName?: string}[]>([]);

  useEffect(() => {
    fetchEvents();
    fetchMarkets();
  }, [filters]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        timeRange: filters.timeRange,
        markets: filters.markets.join(','),
        eventTypes: filters.eventTypes.join(','),
        search: filters.searchQuery,
        minChange: filters.minChangePercent.toString()
      });

      const response = await fetch(`/api/web-activity/timeline?${params}`);
      const data = await response.json();
      setEvents(data.events || []);
    } catch (error) {
      console.error('Error fetching timeline:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarkets = async () => {
    try {
      const response = await fetch('/api/web-activity/markets');
      const data = await response.json();
      setMarketList(data.markets || []);
    } catch (error) {
      console.error('Error fetching markets:', error);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'created':
        return <Plus className="h-4 w-4" />;
      case 'updated':
        return <Edit className="h-4 w-4" />;
      case 'pattern':
        return <TrendingUp className="h-4 w-4" />;
      case 'alert':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'created':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'updated':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'pattern':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'alert':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getImpactBadge = (impact?: string) => {
    if (!impact) return null;
    const colors = {
      high: 'bg-red-500',
      medium: 'bg-yellow-500',
      low: 'bg-green-500'
    };
    return (
      <Badge variant="secondary" className={cn('text-xs', colors[impact as keyof typeof colors])}>
        {impact} impact
      </Badge>
    );
  };

  const formatTimeAgo = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    // For dates older than 30 days, show the actual date
    if (days > 30) {
      const months = Math.floor(days / 30);
      if (months >= 12) {
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
      }
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    
    // For dates within the last month, show relative time
    if (days > 7) {
      const weeks = Math.floor(days / 7);
      return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
    }
    
    if (days > 0) {
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
    
    if (hours > 0) {
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    }
    
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  };

  const groupEventsByTime = (events: TimelineEvent[]) => {
    const grouped: { [key: string]: TimelineEvent[] } = {};
    
    events.forEach(event => {
      const date = new Date(event.timestamp);
      const key = date.toDateString();
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(event);
    });
    
    return grouped;
  };

  const groupedEvents = groupEventsByTime(events);

  return (
    <div className="space-y-6">
      {/* Filter Bar */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Activity Filters</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setFilters({
                markets: [],
                eventTypes: [],
                timeRange: '7d',
                searchQuery: '',
                minChangePercent: 0
              })}
            >
              Clear Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Time Range */}
            <Select
              value={filters.timeRange}
              onValueChange={(value) => setFilters({ ...filters, timeRange: value })}
            >
              <SelectTrigger>
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Time Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
              </SelectContent>
            </Select>

            {/* Event Types */}
            <Select
              value={filters.eventTypes[0] || 'all'}
              onValueChange={(value) => 
                setFilters({ ...filters, eventTypes: value === 'all' ? [] : [value] })
              }
            >
              <SelectTrigger>
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Event Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                <SelectItem value="created">New Content</SelectItem>
                <SelectItem value="updated">Updates</SelectItem>
                <SelectItem value="pattern">Patterns</SelectItem>
                <SelectItem value="alert">Alerts</SelectItem>
              </SelectContent>
            </Select>

            {/* Markets */}
            <Select
              value={filters.markets[0] || 'all'}
              onValueChange={(value) => 
                setFilters({ ...filters, markets: value === 'all' ? [] : [value] })
              }
            >
              <SelectTrigger>
                <Globe className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Market" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Markets</SelectItem>
                {marketList.map(market => (
                  <SelectItem key={market.code} value={market.code}>
                    {market.displayName || market.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search events..."
                value={filters.searchQuery}
                onChange={(e) => setFilters({ ...filters, searchQuery: e.target.value })}
                className="pl-10"
              />
            </div>
          </div>

          {/* Active Filters Display */}
          {(filters.markets.length > 0 || filters.eventTypes.length > 0 || filters.searchQuery) && (
            <div className="flex flex-wrap gap-2">
              {filters.markets.map(market => (
                <Badge key={market} variant="secondary">
                  {market}
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => setFilters({
                      ...filters,
                      markets: filters.markets.filter(m => m !== market)
                    })}
                  />
                </Badge>
              ))}
              {filters.eventTypes.map(type => (
                <Badge key={type} variant="secondary">
                  {type}
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => setFilters({
                      ...filters,
                      eventTypes: filters.eventTypes.filter(t => t !== type)
                    })}
                  />
                </Badge>
              ))}
              {filters.searchQuery && (
                <Badge variant="secondary">
                  Search: {filters.searchQuery}
                  <X 
                    className="h-3 w-3 ml-1 cursor-pointer"
                    onClick={() => setFilters({ ...filters, searchQuery: '' })}
                  />
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Insights Bar */}
      {events.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <BarChart className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm font-medium">Most Active Market</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Germany with 12 updates this week
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-green-50 dark:bg-green-950 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm font-medium">Content Velocity</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    32% increase in updates vs last week
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-purple-50 dark:bg-purple-950 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Eye className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm font-medium">Pattern Detected</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Similar updates across 3 markets
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Timeline */}
      <div className="space-y-6">
        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-3"></div>
                  <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          Object.entries(groupedEvents).map(([date, dayEvents]) => (
            <div key={date}>
              <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">
                {date === new Date().toDateString() ? 'Today' : date}
              </h3>
              <div className="space-y-3">
                {dayEvents.map((event) => (
                  <Card 
                    key={event.id}
                    className={cn(
                      "transition-all cursor-pointer hover:shadow-md",
                      expandedEvent === event.id && "ring-2 ring-blue-500"
                    )}
                    onClick={() => setExpandedEvent(
                      expandedEvent === event.id ? null : event.id
                    )}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        <div className={cn(
                          "p-2 rounded-lg",
                          getEventColor(event.type)
                        )}>
                          {getEventIcon(event.type)}
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-medium text-sm mb-1">
                                {event.title}
                              </h4>
                              <p className="text-xs text-gray-600 dark:text-gray-400">
                                {event.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {getImpactBadge(event.impact)}
                              <Badge variant="outline" className="text-xs font-medium">
                                {event.marketName}
                              </Badge>
                            </div>
                          </div>

                          {/* Event Meta */}
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Published {formatTimeAgo(event.publishedAt || event.timestamp)}
                              {event.crawledAt && event.publishedAt !== event.crawledAt && (
                                <span className="text-gray-400 ml-1">
                                  • Checked {formatTimeAgo(event.crawledAt)}
                                </span>
                              )}
                            </span>
                            {event.originalLanguage && (
                              <span className="text-xs">
                                ({event.originalLanguage.toUpperCase()})
                              </span>
                            )}
                            {event.changePercent && (
                              <span className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                {event.changePercent}% change
                              </span>
                            )}
                            {event.relatedCount && (
                              <span className="flex items-center gap-1">
                                <FileText className="h-3 w-3" />
                                {event.relatedCount} related
                              </span>
                            )}
                          </div>

                          {/* Tags */}
                          {event.tags && event.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {event.tags.map(tag => (
                                <Badge key={tag} variant="secondary" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}

                          {/* Expanded Details */}
                          {expandedEvent === event.id && (
                            <div className="mt-4 pt-4 border-t space-y-3">
                              {event.url && (
                                <div>
                                  <p className="text-xs font-medium mb-1">Page URL:</p>
                                  <a 
                                    href={event.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs text-blue-600 hover:underline"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {event.url}
                                  </a>
                                </div>
                              )}
                              
                              <div className="flex gap-2">
                                <Button size="sm" variant="outline">
                                  View Details
                                  <ChevronRight className="h-3 w-3 ml-1" />
                                </Button>
                                <Button size="sm" variant="outline">
                                  Similar Events
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))
        )}

        {!loading && events.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No events found</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Try adjusting your filters or time range
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}