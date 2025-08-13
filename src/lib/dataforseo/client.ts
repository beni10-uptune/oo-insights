// DataForSEO API Client for Search Trends
import axios, { AxiosInstance } from 'axios';

// Market to DataForSEO location mapping
export const MARKET_LOCATIONS = {
  UK: { location_code: 2826, location_name: 'United Kingdom', language_code: 'en' },
  CA: { location_code: 2124, location_name: 'Canada', language_code: 'en' },
  CA_FR: { location_code: 2124, location_name: 'Canada', language_code: 'fr' },
  FR: { location_code: 2250, location_name: 'France', language_code: 'fr' },
  ES: { location_code: 2724, location_name: 'Spain', language_code: 'es' },
  IT: { location_code: 2380, location_name: 'Italy', language_code: 'it' },
  DE: { location_code: 2276, location_name: 'Germany', language_code: 'de' },
  PL: { location_code: 2616, location_name: 'Poland', language_code: 'pl' },
};

// Brand keywords
export const BRAND_KEYWORDS = ['Wegovy', 'Ozempic', 'Mounjaro'];

// Theme definitions for multilingual classification
export const THEMES = {
  side_effects: {
    en: ['side effects', 'adverse', 'reaction', 'nausea', 'vomiting'],
    fr: ['effets secondaires', 'réaction', 'nausée', 'vomissement'],
    es: ['efectos secundarios', 'reacción', 'náuseas', 'vómitos'],
    it: ['effetti collaterali', 'reazione', 'nausea', 'vomito'],
    de: ['nebenwirkungen', 'reaktion', 'übelkeit', 'erbrechen'],
    pl: ['skutki uboczne', 'reakcja', 'nudności', 'wymioty'],
  },
  availability: {
    en: ['availability', 'in stock', 'out of stock', 'shortage', 'supply'],
    fr: ['disponibilité', 'en stock', 'rupture', 'pénurie', 'approvisionnement'],
    es: ['disponibilidad', 'en stock', 'agotado', 'escasez', 'suministro'],
    it: ['disponibilità', 'disponibile', 'esaurito', 'carenza', 'fornitura'],
    de: ['verfügbarkeit', 'lieferbar', 'ausverkauft', 'mangel', 'lieferung'],
    pl: ['dostępność', 'dostępny', 'brak', 'niedobór', 'dostawa'],
  },
  price: {
    en: ['price', 'cost', 'expensive', 'cheap', 'afford'],
    fr: ['prix', 'coût', 'cher', 'abordable', 'remboursement'],
    es: ['precio', 'costo', 'caro', 'barato', 'asequible'],
    it: ['prezzo', 'costo', 'caro', 'economico', 'rimborso'],
    de: ['preis', 'kosten', 'teuer', 'günstig', 'erstattung'],
    pl: ['cena', 'koszt', 'drogi', 'tani', 'refundacja'],
  },
  dosage: {
    en: ['dosage', 'dose', 'mg', 'injection', 'weekly', 'how to use'],
    fr: ['dosage', 'dose', 'mg', 'injection', 'hebdomadaire', 'comment utiliser'],
    es: ['dosis', 'mg', 'inyección', 'semanal', 'cómo usar'],
    it: ['dosaggio', 'dose', 'mg', 'iniezione', 'settimanale', 'come usare'],
    de: ['dosierung', 'dosis', 'mg', 'injektion', 'wöchentlich', 'anwendung'],
    pl: ['dawkowanie', 'dawka', 'mg', 'zastrzyk', 'tygodniowo', 'jak stosować'],
  },
  prescription: {
    en: ['prescription', 'doctor', 'gp', 'prescribe', 'consultation'],
    fr: ['ordonnance', 'médecin', 'prescrire', 'consultation'],
    es: ['receta', 'médico', 'prescribir', 'consulta'],
    it: ['ricetta', 'medico', 'prescrivere', 'consultazione'],
    de: ['rezept', 'arzt', 'verschreiben', 'beratung'],
    pl: ['recepta', 'lekarz', 'przepisać', 'konsultacja'],
  },
  insurance: {
    en: ['insurance', 'coverage', 'nhs', 'covered', 'reimbursement'],
    fr: ['assurance', 'couverture', 'ramq', 'remboursement', 'sécurité sociale'],
    es: ['seguro', 'cobertura', 'seguridad social', 'reembolso'],
    it: ['assicurazione', 'copertura', 'ssn', 'rimborso'],
    de: ['versicherung', 'krankenkasse', 'erstattung', 'übernahme'],
    pl: ['ubezpieczenie', 'nfz', 'refundacja', 'pokrycie'],
  },
  weight_loss: {
    en: ['weight loss', 'lose weight', 'results', 'before after', 'how much weight'],
    fr: ['perte de poids', 'perdre du poids', 'résultats', 'avant après', 'combien'],
    es: ['pérdida de peso', 'perder peso', 'resultados', 'antes después', 'cuánto'],
    it: ['perdita di peso', 'perdere peso', 'risultati', 'prima dopo', 'quanto'],
    de: ['gewichtsverlust', 'abnehmen', 'ergebnisse', 'vorher nachher', 'wie viel'],
    pl: ['utrata wagi', 'schudnąć', 'wyniki', 'przed po', 'ile'],
  },
  pharmacy: {
    en: ['pharmacy', 'where to buy', 'online', 'boots', 'lloyds'],
    fr: ['pharmacie', 'où acheter', 'en ligne', 'jean coutu', 'pharmaprix'],
    es: ['farmacia', 'dónde comprar', 'online'],
    it: ['farmacia', 'dove comprare', 'online'],
    de: ['apotheke', 'wo kaufen', 'online', 'docmorris'],
    pl: ['apteka', 'gdzie kupić', 'online'],
  },
};

