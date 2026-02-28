const MS_PER_DAY = 1000 * 60 * 60 * 24;

export function getDaysRemaining(expiresAt) {
  if (!expiresAt) return null;

  const expiryDate = new Date(expiresAt);
  if (Number.isNaN(expiryDate.getTime())) return null;

  const now = new Date();
  const diffMs = expiryDate.getTime() - now.getTime();
  return Math.ceil(diffMs / MS_PER_DAY);
}

export function formatDateLabel(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
