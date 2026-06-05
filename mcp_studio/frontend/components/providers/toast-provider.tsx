"use client";
import * as React from "react";
import { Toaster } from "sonner";

export function ToastProvider() {
  return <Toaster richColors position="bottom-right" closeButton />;
}
