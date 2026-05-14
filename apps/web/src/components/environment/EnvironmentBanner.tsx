"use client";

/**
 * Environment Banner Component
 *
 * Prominently displays environment status at top of page.
 * Critical for preventing confusion between Production/Pilot/Dev/Demo.
 */

import React from "react";
import { useEnvironmentConfig } from "@/lib/environment/environment";

interface EnvironmentBannerProps {
  /** Hide banner if displaying in production */
  hideInProduction?: boolean;
  /** Custom className for styling */
  className?: string;
}

export function EnvironmentBanner({
  hideInProduction = false,
  className = "",
}: EnvironmentBannerProps) {
  const config = useEnvironmentConfig();

  // Hide in production if requested
  if (hideInProduction && config.isProduction) {
    return null;
  }

  // Don't display if display mode is "none"
  if (config.bannerDisplay === "none") {
    return null;
  }

  // Styling based on display mode
  const getStyles = () => {
    switch (config.bannerDisplay) {
      case "subtle":
        return {
          container: "bg-gray-800 text-gray-100 border-b border-gray-700",
          icon: "🏢",
          padding: "px-4 py-2",
          textSize: "text-sm",
        };
      case "warning":
        return {
          container: "bg-blue-500 text-white border-b-4 border-blue-700",
          icon: "⚠️",
          padding: "px-4 py-3",
          textSize: "text-base",
        };
      case "danger":
        return {
          container: "bg-red-600 text-white border-b-4 border-red-800",
          icon: "🚫",
          padding: "px-4 py-4",
          textSize: "text-lg font-bold",
        };
      default:
        return {
          container: "bg-gray-500 text-white border-b border-gray-600",
          icon: "?",
          padding: "px-4 py-2",
          textSize: "text-sm",
        };
    }
  };

  const styles = getStyles();

  // Content based on display mode
  const getContent = () => {
    if (config.bannerDisplay === "subtle") {
      return (
        <div className="flex items-center gap-2 text-center justify-center">
          <span className="text-lg">{styles.icon}</span>
          <span className="font-semibold">{config.bannerText}</span>
        </div>
      );
    }

    if (config.bannerDisplay === "danger") {
      return (
        <div className="flex items-center gap-3">
          <span className="text-3xl">{styles.icon}</span>
          <div className="flex-1">
            <div className="font-bold text-lg">{config.bannerText}</div>
            <div className="text-sm opacity-90 mt-1">
              This environment contains test/demo data only. Do not use for real patient care or decisions.
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3">
        <span className="text-2xl">{styles.icon}</span>
        <div className="flex-1">
          <div className="font-bold">{config.bannerText}</div>
          <div className="text-sm opacity-90">
            Environment: <span className="font-mono font-bold">{config.env}</span>
            {" | "}
            SMS: <span className="font-mono font-bold">{config.smsMode}</span>
            {" | "}
            Data: <span className="font-mono font-bold">{config.dataMode}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`w-full ${styles.container} ${styles.padding} ${styles.textSize} ${className}`}
      role="alert"
      aria-live="polite"
      aria-label={`Environment: ${config.env}`}
    >
      {getContent()}
    </div>
  );
}

export default EnvironmentBanner;
