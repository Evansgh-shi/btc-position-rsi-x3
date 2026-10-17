"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fetchMarketData, type MarketData, type Point } from "../lib/market";
import { copy, rangeLabel, rangeOptions, type Language } from "../lib/i18n";
import { chartWindow, zoomWindow, moveWindow, type ChartView } from "../lib/chart-window.mjs";

const sections = [{ id: "overview", icon: "grid" }, { id: "history", icon: "chart" }, { id: "method", icon: "layers" }] as const;

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

function Gauge({ value, language }: { value: number; language: Language }) {
  const t = copy[language];
  const clamped = Math.max(0, Math.min(100, value));
  const angle = -135 + clamped * 2.7;
  return <div className="gauge-wrap">
    <svg className="gauge" viewBox="0 0 320 260" role="img" aria-label={`${t.position} ${clamped.toFixed(1)}%`}>
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
    <div className="gauge-number"><strong>{clamped.toFixed(1)}<span>%</span></strong><small>{t.position}</small></div>
  </div>;
}

function TrendChart({ data, language }: { data: Point[]; language: Language }) {
  const t = copy[language];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => setHover(null), [data]);
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
    const pad = { l: width > 600 ? 76 : 58, r: width > 600 ? 56 : 45, t: 20, b: 42 };
    const chartW = width - pad.l - pad.r, chartH = height - pad.t - pad.b;
    const prices = data.map(d => d.price);
    const min = Math.min(...prices) * .97, max = Math.max(...prices) * 1.03;
    const times = data.map(p => Date.parse(p.date));
    const x = (i: number) => pad.l + (times[i] - times[0]) / (times.at(-1)! - times[0] || 1) * chartW;
    const yp = (price: number) => pad.t + (1 - (price - min) / (max - min || 1)) * chartH;
    const yv = (position: number) => pad.t + (1 - position / 100) * chartH;
    ctx.clearRect(0, 0, width, height);
    ctx.font = "12px ui-monospace, monospace";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + chartH * i / 4;
      ctx.strokeStyle = "rgba(156,166,177,.10)"; ctx.setLineDash([3, 5]);
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(width - pad.r, y); ctx.stroke();
      ctx.fillStyle = "#a0aab7"; ctx.textAlign = "right";
      ctx.fillText(`$${((max - (max - min) * i / 4) / 1000).toFixed(1)}k`, pad.l - 12, y + 4);
      ctx.textAlign = "left"; ctx.fillText(`${100 - i * 25}%`, width - pad.r + 10, y + 4);
    }
    ctx.setLineDash([]);
    const labels = width > 600 ? 4 : 2;
    for (let i = 0; i <= labels; i++) {
      const index = Math.round(i / labels * (data.length - 1));
      ctx.textAlign = i === 0 ? "left" : i === labels ? "right" : "center";
      const longRange = times.at(-1)! - times[0] > 300 * 86400000;
      ctx.fillText(longRange ? data[index].date.slice(0, 7) : data[index].date.slice(5).replace("-", "/"), x(index), height - 12);
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
    {active && <div className="chart-readout" aria-live="polite"><time dateTime={active.date}>{active.date}</time><span><i className="price-dot" />{t.price} <b>{money(active.price)}</b></span><span><i className="position-dot" />{t.allocation} <b>{active.position.toFixed(1)}%</b></span></div>}
    <div className="chart-shell"><canvas ref={canvasRef} role="img" tabIndex={0} aria-label={t.chartAria}
      onPointerMove={event => {
        const rect = event.currentTarget.getBoundingClientRect();
        const l = rect.width > 600 ? 76 : 58, r = rect.width > 600 ? 56 : 45;
        const fraction = Math.max(0, Math.min(1, (event.clientX - rect.left - l) / (rect.width - l - r)));
        const target = Date.parse(data[0].date) + fraction * (Date.parse(data.at(-1)!.date) - Date.parse(data[0].date));
        let lo = 0, hi = data.length - 1;
        while (lo < hi) { const mid = Math.floor((lo + hi) / 2); if (Date.parse(data[mid].date) < target) lo = mid + 1; else hi = mid; }
        setHover(lo > 0 && target - Date.parse(data[lo - 1].date) < Date.parse(data[lo].date) - target ? lo - 1 : lo);
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
  const [language, setLanguage] = useState<Language>("zh");
  const [view, setView] = useState<ChartView>({ count: 90, end: null });
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(Date.parse(initialData.meta.updatedAt));
  const [section, setSection] = useState("overview");
  const t = copy[language];
  useEffect(() => {
    try { if (localStorage.getItem("btc-dashboard-language") === "en") setLanguage("en"); } catch { /* Storage may be disabled. */ }
  }, []);
  useEffect(() => {
    document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
    document.title = copy[language].dashboard;
  }, [language]);
  const changeLanguage = (next: Language) => {
    setLanguage(next);
    try { localStorage.setItem("btc-dashboard-language", next); } catch { /* The current session still works. */ }
  };
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
  const total = market.history.length;
  const { start, end } = chartWindow(total, view);
  const visibleCount = end - start + 1;
  const chartData = useMemo(() => market.history.slice(start, end + 1), [market.history, start, end]);
  const stale = now - Date.parse(market.meta.updatedAt) > 6 * 60 * 60 * 1000;
  const updatedLabel = new Date(market.meta.updatedAt).toLocaleString(language === "zh" ? "zh-CN" : "en-GB", { timeZone: "Asia/Shanghai", hour12: false });
  const c = market.current, positive = c.change24h >= 0;
  const fearLabel = c.fear < 25 ? t.extremeFear : c.fear < 45 ? t.fear : c.fear < 56 ? t.neutralFear : c.fear < 75 ? t.greed : t.extremeGreed;
  const rsiFrame = c.trend === "up" ? t.monthlyRsi : t.weeklyRsi;
  return <div className="app">
    <a className="skip-link" href="#overview">{t.skip}</a>
    <aside className="sidebar">
      <a className="brand" href="#overview"><span className="brand-mark">₿</span><span><b>POSITION</b><small>BITCOIN OBSERVATORY</small></span></a>
      <div className="sidebar-label">{t.workspace} <span>01 — 03</span></div>
      <nav className="side-nav" aria-label={t.navigation}>{sections.map(item => <a key={item.id} href={`#${item.id}`} aria-label={t[item.id]} title={t[item.id]} aria-current={section === item.id ? "location" : undefined} onClick={() => setSection(item.id)}><Icon name={item.icon} /><span>{t[item.id]}</span><i /></a>)}</nav>
      <div className="sidebar-bottom"><span className="small-bitcoin">₿</span><b>{t.motto}</b><p>{t.signals}</p><div><Icon name="shield" /><span>{t.transparent}</span></div></div>
    </aside>
    <div className="main-content">
      <header className="topbar"><div className="breadcrumb"><span>{t.workspace}</span><i>/</i><b>{t.dashboard}</b></div><div className="status"><i className={stale ? "demo" : "live"}>{stale ? t.delayed : t.live}</i><div className="language-switch" role="group" aria-label={t.language}>{(["zh", "en"] as const).map(lang => <button key={lang} lang={lang} aria-pressed={language === lang} onClick={() => changeLanguage(lang)}>{lang === "zh" ? "中文" : "EN"}</button>)}</div><button className="refresh-button" disabled={refreshing} onClick={refresh} aria-label={t.refresh}><Icon name="refresh" className={refreshing ? "spinning" : ""} /><span>{refreshing ? t.refreshing : t.refresh}</span></button></div></header>
      <main>
        <section className="hero" id="overview">
          <div className="hero-title"><div><p className="eyebrow"><span />BITCOIN POSITION MODEL</p><h1>{t.headline}<span>{language === "zh" ? "。" : "."}</span></h1><p className="hero-description">{t.description}</p></div><span className={`trend ${c.trend}`}><span className="trend-arrow">{c.trend === "up" ? "↗" : "↘"}</span><span><b>{c.trend === "up" ? t.up : t.down}</b><small>{rsiFrame}</small></span></span></div>
          <div className={`data-notice ${stale ? "stale" : ""}`} role="status"><i /><span>{stale ? t.stale : t.snapshot}<span className="notice-divider">/</span>{t.updated} <time>{updatedLabel}</time> <small>UTC+8</small>{error && <span className="notice-error"> · {t.refreshError}</span>}</span></div>
          <noscript><div className="data-notice stale">{t.noScript}</div></noscript>
          <div className="overview-grid">
            <article className="gauge-card"><div className="card-kicker"><span><i className="card-dot" />{t.position}</span><i>ALLOCATION</i></div><Gauge value={c.position} language={language} /><div className="allocation"><span style={{ width: `${c.position}%` }} /></div><div className="allocation-label"><span><i className="allocation-dot" />BTC <b>{c.position.toFixed(1)}%</b></span><span><i />{t.cash} <b>{(100 - c.position).toFixed(1)}%</b></span></div><div className="gauge-footnote"><Icon name="layers" /><span>{t.gaugeNote}</span><span>Φ(z)</span></div></article>
            <article className="price-card"><div className="asset-line"><span className="coin">₿</span><div><b>Bitcoin <span>BTC</span></b><small>BTC / USDT · {t.spot}</small></div><i>BINANCE <span>↗</span></i></div><div className="price-line"><h2>{money(c.price)}</h2><span className={positive ? "positive" : "negative"}>{positive ? "↗ +" : "↘ "}{c.change24h.toFixed(2)}%<small>24H</small></span></div><div className="price-range"><span>{t.low} <b>{money(c.low24h)}</b></span><i /><span>{t.high} <b>{money(c.high24h)}</b></span></div><div className="metrics"><div><span>{t.trendBase} <small>MA200</small></span><b>{money(c.ma200)}</b><p><i className={c.trend} />{c.trend === "up" ? t.above : t.below}</p></div><div><span>{t.momentum} <small>RSI · 14 · {c.trend === "up" ? t.monthly : t.weekly}</small></span><b className="rsi-value">{c.rsi.toFixed(1)}</b><p>{c.rsi < 30 ? t.oversold : c.rsi > 70 ? t.overbought : t.neutral}</p></div><div><span>{t.sentiment} <small>F&G · / 100</small></span><b>{c.fear}</b><p>{fearLabel}</p></div></div><div className="formula"><span>{t.todayZ}</span><code>(100 − {c.rsi.toFixed(1)} − {c.fear}) × 0.03</code><b>{c.z.toFixed(3)}</b></div></article>
          </div>
        </section>
        <section className="history-section" id="history">
          <div className="section-head"><div><p className="eyebrow">MARKET PERSPECTIVE</p><h2>{t.chartTitle}<span>{t.chartSubtitle}</span></h2></div><p className="history-availability">{t.available}<b>{market.history[0].date} — {market.history.at(-1)!.date}</b><span>{total.toLocaleString(language === "zh" ? "zh-CN" : "en-US")} {t.observations}</span></p></div>
          <article className="chart-card" data-window-count={visibleCount}>
            <div className="chart-toolbar"><div className="range-tabs" role="group" aria-label={t.timeRange}>{rangeOptions.map(days => {
              const selected = end === total - 1 && (days === Infinity ? visibleCount === total : visibleCount === days);
              return <button key={String(days)} className={selected ? "active" : ""} aria-pressed={selected} onClick={() => setView({ count: days, end: null })}>{rangeLabel(days, language)}</button>;
            })}</div><div className="zoom-controls" role="group" aria-label={t.timeRange}>
              <button aria-label={t.earlier} title={t.earlier} disabled={start === 0} onClick={() => setView(moveWindow(total, view, end - Math.max(1, Math.round(visibleCount / 4))))}>‹</button>
              <button aria-label={t.zoomOut} title={t.zoomOut} disabled={visibleCount >= total} onClick={() => setView(zoomWindow(total, view, 2))}>−</button>
              <button aria-label={t.zoomIn} title={t.zoomIn} disabled={visibleCount <= 14} onClick={() => setView(zoomWindow(total, view, .5))}>+</button>
              <button aria-label={t.later} title={t.later} disabled={end === total - 1} onClick={() => setView(moveWindow(total, view, end + Math.max(1, Math.round(visibleCount / 4))))}>›</button>
              <button className="reset-button" title={t.resetHint} onClick={() => setView({ count: 90, end: null })}>↺ <span>{t.reset}</span></button>
            </div></div>
            <TrendChart data={chartData} language={language} />
            <div className="timeline"><div className="timeline-info"><span>{t.visible}</span><output aria-live="polite">{chartData[0].date} — {chartData.at(-1)!.date}</output><b>{visibleCount.toLocaleString()} {t.observations}</b></div><input type="range" min={visibleCount - 1} max={total - 1} value={end} disabled={visibleCount >= total} aria-label={t.timeline} aria-valuetext={`${chartData[0].date} — ${chartData.at(-1)!.date}`} onChange={event => setView(moveWindow(total, view, Number(event.target.value)))} /><div className="timeline-ends"><span>{market.history[0].date}</span><span>{t.timelineHint}</span><span>{market.history.at(-1)!.date}</span></div></div>
            <div className="chart-bottom"><span><i className="price-dot" />{t.price} <small>{t.leftAxis}</small></span><span><i className="position-dot" />{t.allocation} <small>{t.rightAxis}</small></span><p>{t.chartHint}</p></div>
          </article>
        </section>
        <section className="method-section" id="method"><div className="method-copy"><p className="eyebrow">BEHIND THE NUMBER</p><h2>{t.methodTitle}</h2><p>{t.methodDescription}</p><span className="method-tag"><Icon name="shield" />{t.methodTag}</span></div><div className="steps"><div><i>01</i><span><b>{t.step1}</b><p>{t.step1Body}</p></span><Icon name="chart" /></div><div><i>02</i><span><b>{t.step2}</b><p>{t.step2Body}</p></span><Icon name="layers" /></div><div><i>03</i><span><b>{t.step3}</b><p>{t.step3Body}</p></span><Icon name="grid" /></div></div></section>
      </main>
      <footer><div><b>POSITION <span>/ BTC</span></b><p>{t.sources}: {market.meta.priceSource} · {market.meta.fearSource}</p><p>{t.fearDate} {market.meta.fearUpdatedAt.slice(0, 10)} · {t.maNote}</p></div><span>{t.disclaimer}<br />{t.risk}</span></footer>
    </div>
  </div>;
}
