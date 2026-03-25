"use client";
import { useEffect } from "react";

export default function RootRedirect() {
  useEffect(() => {
    if (window.location.pathname === "/" || window.location.pathname === "") {
      window.location.replace("/cases");
    }
  }, []);
  return null;
}
