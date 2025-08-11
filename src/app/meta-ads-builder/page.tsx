import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function MetaAdsBuilderPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Meta Ads Builder</h1>
          <Badge variant="secondary">Coming Soon</Badge>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Facebook & Instagram Ad Creator</CardTitle>
            <CardDescription>
              Design and launch effective social media advertising campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This page will enable you to create powerful Facebook and Instagram ad campaigns 
              with ease. Build engaging ad creatives, write compelling copy, define precise 
              audience targeting, and set optimal budgets. Access templates, A/B testing tools, 
              and performance predictions to ensure your Meta ads drive engagement, 
              conversions, and measurable business results.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}