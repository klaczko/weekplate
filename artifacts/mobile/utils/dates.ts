export function getTodayDateString(): string {
  const d = new Date();
  return formatDate(d);
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getDayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getDay();
}

export function isWeekend(dateStr: string): boolean {
  const day = getDayOfWeek(dateStr);
  return day === 0 || day === 6;
}

export function getWeekDates(referenceDate?: string): string[] {
  const today = referenceDate ? new Date(referenceDate) : new Date();
  const day = today.getDay();
  const monday = new Date(today);
  const diff = day === 0 ? -6 : 1 - day;
  monday.setDate(today.getDate() + diff);

  return Array.from({ length: 5 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return formatDate(d);
  });
}

export function getDayName(dateStr: string, short = false): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    weekday: short ? "short" : "long",
  });
}

export function getMonthDay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function getCurrentWeekId(): string {
  const dates = getWeekDates();
  return dates[0];
}

export function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9);
}
