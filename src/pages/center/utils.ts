export const formatShortDate = (value: string | null | undefined) => {
  if (!value) return "Not scheduled";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
};

export const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

export const formatTime = (value: string | null | undefined) => {
  if (!value) return "Not set";
  const date = new Date(`1970-01-01T${value.slice(0, 5)}:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
};

export const formatTimeRange = (start: string | null | undefined, end: string | null | undefined) =>
  `${formatTime(start)} - ${formatTime(end)}`;

export const normalizeSearch = (value: string) => value.trim().toLowerCase();
