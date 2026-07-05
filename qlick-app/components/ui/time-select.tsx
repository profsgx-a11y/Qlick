"use client";

import { SelectMenu } from "./select-menu";

// 24-hour time options every 15 minutes (00:00 … 23:45).
const TIME_OPTIONS: string[] = [];
for (let h = 0; h < 24; h++) {
  for (const m of [0, 15, 30, 45]) {
    TIME_OPTIONS.push(
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
    );
  }
}

/**
 * 24h time picker built on the themed SelectMenu — locale-independent (always
 * "HH:MM", no native AM/PM or clock icon) and styled in the app's colours, so it
 * looks and behaves the same everywhere (signup wizard + dashboard settings).
 */
export function TimeSelect({
  value,
  onChange,
  disabled,
  className,
  triggerClassName,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}) {
  // Keep an off-grid existing value selectable so it's never lost.
  const options = TIME_OPTIONS.includes(value)
    ? TIME_OPTIONS
    : [value, ...TIME_OPTIONS];
  return (
    <SelectMenu
      value={value}
      onChange={onChange}
      disabled={disabled}
      ariaLabel="Ώρα"
      centerLabel
      className={className ?? "w-24"}
      triggerClassName={triggerClassName ?? "h-9 px-2.5"}
      options={options.map((t) => ({ value: t, label: t }))}
    />
  );
}

export { TIME_OPTIONS };
