"use client";

import { Toaster } from "sonner";

export function ToasterProvider() {
  return (
    <Toaster
      theme="dark"
      position="top-right"
      richColors
      closeButton
      duration={4000}
    />
  );
}
