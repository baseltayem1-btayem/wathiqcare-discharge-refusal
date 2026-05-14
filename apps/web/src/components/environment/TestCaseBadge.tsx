"use client";

/**
 * Test Case Badge Component
 *
 * Displays clear visual indication when a case is a test/demo case
 */

import React from "react";
import { useEnvironment } from "@/hooks/useEnvironment";

interface TestCaseBadgeProps {
  caseId: string;
  isTestCase: boolean;
  isDemo?: boolean;
  children?: React.ReactNode;
  showWarningText?: boolean;
  className?: string;
}

export function TestCaseBadge({
  caseId,
  isTestCase,
  isDemo = false,
  children,
  showWarningText = true,
  className = "",
}: TestCaseBadgeProps) {
  const { config, enableTestAccounts } = useEnvironment();

  // Don't show badge for real cases
  if (!isTestCase && !isDemo) {
    return children || null;
  }

  // Styling based on case type
  const getBadgeStyle = () => {
    if (isDemo) {
      return {
        bg: "bg-red-100",
        border: "border-2 border-red-400",
        text: "text-red-700",
        icon: "🚫",
        label: "DEMO ONLY",
      };
    }
    return {
      bg: "bg-red-100",
      border: "border-2 border-red-400",
      text: "text-red-700",
      icon: "🚫",
      label: "TEST CASE",
    };
  };

  const style = getBadgeStyle();

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Main badge */}
      <div
        className={`inline-flex items-center gap-2 px-3 py-2 rounded font-semibold text-sm ${style.bg} ${style.border} ${style.text}`}
      >
        <span className="text-lg">{style.icon}</span>
        <span>{style.label}</span>
        {isTestCase && config.isTestEnvironment && (
          <span className="text-xs ml-1 opacity-75">#{caseId}</span>
        )}
      </div>

      {/* Warning text */}
      {showWarningText && (
        <div className={`text-xs ${style.text} opacity-75`}>
          <div className="font-semibold">
            {isDemo
              ? "This is demonstration data only"
              : "This is a test case"}
          </div>
          <div className="mt-1">
            {isDemo
              ? "Do not use for real patient care or clinical decisions."
              : "Created for testing and development purposes."}
          </div>
          {config.isDevelopment && (
            <div className="mt-1 italic">
              Environment: <span className="font-mono">{config.env}</span>
            </div>
          )}
        </div>
      )}

      {/* Children content */}
      {children && <div className="mt-2">{children}</div>}
    </div>
  );
}

export default TestCaseBadge;
