import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function SearchAdsBuilderPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Search Ads Builder</h1>
          <Badge variant="secondary">Coming Soon</Badge>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>AI-Powered Search Ad Creation</CardTitle>
            <CardDescription>
              Build high-converting search ads with intelligent optimization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This page will feature an intelligent search ad builder that helps you create 
              compelling Google Ads and Bing Ads campaigns. Generate ad copy variations, 
              organize ad groups, select optimal keywords, and set smart bidding strategies. 
              Leverage AI to write headlines, descriptions, and extensions that maximize 
              click-through rates and conversions.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}