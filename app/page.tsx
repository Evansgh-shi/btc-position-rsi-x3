"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Point = {
  date: string;
  price: number;
  position: number;
  rsi: number;
  fear: number;
  ma200: number | null;
  trend: "up" | "down";
};

type MarketData = {
  current: Point & {
    change24h: number;
    high24h: number;
    low24h: number;
    rsiFrame: string;
    z: number;
  };
  history: Point[];
  meta: {
    priceSource: string;
    fearSource: string;
    updatedAt: string;
    formula: string;
    degraded: boolean;
  };
};

const ranges = [
  { label: "30天", days: 30 },
  { label: "90天", days: 90 },
  { label: "半年", days: 180 },
  { label: "1年", days: 365 },
];

function money(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function Gauge({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const angle = -135 + clamped * 2.7;
  return (
    <div className="gauge-wrap">
      <svg className="gauge" viewBox="0 0 320 230" aria-label={`建议仓位 ${clamped.toFixed(1)}%`}>
        <defs>
          <linearGradient id="gaugeGradient" x1="0" x2="1">
            <stop offset="0%" stopColor="#f14f59" />
            <stop offset="47%" stopColor="#f3b641" />
            <stop offset="100%" stopColor="#50d59a" />
          </linearGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="4" result="blur" /></filter>
        </defs>
        <path className="gauge-track" d="M 52 184 A 118 118 0 1 1 268 184" pathLength="100" />
        <path className="gauge-value" d="M 52 184 A 118 118 0 1 1 268 184" pathLength="100" strokeDasharray={`${clamped} 100`} />
        <line x1="160" y1="160" x2="160" y2="67" className="needle-shadow" transform={`rotate(${angle} 160 160)`} />
        <line x1="160" y1="160" x2="160" y2="67" className="needle" transform={`rotate(${angle} 160 160)`} />
        <circle cx="160" cy="160" r="9" className="needle-pin" />
        <text x="47" y="210" className="gauge-label">0%</text>
        <text x="250" y="210" className="gauge-label">100%</text>
      </svg>
      <div className="gauge-number">
        <strong>{clamped.toFixed(1)}<span>%</span></strong>
        <small>建议仓位</small>
      </div>
    </div>
  );
}

function TrendChart({ data }: { data: Point[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const pad = { l: 16, r: 16, t: 22, b: 30 };
    const chartW = width - pad.l - pad.r;
    const chartH = height - pad.t - pad.b;
    const prices = data.map((d) => d.price);
    const minPrice = Math.min(...prices) * 0.96;
    const maxPrice = Math.max(...prices) * 1.04;
    const x = (i: number) => pad.l + (i / (data.length - 1)) * chartW;
    const yPrice = (v: number) => pad.t + (1 - (v - minPrice) / (maxPrice - minPrice || 1)) * chartH;
    const yPos = (v: number) => pad.t + (1 - v / 100) * chartH;

    ctx.clearRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(138, 156, 181, .13)";
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 6]);
    for (let i = 0; i <= 4; i++) {
      const gy = pad.t + (chartH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.l, gy);
      ctx.lineTo(width - pad.r, gy);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    const area = ctx.createLinearGradient(0, pad.t, 0, height);
    area.addColorStop(0, "rgba(247, 184, 75, .24)");
    area.addColorStop(1, "rgba(247, 184, 75, 0)");
    ctx.beginPath();
    data.forEach((p, i) => i ? ctx.lineTo(x(i), yPrice(p.price)) : ctx.moveTo(x(i), yPrice(p.price)));
    ctx.lineTo(x(data.length - 1), height - pad.b);
    ctx.lineTo(x(0), height - pad.b);
    ctx.closePath();
    ctx.fillStyle = area;
    ctx.fill();

    ctx.beginPath();
    data.forEach((p, i) => i ? ctx.lineTo(x(i), yPrice(p.price)) : ctx.moveTo(x(i), yPrice(p.price)));
    ctx.strokeStyle = "#f4bd50";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    data.forEach((p, i) => i ? ctx.lineTo(x(i), yPos(p.position)) : ctx.moveTo(x(i), yPos(p.position)));
    ctx.strokeStyle = "#54d6aa";
    ctx.lineWidth = 2.2;
    ctx.stroke();

    if (hover !== null && data[hover]) {
      const hx = x(hover);
      ctx.strokeStyle = "rgba(255,255,255,.28)";
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(hx, pad.t);
      ctx.lineTo(hx, height - pad.b);
      ctx.stroke();
      ctx.setLineDash([]);
      [[yPrice(data[hover].price), "#f4bd50"], [yPos(data[hover].position), "#54d6aa"]].forEach(([hy, color]) => {
        ctx.beginPath();
        ctx.arc(hx, hy as number, 4, 0, Math.PI * 2);
        ctx.fillStyle = color as string;
        ctx.fill();
      });
    }
  }, [data, hover]);

  const active = hover === null ? data.at(-1) : data[hover];
  return (
    <div className="chart-shell">
      <canvas
        ref={canvasRef}
        onMouseMove={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setHover(Math.max(0, Math.min(data.length - 1, Math.round(((event.clientX - rect.left) / rect.width) * (data.length - 1)))));
        }}
        onMouseLeave={() => setHover(null)}
      />
      {active && (
        <div className="chart-tooltip">
          <span>{active.date}</span>
          <b>{money(active.price)}</b>
          <em>{active.position.toFixed(1)}% 仓位</em>
        </div>
      )}
    </div>
  );
}

function Loading() {
  return (
    <main className="app">
      <header><div className="brand"><span>₿</span><b>POSITION / BTC</b></div><i className="live">连接行情中</i></header>
      <section className="loading-card">
        <div className="loader" />
        <h1>正在计算今日仓位</h1>
        <p>同步 BTC 价格、200 日均线、RSI 与恐贪指数</p>
      </section>
    </main>
  );
}