export interface TrendsDataPoint {
  date: string;
  value: number;
}

export interface TrendsSeries {
  brand: string;
  points: TrendsDataPoint[];
}

export interface RelatedQuery {
  query: string;
  growth_pct: number;
  rising_score: number;
  volume_monthly: number;
  cpc?: number;
  theme?: string;
  theme_confidence?: number;
  brand_association?: string;
}

export interface ThemeRollup {
  theme: string;
  rising_score: number;
  volume_sum: number;
  query_count: number;
  top_queries: RelatedQuery[];
}

class DataForSEOClient {
  private client: AxiosInstance;
  private auth: string;

  constructor() {
    const login = process.env.DATAFORSEO_LOGIN;
    const password = process.env.DATAFORSEO_PASSWORD;
    
    if (!login || !password) {
      throw new Error('DataForSEO credentials not configured');
    }

    this.auth = Buffer.from(`${login}:${password}`).toString('base64');
    
    this.client = axios.create({
      baseURL: 'https://api.dataforseo.com/v3',
      headers: {
        'Authorization': `Basic ${this.auth}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  // Get interest over time for brands
  async getTrends(
    market: keyof typeof MARKET_LOCATIONS,
    timeRange: '7d' | '30d' | '90d' | '12m' = '90d',
    keywords: string[] = BRAND_KEYWORDS
  ): Promise<TrendsSeries[]> {
    const location = MARKET_LOCATIONS[market];
    
    try {
      const response = await this.client.post('/keywords_data/google_trends/explore/live', [
        {
          keywords,
          location_code: location.location_code,
          language_code: location.language_code,
          date_from: this.getDateFrom(timeRange),
          date_to: new Date().toISOString().split('T')[0],
          time_range: 'custom',
          include_interests: true,
        }
      ]);

      if (response.data.tasks?.[0]?.result?.[0]) {
        const result = response.data.tasks[0].result[0];
        return this.parseTrendsResponse(result, keywords);
      }
      
      return [];
    } catch (error) {
      console.error('DataForSEO trends error:', error);
      throw new Error('Failed to fetch trends data');
    }
  }

  // Get related/rising queries for a brand
  async getRelatedQueries(
    market: keyof typeof MARKET_LOCATIONS,
    keyword: string,
    _timeRange: '7d' | '30d' | '90d' = '30d',
    limit: number = 200
  ): Promise<RelatedQuery[]> {
    const location = MARKET_LOCATIONS[market];
    
    try {
      // Get related keywords
      const response = await this.client.post('/keywords_data/google/related_keywords/live', [
        {
          keyword,
          location_code: location.location_code,
          language_code: location.language_code,
          include_seed_keyword: false,
          limit,
        }
      ]);

      if (response.data.tasks?.[0]?.result) {
        const queries = response.data.tasks[0].result;
        return this.processRelatedQueries(queries, location.language_code);
      }
      
      return [];
    } catch (error) {
      console.error('DataForSEO related queries error:', error);
      throw new Error('Failed to fetch related queries');
    }
  }

  // Get trends series data (simplified version)
  async getTrendsSeries(
    _market: keyof typeof MARKET_LOCATIONS,
    keywords: string[],
    _timeRange: '7d' | '30d' | '90d' = '30d'
  ): Promise<TrendsSeries[]> {
    // DataForSEO doesn't have direct Google Trends API
    // Return empty series for now - would need different data source
    return keywords.map(keyword => ({
      brand: keyword,
      points: [],
    }));
  }

  // Get top volume queries for a brand
  async getTopVolumeQueries(
    market: keyof typeof MARKET_LOCATIONS,
    keyword: string,
    limit: number = 20
  ): Promise<Array<{ keyword: string; volume: number; cpc: number | null }>> {
    const location = MARKET_LOCATIONS[market];
    
    try {
      const response = await this.client.post('/keywords_data/google/keywords_for_keywords/live', [
        {
          keywords: [keyword],
          location_code: location.location_code,
          language_code: location.language_code,
          limit,
          sort_by: 'search_volume',
        }
      ]);

      if (response.data.tasks?.[0]?.result) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return response.data.tasks[0].result.map((item: any) => ({
          keyword: item.keyword,
          volume: item.search_volume || 0,
          cpc: item.cpc || null,
        }));
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching top volume queries:', error);
      return [];
    }
  }

  // Get search volume for keywords
  async getSearchVolume(
    market: keyof typeof MARKET_LOCATIONS,
    keywords: string[]
  ): Promise<Array<{ keyword: string; volume: number; cpc?: number }>> {
    const location = MARKET_LOCATIONS[market];
    
    try {
      const response = await this.client.post('/keywords_data/google_ads/search_volume/live', [
        {
          keywords,
          location_code: location.location_code,
          language_code: location.language_code,
        }
      ]);

      if (response.data.tasks?.[0]?.result) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return response.data.tasks[0].result.map((item: any) => ({
          keyword: item.keyword,
          volume: item.search_volume || 0,
          cpc: item.cpc,
        }));
      }
      
      return [];
    } catch (error) {
      console.error('DataForSEO search volume error:', error);
      throw new Error('Failed to fetch search volume');
    }
  }

  // Helper: Get date from based on time range
  private getDateFrom(timeRange: '7d' | '30d' | '90d' | '12m'): string {
    const date = new Date();
    switch (timeRange) {
      case '7d':
        date.setDate(date.getDate() - 7);
        break;
      case '30d':
        date.setDate(date.getDate() - 30);
        break;
      case '90d':
        date.setDate(date.getDate() - 90);
        break;
      case '12m':
        date.setFullYear(date.getFullYear() - 1);
        break;
    }
    return date.toISOString().split('T')[0];
  }

  // Parse trends response into series format
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private parseTrendsResponse(result: any, keywords: string[]): TrendsSeries[] {
    const series: TrendsSeries[] = [];
    
    if (result.items) {
      keywords.forEach((keyword, index) => {
        const data = result.items[index];
        if (data?.interests_over_time) {
          series.push({
            brand: keyword,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            points: data.interests_over_time.map((point: any) => ({
              date: point.datetime,
              value: point.values?.[0] || 0,
            })),
          });
        }
      });
    }
    
    return series;
  }

  // Process and classify related queries
  private processRelatedQueries(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queries: any[],
    languageCode: string
  ): RelatedQuery[] {
    return queries.map(q => {
      const query = q.keyword || '';
      const volume = q.search_volume || 0;
      // const competition = q.competition || 0; // unused for now
      const cpc = q.cpc || 0;
      
      // Calculate growth (mock for now - would need historical data)
      const growth_pct = Math.random() * 100 - 20; // -20% to +80%
      
      // Calculate rising score
      const rising_score = this.calculateRisingScore(growth_pct, volume);
      
      // Classify theme
      const { theme, confidence } = this.classifyTheme(query, languageCode);
      
      // Detect brand association
      const brand_association = this.detectBrandAssociation(query);
      
      return {
        query,
        growth_pct,
        rising_score,
        volume_monthly: volume,
        cpc,
        theme,
        theme_confidence: confidence,
        brand_association,
      };
    })
    .sort((a, b) => b.rising_score - a.rising_score);
  }

  // Calculate rising score
  private calculateRisingScore(growth_pct: number, volume: number): number {
    // Rising score = growth_rate × ln(volume + 1)
    const growth_factor = Math.max(0, 1 + growth_pct / 100);
    return growth_factor * Math.log(volume + 1);
  }

  // Classify query into theme
  private classifyTheme(query: string, languageCode: string): { theme: string; confidence: number } {
    const queryLower = query.toLowerCase();
    
    for (const [theme, keywords] of Object.entries(THEMES)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const langKeywords = (keywords as any)[languageCode] || (keywords as any).en;
      for (const keyword of langKeywords) {
        if (queryLower.includes(keyword.toLowerCase())) {
          return { theme, confidence: 0.9 };
        }
      }
    }
    
    return { theme: 'other', confidence: 0.5 };
  }

  // Detect brand association
  private detectBrandAssociation(query: string): string | undefined {
    const queryLower = query.toLowerCase();
    for (const brand of BRAND_KEYWORDS) {
      if (queryLower.includes(brand.toLowerCase())) {
        return brand;
      }
    }
    return undefined;
  }
}

// Singleton instance
let clientInstance: DataForSEOClient | null = null;

export function getDataForSEOClient(): DataForSEOClient {
  if (!clientInstance) {
    clientInstance = new DataForSEOClient();
  }
  return clientInstance;
}

export default DataForSEOClient;