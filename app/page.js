"use client";

// ─── 아티팩트 코드를 Next.js에서 그대로 실행하는 단일 파일 ───
// window.storage → localStorage 로만 교체, 나머지 100% 동일

import { useState, useEffect, useRef, useCallback } from "react";

/* ── Data ─────────────────────────────────────────────────── */
const POPULAR = ["AAPL", "MSFT", "NVDA", "GOOGL", "AMZN"];
const MKT_SYMS = {
  indices: ["^GSPC", "^IXIC", "^DJI"],
  commodities: ["GC=F", "CL=F", "SI=F", "NG=F", "HG=F"],
  bonds: ["^IRX", "^TNX", "^TYX"],
  rates: ["DX-Y.NYB", "^VIX", "USDKRW=X"]
};
const META = {
  "^GSPC": { name: "S&P 500", symbol: "SPX" }, "^IXIC": { name: "NASDAQ", symbol: "NDX" }, "^DJI": { name: "DOW", symbol: "DJIA" },
  "GC=F": { name: "금 (Gold)", symbol: "XAU/USD" }, "CL=F": { name: "WTI 원유", symbol: "WTI" },
  "SI=F": { name: "은 (Silver)", symbol: "XAG/USD" }, "NG=F": { name: "천연가스", symbol: "NG" }, "HG=F": { name: "구리", symbol: "HG" },
  "^IRX": { name: "미 국채 3M", symbol: "US3M" }, "^TNX": { name: "미 국채 10Y", symbol: "US10Y" }, "^TYX": { name: "미 국채 30Y", symbol: "US30Y" },
  "DX-Y.NYB": { name: "달러인덱스", symbol: "DXY" }, "^VIX": { name: "VIX 변동성", symbol: "VIX" }, "USDKRW=X": { name: "USD/KRW", symbol: "USDKRW" }
};
const FUND = {
  AAPL: { grossMargin: 46.2, netMargin: 26.4, roe: 147.9, de: 1.87, revenueGrowth: 6.1, epsGrowth: 10.8, currentRatio: 0.95, rev: "391B", opInc: "123B", pe: 29.5, pb: 52.3, eps: 6.57, sector: "Technology", consensus: { buy: 28, hold: 12, sell: 2 }, news: [{ title: "Apple AI 기능, 역대 최대 아이폰 업그레이드 사이클 촉발", time: "2시간 전", src: "Reuters", url: "https://reuters.com" }, { title: "애플 2분기 실적, 시장 예상치 상회하며 어닝서프라이즈", time: "1일 전", src: "Bloomberg", url: "https://bloomberg.com" }, { title: "아이폰 17 공급망 풀 가동 시작 공식 확인", time: "2일 전", src: "WSJ", url: "https://wsj.com" }], events: [{ date: "2025-07-31", event: "Q3 실적발표" }, { date: "2025-08-11", event: "배당락일" }], qrev: [{ q: "Q1'23", rev: 117.2, g: -5.5 }, { q: "Q2'23", rev: 94.8, g: -1.4 }, { q: "Q3'23", rev: 81.8, g: -1.4 }, { q: "Q4'23", rev: 89.5, g: 2.8 }, { q: "Q1'24", rev: 119.6, g: 2.1 }, { q: "Q2'24", rev: 90.8, g: 4.9 }, { q: "Q3'24", rev: 85.8, g: 5.0 }, { q: "Q4'24", rev: 94.9, g: 6.1 }] },
  MSFT: { grossMargin: 70.1, netMargin: 35.9, roe: 37.8, de: 0.31, revenueGrowth: 15.2, epsGrowth: 20.1, currentRatio: 1.30, rev: "245B", opInc: "109B", pe: 35.2, pb: 13.1, eps: 12.93, sector: "Technology", consensus: { buy: 35, hold: 7, sell: 1 }, news: [{ title: "Azure, AI 수요 급증에 힘입어 성장세 재가속", time: "3시간 전", src: "CNBC", url: "https://cnbc.com" }, { title: "Copilot+ PC, 전 세계 출시 라인업 대폭 확대", time: "1일 전", src: "Bloomberg", url: "https://bloomberg.com" }, { title: "마이크로소프트, 배당금 10% 인상 발표", time: "3일 전", src: "Reuters", url: "https://reuters.com" }], events: [{ date: "2025-07-30", event: "Q4 실적발표" }, { date: "2025-09-18", event: "배당락일" }], qrev: [{ q: "Q1'23", rev: 52.7, g: 7 }, { q: "Q2'23", rev: 56.2, g: 8 }, { q: "Q3'23", rev: 56.5, g: 8 }, { q: "Q4'23", rev: 62, g: 12 }, { q: "Q1'24", rev: 61.9, g: 17 }, { q: "Q2'24", rev: 64.7, g: 15 }, { q: "Q3'24", rev: 65.6, g: 16 }, { q: "Q4'24", rev: 69.6, g: 16 }] },
  NVDA: { grossMargin: 76.3, netMargin: 55.2, roe: 123.5, de: 0.41, revenueGrowth: 122.4, epsGrowth: 288, currentRatio: 4.17, rev: "113B", opInc: "71B", pe: 45.8, pb: 52.6, eps: 2.94, sector: "Semiconductors", consensus: { buy: 42, hold: 6, sell: 0 }, news: [{ title: "Blackwell GPU, 공급 대비 수요가 압도적으로 초과", time: "1시간 전", src: "Bloomberg", url: "https://bloomberg.com" }, { title: "데이터센터 매출, 사상 최고치 경신", time: "5시간 전", src: "Reuters", url: "https://reuters.com" }, { title: "젠슨 황 CEO, 차세대 AI 칩 로드맵 공개 시연", time: "2일 전", src: "WSJ", url: "https://wsj.com" }], events: [{ date: "2025-05-28", event: "Q1 실적발표" }, { date: "2025-06-10", event: "배당락일" }], qrev: [{ q: "Q1'23", rev: 7.2, g: -13 }, { q: "Q2'23", rev: 13.5, g: 88 }, { q: "Q3'23", rev: 18.1, g: 206 }, { q: "Q4'23", rev: 22.1, g: 265 }, { q: "Q1'24", rev: 26, g: 262 }, { q: "Q2'24", rev: 30, g: 122 }, { q: "Q3'24", rev: 35.1, g: 94 }, { q: "Q4'24", rev: 39.3, g: 78 }] },
  GOOGL: { grossMargin: 57.3, netMargin: 24, roe: 31.5, de: 0.07, revenueGrowth: 13.9, epsGrowth: 31.4, currentRatio: 2.1, rev: "350B", opInc: "104B", pe: 21.4, pb: 6.8, eps: 8.04, sector: "Communication", consensus: { buy: 38, hold: 8, sell: 1 }, news: [{ title: "AI 통합 이후 구글 검색 광고 매출 회복세 전환", time: "4시간 전", src: "FT", url: "https://ft.com" }, { title: "Waymo 자율주행, 10개 신규 도시로 서비스 확대", time: "1일 전", src: "Reuters", url: "https://reuters.com" }, { title: "유튜브 광고 매출, 넷플릭스 전체 매출 초과 달성", time: "3일 전", src: "CNBC", url: "https://cnbc.com" }], events: [{ date: "2025-07-29", event: "Q2 실적발표" }, { date: "2025-09-09", event: "배당락일" }], qrev: [{ q: "Q1'23", rev: 69.8, g: 3 }, { q: "Q2'23", rev: 74.6, g: 7 }, { q: "Q3'23", rev: 76.7, g: 11 }, { q: "Q4'23", rev: 86.3, g: 13 }, { q: "Q1'24", rev: 80.5, g: 15 }, { q: "Q2'24", rev: 84.7, g: 14 }, { q: "Q3'24", rev: 88.3, g: 15 }, { q: "Q4'24", rev: 96.5, g: 12 }] },
  AMZN: { grossMargin: 49.3, netMargin: 5.3, roe: 22, de: 0.56, revenueGrowth: 10.9, epsGrowth: 202, currentRatio: 1.05, rev: "638B", opInc: "68B", pe: 43.6, pb: 8.2, eps: 5.53, sector: "Consumer", consensus: { buy: 44, hold: 5, sell: 0 }, news: [{ title: "AWS, AI 워크로드 급증으로 전년 대비 17% 성장 달성", time: "2시간 전", src: "Bloomberg", url: "https://bloomberg.com" }, { title: "아마존 프라임 회원수, 전 세계 2억 3천만 명 돌파", time: "1일 전", src: "WSJ", url: "https://wsj.com" }, { title: "물류 단위당 비용, 역대 최저 수준 달성", time: "4일 전", src: "Reuters", url: "https://reuters.com" }], events: [{ date: "2025-08-01", event: "Q2 실적발표" }, { date: "2025-06-01", event: "주주총회" }], qrev: [{ q: "Q1'23", rev: 127.4, g: 9 }, { q: "Q2'23", rev: 134.4, g: 11 }, { q: "Q3'23", rev: 143.1, g: 13 }, { q: "Q4'23", rev: 169.9, g: 14 }, { q: "Q1'24", rev: 143.3, g: 13 }, { q: "Q2'24", rev: 148, g: 10 }, { q: "Q3'24", rev: 159, g: 11 }, { q: "Q4'24", rev: 187.8, g: 10 }] }
};
const FG = { value: 34, prev: 42, weekAgo: 28, monthAgo: 61, yearAgo: 72, components: [{ name: "모멘텀 (S&P 500)", value: 38, signal: "Fear" }, { name: "주가 강도", value: 29, signal: "Extreme Fear" }, { name: "주가 폭", value: 45, signal: "Fear" }, { name: "풋/콜 비율", value: 31, signal: "Fear" }, { name: "VIX 변동성", value: 26, signal: "Extreme Fear" }, { name: "정크본드 수요", value: 48, signal: "Neutral" }, { name: "안전자산 수요", value: 22, signal: "Extreme Fear" }] };

