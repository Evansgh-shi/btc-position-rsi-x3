export type Language = "zh" | "en";

const zh = {
  overview: "市场概览", history: "价格与仓位", method: "模型说明", skip: "跳转至市场概览",
  workspace: "工作台", dashboard: "BTC 仓位仪表盘", navigation: "主导航", language: "界面语言",
  motto: "少一点情绪，\n多一份依据。", signals: "趋势 · 动量 · 市场情绪", transparent: "公开数据 · 透明计算",
  live: "真实行情", delayed: "行情待更新", refresh: "刷新", refreshing: "刷新中…",
  headline: "让每一份仓位，都有依据", description: "用趋势、动量与情绪，寻找市场中的配置平衡。",
  up: "上涨趋势", down: "下跌趋势", monthly: "月线", weekly: "周线", monthlyRsi: "月线 RSI(14)", weeklyRsi: "周线 RSI(14)",
  snapshot: "行情快照", stale: "更新延迟 · 当前保留最后一次真实行情", updated: "更新于",
  refreshError: "刷新失败，已保留最后一次真实行情", noScript: "已显示发布时的真实行情。启用 JavaScript 可刷新数据与查看历史曲线。",
  position: "模型参考仓位", allocation: "参考仓位", cash: "现金", gaugeNote: "由 RSI 与恐贪指数共同计算",
  cmcSource: "CMC 官方恐贪指数", binanceSameSource: "与币安客户端恐贪小组件同源", noCmcData: "暂无 CMC 数据",
  cmcHistorySince: "CMC 仓位历史始于", cmcHistoryNote: "此前仅显示 BTC 价格，不混用其他指数；最新点使用 CMC 实时读数",
  spot: "现货市场", low: "24h 最低", high: "24h 最高", trendBase: "趋势基准", momentum: "动量指标", sentiment: "市场情绪",
  above: "现价高于均线", below: "现价低于均线", oversold: "超卖区间", overbought: "超买区间", neutral: "中性区间",
  extremeFear: "极度恐惧", fear: "恐惧", neutralFear: "中性", greed: "贪婪", extremeGreed: "极度贪婪", todayZ: "今日 Z 值",
  chartTitle: "价格与仓位的对话", chartSubtitle: "历史关系", timeRange: "图表时间范围", price: "BTC 价格",
  chartAria: "BTC 价格与仓位双轴图。左轴为美元，右轴为仓位。可用左右方向键查看日期，Escape 返回最新点。",
  leftAxis: "左轴 · USD", rightAxis: "右轴 · %", chartHint: "移动或轻触图表，查看每日数据",
  available: "可用历史", observations: "个日度数据点", zoomIn: "放大时间轴", zoomOut: "缩小时间轴", earlier: "向前移动", later: "向后移动",
  reset: "重置", resetHint: "重置为最近 90 天", timeline: "移动时间窗口", timelineHint: "拖动滑块移动时间窗口，使用 + / − 调整跨度",
  visible: "当前窗口", days: "天", all: "全部", methodTitle: "一个数字，三重市场视角。",
  methodDescription: "把复杂的市场信号，转化为可理解、可追溯的仓位参考。", methodTag: "透明计算，不添加主观判断",
  step1: "趋势决定观察视角", step1Body: "价格 ≥ 200 日均线为上涨趋势，否则为下跌趋势。",
  step2: "动量与情绪共同衡量", step2Body: "上涨看月线、下跌看周线 Wilder RSI(14)，结合恐贪指数。包含 UTC 当期未收盘值。",
  step3: "标准正态分布映射仓位", step3Body: "仓位 = Φ((100 − RSI − 恐贪指数) × 0.03)",
  sources: "数据", fearDate: "恐贪日期", maNote: "MA200 使用前 200 个已收盘日线", disclaimer: "仅供量化观察与仓位参考", risk: "不构成投资建议",
};

