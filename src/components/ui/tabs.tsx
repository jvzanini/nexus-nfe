"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

interface TabsContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

function useTabsContext() {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("Tabs compound components must be used inside <Tabs>");
  return ctx;
}

interface TabsProps {
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: ReactNode;
}

export function Tabs({ defaultValue, value: controlledValue, onValueChange, className, children }: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? "");
  const value = controlledValue ?? internalValue;

  const handleChange = useCallback(
    (v: string) => {
      if (controlledValue === undefined) {
        setInternalValue(v);
      }
      onValueChange?.(v);
    },
    [onValueChange, controlledValue]
  );

  return (
    <TabsContext.Provider value={{ value, onValueChange: handleChange }}>
      <div className={cn("space-y-6", className)}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  className?: string;
  children: ReactNode;
}

export function TabsList({ className, children }: TabsListProps) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-lg bg-muted/50 border border-border p-1 overflow-x-auto",
        className
      )}
    >
      {children}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  className?: string;
  children: ReactNode;
}

export function TabsTrigger({ value, className, children }: TabsTriggerProps) {
  const ctx = useTabsContext();
  const isActive = ctx.value === value;

  return (
    <button
      type="button"
      onClick={() => ctx.onValueChange(value)}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all cursor-pointer",
        isActive
          ? "bg-violet-500/5 text-violet-300 shadow-sm border border-violet-500/20"
          : "text-muted-foreground hover:text-foreground border border-transparent",
        className
      )}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  className?: string;
  children: ReactNode;
}

export function TabsContent({ value, className, children }: TabsContentProps) {
  const ctx = useTabsContext();
  if (ctx.value !== value) return null;

  return <div className={className}>{children}</div>;
}
