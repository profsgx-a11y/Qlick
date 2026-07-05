import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";

interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  htmlFor?: string;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  className,
  children,
  ...props
}: FieldProps) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)} {...props}>
      {label && (
        <Label htmlFor={htmlFor}>
          {label}
          {required && <span className="ml-0.5 text-gold">*</span>}
        </Label>
      )}
      {children}
      {hint && !error && (
        <p className="text-xs text-muted-2">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-danger">{error}</p>
      )}
    </div>
  );
}