type Copy = { [Key in keyof typeof zh]: string };
const en: Copy = {
  overview: "Overview", history: "Price & allocation", method: "The model", skip: "Skip to overview",
  workspace: "Workspace", dashboard: "BTC Position Dashboard", navigation: "Main navigation", language: "Interface language",
  motto: "Less emotion.\nMore perspective.", signals: "Trend · Momentum · Sentiment", transparent: "Public data · Open methodology",
  live: "Real market data", delayed: "Update delayed", refresh: "Refresh", refreshing: "Refreshing…",
  headline: "A clearer perspective on every position", description: "Find an allocation balance through trend, momentum and sentiment.",
  up: "Uptrend", down: "Downtrend", monthly: "Monthly", weekly: "Weekly", monthlyRsi: "Monthly RSI(14)", weeklyRsi: "Weekly RSI(14)",
  snapshot: "Market snapshot", stale: "Update delayed · Showing the last verified snapshot", updated: "Updated",
  refreshError: "Refresh failed. The last verified snapshot is retained.", noScript: "Verified data from publication is shown. Enable JavaScript to refresh data and explore the chart.",
  position: "Model allocation", allocation: "Allocation", cash: "Cash", gaugeNote: "Calculated from RSI and market sentiment",
  cmcSource: "Official CMC Fear & Greed", binanceSameSource: "Same source as Binance's Fear & Greed app widget", noCmcData: "No CMC data",
  cmcHistorySince: "CMC allocation history starts", cmcHistoryNote: "Earlier dates show BTC price only. No mixed indices; the latest point uses CMC's live reading.",
  spot: "Spot market", low: "24h low", high: "24h high", trendBase: "Trend baseline", momentum: "Momentum", sentiment: "Sentiment",
  above: "Price above MA200", below: "Price below MA200", oversold: "Oversold", overbought: "Overbought", neutral: "Neutral range",
  extremeFear: "Extreme fear", fear: "Fear", neutralFear: "Neutral", greed: "Greed", extremeGreed: "Extreme greed", todayZ: "Today's Z-score",
  chartTitle: "Price meets allocation", chartSubtitle: "Historical relationship", timeRange: "Chart time range", price: "BTC price",
  chartAria: "BTC price and allocation chart. Left axis: USD; right axis: allocation. Use left and right arrow keys to explore dates; Escape returns to the latest point.",
  leftAxis: "Left · USD", rightAxis: "Right · %", chartHint: "Hover or touch to explore daily observations",
  available: "Available history", observations: "daily observations", zoomIn: "Zoom in timeline", zoomOut: "Zoom out timeline", earlier: "Move earlier", later: "Move later",
  reset: "Reset", resetHint: "Reset to the latest 90 days", timeline: "Move time window", timelineHint: "Drag to move the time window. Use + / − to change its span.",
  visible: "Visible window", days: "days", all: "All", methodTitle: "One number. Three market perspectives.",
  methodDescription: "Turn complex market signals into an allocation reference you can understand and trace.", methodTag: "Transparent calculations. No discretionary input.",
  step1: "Trend sets the perspective", step1Body: "Price ≥ the 200-day moving average signals an uptrend; otherwise, a downtrend.",
  step2: "Momentum meets sentiment", step2Body: "Use monthly Wilder RSI(14) in uptrends and weekly RSI(14) in downtrends, alongside Fear & Greed. Includes the current, incomplete UTC period.",
  step3: "Map to a normal distribution", step3Body: "Allocation = Φ((100 − RSI − Fear & Greed) × 0.03)",
  sources: "Sources", fearDate: "Fear & Greed date", maNote: "MA200 uses the previous 200 completed daily candles", disclaimer: "For quantitative observation and allocation reference only", risk: "Not investment advice",
};

export const copy: Record<Language, Copy> = { zh, en };
export const rangeOptions = [30, 90, 180, 365, 1095, 1825, Infinity];
export function rangeLabel(days: number, language: Language) {
  const labels = language === "zh" ? ["30天", "90天", "半年", "1年", "3年", "5年", "全部"] : ["1M", "3M", "6M", "1Y", "3Y", "5Y", "ALL"];
  return labels[rangeOptions.indexOf(days)];
}
