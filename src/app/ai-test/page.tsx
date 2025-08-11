"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2 } from "lucide-react";

const SAMPLE_CONTENT = `Novo Nordisk announced today that Wegovy® (semaglutide 2.4 mg) demonstrated a 20% reduction in major adverse cardiovascular events in adults with overweight or obesity and established cardiovascular disease in the SELECT trial. The trial included 17,604 patients across 41 countries. Results show significant benefits beyond weight loss, with implications for healthcare coverage and patient access.`;

export default function AITestPage() {
  const [content, setContent] = useState(SAMPLE_CONTENT);
  const [market, setMarket] = useState("Global");
  const [summary, setSummary] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTest, setActiveTest] = useState<"summarize" | "classify" | null>(null);

  const handleSummarize = async () => {
    setLoading(true);
    setActiveTest("summarize");
    setSummary("");
    
    try {
      const response = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          market,
          maxLength: 150,
        }),
      });

      const data = await response.json();
      if (data.summary) {
        setSummary(data.summary);
      } else {
        setSummary("Error: " + (data.error || "Failed to generate summary"));
      }
    } catch {
      setSummary("Error: Failed to connect to AI service");
    } finally {
      setLoading(false);
    }
  };

  const handleClassify = async () => {
    setLoading(true);
    setActiveTest("classify");
    setTopics([]);
    
    try {
      const response = await fetch("/api/ai/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const data = await response.json();
      if (data.topics) {
        setTopics(data.topics);
      } else {
        setTopics(["Error: " + (data.error || "Failed to classify")]);
      }
    } catch {
      setTopics(["Error: Failed to connect to AI service"]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Vertex AI Integration Test</h1>
        <p className="text-muted-foreground mt-2">
          Test Gemini 2.5 capabilities for content analysis and generation
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Content Input</CardTitle>
          <CardDescription>
            Enter or modify the content to analyze
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Enter content to analyze..."
            className="min-h-[150px] font-mono text-sm"
          />
          
          <div className="flex gap-4">
            <Select value={market} onValueChange={setMarket}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select market" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Global">Global</SelectItem>
                <SelectItem value="UK">UK</SelectItem>
                <SelectItem value="CA">Canada</SelectItem>
                <SelectItem value="BE-NL">Belgium (NL)</SelectItem>
                <SelectItem value="BE-FR">Belgium (FR)</SelectItem>
                <SelectItem value="CH-DE">Switzerland (DE)</SelectItem>
                <SelectItem value="CH-FR">Switzerland (FR)</SelectItem>
                <SelectItem value="CH-IT">Switzerland (IT)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              AI Summary
            </CardTitle>
            <CardDescription>
              Generate compliant medical content summary
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleSummarize}
              disabled={loading || !content}
              className="w-full"
            >
              {loading && activeTest === "summarize" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Summary"
              )}
            </Button>
            
            {summary && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{summary}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Topic Classification
            </CardTitle>
            <CardDescription>
              Automatically classify content topics
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleClassify}
              disabled={loading || !content}
              className="w-full"
            >
              {loading && activeTest === "classify" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Classifying...
                </>
              ) : (
                "Classify Topics"
              )}
            </Button>
            
            {topics.length > 0 && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex flex-wrap gap-2">
                  {topics.map((topic, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm"
                    >
                      {topic}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-blue-900">Vertex AI Configuration</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 space-y-2">
          <p>✅ Project: oo-insights-468716</p>
          <p>✅ Location: europe-west1</p>
          <p>✅ Models:</p>
          <ul className="ml-6 space-y-1">
            <li>• Gemini 1.5 Pro 002 (Latest stable - High quality)</li>
            <li>• Gemini 1.5 Flash 002 (Latest stable - Fast response)</li>
            <li>• Text Embedding 004 (Vector embeddings)</li>
          </ul>
          <p className="text-xs italic">Note: Gemini 2.5 will be used when available in europe-west1</p>
          <p>✅ Safety: Medical compliance filters enabled</p>
          <p>✅ Authentication: Using Application Default Credentials</p>
        </CardContent>
      </Card>
    </div>
  );
}