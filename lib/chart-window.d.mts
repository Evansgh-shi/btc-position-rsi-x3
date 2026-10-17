export type ChartView = { count: number; end: number | null };
export function chartWindow(total: number, view: ChartView): { start: number; end: number };
export function zoomWindow(total: number, view: ChartView, factor: number): ChartView;
export function moveWindow(total: number, view: ChartView, nextEnd: number): ChartView;