/* ── Storage: window.storage → localStorage ──────────────── */
const sGet = k => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch { return null; } };
const sSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } };
const loadUsers = () => sGet("users") || {};
const saveUsers = u => sSet("users", u);
const loadUD = uid => sGet("u:" + uid);
const saveUD = (uid, d) => sSet("u:" + uid, d);

/* ── API: Yahoo Finance (server-side routes) ──────────────── */
function fmtNum(n) { if (!n) return "—"; if (n >= 1e12) return (n / 1e12).toFixed(2) + "T"; if (n >= 1e9) return (n / 1e9).toFixed(1) + "B"; if (n >= 1e6) return (n / 1e6).toFixed(1) + "M"; return String(n); }

async function apiQuotes(symbols) {
  try {
    const res = await fetch("/api/quotes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbols }) });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function apiChart(sym, period) {
  try {
    const res = await fetch("/api/chart", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbol: sym, period }) });
    if (!res.ok) return [];
    const data = await res.json();
    const prices = data.prices || [];
    return prices.map(p => typeof p === "object" ? p.close : p);
  } catch { return []; }
}

async function apiSearch(q) {
  if (!q.trim()) return [];
  try {
    const res = await fetch("/api/search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: q }) });
    if (!res.ok) return [];
    return await res.json();
  } catch { return []; }
}

async function apiNews(sym) {
  try {
    const res = await fetch("/api/news", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbol: sym }) });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function apiFearGreed() {
  try {
    const res = await fetch("/api/feargreed");
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

/* ── Market Clock ─────────────────────────────────────────── */
function useMarketClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  const isDST = d => { const a = new Date(d.getFullYear(), 0, 1).getTimezoneOffset(), b = new Date(d.getFullYear(), 6, 1).getTimezoneOffset(); return d.getTimezoneOffset() < Math.max(a, b); };
  const off = isDST(now) ? -4 : -5;
  const et = new Date(now.getTime() + now.getTimezoneOffset() * 60000 + off * 3600000);
  const day = et.getDay(), H = et.getHours(), M = et.getMinutes(), S = et.getSeconds();
  const tot = H * 3600 + M * 60 + S, PS = 14400, OS = 34200, CS = 57600, AS = 72000;
  let status, remaining, pct = 0;
  if (day === 0 || day === 6) { status = "weekend"; remaining = (day === 0 ? 1 : 2) * 86400 + OS - tot; }
  else if (tot < PS) { status = "closed_night"; remaining = PS - tot; }
  else if (tot < OS) { status = "premarket"; remaining = OS - tot; pct = (tot - PS) / (OS - PS) * 100; }
  else if (tot < CS) { status = "open"; remaining = CS - tot; pct = (tot - OS) / (CS - OS) * 100; }
  else if (tot < AS) { status = "aftermarket"; remaining = AS - tot; pct = (tot - CS) / (AS - CS) * 100; }
  else { status = "closed_night"; remaining = 86400 - tot + PS; }
  const fmt = s => { const a = Math.abs(s), h = Math.floor(a / 3600), m = String(Math.floor(a % 3600 / 60)).padStart(2, "0"), ss = String(a % 60).padStart(2, "0"); return h > 0 ? `${h}h ${m}m ${ss}s` : `${m}m ${ss}s`; };
  const etStr = `${String(H).padStart(2, "0")}:${String(M).padStart(2, "0")}:${String(S).padStart(2, "0")} ET`;
  return { status, remaining, pct: Math.min(100, Math.max(0, pct)), fmt, etStr };
}

function useIsMobile() {
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return mobile;
}

/* ── Canvas ───────────────────────────────────────────────── */
function PriceChart({ data, positive, dark }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c || !data || !data.length) return;
    const dpr = window.devicePixelRatio || 1, W = c.offsetWidth, H = c.offsetHeight; if (!W || !H) return;
    c.width = W * dpr; c.height = H * dpr;
    const ctx = c.getContext("2d"); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, W, H);
    const pL = 52, pR = 12, pT = 10, pB = 26, cW = W - pL - pR, cH = H - pT - pB;
    const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
    const col = positive ? "#10b981" : "#f43f5e", tc = dark ? "rgba(255,255,255,0.32)" : "rgba(0,0,0,0.28)", gc = dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";
    for (let i = 0; i <= 4; i++) { const y = pT + cH / 4 * i; ctx.beginPath(); ctx.moveTo(pL, y); ctx.lineTo(pL + cW, y); ctx.strokeStyle = gc; ctx.lineWidth = 0.5; ctx.stroke(); const v = mx - rng / 4 * i; ctx.fillStyle = tc; ctx.font = "10px system-ui"; ctx.textAlign = "right"; ctx.fillText(v >= 1000 ? v.toFixed(0) : v.toFixed(2), pL - 4, y + 3.5); }
    const pts = data.map((v, i) => [pL + i / (data.length - 1) * cW, pT + (mx - v) / rng * cH]);
    const g = ctx.createLinearGradient(0, pT, 0, pT + cH); g.addColorStop(0, col + (dark ? "33" : "22")); g.addColorStop(1, col + "00");
    ctx.beginPath(); ctx.moveTo(pts[0][0], pT + cH); pts.forEach(([x, y]) => ctx.lineTo(x, y)); ctx.lineTo(pts[pts.length - 1][0], pT + cH); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)); ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.stroke();
    const [lx, ly] = pts[pts.length - 1]; ctx.beginPath(); ctx.arc(lx, ly, 3.5, 0, Math.PI * 2); ctx.fillStyle = col; ctx.fill();
    const lc = Math.min(6, data.length); for (let i = 0; i < lc; i++) { const idx = Math.round(i / (lc - 1) * (data.length - 1)); ctx.fillStyle = tc; ctx.font = "9px system-ui"; ctx.textAlign = "center"; ctx.fillText(String(idx + 1), pL + idx / (data.length - 1) * cW, H - pB + 14); }
  }, [data, positive, dark]);
  return <div style={{ width: "100%", height: 200 }}><canvas ref={ref} style={{ width: "100%", height: "100%", display: "block" }} /></div>;
}

