// Inclusive point indices. A null end follows the latest observation on refresh.
export function chartWindow(total, view) {
  const end = Math.max(0, Math.min(total - 1, view.end ?? total - 1));
  const count = Math.min(total, Math.max(2, view.count));
  return { start: Math.max(0, end - count + 1), end };
}

export function zoomWindow(total, view, factor) {
  const { start, end } = chartWindow(total, view);
  const count = Math.min(total, Math.max(Math.min(14, total), Math.round((end - start + 1) * factor)));
  const center = (start + end) / 2;
  const nextEnd = Math.max(count - 1, Math.min(total - 1, Math.round(center + (count - 1) / 2)));
  return { count, end: nextEnd === total - 1 ? null : nextEnd };
}

export function moveWindow(total, view, nextEnd) {
  const { start, end } = chartWindow(total, view);
  const count = end - start + 1;
  const target = Math.min(total - 1, Math.max(count - 1, Math.round(nextEnd)));
  return { count, end: target === total - 1 ? null : target };
}
