import * as React from "react";
import { cn } from "@/lib/utils";

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg" | "xl";
}

// Wide but "gathered": pages use most of the screen (far wider than a classic
// 1280 cap, per the user's full-width preference) but stay pulled in from the
// edges with a generous cap + comfortable side padding, so content never hugs
// the screen edge. `sm` stays narrow for the rare reading column / form.
const sizes = {
  sm: "max-w-3xl",
  md: "max-w-[1700px]",
  lg: "max-w-[1700px]",
  xl: "max-w-[1700px]",
};

export function Container({
  className,
  size = "lg",
  ...props
}: ContainerProps) {
  return (
    <div
      className={cn("mx-auto w-full px-6 md:px-10 lg:px-16", sizes[size], className)}
      {...props}
    />
  );
}
