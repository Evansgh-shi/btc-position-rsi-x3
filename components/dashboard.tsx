"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fetchMarketData, type MarketData, type Point } from "../lib/market";

const ranges = [{ label: "30天", days: 30 }, { label: "90天", days: 90 }, { label: "半年", days: 180 }, { label: "1年", days: 365 }];
const sections = [{ id: "overview", label: "市场概览", icon: "grid" }, { id: "history", label: "价格与仓位", icon: "chart" }, { id: "method", label: "模型说明", icon: "layers" }];

function Icon({ name, className = "" }: { name: string; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    grid: <><rect x="3" y="3" width="6" height="6" rx="1.2" /><rect x="15" y="3" width="6" height="6" rx="1.2" /><rect x="3" y="15" width="6" height="6" rx="1.2" /><rect x="15" y="15" width="6" height="6" rx="1.2" /></>,
    chart: <><path d="M4 3v17h17" /><path d="m7 14 4-5 4 3 5-7" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 12 9 5 9-5M3 16l9 5 9-5" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M5.5 8a7 7 0 0 1 11.6-3L20 8M4 16l2.9 3A7 7 0 0 0 18.5 16" /></>,
    arrow: <path d="M5 19 19 5M5 5h14v14" />,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></>,
  };
  return <svg className={`icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name] || paths.grid}</svg>;
}

function money(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function Gauge({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const angle = -135 + clamped * 2.7;
  return <div className="gauge-wrap">
    <svg className="gauge" viewBox="0 0 320 260" role="img" aria-label={`模型参考仓位 ${clamped.toFixed(1)}%`}>
      <defs>
        <linearGradient id="gaugeGradient"><stop offset="0%" stopColor="#b78f59" /><stop offset="100%" stopColor="#ead3a4" /></linearGradient>
        <radialGradient id="gaugeHalo"><stop offset="0%" stopColor="#d4b781" stopOpacity=".07" /><stop offset="100%" stopColor="#d4b781" stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="160" cy="146" r="110" fill="url(#gaugeHalo)" />
      <path className="gauge-track" d="M80.804 225.196 A112 112 0 1 1 239.196 225.196" pathLength="100" />
      <path className="gauge-value" d="M80.804 225.196 A112 112 0 1 1 239.196 225.196" pathLength="100" strokeDasharray={`${clamped} 100`} />
      {Array.from({ length: 21 }, (_, i) => {
        const a = (135 + i * 13.5) * Math.PI / 180;
        const r = i % 5 === 0 ? 94 : 98;
        return <line key={i} x1={160 + Math.cos(a) * r} y1={146 + Math.sin(a) * r} x2={160 + Math.cos(a) * 102} y2={146 + Math.sin(a) * 102} className={`gauge-tick ${i % 5 === 0 ? "major" : ""}`} />;
      })}
      <line x1="160" y1="146" x2="160" y2="67" className="needle" transform={`rotate(${angle} 160 146)`} />
      <circle cx="160" cy="146" r="6" className="needle-pin" />
      <text x="64" y="246" className="gauge-label">0%</text><text x="231" y="246" className="gauge-label">100%</text>
    </svg>
    <div className="gauge-number"><strong>{clamped.toFixed(1)}<span>%</span></strong><small>模型参考仓位</small></div>
  </div>;
}

function TrendChart({ data }: { data: Point[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new ResizeObserver(() => setSize({ width: canvas.clientWidth, height: canvas.clientHeight }));
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || data.length < 2 || !size.width) return;
    const { width, height } = size, dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr; canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const pad = { l: width > 600 ? 64 : 52, r: width > 600 ? 46 : 34, t: 20, b: 38 };
    const chartW = width - pad.l - pad.r, chartH = height - pad.t - pad.b;
    const prices = data.map(d => d.price);
    const min = Math.min(...prices) * .97, max = Math.max(...prices) * 1.03;
    const x = (i: number) => pad.l + i / (data.length - 1) * chartW;
    const yp = (price: number) => pad.t + (1 - (price - min) / (max - min || 1)) * chartH;
    const yv = (position: number) => pad.t + (1 - position / 100) * chartH;
    ctx.clearRect(0, 0, width, height);
    ctx.font = "10px ui-monospace, monospace";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + chartH * i / 4;
      ctx.strokeStyle = "rgba(156,166,177,.10)"; ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(width - pad.r, y); ctx.stroke();
      ctx.fillStyle = "#7e8793"; ctx.textAlign = "right";
      ctx.fillText(`$${((max - (max - min) * i / 4) / 1000).toFixed(1)}k`, pad.l - 12, y + 4);
      ctx.textAlign = "left"; ctx.fillText(`${100 - i * 25}%`, width - pad.r + 10, y + 4);
    }
    ctx.setLineDash([]);
    const labels = width > 600 ? 4 : 2;
    for (let i = 0; i <= labels; i++) {
      const index = Math.round(i / labels * (data.length - 1));
      ctx.textAlign = i === 0 ? "left" : i === labels ? "right" : "center";
      ctx.fillText(data[index].date.slice(5).replace("-", "/"), x(index), height - 10);
    }
    const gradient = ctx.createLinearGradient(0, pad.t, 0, height - pad.b);
    gradient.addColorStop(0, "rgba(212,183,129,.13)"); gradient.addColorStop(1, "rgba(212,183,129,0)");
    ctx.beginPath(); data.forEach((p, i) => i ? ctx.lineTo(x(i), yp(p.price)) : ctx.moveTo(x(i), yp(p.price)));
    ctx.lineTo(x(data.length - 1), height - pad.b); ctx.lineTo(x(0), height - pad.b); ctx.closePath(); ctx.fillStyle = gradient; ctx.fill();
    const line = (project: (p: Point) => number, color: string) => {
      ctx.beginPath(); data.forEach((p, i) => i ? ctx.lineTo(x(i), project(p)) : ctx.moveTo(x(i), project(p)));
      ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.lineJoin = "round"; ctx.stroke();
    };
    line(p => yp(p.price), "#d4b781"); line(p => yv(p.position), "#6fc8ac");
    if (hover !== null && data[hover]) {
      ctx.beginPath(); ctx.moveTo(x(hover), pad.t); ctx.lineTo(x(hover), height - pad.b);
      ctx.strokeStyle = "#65707c"; ctx.lineWidth = 1; ctx.setLineDash([3, 4]); ctx.stroke(); ctx.setLineDash([]);
      for (const [y, color] of [[yp(data[hover].price), "#d4b781"], [yv(data[hover].position), "#6fc8ac"]] as const) {
        ctx.beginPath(); ctx.arc(x(hover), y, 4, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill();
        ctx.strokeStyle = "#12161b"; ctx.lineWidth = 2; ctx.stroke();
      }
    }
  }, [data, hover, size]);

  const active = data[hover ?? data.length - 1] ?? data.at(-1);
  return <>
    {active && <div className="chart-readout" aria-live="polite"><time>{active.date}</time><span><i className="price-dot" />BTC 价格 <b>{money(active.price)}</b></span><span><i className="position-dot" />参考仓位 <b>{active.position.toFixed(1)}%</b></span></div>}
    <div className="chart-shell"><canvas ref={canvasRef} role="img" tabIndex={0} aria-label="BTC 价格与仓位双轴图。左轴为美元，右轴为仓位。可用左右方向键查看日期。"
      onPointerMove={event => {
        const rect = event.currentTarget.getBoundingClientRect();
        const l = rect.width > 600 ? 64 : 52, r = rect.width > 600 ? 46 : 34;
        setHover(Math.max(0, Math.min(data.length - 1, Math.round((event.clientX - rect.left - l) / (rect.width - l - r) * (data.length - 1)))));
      }}
      onPointerLeave={() => setHover(null)}
      onKeyDown={event => {
        if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
          event.preventDefault(); setHover(index => Math.max(0, Math.min(data.length - 1, (index ?? data.length - 1) + (event.key === "ArrowLeft" ? -1 : 1))));
        } else if (event.key === "Escape") setHover(null);
      }} /></div>
  </>;
}

export default function Dashboard({ initialData }: { initialData: MarketData }) {
  const [market, setMarket] = useState<MarketData>(initialData);
  const [error, setError] = useState("");
  const [range, setRange] = useState(90);
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.parse(initialData.meta.updatedAt));
  const [section, setSection] = useState("overview");
  const refresh = async () => {
    setRefreshing(true);
    try {
      const body = await fetchMarketData();
      setMarket(previous => Date.parse(body.meta.updatedAt) >= Date.parse(previous.meta.updatedAt) ? body : previous); setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "行情刷新失败"); }
    finally { setRefreshing(false); setNow(Date.now()); }
  };
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const body = await fetchMarketData();
        if (active) { setMarket(previous => Date.parse(body.meta.updatedAt) >= Date.parse(previous.meta.updatedAt) ? body : previous); setError(""); }
      } catch (e) { if (active) setError(e instanceof Error ? e.message : "行情刷新失败"); }
      finally { if (active) setNow(Date.now()); }
    };
    setNow(Date.now()); void load();
    const timer = window.setInterval(load, 5 * 60 * 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) setSection(entry.target.id);
    }, { rootMargin: "-90px 0px -50% 0px", threshold: 0 });
    for (const item of sections) { const element = document.getElementById(item.id); if (element) observer.observe(element); }
    return () => observer.disconnect();
  }, []);
  const chartData = useMemo(() => market.history.slice(-range), [market, range]);
  const stale = now - Date.parse(market.meta.updatedAt) > 6 * 60 * 60 * 1000;
  const updatedLabel = new Date(market.meta.updatedAt).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false });
  const c = market.current, positive = c.change24h >= 0;
  const fearLabel = c.fear < 25 ? "极度恐惧" : c.fear < 45 ? "恐惧" : c.fear < 56 ? "中性" : c.fear < 75 ? "贪婪" : "极度贪婪";
  return <div className="app">
    <a className="skip-link" href="#overview">跳转至市场概览</a>
    <aside className="sidebar">
      <a className="brand" href="#overview"><span className="brand-mark">₿</span><span><b>POSITION</b><small>BITCOIN OBSERVATORY</small></span></a>
      <div className="sidebar-label">工作台 <span>01 — 03</span></div>
      <nav className="side-nav" aria-label="主导航">{sections.map(item => <a key={item.id} href={`#${item.id}`} aria-label={item.label} title={item.label} aria-current={section === item.id ? "location" : undefined} onClick={() => setSection(item.id)}><Icon name={item.icon} /><span>{item.label}</span><i /></a>)}</nav>
      <div className="sidebar-bottom"><span className="small-bitcoin">₿</span><b>少一点情绪，<br />多一份依据。</b><p>趋势 · 动量 · 市场情绪</p><div><Icon name="shield" /><span>公开数据 · 透明计算</span></div></div>
    </aside>
    <div className="main-content">
      <header className="topbar"><div className="breadcrumb"><span>工作台</span><i>/</i><b>BTC 仓位仪表盘</b></div><div className="status"><i className={stale ? "demo" : "live"}>{stale ? "行情待更新" : "真实行情"}</i><button className="refresh-button" disabled={refreshing} onClick={refresh}><Icon name="refresh" className={refreshing ? "spinning" : ""} /><span>{refreshing ? "刷新中…" : "刷新"}</span></button></div></header>
      <main>
        <section className="hero" id="overview">
          <div className="hero-title"><div><p className="eyebrow"><span />BITCOIN POSITION MODEL</p><h1>让每一份仓位，都有依据<span>。</span></h1><p className="hero-description">用趋势、动量与情绪，寻找市场中的配置平衡。</p></div><span className={`trend ${c.trend}`}><span className="trend-arrow">{c.trend === "up" ? "↗" : "↘"}</span><span><b>{c.trend === "up" ? "上涨趋势" : "下跌趋势"}</b><small>{c.rsiFrame}</small></span></span></div>
          <div className={`data-notice ${stale ? "stale" : ""}`} role="status"><i /><span>{stale ? "更新延迟 · 当前保留最后一次真实行情" : "行情快照"}<span className="notice-divider">/</span>更新于 <time>{updatedLabel}</time> <small>UTC+8</small>{error && <span className="notice-error"> · {error}</span>}</span></div>
          <noscript><div className="data-notice stale">已显示发布时的真实行情。启用 JavaScript 可刷新数据与查看历史曲线。</div></noscript>
          <div className="overview-grid">
            <article className="gauge-card"><div className="card-kicker"><span><i className="card-dot" />模型参考仓位</span><i>ALLOCATION</i></div><Gauge value={c.position} /><div className="allocation"><span style={{ width: `${c.position}%` }} /></div><div className="allocation-label"><span><i className="allocation-dot" />BTC <b>{c.position.toFixed(1)}%</b></span><span><i />现金 <b>{(100 - c.position).toFixed(1)}%</b></span></div><div className="gauge-footnote"><Icon name="layers" /><span>由 RSI 与恐贪指数共同计算</span><span>Φ(z)</span></div></article>
            <article className="price-card"><div className="asset-line"><span className="coin">₿</span><div><b>Bitcoin <span>BTC</span></b><small>BTC / USDT · 现货市场</small></div><i>BINANCE <span>↗</span></i></div><div className="price-line"><h2>{money(c.price)}</h2><span className={positive ? "positive" : "negative"}>{positive ? "↗ +" : "↘ "}{c.change24h.toFixed(2)}%<small>24H</small></span></div><div className="price-range"><span>24h 最低 <b>{money(c.low24h)}</b></span><i /><span>24h 最高 <b>{money(c.high24h)}</b></span></div><div className="metrics"><div><span>趋势基准 <small>MA200</small></span><b>{money(c.ma200)}</b><p><i className={c.trend} />{c.trend === "up" ? "现价位于均线上方" : "现价位于均线下方"}</p></div><div><span>动量指标 <small>RSI · 14</small></span><b>{c.rsi.toFixed(1)}<em>{c.trend === "up" ? "月线" : "周线"}</em></b><p>{c.rsi < 30 ? "超卖区间" : c.rsi > 70 ? "超买区间" : "中性区间"}</p></div><div><span>市场情绪 <small>F&G</small></span><b>{c.fear}<em>/ 100</em></b><p>{fearLabel}</p></div></div><div className="formula"><span>今日 Z 值</span><code>(100 − {c.rsi.toFixed(1)} − {c.fear}) × 0.03</code><b>{c.z.toFixed(3)}</b></div></article>
          </div>
        </section>
        <section className="history-section" id="history"><div className="section-head"><div><p className="eyebrow">MARKET PERSPECTIVE</p><h2>价格与仓位的对话<span>历史关系</span></h2></div><div className="range-tabs" aria-label="图表时间范围">{ranges.map(item => <button key={item.days} className={range === item.days ? "active" : ""} aria-pressed={range === item.days} onClick={() => setRange(item.days)}>{item.label}</button>)}</div></div><article className="chart-card"><TrendChart data={chartData} /><div className="chart-bottom"><span><i className="price-dot" />BTC 价格 <small>左轴 · USD</small></span><span><i className="position-dot" />参考仓位 <small>右轴 · %</small></span><p>移动或轻触图表，查看每日数据</p></div></article></section>
        <section className="method-section" id="method"><div className="method-copy"><p className="eyebrow">BEHIND THE NUMBER</p><h2>一个数字，<br />三重市场视角。</h2><p>把复杂的市场信号，转化为可理解、可追溯的仓位参考。</p><span className="method-tag"><Icon name="shield" />透明计算，不添加主观判断</span></div><div className="steps"><div><i>01</i><span><b>趋势决定观察视角</b><p>价格 ≥ 200 日均线为上涨趋势，否则为下跌趋势。</p></span><Icon name="chart" /></div><div><i>02</i><span><b>动量与情绪共同衡量</b><p>上涨看月线、下跌看周线 Wilder RSI(14)，结合恐贪指数。包含 UTC 当期未收盘值。</p></span><Icon name="layers" /></div><div><i>03</i><span><b>标准正态分布映射仓位</b><p>仓位 = Φ((100 − RSI − 恐贪指数) × 0.03)</p></span><Icon name="grid" /></div></div></section>
      </main>
      <footer><div><b>POSITION <span>/ BTC</span></b><p>数据：{market.meta.priceSource} · {market.meta.fearSource}</p><p>恐贪日期 {market.meta.fearUpdatedAt.slice(0, 10)} · MA200 使用前 200 个已收盘日线</p></div><span>仅供量化观察与仓位参考<br />不构成投资建议</span></footer>
    </div>
  </div>;
}
