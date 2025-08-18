'use client';

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

// Google Trends widget types
declare global {
  interface Window {
    trends?: {
      embed: {
        renderExploreWidget: (
          type: string,
          config: any,
          options: any
        ) => void;
      };
    };
  }
}

interface GoogleTrendsEmbedProps {
  market: string;
  keywords?: string[];
  timeRange?: string;
  widgetType?: 'TIMESERIES' | 'GEO_MAP' | 'RELATED_QUERIES' | 'RELATED_TOPICS';
}

// Market to Google Trends geo code mapping
const MARKET_TO_GEO: Record<string, string> = {
  'UK': 'GB',
  'CA': 'CA',
  'CA_FR': 'CA',
  'FR': 'FR',
  'ES': 'ES',
  'IT': 'IT',
  'DE': 'DE',
  'PL': 'PL',
  'BE': 'BE',
  'NL': 'NL',
  'CH': 'CH',
  'AT': 'AT',
  'PT': 'PT',
  'SE': 'SE',
  'DK': 'DK',
  'NO': 'NO',
  'FI': 'FI',
  'GR': 'GR',
  'CZ': 'CZ',
  'HU': 'HU',
  'RO': 'RO',
  'SK': 'SK',
  'IE': 'IE',
};

// Time range mappings
const TIME_RANGE_MAP: Record<string, string> = {
  '7d': 'now 7-d',
  '30d': 'today 1-m',
  '90d': 'today 3-m',
  '12m': 'today 12-m',
};

export default function GoogleTrendsEmbed({
  market = 'UK',
  keywords = ['wegovy', 'ozempic', 'mounjaro'],
  timeRange = '30d',
  widgetType = 'TIMESERIES',
}: GoogleTrendsEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    // Load Google Trends script if not already loaded
    if (!scriptLoadedRef.current && typeof window !== 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://ssl.gstatic.com/trends_nrtr/4116_RC01/embed_loader.js';
      script.async = true;
      script.onload = () => {
        scriptLoadedRef.current = true;
        renderWidget();
      };
      document.head.appendChild(script);
    } else if (scriptLoadedRef.current) {
      renderWidget();
    }

    function renderWidget() {
      if (!containerRef.current || !window.trends?.embed) return;

      // Clear existing content
      containerRef.current.innerHTML = '';

      const geo = MARKET_TO_GEO[market] || 'GB';
      const time = TIME_RANGE_MAP[timeRange] || 'today 1-m';

      // Build comparison items for each keyword
      const comparisonItem = keywords.map(keyword => ({
        keyword: keyword.toLowerCase(),
        geo: geo,
        time: time,
      }));

      // Widget configuration
      const widgetConfig = {
        comparisonItem,
        category: 0, // All categories
        property: '', // Web search
      };

      // Widget options
      const widgetOptions = {
        exploreQuery: `geo=${geo}&q=${keywords.join(',')}&hl=en&date=${time}`,
        guestPath: 'https://trends.google.com:443/trends/embed/',
      };

      try {
        // Create a div for the widget
        const widgetDiv = document.createElement('div');
        containerRef.current.appendChild(widgetDiv);

        // Render the widget
        window.trends.embed.renderExploreWidget(
          widgetType,
          widgetConfig,
          widgetOptions
        );
      } catch (error) {
        console.error('Error rendering Google Trends widget:', error);
      }
    }
  }, [market, keywords, timeRange, widgetType]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Google Trends - Live Data
        </CardTitle>
        <CardDescription>
          Real-time search interest from Google Trends
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div 
          ref={containerRef}
          className="min-h-[400px] w-full"
          style={{ position: 'relative' }}
        />
      </CardContent>
    </Card>
  );
}