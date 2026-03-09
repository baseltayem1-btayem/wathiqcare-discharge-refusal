export const uiTokens = {
  radius: {
    sm: "10px",
    md: "14px",
    lg: "18px",
    xl: "24px",
  },
  shadow: {
    sm: "0 1px 2px rgba(15, 23, 42, 0.08)",
    md: "0 8px 24px rgba(15, 23, 42, 0.08)",
    lg: "0 18px 40px rgba(15, 23, 42, 0.12)",
  },
  spacing: {
    xs: "6px",
    sm: "10px",
    md: "14px",
    lg: "20px",
    xl: "28px",
  },
};

export const statusColorMap: Record<string, string> = {
  pending: "var(--ui-warning)",
  indexed: "var(--ui-info)",
  archived: "var(--ui-success)",
  verified: "var(--ui-success)",
  failed: "var(--ui-danger)",
  high: "var(--ui-danger)",
  medium: "var(--ui-warning)",
  low: "var(--ui-success)",
};
