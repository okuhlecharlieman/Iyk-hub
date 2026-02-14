"use client";
import { ThemeProvider } from "next-themes";
import { ToastProvider } from '../components/ui/ToastProvider';

export function Providers({ children }) {
  return (
    <ThemeProvider attribute="class">
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}