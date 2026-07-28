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
- 实时数据不可达时，页面会明确切换到离线演示状态。

## 在线访问

- [公开站点](https://btc-position-rsi-x3.hakimi666.chatgpt.site)
- [GitHub Pages](https://evansgh-shi.github.io/btc-position-rsi-x3/)

## 本地运行

```bash
pnpm install
pnpm dev
```

## 构建

```bash
pnpm build
```

构建产物位于 `dist/`。

> 本项目仅用于量化观察与仓位参考，不构成投资建议。
