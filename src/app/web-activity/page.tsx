import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function WebActivityPage() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight">Web Activity</h1>
          <Badge variant="secondary">Coming Soon</Badge>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Track Website Visitor Behavior</CardTitle>
            <CardDescription>
              Monitor and analyze real-time web activity across your digital properties
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This page will provide comprehensive insights into user behavior patterns, 
              including page views, session duration, bounce rates, and user flow analytics. 
              You&apos;ll be able to track visitor journeys, identify high-performing content, 
              and optimize your website based on actual user interactions.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}