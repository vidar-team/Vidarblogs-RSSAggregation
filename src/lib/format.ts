export function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function initials(name: string): string {
  const chars = Array.from(name.trim());
  return chars.length > 0 ? chars[0].toUpperCase() : "?";
}
