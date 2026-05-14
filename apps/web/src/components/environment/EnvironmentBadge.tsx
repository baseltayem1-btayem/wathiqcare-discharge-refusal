"use client";

/**
 * Environment Badge Component
 *
 * Small, subtle badge showing current environment status.
 * Placed in top-right corner or settings panel.
 */

import React from "react";
import { useEnvironmentConfig } from "@/lib/environment/environment";

interface EnvironmentBadgeProps {
  /** Display in compact form (icon only) or expanded form (icon + text) */
  compact?: boolean;
  /** Custom className for styling */
  className?: string;
  /** Show SMS mode indicator */
  showSmsMode?: boolean;
  /** Show TrakCare mode indicator */
  showTrakCareMode?: boolean;
  /** Show data mode indicator */
  showDataMode?: boolean;
}

export function EnvironmentBadge({
  compact = false,
  className = "",
  showSmsMode = true,
  showTrakCareMode = true,
  showDataMode = true,
}: EnvironmentBadgeProps) {
  const config = useEnvironmentConfig();

  // Badge styling based on environment
  const getBadgeStyle = () => {
    if (config.isProduction) {
      return {
        bg: "bg-gray-800",
        text: "text-gray-100",
        icon: "🏢",
      };
    }
    if (config.isPilot) {
      return {
        bg: "bg-blue-500",
        text: "text-white",
        icon: "🔵",
      };
    }
    if (config.isUAT) {
      return {
        bg: "bg-blue-600",
        text: "text-white",
        icon: "🔷",
      };
    }
    if (config.isDevelopment) {
      return {
        bg: "bg-yellow-500",
        text: "text-gray-900",
        icon: "⚠️",
      };
    }
    if (config.isDemo) {
      return {
        bg: "bg-red-600",
        text: "text-white",
        icon: "🚫",
      };
    }
    return {
      bg: "bg-gray-500",
      text: "text-white",
      icon: "?",
    };
  };

  const style = getBadgeStyle();
  const label = config.env.toUpperCase();

  if (compact) {
    return (
      <div
        className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold ${style.bg} ${style.text} ${className}`}
        title={`Environment: ${label}`}
      >
        <span>{style.icon}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col gap-2 p-3 rounded-lg border ${style.bg} ${style.text} ${className}`}
    >
      {/* Main badge */}
      <div className="flex items-center gap-2">
        <span className="text-lg">{style.icon}</span>
        <div>
          <div className="font-bold text-sm">{label}</div>
          <div className="text-xs opacity-75">{config.env}</div>
        </div>
      </div>

      {/* Mode indicators */}
      <div className="space-y-1 text-xs border-t border-current pt-2 opacity-75">
        {showSmsMode && (
          <div>
            SMS: <span className="font-mono font-bold">{config.smsMode.toUpperCase()}</span>
          </div>
        )}
        {showTrakCareMode && (
          <div>
            TrakCare: <span className="font-mono font-bold">{config.trakCareMode.toUpperCase()}</span>
          </div>
        )}
        {showDataMode && (
          <div>
            Data: <span className="font-mono font-bold">{config.dataMode.toUpperCase()}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default EnvironmentBadge;
