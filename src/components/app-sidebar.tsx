"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Globe,
  Activity,
  BookOpen,
  Eye,
  Target,
  TrendingUp,
  Search,
  PieChart,
  Megaphone,
  Sparkles,
} from "lucide-react";

const menuItems = [
  {
    title: "Web Activity",
    href: "/web-activity",
    icon: Activity,
    description: "Track website changes and updates",
  },
  {
    title: "Industry Insights",
    href: "/industry-insights",
    icon: BookOpen,
    description: "RSS feeds and news analysis",
  },
  {
    title: "Competitor Watch",
    href: "/competitor-watch",
    icon: Eye,
    description: "Monitor competitor advertising",
  },
  {
    title: "Organic Impact",
    href: "/organic-impact",
    icon: Target,
    description: "Google Search Console metrics",
  },
  {
    title: "Search Trends",
    href: "/search-trends",
    icon: TrendingUp,
    description: "DataForSEO trend analysis",
  },
  {
    title: "Search Ads Builder",
    href: "/search-ads-builder",
    icon: Search,
    description: "Generate Google Ads campaigns",
  },
  {
    title: "Campaign Analyzer",
    href: "/campaign-analyzer",
    icon: PieChart,
    description: "Analyze campaign performance",
  },
  {
    title: "Meta Ads Builder",
    href: "/meta-ads-builder",
    icon: Megaphone,
    description: "Create Meta advertising campaigns",
  },
  {
    title: "AI Test",
    href: "/ai-test",
    icon: Sparkles,
    description: "Test Vertex AI integration",
  },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <div className="flex items-center gap-2">
          <Globe className="h-6 w-6 text-primary" />
          <div>
            <h2 className="font-semibold">OO Insights</h2>
            <p className="text-xs text-muted-foreground">EUCAN Marketing</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Tools & Analytics</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.description}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t px-6 py-4">
        <div className="text-xs text-muted-foreground">
          <p>© 2025 truthaboutweight.global</p>
          <p>Internal use only</p>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}