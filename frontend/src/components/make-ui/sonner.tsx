"use client";

import { Toaster as Sonner, ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  return <Sonner position="top-right" richColors {...props} />;
}
