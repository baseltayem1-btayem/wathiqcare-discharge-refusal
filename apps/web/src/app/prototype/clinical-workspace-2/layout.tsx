import type { Metadata } from "next";
import "./workspace.css";

export const metadata: Metadata = {
  title: "Clinical Workspace 2.0 Prototype",
  description: "Isolated prototype for the redesigned physician informed-consent workspace.",
};

export default function PrototypeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