function RevCanvas({ data, dark }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c || !data.length) return;
    const dpr = window.devicePixelRatio || 1, W = c.offsetWidth, H = c.offsetHeight; if (!W || !H) return;
    c.width = W * dpr; c.height = H * dpr; const ctx = c.getContext("2d"); ctx.scale(dpr, dpr); ctx.clearRect(0, 0, W, H);
    const pL = 48, pR = 12, pT = 26, pB = 40, cW = W - pL - pR, cH = H - pT - pB, n = data.length, gap = cW / n, bw = Math.min(20, gap * .48);
    const maxR = Math.max(...data.map(d => d.rev)), gs = data.map(d => d.g), minG = Math.min(...gs), maxG = Math.max(...gs), gR = maxG - minG || 1;
    const tc = dark ? "rgba(255,255,255,0.38)" : "rgba(0,0,0,0.35)", gc = dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)", bc = dark ? "#60a5fa" : "#3b82f6";
    for (let i = 0; i <= 4; i++) { const y = pT + cH / 4 * i; ctx.beginPath(); ctx.moveTo(pL, y); ctx.lineTo(pL + cW, y); ctx.strokeStyle = gc; ctx.lineWidth = 0.5; ctx.stroke(); ctx.fillStyle = tc; ctx.font = "10px system-ui"; ctx.textAlign = "right"; ctx.fillText(Math.round(maxR - maxR / 4 * i) + "B", pL - 6, y + 3.5); }
    const lpts = data.map((d, i) => { const x = pL + gap * i + gap / 2, bH = (d.rev / maxR) * cH, bY = pT + cH - bH, g2 = ctx.createLinearGradient(0, bY, 0, pT + cH); g2.addColorStop(0, bc); g2.addColorStop(1, dark ? "rgba(96,165,250,0.15)" : "rgba(59,130,246,0.12)"); ctx.fillStyle = g2; ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x - bw / 2, bY, bw, bH, 3); else ctx.rect(x - bw / 2, bY, bw, bH); ctx.fill(); ctx.fillStyle = tc; ctx.font = "9px system-ui"; ctx.textAlign = "center"; ctx.fillText(d.q, x, H - pB + 14); return [x, pT + cH - (d.g - minG) / gR * cH, d.g]; });
    ctx.beginPath(); lpts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)); ctx.strokeStyle = "#10b981"; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.stroke();
    lpts.forEach(([x, y, g]) => { ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2); ctx.fillStyle = g >= 0 ? "#10b981" : "#f43f5e"; ctx.fill(); ctx.fillStyle = g >= 0 ? "#10b981" : "#f43f5e"; ctx.font = "bold 8.5px system-ui"; ctx.textAlign = "center"; ctx.fillText((g > 0 ? "+" : "") + g + "%", x, y - 8); });
  }, [data, dark]);
  return <div style={{ width: "100%", height: 200 }}><canvas ref={ref} style={{ width: "100%", height: "100%", display: "block" }} /></div>;
}

function RadarSVG({ scores, dark }) {
  const labels = ["수익성", "성장성", "안정성", "밸류", "EPS성장"], n = labels.length, cx = 110, cy = 105, r = 78;
  const ang = i => -Math.PI / 2 + Math.PI * 2 / n * i, pt = (i, v) => [cx + v / 100 * r * Math.cos(ang(i)), cy + v / 100 * r * Math.sin(ang(i))];
  const ov = Math.round(scores.reduce((a, b) => a + b, 0) / n), col = ov >= 70 ? "#10b981" : ov >= 45 ? "#f59e0b" : "#f43f5e", sc = v => v >= 70 ? "#10b981" : v >= 45 ? "#f59e0b" : "#f43f5e";
  const gc = dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)", tc = dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)";
  return (
    <svg viewBox="0 0 220 210" width="100%" height="210">
      {[25, 50, 75, 100].map(lv => <polygon key={lv} points={labels.map((_, i) => pt(i, lv).join(",")).join(" ")} fill="none" stroke={gc} strokeWidth={0.6} />)}
      {labels.map((_, i) => { const [x, y] = pt(i, 100); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={gc} strokeWidth={0.6} />; })}
      <polygon points={scores.map((s, i) => pt(i, s).join(",")).join(" ")} fill={dark ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.12)"} stroke="#3b82f6" strokeWidth={1.8} />
      {scores.map((s, i) => { const [x, y] = pt(i, s); return <circle key={i} cx={x} cy={y} r={4} fill={sc(s)} />; })}
      {labels.map((l, i) => { const [x, y] = pt(i, 125); return <text key={i} x={x} y={y} textAnchor={x < cx - 4 ? "end" : x > cx + 4 ? "start" : "middle"} fontSize={10} fill={tc} dominantBaseline="middle" fontWeight={500}>{l}</text>; })}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize={22} fontWeight={600} fill={col}>{ov}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize={9} fill={dark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)"}>종합</text>
    </svg>
  );
}

function FGGauge({ data, C, dark }) {
  const value = data.value;
  const gl = v => v <= 25 ? "극단적 공포" : v <= 45 ? "공포" : v <= 55 ? "중립" : v <= 75 ? "탐욕" : "극단적 탐욕";
  const gc = v => v <= 25 ? "#f43f5e" : v <= 45 ? "#f97316" : v <= 55 ? "#f59e0b" : v <= 75 ? "#84cc16" : "#10b981";
  const col = gc(value), toR = d => d * Math.PI / 180, cx = 100, cy = 88, r = 68;
  const arc = (a1, a2) => { const x1 = cx + r * Math.cos(toR(a1)), y1 = cy + r * Math.sin(toR(a1)), x2 = cx + r * Math.cos(toR(a2)), y2 = cy + r * Math.sin(toR(a2)); return `M${x1} ${y1}A${r} ${r} 0 ${Math.abs(a2 - a1) > 180 ? 1 : 0} 1 ${x2} ${y2}`; };
  const fe = -135 + value / 100 * 270, nx = cx + (r - 10) * Math.cos(toR(fe)), ny = cy + (r - 10) * Math.sin(toR(fe));
  const tc = dark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg viewBox="0 0 200 120" width="100%" height="120">
        {[[-135, -81, "#f43f5e"], [-81, -27, "#f97316"], [-27, 27, "#f59e0b"], [27, 81, "#84cc16"], [81, 135, "#10b981"]].map(([a1, a2, c], i) => <path key={i} d={arc(a1, a2)} fill="none" stroke={c} strokeWidth={11} strokeLinecap="butt" opacity={0.22} />)}
        <path d={arc(-135, fe)} fill="none" stroke={col} strokeWidth={11} strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={dark ? "#eee" : "#1e293b"} strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={5} fill={dark ? "#eee" : "#1e293b"} />
        <text x={cx} y={cy + 22} textAnchor="middle" fontSize={24} fontWeight={800} fill={col}>{value}</text>
        <text x={cx} y={cy + 37} textAnchor="middle" fontSize={10} fontWeight={700} fill={col}>{gl(value)}</text>
        {["극단공포", "공포", "중립", "탐욕", "극단탐욕"].map((l, i) => { const a = toR(-135 + i * 67.5); return <text key={i} x={cx + (r + 15) * Math.cos(a)} y={cy + (r + 15) * Math.sin(a)} textAnchor="middle" fontSize={7} fill={tc} dominantBaseline="middle">{l}</text>; })}
      </svg>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 5, width: "100%" }}>
        {[["어제", data.prev], ["1주전", data.weekAgo], ["1달전", data.monthAgo], ["1년전", data.yearAgo]].map(([l, v]) => (
          v != null && <div key={l} style={{ textAlign: "center", padding: "5px 2px", borderRadius: 8, background: C.s2 }}>
            <div style={{ fontSize: 9, color: C.m, marginBottom: 1 }}>{l}</div>
            <div style={{ fontSize: 13, fontWeight: 800, color: gc(v) }}>{v}</div>
            <div style={{ fontSize: 7, color: gc(v), fontWeight: 600 }}>{gl(v)}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MktRow({ item, C }) {
  if (!item) return null;
  const pos = (item.change || 0) >= 0, p = item.price;
  const disp = !p ? "—" : p >= 10000 ? p.toFixed(1) : p >= 100 ? p.toFixed(2) : p.toFixed(3);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderTop: `1px solid ${C.b}` }}>
      <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 700, color: C.t }}>{item.name}</div><div style={{ fontSize: 9, color: C.m }}>{item.symbol}</div></div>
      <div style={{ textAlign: "right", minWidth: 90 }}><div style={{ fontSize: 13, fontWeight: 800, color: C.t }}>{disp}</div><div style={{ fontSize: 10, fontWeight: 700, color: pos ? "#10b981" : "#f43f5e" }}>{pos ? "▲ " : "▼ "}{Math.abs(item.changePct || 0).toFixed(2)}%</div></div>
    </div>
  );
}

