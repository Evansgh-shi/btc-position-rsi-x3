# BTC 动态仓位仪表盘

一个基于 BTC 趋势、RSI、恐贪指数与标准正态分布累计概率的仓位参考网页。

## 模型

```text
Z = (100 − RSI(14) − 恐贪指数) × 0.03
仓位 = Φ(Z)
```

- 使用 200 日均线判断趋势。
- 上涨趋势参考月线 RSI(14)。
- 下跌趋势参考周线 RSI(14)。
- BTC 价格和 K 线优先使用 Binance 公开数据。
- 恐贪指数使用 Alternative.me Crypto Fear & Greed。
- 使用币安官方公开行情专用域名 `data-api.binance.vision`，不可用时尝试主域名。
- GitHub Actions 约每小时采集、校验并发布真实行情快照；浏览器只读取 JSON，不直接跨域请求交易所。
- 原 Sites 站点提供同源 `/data/market.json` 服务端接口，缓存 5 分钟，采集失败保留最后真实数据。GitHub 页面可使用该接口作为额外备源。
- 首屏 HTML 已包含真实仓位，JavaScript 加载失败也能显示数值。刷新失败保留上次真实数据，超过 6 小时明确提示更新延迟，不生成演示仓位。
- RSI 使用 Wilder RMA(14)，从 2017 年起的币安日线按 UTC 聚合周/月，包含计算点当期未收盘值。
- MA200 使用计算点之前 200 个已收盘日线，历史计算不读取未来价格或恐贪值。
- 恐贪源为 Alternative.me，**不保证与币安客户端/CMC 的指数一致**，页面明确显示来源和日期。

## 在线访问

- [公开站点](https://btc-position-rsi-x3.hakimi666.chatgpt.site)
- [GitHub Pages](https://evansgh-shi.github.io/btc-position-rsi-x3/)

## 本地运行

```bash
pnpm install
pnpm refresh:market
pnpm dev
```

## 构建

```bash
pnpm build
```

构建产物位于 `dist/`。

GitHub Pages 构建：`DEPLOY_TARGET=github pnpm build`；普通域名构建无需该变量。
`pnpm test` 校验 Wilder RSI、正态 CDF、历史无未来数据与失效数据拒绝策略。
构建还会逐项验证 HTML 引用的 CSS/JavaScript 文件是否存在。

采集失败时工作流会停止发布，已有线上版本继续服务。快照刷新不会自动写入默认分支。
GitHub 的公开仓库定时任务可能在仓库连续 60 天无活动后自动停用；若看到更新延迟，请在 Actions 中检查并重新启用。

> 本项目仅用于量化观察与仓位参考，不构成投资建议。
