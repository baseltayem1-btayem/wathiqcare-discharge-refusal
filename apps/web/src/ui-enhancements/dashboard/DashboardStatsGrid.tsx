"use client";

import { Activity, FileText, TrendingUp, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/design-system/card";
import { Badge } from "@/components/design-system/badge";

type DashboardStats = {
  totalCases: number;
  activeCases: number;
  escalatedCases: number;
  closedCases: number;
  totalTrend?: string;
  activeTrend?: string;
};

type DashboardStatsGridProps = {
  stats: DashboardStats;
  loading?: boolean;
};

/**
 * Enhanced KPI grid for the dashboard using the design system.
 * Displays statistics without modifying backend data sources.
 */
export default function DashboardStatsGrid({ 
  stats, 
  loading = false 
}: DashboardStatsGridProps) {
  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-slate-200 rounded" />
              <div className="h-4 w-4 bg-slate-200 rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-slate-200 rounded" />
              <div className="h-3 w-32 bg-slate-200 rounded mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: "Total Cases",
      icon: FileText,
      value: stats.totalCases,
      description: "All discharge refusal cases",
      trend: stats.totalTrend,
      iconColor: "text-slate-600",
      bgColor: "bg-slate-50",
    },
    {
      title: "Active Cases",
      icon: Activity,
      value: stats.activeCases,
      description: "Currently in progress",
      trend: stats.activeTrend,
      iconColor: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Escalated Cases",
      icon: TrendingUp,
      value: stats.escalatedCases,
      description: "Requiring legal review",
      iconColor: "text-rose-600",
      bgColor: "bg-rose-50",
    },
    {
      title: "Closed Cases",
      icon: Users,
      value: stats.closedCases,
      description: "Successfully resolved",
      iconColor: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {card.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${card.bgColor}`}>
                <Icon className={`h-4 w-4 ${card.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <CardDescription className="mt-1">
                {card.description}
              </CardDescription>
              {card.trend && (
                <Badge variant="secondary" className="mt-2">
                  {card.trend}
                </Badge>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