function ClockBar({ C, dark, indices }) {
  const { status, remaining, pct, fmt, etStr } = useMarketClock();
  const INFO = { open: { label: "장 마감까지", color: "#10b981", bg: dark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.1)", badge: "거래중" }, premarket: { label: "정규장 개장까지", color: "#f59e0b", bg: dark ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.1)", badge: "프리마켓" }, aftermarket: { label: "애프터마켓 종료까지", color: "#8b5cf6", bg: dark ? "rgba(139,92,246,0.15)" : "rgba(139,92,246,0.1)", badge: "애프터마켓" }, closed_night: { label: "프리마켓 시작까지", color: "#64748b", bg: dark ? "rgba(100,116,139,0.15)" : "rgba(100,116,139,0.1)", badge: "장 마감" }, weekend: { label: "월요일 개장까지", color: "#64748b", bg: dark ? "rgba(100,116,139,0.15)" : "rgba(100,116,139,0.1)", badge: "주말 휴장" } };
  const s = INFO[status] || INFO.closed_night;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 2, flexWrap: "wrap" }}>
      <span style={{ fontSize: 18, fontWeight: 800, color: C.t }}>시장 현황</span>
      <span style={{ fontSize: 12, color: C.m }}>Market Overview</span>
      <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: s.bg, border: `1px solid ${s.color}44` }}>
        <span style={{ width: 7, height: 7, borderRadius: "50%", background: s.color, display: "inline-block", boxShadow: status === "open" ? `0 0 0 3px ${s.color}44` : "none" }} />
        <span style={{ fontSize: 11, fontWeight: 700, color: s.color }}>{s.badge}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 230 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 10, color: C.m }}>{s.label}</span>
          <span style={{ fontSize: 13, fontWeight: 800, color: s.color, fontVariantNumeric: "tabular-nums" }}>{fmt(remaining)}</span>
        </div>
        {["open", "premarket", "aftermarket"].includes(status) && <div style={{ height: 4, background: dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", borderRadius: 2, overflow: "hidden" }}><div style={{ height: "100%", width: `${pct}%`, background: s.color, borderRadius: 2, transition: "width 1s linear" }} /></div>}
      </div>
      <div style={{ padding: "4px 10px", background: C.s2, borderRadius: 8, fontSize: 11, fontWeight: 600, color: C.m, fontVariantNumeric: "tabular-nums" }}>{etStr}</div>
      <div style={{ marginLeft: "auto", display: "flex", gap: 7 }}>
        {indices.map(idx => (
          <div key={idx.symbol} style={{ background: C.s2, borderRadius: 10, padding: "5px 11px", textAlign: "center" }}>
            <div style={{ fontSize: 9, color: C.m, fontWeight: 600 }}>{idx.symbol}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: (idx.change || 0) >= 0 ? "#10b981" : "#f43f5e" }}>{(idx.change || 0) >= 0 ? "▲ " : "▼ "}{Math.abs(idx.changePct || 0).toFixed(2)}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Sk({ w = "100%", h = 16, r = 6 }) { return <div style={{ width: w, height: h, borderRadius: r, background: "linear-gradient(90deg,rgba(128,128,128,0.12) 25%,rgba(128,128,128,0.06) 50%,rgba(128,128,128,0.12) 75%)", backgroundSize: "200% 100%" }} />; }

/* ── Login ────────────────────────────────────────────────── */
function Login({ onLogin, dark, setDark }) {
  const [mode, setMode] = useState("login"), [id, setId] = useState(""), [pw, setPw] = useState(""), [pw2, setPw2] = useState(""), [err, setErr] = useState(""), [loading, setLoading] = useState(false);
  const bg = dark ? "#0d0f18" : "#f1f5f9", sf = dark ? "#161929" : "#fff", s2 = dark ? "#1e2235" : "#f1f5f9", b2 = dark ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.1)", tc = dark ? "#eef0f8" : "#0f172a", mc = dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.42)", acc = "#3b82f6";
  const submit = () => {
    setErr(""); setLoading(true); const tid = id.trim();
    if (!tid || !pw) { setErr("아이디와 비밀번호를 입력하세요."); setLoading(false); return; }
    if (tid.length < 2) { setErr("아이디는 2자 이상이어야 합니다."); setLoading(false); return; }
    if (pw.length < 4) { setErr("비밀번호는 4자 이상이어야 합니다."); setLoading(false); return; }
    const users = loadUsers();
    if (mode === "signup") {
      if (pw !== pw2) { setErr("비밀번호가 일치하지 않습니다."); setLoading(false); return; }
      if (users[tid]) { setErr("이미 존재하는 아이디입니다."); setLoading(false); return; }
      users[tid] = pw; saveUsers(users); saveUD(tid, { favorites: ["AAPL", "MSFT", "NVDA"], dark: false }); onLogin(tid);
    } else {
      if (!users[tid] || users[tid] !== pw) { setErr("아이디 또는 비밀번호가 올바르지 않습니다."); setLoading(false); return; }
      onLogin(tid);
    }
    setLoading(false);
  };
  const inp = { width: "100%", fontSize: 13, padding: "10px 12px", background: s2, border: `1px solid ${b2}`, borderRadius: 10, color: tc, outline: "none" };
  return (
    <div style={{ width: "100vw", height: "100vh", background: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 360, background: sf, borderRadius: 20, border: `1px solid ${b2}`, padding: "36px 32px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}><div style={{ fontSize: 28, fontWeight: 900, color: acc, letterSpacing: "-1px" }}>US Stocks</div><div style={{ fontSize: 12, color: mc, marginTop: 4 }}>미국 주식 대시보드</div></div>
        <div style={{ display: "flex", background: s2, borderRadius: 10, padding: 3, marginBottom: 24 }}>
          {[["login", "로그인"], ["signup", "회원가입"]].map(([m, l]) => <button key={m} onClick={() => { setMode(m); setErr(""); }} style={{ flex: 1, padding: "8px 0", fontSize: 12, fontWeight: mode === m ? 700 : 500, border: "none", borderRadius: 8, background: mode === m ? sf : "transparent", color: mode === m ? tc : mc }}>{l}</button>)}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div><div style={{ fontSize: 11, fontWeight: 600, color: mc, marginBottom: 5 }}>아이디</div><input value={id} onChange={e => setId(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="아이디 입력" style={inp} /></div>
          <div><div style={{ fontSize: 11, fontWeight: 600, color: mc, marginBottom: 5 }}>비밀번호</div><input type="password" value={pw} onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="비밀번호 (4자 이상)" style={inp} /></div>
          {mode === "signup" && <div><div style={{ fontSize: 11, fontWeight: 600, color: mc, marginBottom: 5 }}>비밀번호 확인</div><input type="password" value={pw2} onChange={e => setPw2(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="비밀번호 재입력" style={inp} /></div>}
          {err && <div style={{ fontSize: 12, color: "#f43f5e", fontWeight: 600, padding: "8px 12px", background: "rgba(244,63,94,0.1)", borderRadius: 8 }}>{err}</div>}
          <button onClick={submit} disabled={loading} style={{ marginTop: 4, padding: "12px 0", fontSize: 13, fontWeight: 700, borderRadius: 12, border: "none", background: acc, color: "#fff", opacity: loading ? 0.7 : 1 }}>{loading ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}</button>
        </div>
        <div style={{ marginTop: 18, padding: "12px 14px", background: s2, borderRadius: 10, fontSize: 11, color: mc, lineHeight: 1.6 }}><b style={{ color: tc }}>데모 계정</b> — 아이디: <b style={{ color: acc }}>demo</b> / 비밀번호: <b style={{ color: acc }}>1234</b></div>
        <div style={{ textAlign: "center", marginTop: 12 }}><button onClick={() => setDark(p => !p)} style={{ background: "none", border: `1px solid ${b2}`, borderRadius: 8, padding: "6px 14px", fontSize: 11, color: mc }}>{dark ? "☀ 라이트모드" : "☾ 다크모드"}</button></div>
      </div>
    </div>
  );
}

/* ── Dashboard ────────────────────────────────────────────── */
function Dashboard({ user, onLogout }) {
  const [dark, setDarkRaw] = useState(() => { try { const d = JSON.parse(localStorage.getItem("u:" + user)); return d?.dark ?? false; } catch { return false; } });
  const [favorites, setFavRaw] = useState(() => { try { const d = JSON.parse(localStorage.getItem("u:" + user)); return d?.favorites || ["AAPL", "MSFT", "NVDA"]; } catch { return ["AAPL", "MSFT", "NVDA"]; } });
  const [selected, setSelected] = useState("AAPL");
  const [tab, setTab] = useState("market");
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [period, setPeriod] = useState("3M");
  const [search, setSearch] = useState("");
  const [searchRes, setSearchRes] = useState([]);
  const [focused, setFocused] = useState(false);
  const [quotes, setQuotes] = useState({});
  const [mktData, setMktData] = useState({});
  const [fgData, setFgData] = useState(FG);
  const [chartData, setChartData] = useState([]);
  const [chartLoading, setChartLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [apiError, setApiError] = useState(false);
  const [newsData, setNewsData] = useState(null);
  const [newsLoading, setNewsLoading] = useState(false);
  const chartCache = useRef({});
  const searchTimer = useRef(null);
  const persistTimer = useRef(null);
  const favRef = useRef(favorites);
  const darkRef = useRef(dark);
  favRef.current = favorites; darkRef.current = dark;

  useEffect(() => { document.documentElement.setAttribute("data-dark", dark); }, [dark]);

  const persist = (f, dk) => { clearTimeout(persistTimer.current); persistTimer.current = setTimeout(() => saveUD(user, { favorites: f, dark: dk }), 500); };
  const setDark = v => setDarkRaw(prev => { const nv = typeof v === "function" ? v(prev) : v; persist(favRef.current, nv); return nv; });
  const setFavorites = v => setFavRaw(prev => { const nv = typeof v === "function" ? v(prev) : v; persist(nv, darkRef.current); return nv; });

  const allSyms = [...POPULAR, ...MKT_SYMS.indices, ...MKT_SYMS.commodities, ...MKT_SYMS.bonds, ...MKT_SYMS.rates];

  const refresh = useCallback(() => {
    apiQuotes(allSyms).then(res => {
      if (res) {
        const sq = {}, mq = {};
        Object.keys(res).forEach(s => { if (POPULAR.includes(s)) sq[s] = res[s]; else mq[s] = res[s]; });
        setQuotes(q => ({ ...q, ...sq })); setMktData(m => ({ ...m, ...mq }));
        setLastUpdated(new Date()); setApiError(false);
      } else { setApiError(true); }
      setDataLoading(false);
    });
  }, []);

  useEffect(() => {
    const users = loadUsers();
    if (!users.demo) { users.demo = "1234"; saveUsers(users); saveUD("demo", { favorites: ["NVDA", "GOOGL", "AMZN"], dark: false }); }
    refresh();
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [refresh]);

  useEffect(() => {
    if (!selected) return; const key = `${selected}_${period}`;
    if (chartCache.current[key]) { setChartData(chartCache.current[key]); return; }
    setChartLoading(true);
    apiChart(selected, period).then(d => { if (d.length) { chartCache.current[key] = d; setChartData(d); } setChartLoading(false); });
  }, [selected, period]);

  useEffect(() => {
    if (!selected) return;
    setNewsData(null);
    setNewsLoading(true);
    apiNews(selected).then(d => { setNewsData(d); setNewsLoading(false); });
  }, [selected]);

  useEffect(() => {
    const loadFG = () => apiFearGreed().then(d => { if (d) setFgData(f => ({ ...f, ...d })); });
    loadFG();
    const t = setInterval(loadFG, 300000);
    return () => clearInterval(t);
  }, []);

  const handleSearch = v => {
    setSearch(v); clearTimeout(searchTimer.current);
    if (!v.trim()) { setSearchRes([]); return; }
    setSearchRes([{ ticker: "__loading__", name: "검색 중...", exchange: "" }]);
    searchTimer.current = setTimeout(() => {
      apiSearch(v).then(r => {
        if (r && r.length > 0) setSearchRes(r);
        else setSearchRes([{ ticker: "__none__", name: "결과 없음", exchange: "" }]);
      });
    }, 400);
  };

  const selectTicker = t => {
    setSelected(t); setSearch(""); setSearchRes([]);
    setFavRaw(prev => { if (prev.includes(t)) return prev; const nv = [...prev, t]; persist(nv, darkRef.current); return nv; });
    setTab(prev => prev === "market" ? "overview" : prev);
    setQuotes(prev => { if (!prev[t]) apiQuotes([t]).then(res => { if (res) setQuotes(p => ({ ...p, ...res })); }); return prev; });
  };

  const toggleFav = t => setFavorites(f => f.includes(t) ? f.filter(x => x !== t) : [...f, t]);

  const lq = quotes[selected] || {}, fund = FUND[selected] || {};
  const d = { name: lq.name || selected, price: lq.price || 0, change: lq.change || 0, changePct: lq.changePct || 0, mktCap: fmtNum(lq.mktCap), pe: lq.pe != null ? lq.pe.toFixed(1) : (fund.pe != null ? fund.pe.toFixed(1) : "—"), eps: lq.eps != null ? lq.eps.toFixed(2) : (fund.eps != null ? fund.eps.toFixed(2) : "—"), pb: lq.pb != null ? lq.pb.toFixed(1) : (fund.pb != null ? fund.pb.toFixed(1) : "—"), sector: fund.sector || "" };
  const pos = (d.change || 0) >= 0;

  const C = { bg: dark ? "#0d0f18" : "#f1f5f9", sf: dark ? "#161929" : "#fff", s2: dark ? "#1e2235" : "#f1f5f9", b: dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)", b2: dark ? "rgba(255,255,255,0.13)" : "rgba(0,0,0,0.1)", t: dark ? "#eef0f8" : "#0f172a", m: dark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.42)", sub: dark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)", acc: "#3b82f6", g: "#10b981", r: "#f43f5e", am: "#f59e0b" };
  const sc = v => v >= 70 ? C.g : v >= 45 ? C.am : C.r;
  const sbg = v => v >= 70 ? (dark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.1)") : v >= 45 ? (dark ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.1)") : (dark ? "rgba(244,63,94,0.15)" : "rgba(244,63,94,0.1)");

  const prof = Math.round((fund.grossMargin || 0) / 100 * 30 + (fund.netMargin || 0) / 50 * 40 + Math.min(fund.roe || 0, 150) / 150 * 30);
  const grow = Math.round(Math.min(100, (fund.revenueGrowth || 0) / 20 * 50 + Math.min(fund.epsGrowth || 0, 100) / 100 * 50));
  const stab = Math.min(100, Math.round(80 - Math.min(60, (fund.de || 0) * 20) + ((fund.currentRatio || 0) > 1 ? 15 : 0)));
  const valu = Math.round(Math.max(0, 100 - (parseFloat(d.pe) || 50) * 1.2));
  const epsg = Math.min(100, Math.round((fund.epsGrowth || 0) / 3 + 30));
  const scores = [prof, grow, stab, valu, epsg], overall = Math.round(scores.reduce((a, b) => a + b, 0) / 5);
  const tot = (fund.consensus?.buy || 0) + (fund.consensus?.hold || 0) + (fund.consensus?.sell || 0) || 1;
  const currentNews = (newsData && newsData.length > 0) ? newsData : (fund.news || []);
  const buyPct = Math.round((fund.consensus?.buy || 0) / tot * 100), holdPct = Math.round((fund.consensus?.hold || 0) / tot * 100), sellPct = 100 - buyPct - holdPct;
  const targetPrice = lq.price ? +(lq.price * 1.10).toFixed(0) : null;

  const getMkt = sym => { const q = mktData[sym], m = META[sym] || { name: sym, symbol: sym }; return q ? { ...m, price: q.price, change: q.change, changePct: q.changePct } : { ...m, price: null, change: 0, changePct: 0 }; };
  const indices = MKT_SYMS.indices.map(getMkt), commodities = MKT_SYMS.commodities.map(getMkt), bonds = MKT_SYMS.bonds.map(getMkt), rates = MKT_SYMS.rates.map(getMkt);

  const TABS = [["market", "시장현황"], ["overview", "개요"], ["fund", "펀더멘탈"], ["fin", "재무지표"], ["news", "뉴스"], ["cal", "일정"]];
  const card = { background: C.sf, border: `1px solid ${C.b}`, borderRadius: 14, padding: "16px 18px" };
  const scard = { background: C.sf, border: `1px solid ${C.b}`, borderRadius: 12, padding: "12px 14px" };
  const avatarColor = ["#3b82f6", "#10b981", "#f59e0b", "#f43f5e", "#8b5cf6", "#06b6d4"][user.charCodeAt(0) % 6];

  return (
    <div style={{ display: "flex", height: "100vh", background: C.bg, overflow: "hidden", fontFamily: "-apple-system,'Segoe UI',sans-serif" }}>
      {/* Mobile backdrop */}
      {isMobile && sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99 }} />}
      {/* Sidebar */}
      <div style={{ width: 220, background: C.sf, borderRight: `1px solid ${C.b}`, display: "flex", flexDirection: "column", flexShrink: 0, ...(isMobile ? { position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 100, transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)", transition: "transform 0.25s ease", width: 260 } : {}) }}>
        <div style={{ padding: "14px 12px 10px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.t }}>US Stocks</span>
            <button onClick={() => setDark(p => !p)} style={{ background: C.s2, border: `1px solid ${C.b}`, borderRadius: 8, width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: C.t }}>{dark ? "☀" : "☾"}</button>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: C.s2, borderRadius: 10, marginBottom: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: avatarColor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, color: "#fff", flexShrink: 0 }}>{user.slice(0, 2).toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontSize: 12, fontWeight: 700, color: C.t, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user}</div><div style={{ fontSize: 9, color: C.m }}>{lastUpdated ? lastUpdated.toLocaleTimeString("ko-KR") + " 업데이트" : "로딩 중..."}</div></div>
            <button onClick={onLogout} style={{ background: "none", border: "none", fontSize: 14, color: C.m, padding: 2 }}>⏏</button>
          </div>
          <div style={{ position: "relative" }}>
            <input value={search} onChange={e => handleSearch(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => setTimeout(() => setFocused(false), 200)} placeholder="🔍  종목 검색" style={{ width: "100%", fontSize: 12, padding: "8px 10px", background: C.s2, border: `1px solid ${C.b}`, borderRadius: 9, color: C.t, outline: "none" }} />
            {search.trim() && focused && (
              <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: C.sf, border: `1px solid ${C.b2}`, borderRadius: 10, zIndex: 50, overflow: "hidden", boxShadow: dark ? "0 8px 24px rgba(0,0,0,0.5)" : "0 8px 24px rgba(0,0,0,0.12)" }}>
                {searchRes.map(r => {
                  const isSpecial = r.ticker === "__loading__" || r.ticker === "__none__";
                  return <div key={r.ticker} onMouseDown={isSpecial ? undefined : () => selectTicker(r.ticker)} style={{ padding: "9px 12px", cursor: isSpecial ? "default" : "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, opacity: isSpecial ? 0.55 : 1 }} onMouseEnter={e => { if (!isSpecial) e.currentTarget.style.background = C.s2; }} onMouseLeave={e => e.currentTarget.style.background = "transparent"}><div><div style={{ fontSize: 12, fontWeight: 700, color: C.t }}>{r.ticker === "__loading__" ? "⏳" : r.ticker === "__none__" ? "—" : r.ticker}</div><div style={{ fontSize: 10, color: C.m, marginTop: 1, maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</div></div>{!isSpecial && <span style={{ fontSize: 10, color: C.sub, flexShrink: 0 }}>{r.exchange}</span>}</div>;
                })}
              </div>
            )}
          </div>
        </div>
        <div style={{ padding: "4px 12px 3px", fontSize: 10, fontWeight: 700, color: C.sub, letterSpacing: ".8px", textTransform: "uppercase" }}>즐겨찾기</div>
        <div style={{ flex: 1, overflowY: "auto" }}>
          {favorites.map(tk => {
            const q2 = quotes[tk] || {}, pp = (q2.change || 0) >= 0, isSel = selected === tk && tab !== "market"; return (
              <div key={tk} onClick={() => selectTicker(tk)} style={{ margin: "2px 8px", padding: "8px 10px", cursor: "pointer", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center", background: isSel ? (dark ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.09)") : "transparent" }} onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = C.s2; }} onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = "transparent"; }}>
                <div><div style={{ fontSize: 13, fontWeight: 700, color: isSel ? C.acc : C.t }}>{tk}</div><div style={{ fontSize: 10, color: C.m, marginTop: 1 }}>{q2.mktCap ? fmtNum(q2.mktCap) : "—"}</div></div>
                <div style={{ textAlign: "right" }}>{dataLoading ? <Sk w={50} h={12} /> : <><div style={{ fontSize: 11, fontWeight: 700, color: C.t }}>{q2.price ? "$" + q2.price.toFixed(2) : "—"}</div><div style={{ fontSize: 10, fontWeight: 700, color: pp ? C.g : C.r }}>{q2.changePct != null ? (pp ? "+" : "") + q2.changePct.toFixed(2) + "%" : "—"}</div></>}</div>
              </div>
            );
          })}
          <div style={{ padding: "8px 12px 3px", fontSize: 10, fontWeight: 700, color: C.sub, letterSpacing: ".8px", textTransform: "uppercase" }}>추천</div>
          {POPULAR.filter(p => !favorites.includes(p)).slice(0, 3).map(p => <div key={p} onClick={() => selectTicker(p)} style={{ margin: "2px 8px", padding: "7px 10px", cursor: "pointer", borderRadius: 10, display: "flex", justifyContent: "space-between" }} onMouseEnter={e => e.currentTarget.style.background = C.s2} onMouseLeave={e => e.currentTarget.style.background = "transparent"}><span style={{ fontSize: 12, fontWeight: 700, color: C.t }}>{p}</span><span style={{ fontSize: 11, color: C.acc, fontWeight: 700 }}>+</span></div>)}
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        <div style={{ background: C.sf, borderBottom: `1px solid ${C.b}`, padding: isMobile ? "10px 14px 0" : "13px 20px 0", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 8 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
              {isMobile && <button onClick={() => setSidebarOpen(p => !p)} style={{ background: C.s2, border: `1px solid ${C.b}`, borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: C.t, flexShrink: 0, marginTop: 2 }}>☰</button>}
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: C.t }}>{selected}</span>
                <span style={{ fontSize: 12, color: C.m }}>{d.name}</span>
                {d.sector && <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, background: dark ? "rgba(59,130,246,0.2)" : "rgba(59,130,246,0.1)", color: C.acc, fontWeight: 600 }}>{d.sector}</span>}
                <span onClick={() => toggleFav(selected)} style={{ cursor: "pointer", fontSize: 15, color: favorites.includes(selected) ? C.am : C.sub }}>{favorites.includes(selected) ? "★" : "☆"}</span>
                {apiError && <span style={{ fontSize: 10, color: C.am, padding: "2px 8px", background: dark ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.1)", borderRadius: 20 }}>⚠ API 오류</span>}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 3 }}>
                {dataLoading ? <Sk w={160} h={26} r={8} /> : <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}><span style={{ fontSize: 26, fontWeight: 800, color: C.t }}>{d.price ? "$" + d.price.toFixed(2) : "—"}</span><span style={{ fontSize: 13, fontWeight: 700, color: pos ? C.g : C.r }}>{pos ? "▲ " : "▼ "}{Math.abs(d.change).toFixed(2)} ({pos ? "+" : ""}{d.changePct.toFixed(2)}%)</span></div>}
              </div>
            </div>
            </div>
            {!isMobile && <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
              {dataLoading ? [0, 1, 2, 3].map(i => <Sk key={i} w={52} h={44} r={10} />) : [["시총", d.mktCap || "—"], ["P/E", d.pe || "—"], ["EPS", "$" + (d.eps || "—")], ["목표가", targetPrice ? "$" + targetPrice : "—"]].map(([k, v]) => <div key={k} style={{ background: C.s2, borderRadius: 10, padding: "7px 11px", textAlign: "center" }}><div style={{ fontSize: 9, color: C.m, fontWeight: 600, textTransform: "uppercase" }}>{k}</div><div style={{ fontSize: 12, fontWeight: 700, color: C.t, marginTop: 1 }}>{v}</div></div>)}
            </div>}
          </div>
          {!isMobile && <div style={{ borderTop: `1px solid ${C.b}`, paddingTop: 7, marginBottom: 2 }}>
            <ClockBar C={C} dark={dark} indices={indices} />
          </div>}
          <div style={{ display: "flex", alignItems: "center", overflowX: "auto", scrollbarWidth: "none", msOverflowStyle: "none", gap: 2 }}>
            {TABS.map(([t, l]) => {
              const isMkt = t === "market";
              return <button key={t} onClick={() => setTab(t)} style={isMkt ? { padding: "6px 14px", fontSize: 12, fontWeight: 700, borderRadius: 20, border: `1px solid ${tab === t ? C.acc : C.b2}`, background: tab === t ? C.acc : (dark ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.1)"), color: tab === t ? "#fff" : C.acc, whiteSpace: "nowrap", cursor: "pointer", marginRight: 6, flexShrink: 0 } : { padding: "8px 13px", fontSize: 12, fontWeight: tab === t ? 700 : 500, background: "transparent", border: "none", borderBottom: tab === t ? `2px solid ${C.acc}` : "2px solid transparent", color: tab === t ? C.acc : C.m, whiteSpace: "nowrap", cursor: "pointer", flexShrink: 0 }}>{l}</button>;
            })}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: isMobile ? "12px 10px" : "14px 20px", background: C.bg }}>

          {tab === "overview" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* 차트 카드 */}
              <div style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.m }}>주가 차트</div>
                  <div style={{ display: "flex", gap: 3 }}>
                    {["1W", "1M", "3M", "6M", "1Y", "2Y"].map(p => (
                      <button key={p} onClick={() => setPeriod(p)} style={{ padding: "3px 9px", fontSize: 10, fontWeight: period === p ? 700 : 500, borderRadius: 6, border: period === p ? `1px solid ${C.acc}` : `1px solid ${C.b}`, background: period === p ? (dark ? "rgba(59,130,246,0.25)" : "rgba(59,130,246,0.1)") : C.s2, color: period === p ? C.acc : C.m, cursor: "pointer" }}>{p}</button>
                    ))}
                  </div>
                </div>
                {chartLoading
                  ? <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ width: 24, height: 24, border: `2px solid ${C.b2}`, borderTopColor: C.acc, borderRadius: "50%", animation: "spin .8s linear infinite" }} /></div>
                  : chartData.length > 0
                    ? <PriceChart data={chartData} positive={pos} dark={dark} />
                    : <div style={{ height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: C.sub, fontSize: 12 }}>차트 데이터를 불러오는 중...</div>
                }
              </div>
              {/* 요약 지표 */}
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 10 }}>
                {[[buyPct + "%", "매수의견", C.g], [targetPrice ? "$" + targetPrice : "—", "목표주가(추정)", C.acc], [(d.changePct > 0 ? "+" : "") + d.changePct.toFixed(2) + "%", "당일 등락", pos ? C.g : C.r], [overall + "점", "종합스코어", sc(overall)]].map(([v, l, col]) => <div key={l} style={{ ...card, textAlign: "center" }}><div style={{ fontSize: 22, fontWeight: 800, color: col }}>{v}</div><div style={{ fontSize: 11, color: C.m, marginTop: 3 }}>{l}</div></div>)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                <div style={card}><div style={{ fontSize: 12, fontWeight: 700, color: C.m, marginBottom: 12 }}>애널리스트 컨센서스 · {tot}명</div><div style={{ display: "flex", borderRadius: 8, overflow: "hidden", height: 10, marginBottom: 10 }}><div style={{ width: buyPct + "%", background: C.g }} /><div style={{ width: holdPct + "%", background: C.am }} /><div style={{ width: sellPct + "%", background: C.r }} /></div><div style={{ display: "flex", gap: 16, fontSize: 12 }}>{[["매수", buyPct, C.g], ["보유", holdPct, C.am], ["매도", sellPct, C.r]].map(([l, v, c]) => <div key={l}><span style={{ color: c, fontWeight: 700 }}>{v}%</span> <span style={{ color: C.m }}>{l}</span></div>)}</div></div>
                <div style={card}><div style={{ fontSize: 12, fontWeight: 700, color: C.m, marginBottom: 10 }}>펀더멘탈 스코어</div><div style={{ display: "flex", gap: 6 }}>{[["수익성", prof], ["성장성", grow], ["안정성", stab], ["밸류", valu]].map(([l, v]) => <div key={l} style={{ flex: 1, textAlign: "center", padding: "8px 4px", borderRadius: 10, background: sbg(v) }}><div style={{ fontSize: 18, fontWeight: 800, color: sc(v) }}>{v}</div><div style={{ fontSize: 9, color: sc(v), fontWeight: 600, marginTop: 2 }}>{l}</div></div>)}</div></div>
              </div>
              <div style={card}><div style={{ fontSize: 12, fontWeight: 700, color: C.m, marginBottom: 10 }}>최신 뉴스</div>{currentNews.map((n, i) => <a key={i} href={n.url || "#"} target="_blank" rel="noopener noreferrer" style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "10px 0", borderTop: i > 0 ? `1px solid ${C.b}` : "none", textDecoration: "none" }} onMouseEnter={e => e.currentTarget.style.opacity = "0.75"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}><div style={{ fontSize: 13, color: C.t, fontWeight: 500, lineHeight: 1.4 }}>{n.title}</div><div style={{ fontSize: 10, color: C.m, whiteSpace: "nowrap", textAlign: "right" }}><div style={{ fontWeight: 600 }}>{n.src}</div><div>{n.time}</div></div></a>)}</div>
            </div>
          )}

          {tab === "fund" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "220px 1fr", gap: 12 }}>
                <div style={card}><div style={{ fontSize: 12, fontWeight: 700, color: C.m, marginBottom: 4 }}>레이더 차트</div><RadarSVG scores={scores} dark={dark} /></div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>{[["수익성", prof, "매출총이익률 · 순이익률 · ROE"], ["성장성", grow, "매출성장 · EPS성장"], ["안정성", stab, "유동비율 · 부채비율"], ["밸류에이션", valu, "P/E 기반"], ["EPS 성장", epsg, "EPS 성장 추세"]].map(([l, v, desc]) => <div key={l} style={{ ...card, padding: "12px 14px", display: "flex", alignItems: "center", gap: 14 }}><div style={{ width: 44, height: 44, borderRadius: "50%", background: sbg(v), display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ fontSize: 15, fontWeight: 800, color: sc(v) }}>{v}</span></div><div style={{ flex: 1 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}><span style={{ fontSize: 13, fontWeight: 700, color: C.t }}>{l}</span><span style={{ fontSize: 10, color: C.m }}>{desc}</span></div><div style={{ height: 6, background: C.s2, borderRadius: 4 }}><div style={{ height: "100%", width: v + "%", background: sc(v), borderRadius: 4 }} /></div></div></div>)}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>{[["수익성 상세", [["매출총이익률", fund.grossMargin || 0, 100, "%"], ["순이익률", fund.netMargin || 0, 50, "%"], ["ROE", Math.min(fund.roe || 0, 150), 150, "%"]], C.g], ["성장성 상세", [["매출 성장률", Math.min(fund.revenueGrowth || 0, 120), 120, "%"], ["EPS 성장률", Math.min(fund.epsGrowth || 0, 300), 300, "%"]], C.acc]].map(([title, items, col]) => <div key={title} style={card}><div style={{ fontSize: 12, fontWeight: 700, color: C.m, marginBottom: 12 }}>{title}</div>{items.map(([l, v, mx, u]) => <div key={l} style={{ marginBottom: 12 }}><div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 12 }}><span style={{ color: C.m }}>{l}</span><span style={{ fontWeight: 700, color: C.t }}>{v}{u}</span></div><div style={{ height: 6, background: C.s2, borderRadius: 4 }}><div style={{ height: "100%", width: Math.min(100, v / mx * 100) + "%", background: col, borderRadius: 4 }} /></div></div>)}</div>)}</div>
            </div>
          )}

          {tab === "fin" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={card}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}><div style={{ fontSize: 12, fontWeight: 700, color: C.m }}>분기별 매출 & YoY 성장률</div><div style={{ display: "flex", gap: 14, fontSize: 11, color: C.m }}><span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: dark ? "#60a5fa" : "#3b82f6", display: "inline-block" }} />매출</span><span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 14, height: 2, background: C.g, display: "inline-block" }} />YoY</span></div></div><RevCanvas data={fund.qrev || []} dark={dark} /></div>
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(2,1fr)" : "repeat(4,1fr)", gap: 10 }}>{(fund.qrev || []).slice(-4).map((q, i) => <div key={i} style={card}><div style={{ fontSize: 10, color: C.m, fontWeight: 700, textTransform: "uppercase", marginBottom: 4 }}>{q.q}</div><div style={{ fontSize: 18, fontWeight: 800, color: C.t }}>${q.rev}B</div><div style={{ marginTop: 4, display: "inline-flex", padding: "2px 8px", borderRadius: 20, background: q.g >= 0 ? (dark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.1)") : (dark ? "rgba(244,63,94,0.15)" : "rgba(244,63,94,0.1)"), fontSize: 11, fontWeight: 700, color: q.g >= 0 ? C.g : C.r }}>{q.g > 0 ? "+" : ""}{q.g}% YoY</div></div>)}</div>
              <div style={{ borderTop: `1px solid ${C.b}`, margin: "4px 0" }} />
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
              {[["P/E", d.pe || "—", "주가수익비율"], ["P/B", d.pb || "—", "주가순자산비율"], ["EPS", "$" + (d.eps || "—"), "주당순이익"], ["ROE", (fund.roe || 0) + "%", "자기자본이익률"], ["D/E", (fund.de || 0) + "x", "부채비율"], ["유동비율", (fund.currentRatio || 0) + "x", "단기 지급능력"], ["매출", fund.rev || "—", "연간 매출"], ["영업이익", fund.opInc || "—", "연간 영업이익"], ["매출총이익률", (fund.grossMargin || 0) + "%", "Gross Margin"], ["순이익률", (fund.netMargin || 0) + "%", "Net Margin"]].map(([k, v, desc]) => <div key={k} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center" }}><div><div style={{ fontSize: 11, color: C.m, fontWeight: 600 }}>{k}</div><div style={{ fontSize: 10, color: C.sub, marginTop: 1 }}>{desc}</div></div><div style={{ fontSize: 20, fontWeight: 800, color: C.t }}>{v}</div></div>)}
              </div>
            </div>
          )}

          {tab === "news" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={card}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.m, marginBottom: 10 }}>최신 뉴스</div>
                {newsLoading && currentNews.length === 0
                  ? <div style={{ padding: "20px 0", display: "flex", justifyContent: "center" }}><div style={{ width: 20, height: 20, border: `2px solid ${C.b2}`, borderTopColor: C.acc, borderRadius: "50%", animation: "spin .8s linear infinite" }} /></div>
                  : currentNews.map((n, i) => (
                  <a key={i} href={n.url || "#"} target="_blank" rel="noopener noreferrer" style={{ display: "block", padding: "12px 0", borderTop: i > 0 ? `1px solid ${C.b}` : "none", textDecoration: "none", cursor: "pointer" }} onMouseEnter={e => e.currentTarget.style.opacity = "0.75"} onMouseLeave={e => e.currentTarget.style.opacity = "1"}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.t, lineHeight: 1.5 }}>{n.title}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 5 }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: C.acc, padding: "1px 7px", background: dark ? "rgba(59,130,246,0.15)" : "rgba(59,130,246,0.08)", borderRadius: 20 }}>{n.src}</span>
                      <span style={{ fontSize: 10, color: C.sub }}>{n.time}</span>
                      <span style={{ fontSize: 10, color: C.sub, marginLeft: "auto" }}>→ 기사 보기</span>
                    </div>
                  </a>
                ))}
              </div>
              <div style={card}><div style={{ fontSize: 12, fontWeight: 700, color: C.m, marginBottom: 14 }}>애널리스트 컨센서스 · {tot}명</div><div style={{ display: "flex", borderRadius: 10, overflow: "hidden", height: 12, marginBottom: 14 }}><div style={{ width: buyPct + "%", background: C.g }} /><div style={{ width: holdPct + "%", background: C.am }} /><div style={{ width: sellPct + "%", background: C.r }} /></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 14 }}>{[["매수", fund.consensus?.buy || 0, buyPct, C.g], ["보유", fund.consensus?.hold || 0, holdPct, C.am], ["매도", fund.consensus?.sell || 0, sellPct, C.r]].map(([l, cnt, pct, col]) => <div key={l} style={{ textAlign: "center", padding: "12px 8px", borderRadius: 12, background: dark ? col + "22" : col + "14" }}><div style={{ fontSize: 22, fontWeight: 800, color: col }}>{cnt}</div><div style={{ fontSize: 11, color: col, fontWeight: 600 }}>{l} {pct}%</div></div>)}</div></div>
            </div>
          )}

          {tab === "cal" && (
            <div style={card}><div style={{ fontSize: 12, fontWeight: 700, color: C.m, marginBottom: 14 }}>향후 주요 일정</div>{(fund.events || []).map((ev, i) => <div key={i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "14px 0", borderTop: i > 0 ? `1px solid ${C.b}` : "none" }}><div style={{ background: dark ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.08)", borderRadius: 10, padding: "8px 14px", textAlign: "center", minWidth: 58 }}><div style={{ fontSize: 16, fontWeight: 800, color: C.acc }}>{ev.date.slice(8)}</div><div style={{ fontSize: 9, color: C.acc, fontWeight: 600, marginTop: 1 }}>{ev.date.slice(5, 7)}월</div></div><div><div style={{ fontSize: 14, fontWeight: 700, color: C.t }}>{ev.event}</div><div style={{ fontSize: 11, color: C.m, marginTop: 2 }}>{ev.date}</div></div></div>)}</div>
          )}

          {tab === "market" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {isMobile && <div style={{ background: C.sf, border: `1px solid ${C.b}`, borderRadius: 14, padding: "12px 14px" }}><ClockBar C={C} dark={dark} indices={indices} /></div>}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={card}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.m, marginBottom: 4 }}>미국 주식지수</div>
                  {indices.map(item => <MktRow key={item.symbol} item={item} C={C} />)}
                </div>
                <div style={card}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.m, marginBottom: 4 }}>원자재</div>
                  {commodities.map(item => <MktRow key={item.symbol} item={item} C={C} />)}
                </div>
                <div style={card}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.m, marginBottom: 4 }}>미국 국채</div>
                  {bonds.map(item => <MktRow key={item.symbol} item={item} C={C} />)}
                </div>
                <div style={card}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.m, marginBottom: 4 }}>기타 지표 (VIX · DXY · 원달러)</div>
                  {rates.map(item => <MktRow key={item.symbol} item={item} C={C} />)}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={card}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.m, marginBottom: 8 }}>공포 탐욕 지수 (Fear &amp; Greed)</div>
                  <FGGauge data={fgData} C={C} dark={dark} />
                </div>
                <div style={card}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.m, marginBottom: 6 }}>구성 지표</div>
                  {fgData.components.map((comp, i) => {
                    const compCol = comp.value <= 25 ? C.r : comp.value <= 45 ? C.am : comp.value <= 55 ? C.am : C.g;
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 0", borderTop: i > 0 ? `1px solid ${C.b}` : "none" }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: C.t }}>{comp.name}</div>
                          <div style={{ fontSize: 10, color: compCol, fontWeight: 600 }}>{comp.signal}</div>
                        </div>
                        <div style={{ width: 70, height: 5, background: C.s2, borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: comp.value + "%", height: "100%", background: compCol, borderRadius: 3 }} />
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: compCol, minWidth: 28, textAlign: "right" }}>{comp.value}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

/* ── Root ─────────────────────────────────────────────────── */
export default function Page() {
  const [user, setUser] = useState(null);
  const [loginDark, setLoginDark] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const users = loadUsers();
    if (!users.demo) {
      users.demo = "1234";
      saveUsers(users);
      saveUD("demo", { favorites: ["NVDA", "GOOGL", "AMZN"], dark: false });
    }
    const saved = localStorage.getItem("currentUser");
    if (saved && users[saved]) setUser(saved);
    setReady(true);
  }, []);

  const handleLogin = uid => { localStorage.setItem("currentUser", uid); setUser(uid); };
  const handleLogout = () => { localStorage.removeItem("currentUser"); setUser(null); };

  if (!ready) return null;
  if (!user) return <Login onLogin={handleLogin} dark={loginDark} setDark={setLoginDark} />;
  return <Dashboard user={user} onLogout={handleLogout} />;
}