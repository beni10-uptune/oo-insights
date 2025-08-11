import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, BookOpen, Eye, Target, TrendingUp, Search, PieChart, Megaphone } from "lucide-react";
import Link from "next/link";

const tools = [
  {
    title: "Web Activity",
    description: "Track website changes and updates in real-time",
    href: "/web-activity",
    icon: Activity,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
  },
  {
    title: "Industry Insights",
    description: "RSS feeds and news analysis with AI summaries",
    href: "/industry-insights",
    icon: BookOpen,
    color: "text-green-600",
    bgColor: "bg-green-50",
  },
  {
    title: "Competitor Watch",
    description: "Monitor competitor advertising and strategies",
    href: "/competitor-watch",
    icon: Eye,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
  },
  {
    title: "Organic Impact",
    description: "Google Search Console metrics and SEO performance",
    href: "/organic-impact",
    icon: Target,
    color: "text-orange-600",
    bgColor: "bg-orange-50",
  },
  {
    title: "Search Trends",
    description: "DataForSEO trend analysis and keyword insights",
    href: "/search-trends",
    icon: TrendingUp,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50",
  },
  {
    title: "Search Ads Builder",
    description: "AI-powered Google Ads campaign generation",
    href: "/search-ads-builder",
    icon: Search,
    color: "text-red-600",
    bgColor: "bg-red-50",
  },
  {
    title: "Campaign Analyzer",
    description: "Analyze campaign performance and generate reports",
    href: "/campaign-analyzer",
    icon: PieChart,
    color: "text-teal-600",
    bgColor: "bg-teal-50",
  },
  {
    title: "Meta Ads Builder",
    description: "Create localized Meta advertising campaigns",
    href: "/meta-ads-builder",
    icon: Megaphone,
    color: "text-pink-600",
    bgColor: "bg-pink-50",
  },
];

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">OO Insights Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Marketing intelligence platform for truthaboutweight.global EUCAN markets
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tools.map((tool) => (
          <Link key={tool.href} href={tool.href}>
            <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
              <CardHeader>
                <div className={`w-12 h-12 rounded-lg ${tool.bgColor} flex items-center justify-center mb-3`}>
                  <tool.icon className={`h-6 w-6 ${tool.color}`} />
                </div>
                <CardTitle className="text-lg">{tool.title}</CardTitle>
                <CardDescription className="text-sm">{tool.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
          <CardDescription>Get started with OO Insights</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Configure Environment</h3>
              <p className="text-sm text-muted-foreground">
                Update your <code className="bg-muted px-1 py-0.5 rounded">.env.local</code> file with your Google Cloud credentials, API keys, and other configuration settings.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Setup Database</h3>
              <p className="text-sm text-muted-foreground">
                Run <code className="bg-muted px-1 py-0.5 rounded">npx prisma migrate dev</code> to initialize your PostgreSQL database with pgvector support.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Configure Markets</h3>
              <p className="text-sm text-muted-foreground">
                Markets configured: Global, UK, CA, BE-NL, BE-FR, CH-DE, CH-FR, CH-IT
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}