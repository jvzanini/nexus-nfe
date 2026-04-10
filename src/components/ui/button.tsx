"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant =
  | "default"
  | "ghost"
  | "outline"
  | "destructive"
  | "secondary"
  | "link";

type ButtonSize = "sm" | "default" | "lg" | "icon";

const baseClass =
  "inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0";

const variantClasses: Record<ButtonVariant, string> = {
  default:
    "bg-primary text-primary-foreground hover:bg-primary/90",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  outline:
    "border border-border bg-background hover:bg-muted hover:text-foreground",
  ghost:
    "hover:bg-muted hover:text-foreground",
  destructive:
    "bg-destructive/10 text-destructive hover:bg-destructive/20",
  link: "text-primary underline-offset-4 hover:underline",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5 [&_svg]:size-3.5",
  default: "h-9 px-4 gap-2 [&_svg]:size-4",
  lg: "h-11 px-6 text-base gap-2 [&_svg]:size-4",
  icon: "h-9 w-9 [&_svg]:size-4",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(baseClass, variantClasses[variant], sizeClasses[size], className)}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
