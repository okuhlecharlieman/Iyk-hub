"use client";
/**
 * Module: providers.js.
 */
import { ThemeProvider } from "next-themes";
import { ToastProvider } from '../components/ui/ToastProvider';

/** Providers — context provider component. */
export function Providers({ children }) {
  return (
    <ThemeProvider attribute="class">
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}