export default function Home() {
  const [market, setMarket] = useState<MarketData | null>(null);
  const [error, setError] = useState("");
  const [range, setRange] = useState(90);

  useEffect(() => {
    const load = () => fetch("/api/market")
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.detail || body.error);
        setMarket(body);
        setError("");
      })
      .catch((e) => setError(e.message));
    load();
    const timer = window.setInterval(load, 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const chartData = useMemo(() => market?.history.slice(-range) ?? [], [market, range]);
  if (!market && !error) return <Loading />;

  if (!market) {
    return (
      <main className="app">
        <section className="loading-card error">
          <span>!</span><h1>行情暂时未接通</h1><p>{error}</p>
          <button onClick={() => location.reload()}>重新连接</button>
        </section>
      </main>
    );
  }

  const c = market.current;
  const positive = c.change24h >= 0;
  return (
    <main className="app">
      <header>
        <div className="brand"><span>₿</span><b>POSITION / BTC</b></div>
        <nav><a href="#overview">实时仓位</a><a href="#history">历史关系</a><a href="#method">计算方法</a></nav>
        <div className="status"><i className={market.meta.degraded ? "demo" : "live"}>{market.meta.degraded ? "DEMO" : "LIVE"}</i><span>{new Date(market.meta.updatedAt).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span></div>
      </header>

      <section className="hero" id="overview">
        {market.meta.degraded && <div className="data-notice">实时行情源当前不可达，正在展示离线演示数据；连接恢复后会自动切回币安实时数据。</div>}
        <div className="hero-title">
          <div><p>BTC 动态仓位模型</p><h1>此刻，应该投入多少？</h1></div>
          <span className={`trend ${c.trend}`}>{c.trend === "up" ? "↗ 上涨趋势 · 月线 RSI" : "↘ 下跌趋势 · 周线 RSI"}</span>
        </div>

        <div className="overview-grid">
          <article className="gauge-card">
            <div className="card-kicker"><span>模型建议</span><i>标准正态 CDF</i></div>
            <Gauge value={c.position} />
            <div className="allocation">
              <span style={{ width: `${c.position}%` }} />
            </div>
            <div className="allocation-label"><b>BTC {c.position.toFixed(1)}%</b><span>现金 {(100 - c.position).toFixed(1)}%</span></div>
          </article>

          <article className="price-card">
            <div className="asset-line"><span className="coin">₿</span><div><b>Bitcoin</b><small>BTC / USDT</small></div><i>BINANCE</i></div>
            <div className="price-line">
              <h2>{money(c.price)}</h2>
              <span className={positive ? "positive" : "negative"}>{positive ? "+" : ""}{c.change24h.toFixed(2)}%</span>
            </div>
            <div className="price-range"><span>24h 低点 <b>{money(c.low24h)}</b></span><span>24h 高点 <b>{money(c.high24h)}</b></span></div>

            <div className="metrics">
              <div><span>趋势参考</span><b>{c.ma200 ? money(c.ma200) : "—"}</b><small>MA 200D</small></div>
              <div><span>{c.rsiFrame}</span><b>{c.rsi.toFixed(1)}</b><small>{c.rsi < 30 ? "超卖" : c.rsi > 70 ? "超买" : "中性区间"}</small></div>
              <div><span>恐贪指数</span><b>{c.fear}</b><small>{c.fear < 25 ? "极度恐惧" : c.fear < 45 ? "恐惧" : c.fear < 56 ? "中性" : c.fear < 75 ? "贪婪" : "极度贪婪"}</small></div>
            </div>

            <div className="formula">
              <span>今日 Z 值</span><code>(100 − {c.rsi.toFixed(1)} − {c.fear}) × 0.03 = <b>{c.z.toFixed(3)}</b></code>
            </div>
          </article>
        </div>
      </section>

      <section className="history-section" id="history">
        <div className="section-head">
          <div><p>HISTORICAL RELATION</p><h2>仓位与 BTC 价格</h2></div>
          <div className="range-tabs">{ranges.map((item) => <button key={item.days} className={range === item.days ? "active" : ""} onClick={() => setRange(item.days)}>{item.label}</button>)}</div>
        </div>
        <article className="chart-card">
          <div className="legend"><span className="price-dot">BTC 价格</span><span className="position-dot">建议仓位</span><i>移动查看每日数据</i></div>
          <TrendChart data={chartData} />
          <div className="axis-labels"><span>左轴 · BTC 价格</span><span>右轴 · 仓位 0—100%</span></div>
        </article>
      </section>

      <section className="method-section" id="method">
        <div className="method-copy">
          <p>THE MODEL</p>
          <h2>情绪越冷，仓位越暖。</h2>
          <span>模型先用 200 日均线判断趋势，再选择对应周期 RSI，最后将情绪与动量合并为 Z 值，并通过标准正态分布累计概率转换成 0—100% 仓位。</span>
        </div>
        <div className="steps">
          <div><i>01</i><b>判断趋势</b><span>价格 ≥ MA200 为上涨趋势，否则为下跌趋势</span></div>
          <div><i>02</i><b>选择 RSI</b><span>上涨参考月线 RSI(14)，下跌参考周线 RSI(14)</span></div>
          <div><i>03</i><b>映射仓位</b><span>仓位 = Φ((100 − RSI − 恐贪) × 0.03)</span></div>
        </div>
      </section>

      <footer>
        <div><b>POSITION / BTC</b><span>数据：{market.meta.priceSource} · {market.meta.fearSource}</span></div>
        <p>本工具仅为量化观察与仓位参考，不构成投资建议。</p>
      </footer>
    </main>
  );
}
