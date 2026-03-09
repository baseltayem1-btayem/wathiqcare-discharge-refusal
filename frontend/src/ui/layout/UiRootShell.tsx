"use client";

import type { ReactNode } from "react";
import AppShell from "@/ui/layout/AppShell";

type UiRootShellProps = {
  children: ReactNode;
};

export default function UiRootShell({ children }: UiRootShellProps) {
  return <AppShell>{children}</AppShell>;
}
