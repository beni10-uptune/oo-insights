import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function OrganicImpactPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Organic Impact</h1>
          <Badge variant="secondary">Coming Soon</Badge>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>SEO Performance & Organic Reach</CardTitle>
            <CardDescription>
              Measure and optimize your organic search visibility and impact
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This page will showcase your organic search performance including keyword rankings, 
              organic traffic trends, click-through rates, and SERP feature visibility. 
              Analyze content performance, backlink profiles, and technical SEO health 
              to maximize your organic reach and drive sustainable growth without paid advertising.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}