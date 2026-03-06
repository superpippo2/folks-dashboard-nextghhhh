"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

// ── POOLS ─────────────────────────────────────────────────────────────────────
const MAIN_POOLS = [
  { name:"ALGO",   color:"#00B2FF", icon:"A",  depositAPY:3.82, varBorrowAPY:5.41, stblBorrowAPY:6.20, totalDeposits:48200000, totalBorrow:29100000, collateralCap:55000000, borrowCap:40000000, price:0.158 },
  { name:"xALGO",  color:"#00C896", icon:"x",  depositAPY:2.97, varBorrowAPY:4.88, stblBorrowAPY:5.50, totalDeposits:9200000,  totalBorrow:4100000,  collateralCap:11000000, borrowCap:6000000,  price:0.162 },
  { name:"USDC",   color:"#2775CA", icon:"$",  depositAPY:5.14, varBorrowAPY:7.23, stblBorrowAPY:8.10, totalDeposits:12400000, totalBorrow:9800000,  collateralCap:14000000, borrowCap:11000000, price:1.0   },
  { name:"goBTC",  color:"#F7931A", icon:"₿",  depositAPY:0.42, varBorrowAPY:1.88, stblBorrowAPY:2.40, totalDeposits:48,       totalBorrow:21,       collateralCap:70,       borrowCap:40,       price:65200 },
  { name:"goETH",  color:"#8C9EFF", icon:"Ξ",  depositAPY:0.61, varBorrowAPY:2.14, stblBorrowAPY:2.80, totalDeposits:820,      totalBorrow:390,      collateralCap:1100,     borrowCap:700,      price:3410  },
  { name:"WBTC",   color:"#FF9900", icon:"₿",  depositAPY:0.38, varBorrowAPY:1.72, stblBorrowAPY:2.20, totalDeposits:32,       totalBorrow:12,       collateralCap:50,       borrowCap:30,       price:65300 },
  { name:"WETH",   color:"#A0AEC0", icon:"Ξ",  depositAPY:0.55, varBorrowAPY:1.98, stblBorrowAPY:2.55, totalDeposits:610,      totalBorrow:280,      collateralCap:850,      borrowCap:500,      price:3415  },
  { name:"GOLD",   color:"#FFD166", icon:"Au", depositAPY:0.18, varBorrowAPY:1.10, stblBorrowAPY:1.50, totalDeposits:12000,    totalBorrow:3800,     collateralCap:18000,    borrowCap:10000,    price:60.2  },
  { name:"SILVER", color:"#CBD5E0", icon:"Ag", depositAPY:0.09, varBorrowAPY:0.88, stblBorrowAPY:1.20, totalDeposits:280000,   totalBorrow:72000,    collateralCap:350000,   borrowCap:180000,   price:0.82  },
];
const ISOLATED_POOLS = [
  { name:"ISO ALGO",  color:"#00B2FF", icon:"A", depositAPY:2.40, varBorrowAPY:4.10, stblBorrowAPY:5.00, totalDeposits:3200000, totalBorrow:1400000, collateralCap:4000000, borrowCap:2000000, price:0.158 },
  { name:"ISO USDC",  color:"#2775CA", icon:"$", depositAPY:3.80, varBorrowAPY:5.90, stblBorrowAPY:6.80, totalDeposits:4100000, totalBorrow:2900000, collateralCap:5000000, borrowCap:3500000, price:1.0   },
  { name:"ISO TINY",  color:"#E040FB", icon:"T", depositAPY:1.20, varBorrowAPY:3.40, stblBorrowAPY:4.10, totalDeposits:980000,  totalBorrow:320000,  collateralCap:1200000, borrowCap:600000,  price:0.048 },
  { name:"ISO FOLKS", color:"#FF6B6B", icon:"F", depositAPY:1.80, varBorrowAPY:3.90, stblBorrowAPY:4.70, totalDeposits:2100000, totalBorrow:850000,  collateralCap:2500000, borrowCap:1200000, price:0.12  },
];
const ALL_POOLS = [...MAIN_POOLS, ...ISOLATED_POOLS];

// ── TIME RANGES ───────────────────────────────────────────────────────────────
const RANGES = [
  { key:"1W",  label:"1W",     days:7   },
  { key:"1M",  label:"1M",     days:30  },
  { key:"3M",  label:"3M",     days:90  },
  { key:"6M",  label:"6M",     days:180 },
  { key:"1Y",  label:"1Y",     days:365 },
  { key:"custom", label:"Custom", days:null },
];

function getGranularity(days) {
  if (days <= 14)  return "day";
  if (days <= 90)  return "week";
  return "month";
}

function fmtTick(date, granularity) {
  if (granularity === "month") return date.toLocaleDateString("en-US",{month:"short",year:"2-digit"});
  return date.toLocaleDateString("en-US",{month:"short",day:"numeric"});
}

function genHistory(pool, fromMs, toMs) {
  const seed = pool.name.split("").reduce((a,c)=>a+c.charCodeAt(0),0);
  const days = Math.round((toMs - fromMs) / 86400000);
  const granularity = getGranularity(days);
  const stepDays = granularity === "month" ? 30 : granularity === "week" ? 7 : 1;
  const stepMs = stepDays * 86400000;
  const points = Math.max(2, Math.round((toMs - fromMs) / stepMs));

  return Array.from({length: points}, (_, i) => {
    const t = new Date(fromMs + (i / (points - 1)) * (toMs - fromMs));
    const p1 = Math.sin(seed*0.07 + i*0.41)*0.5+0.5;
    const p2 = Math.sin(seed*0.13 + i*0.29)*0.5+0.5;
    const p3 = Math.sin(seed*0.05 + i*0.67)*0.5+0.5;
    const n1 = 0.6 + p1*0.8 + p3*0.15;
    const n2 = 0.6 + p2*0.8 + p3*0.12;
    const tr = 0.72 + (i/(points-1))*0.56;
    return {
      label: fmtTick(t, granularity),
      depositAPY:    +Math.max(0.01, pool.depositAPY    * n1 * tr).toFixed(3),
      varBorrowAPY:  +Math.max(0.01, pool.varBorrowAPY  * n2 * tr).toFixed(3),
      stblBorrowAPY: +Math.max(0.01, pool.stblBorrowAPY * (0.7+p1*0.5) * tr).toFixed(3),
      depositUSD:    +Math.max(0,    pool.totalDeposits * pool.price * n1 * tr * 0.9).toFixed(0),
      borrowUSD:     +Math.max(0,    pool.totalBorrow   * pool.price * n2 * tr * 0.85).toFixed(0),
      depositAmt:    +Math.max(0,    pool.totalDeposits * n1 * tr * 0.9).toFixed(2),
      borrowAmt:     +Math.max(0,    pool.totalBorrow   * n2 * tr * 0.85).toFixed(2),
    };
  });
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
const toDateStr = ms => new Date(ms).toISOString().split("T")[0];
const fromDateStr = s => new Date(s).getTime();

function fmt(n,d=2){
  if(n>=1e9)return`${(n/1e9).toFixed(d)}B`;
  if(n>=1e6)return`${(n/1e6).toFixed(d)}M`;
  if(n>=1e3)return`${(n/1e3).toFixed(d)}K`;
  return n.toFixed(d);
}
const fmtAPY = n => n<0.01?"—":`${n.toFixed(2)}%`;
const fmtUSD = n => `$${fmt(n)}`;
function hexToRgb(c){ return `${parseInt(c.slice(1,3),16)},${parseInt(c.slice(3,5),16)},${parseInt(c.slice(5,7),16)}`; }

// ── CUSTOM DATE PICKER POPOVER ────────────────────────────────────────────────
function DateRangePopover({ fromMs, toMs, onApply, onClose }) {
  const now = Date.now();
  const minMs = now - 365 * 86400000;
  const [from, setFrom] = useState(toDateStr(fromMs));
  const [to, setTo]     = useState(toDateStr(toMs));
  const ref = useRef();

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    setTimeout(() => document.addEventListener("mousedown", handler), 0);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const fromVal = fromDateStr(from);
  const toVal   = fromDateStr(to);
  const valid   = fromVal >= minMs && toVal <= now && fromVal < toVal;
  const daysDiff = Math.round((toVal - fromVal) / 86400000);

  return (
    <div ref={ref} style={{
      position:"absolute",top:"calc(100% + 8px)",right:0,zIndex:200,
      background:"#0A1220",border:"1px solid #162032",borderRadius:12,
      padding:"18px 20px",boxShadow:"0 16px 48px rgba(0,0,0,.7)",
      minWidth:300,fontFamily:"'DM Sans',sans-serif",
    }}>
      <div style={{fontSize:11,fontWeight:600,color:"#3A5270",letterSpacing:.4,marginBottom:14,textTransform:"uppercase"}}>Custom Range</div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:14}}>
        {[
          {label:"From", val:from, set:setFrom, min:toDateStr(minMs), max:to},
          {label:"To",   val:to,   set:setTo,   min:from,             max:toDateStr(now)},
        ].map(f=>(
          <div key={f.label}>
            <div style={{fontSize:10,color:"#2E4A68",marginBottom:5,fontWeight:600,letterSpacing:.3}}>{f.label}</div>
            <input type="date" value={f.val} min={f.min} max={f.max}
              onChange={e=>f.set(e.target.value)}
              style={{
                background:"#060A14",border:"1px solid #162032",borderRadius:7,
                color:"#94A3B8",padding:"7px 10px",fontSize:12,
                fontFamily:"'DM Mono',monospace",width:"100%",
                outline:"none",cursor:"pointer",
                colorScheme:"dark",
              }}
            />
          </div>
        ))}
      </div>

      {valid && (
        <div style={{fontSize:10,color:"#2E4A68",marginBottom:12,fontFamily:"'DM Mono',monospace"}}>
          {daysDiff} day{daysDiff!==1?"s":""} selected
        </div>
      )}
      {!valid && fromVal && toVal && (
        <div style={{fontSize:10,color:"#F97316",marginBottom:12}}>
          {fromVal >= toVal ? "Start must be before end" : fromVal < minMs ? "Max 1 year lookback" : ""}
        </div>
      )}

      {/* Quick shortcuts */}
      <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
        {[
          {label:"Last week",   d:7},
          {label:"Last month",  d:30},
          {label:"Last quarter",d:90},
        ].map(s=>(
          <button key={s.label} onClick={()=>{
            setTo(toDateStr(now));
            setFrom(toDateStr(now - s.d*86400000));
          }} style={{
            background:"none",border:"1px solid #162032",color:"#3A5270",
            padding:"3px 9px",borderRadius:5,fontSize:10,
            fontFamily:"'DM Sans',sans-serif",cursor:"pointer",
          }}>{s.label}</button>
        ))}
      </div>

      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <button onClick={onClose} style={{
          background:"none",border:"1px solid #162032",color:"#3A5270",
          padding:"6px 14px",borderRadius:7,fontSize:12,
          fontFamily:"'DM Sans',sans-serif",cursor:"pointer",
        }}>Cancel</button>
        <button onClick={()=>valid&&onApply(fromDateStr(from),fromDateStr(to))}
          disabled={!valid}
          style={{
            background:valid?"linear-gradient(135deg,#0AAFE6,#0055CC)":"#0A1628",
            border:"none",color:valid?"#fff":"#2E4A68",
            padding:"6px 16px",borderRadius:7,fontSize:12,fontWeight:600,
            fontFamily:"'DM Sans',sans-serif",cursor:valid?"pointer":"default",
            transition:"all .15s",
          }}>Apply</button>
      </div>
    </div>
  );
}

// ── RANGE PICKER ─────────────────────────────────────────────────────────────
function RangePicker({ rangeKey, fromMs, toMs, onChange, onCustomApply }) {
  const [open, setOpen] = useState(false);

  return (
    <div style={{position:"relative",display:"flex",gap:0}}>
      <div style={{display:"flex",background:"#060A14",border:"1px solid #0C1628",borderRadius:8,overflow:"visible"}}>
        {RANGES.map((r, i) => {
          const isActive = rangeKey === r.key;
          const isCustom = r.key === "custom";
          const isLast = i === RANGES.length - 1;
          return (
            <button key={r.key}
              onClick={() => {
                if (isCustom) { setOpen(v=>!v); }
                else { onChange(r.key); setOpen(false); }
              }}
              style={{
                background: isActive ? "#0D1A2E" : "none",
                border: "none",
                borderRight: !isLast ? "1px solid #0C1628" : "none",
                borderRadius: isCustom ? "0 8px 8px 0" : 0,
                color: isActive ? "#0AAFE6" : "#3A5270",
                padding: isCustom ? "5px 11px" : "5px 11px",
                fontSize: 11, fontWeight: isActive ? 600 : 400,
                fontFamily: "'DM Sans',sans-serif", cursor: "pointer",
                transition: "all .15s", minWidth: 36,
                display:"flex",alignItems:"center",gap:4,
              }}>
              {r.label}
              {isCustom && (
                <svg width="9" height="9" viewBox="0 0 10 10" fill="none" style={{opacity:.6}}>
                  <rect x="1" y="1" width="8" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
                  <line x1="1" y1="3.5" x2="9" y2="3.5" stroke="currentColor" strokeWidth="1.2"/>
                  <line x1="3.5" y1="5.5" x2="3.5" y2="7.5" stroke="currentColor" strokeWidth="1.2"/>
                  <line x1="6.5" y1="5.5" x2="6.5" y2="7.5" stroke="currentColor" strokeWidth="1.2"/>
                </svg>
              )}
            </button>
          );
        })}
      </div>

      {/* Show selected custom range label when active */}
      {rangeKey === "custom" && !open && (
        <div style={{
          position:"absolute",top:"calc(100% + 4px)",right:0,
          fontSize:10,color:"#0AAFE6",fontFamily:"'DM Mono',monospace",
          background:"#060A14",border:"1px solid #0C1628",borderRadius:5,
          padding:"2px 8px",whiteSpace:"nowrap",zIndex:10,
        }}>
          {new Date(fromMs).toLocaleDateString("en-US",{month:"short",day:"numeric"})} →{" "}
          {new Date(toMs).toLocaleDateString("en-US",{month:"short",day:"numeric"})}
        </div>
      )}

      {open && (
        <DateRangePopover
          fromMs={fromMs} toMs={toMs}
          onApply={(f,t)=>{ onCustomApply(f,t); setOpen(false); }}
          onClose={()=>setOpen(false)}
        />
      )}
    </div>
  );
}

// ── MISC COMPONENTS ───────────────────────────────────────────────────────────
const Tip = ({active,payload,label,isUSD,assetName}) => {
  if(!active||!payload?.length) return null;
  return (
    <div style={{background:"#0A1220",border:"1px solid #162032",borderRadius:8,padding:"10px 14px",fontSize:11,fontFamily:"'DM Sans',sans-serif",boxShadow:"0 8px 32px rgba(0,0,0,.6)"}}>
      <p style={{color:"#3A5270",marginBottom:6,fontSize:10,fontWeight:600,letterSpacing:.4}}>{label}</p>
      {payload.map((e,i)=>(
        <p key={i} style={{color:e.color||"#94A3B8",margin:"3px 0",fontFamily:"'DM Mono',monospace"}}>
          <span style={{color:"#4A6380",marginRight:4}}>{e.name}:</span>
          {e.name.includes("APY") ? fmtAPY(e.value) : isUSD ? fmtUSD(e.value) : `${fmt(e.value)} ${assetName}`}
        </p>
      ))}
    </div>
  );
};

const Card = ({children,style={}}) => (
  <div style={{background:"#080E1C",border:"1px solid #0C1628",borderRadius:14,padding:"20px 22px",...style}}>
    {children}
  </div>
);

const AssetBtn = ({pool,active,onClick}) => (
  <button onClick={onClick} style={{
    background:active?`rgba(${hexToRgb(pool.color)},0.08)`:"none",
    border:`1px solid ${active?pool.color+"55":"#0C1628"}`,
    color:active?pool.color:"#3A5270",
    padding:"7px 4px",borderRadius:10,cursor:"pointer",
    transition:"all .15s",display:"flex",flexDirection:"column",
    alignItems:"center",gap:3,fontFamily:"'DM Sans',sans-serif",width:"100%"}}>
    <span style={{fontSize:14,fontWeight:700}}>{pool.icon}</span>
    <span style={{fontSize:8,fontWeight:600,lineHeight:1.2,textAlign:"center",wordBreak:"break-word"}}>{pool.name}</span>
  </button>
);

const SectionLabel = ({label}) => (
  <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:"#1E3050",fontWeight:700,padding:"8px 4px 4px",borderTop:"1px solid #0C1628",marginTop:4}}>{label}</div>
);

const LineToggle = ({label,color,active,onClick}) => (
  <button onClick={onClick} style={{
    display:"flex",alignItems:"center",gap:6,
    background:active?`rgba(${hexToRgb(color)},0.07)`:"none",
    border:`1px solid ${active?color+"44":"#0C1628"}`,
    color:active?color:"#3A5270",
    padding:"4px 11px",borderRadius:6,
    fontSize:11,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",transition:"all .15s"}}>
    <span style={{width:8,height:8,borderRadius:2,background:active?color:"#1E3050",display:"inline-block",flexShrink:0,transition:"background .15s"}}/>
    {label}
  </button>
);

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const NOW = useMemo(()=>Date.now(),[]);

  const [selectedName, setSelectedName] = useState("ALGO");
  const [liveData, setLiveData] = useState(null);

  useEffect(() => {
    fetch("/api/pools")
      .then(r => r.json())
      .then(json => {
        if (json.success) setLiveData(json.data);
      })
      .catch(console.error);
  }, []);
  const [amountUnit, setAmountUnit]     = useState("usd");
  const [showDeposit, setShowDeposit]   = useState(true);
  const [showVariable, setShowVariable] = useState(true);
  const [showStable, setShowStable]     = useState(true);

  // APY range state
  const [apyRangeKey, setApyRangeKey]   = useState("3M");
  const [apyFrom, setApyFrom]           = useState(NOW - 90*86400000);
  const [apyTo, setApyTo]               = useState(NOW);

  // Amount range state
  const [amtRangeKey, setAmtRangeKey]   = useState("3M");
  const [amtFrom, setAmtFrom]           = useState(NOW - 90*86400000);
  const [amtTo, setAmtTo]               = useState(NOW);

  const handleApyRange = key => {
    const r = RANGES.find(r=>r.key===key);
    setApyRangeKey(key);
    if (r.days) { setApyFrom(NOW - r.days*86400000); setApyTo(NOW); }
  };
  const handleAmtRange = key => {
    const r = RANGES.find(r=>r.key===key);
    setAmtRangeKey(key);
    if (r.days) { setAmtFrom(NOW - r.days*86400000); setAmtTo(NOW); }
  };

  const pool = useMemo(() => {
    const base = ALL_POOLS.find(p=>p.name===selectedName);
    if (!liveData) return base;
    const keyMap = {
      "ALGO":"ALGO","xALGO":"xALGO","USDC":"USDC","goBTC":"goBTC",
      "goETH":"goETH","WBTC":"WBTC","WETH":"WETH","GOLD":"GOLD","SILVER":"SILVER",
      "ISO ALGO":"ISOLATED_ALGO","ISO USDC":"ISOLATED_USDC",
      "ISO TINY":"ISOLATED_TINY","ISO FOLKS":"ISOLATED_FOLKS",
    };
    const live = liveData.find(d => d.key === keyMap[selectedName]);
    if (!live) return base;
    return { ...base, ...live };
  }, [selectedName, liveData]);
  const isIsolated = ISOLATED_POOLS.some(p=>p.name===selectedName);

  const apyHistory = useMemo(()=>genHistory(pool,apyFrom,apyTo),[selectedName,apyFrom,apyTo]);
  const amtHistory = useMemo(()=>genHistory(pool,amtFrom,amtTo),[selectedName,amtFrom,amtTo]);

  const apyTick = Math.max(0, Math.floor(apyHistory.length/6)-1);
  const amtTick = Math.max(0, Math.floor(amtHistory.length/6)-1);

  const collatPct = ((pool.totalDeposits/pool.collateralCap)*100).toFixed(1);
  const borrowPct  = ((pool.totalBorrow/pool.borrowCap)*100).toFixed(1);

  return (
    <div style={{background:"#060A14",color:"#E2E8F0",minHeight:"100vh",fontFamily:"'DM Sans',sans-serif",fontSize:14}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}
        ::-webkit-scrollbar{width:4px;} ::-webkit-scrollbar-track{background:#060A14;} ::-webkit-scrollbar-thumb{background:#162032;border-radius:2px;}
        @keyframes fadein{from{opacity:0;transform:translateY(7px);}to{opacity:1;transform:translateY(0);}}
        .fadein{animation:fadein .2s ease forwards;}
        @keyframes dotpulse{0%,100%{opacity:1;}50%{opacity:.3;}}
        .unit-btn{background:none;border:1px solid #0C1628;color:#3A5270;padding:4px 11px;border-radius:6px;font-size:11px;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all .15s;}
        .unit-btn.on{background:rgba(10,175,230,0.08);border-color:rgba(10,175,230,0.3);color:#0AAFE6;}
        input[type="date"]::-webkit-calendar-picker-indicator{filter:invert(0.4);}
      `}</style>

      <header style={{borderBottom:"1px solid #0C1628",background:"rgba(6,10,20,0.97)",backdropFilter:"blur(10px)",position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:1240,margin:"0 auto",padding:"0 20px",display:"flex",alignItems:"center",justifyContent:"space-between",height:52}}>
          <div style={{display:"flex",alignItems:"center",gap:9}}>
            <div style={{width:26,height:26,background:"linear-gradient(135deg,#0AAFE6,#0055CC)",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:"#fff"}}>FF</div>
            <span style={{fontSize:13,fontWeight:600,letterSpacing:-.2}}>Folks Finance</span>
            <span style={{color:"#162032",fontSize:11}}>/ Analytics</span>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:7,background:"#080E1C",border:"1px solid #0C1628",borderRadius:7,padding:"4px 11px",fontSize:10,color:"#2E4A68",fontFamily:"'DM Mono',monospace"}}>
            <span style={{width:5,height:5,background:"#10B981",borderRadius:"50%",animation:"dotpulse 2.5s ease infinite",display:"inline-block"}}/>
            {liveData ? "Live · Algorand Mainnet" : "Loading..."}
          </div>
        </div>
      </header>

      <div style={{maxWidth:1240,margin:"0 auto",padding:"22px 20px 56px",display:"flex",gap:20}}>

        {/* SIDEBAR */}
        <div style={{width:70,flexShrink:0,display:"flex",flexDirection:"column",gap:5}}>
          <div style={{fontSize:8,textTransform:"uppercase",letterSpacing:1,color:"#1E3050",fontWeight:700,marginBottom:2,paddingLeft:2}}>Main</div>
          {MAIN_POOLS.map(p=><AssetBtn key={p.name} pool={p} active={selectedName===p.name} onClick={()=>setSelectedName(p.name)}/>)}
          <SectionLabel label="Isolated"/>
          {ISOLATED_POOLS.map(p=><AssetBtn key={p.name} pool={p} active={selectedName===p.name} onClick={()=>setSelectedName(p.name)}/>)}
        </div>

        {/* CONTENT */}
        <div className="fadein" key={selectedName} style={{flex:1,display:"flex",flexDirection:"column",gap:15}}>

          {/* Asset header */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
            <div style={{display:"flex",alignItems:"center",gap:11}}>
              <div style={{width:42,height:42,borderRadius:12,background:`${pool.color}16`,border:`1px solid ${pool.color}25`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,fontWeight:700,color:pool.color}}>
                {pool.icon}
              </div>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <h1 style={{fontSize:19,fontWeight:700,letterSpacing:-.4}}>{pool.name}</h1>
                  {isIsolated&&<span style={{fontSize:9,fontWeight:700,letterSpacing:.5,color:"#F59E0B",background:"rgba(245,158,11,0.1)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:4,padding:"2px 6px",textTransform:"uppercase"}}>Isolated</span>}
                </div>
                <div style={{fontSize:10,color:"#2E4A68",fontFamily:"'DM Mono',monospace",marginTop:2}}>
                  {pool.price<1?`$${pool.price.toFixed(5)}`:`$${fmt(pool.price,pool.price>100?0:2)}`} · Algorand Mainnet
                </div>
              </div>
            </div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              {[
                {l:"Deposit APY",    v:fmtAPY(pool.depositAPY),    c:"#10B981"},
                {l:"Variable Borrow",v:fmtAPY(pool.varBorrowAPY),  c:"#F97316"},
                {l:"Stable Borrow",  v:fmtAPY(pool.stblBorrowAPY), c:"#F59E0B"},
              ].map((s,i)=>(
                <div key={i} style={{background:"#080E1C",border:`1px solid ${s.c}22`,borderRadius:9,padding:"7px 13px",textAlign:"center",minWidth:90}}>
                  <div style={{fontSize:9,color:"#2E4A68",textTransform:"uppercase",letterSpacing:.7,marginBottom:3,fontWeight:600}}>{s.l}</div>
                  <div style={{fontSize:15,fontWeight:700,fontFamily:"'DM Mono',monospace",color:s.c}}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── CHART 1: APY ── */}
          <Card style={{overflow:"visible"}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:14,gap:12,flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:"#94A3B8"}}>APY — Historical Rates</div>
                <div style={{fontSize:10,color:"#2E4A68",marginTop:2}}>Select rates and time range</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <LineToggle label="Deposit"  color="#10B981" active={showDeposit}  onClick={()=>setShowDeposit(v=>!v)}/>
                <LineToggle label="Variable" color="#F97316" active={showVariable} onClick={()=>setShowVariable(v=>!v)}/>
                <LineToggle label="Stable"   color="#F59E0B" active={showStable}   onClick={()=>setShowStable(v=>!v)}/>
                <div style={{width:1,height:20,background:"#0C1628"}}/>
                <RangePicker
                  rangeKey={apyRangeKey} fromMs={apyFrom} toMs={apyTo}
                  onChange={handleApyRange}
                  onCustomApply={(f,t)=>{ setApyFrom(f); setApyTo(t); }}
                />
              </div>
            </div>

            {(!showDeposit&&!showVariable&&!showStable) ? (
              <div style={{height:220,display:"flex",alignItems:"center",justifyContent:"center",color:"#2E4A68",fontSize:12}}>Select at least one rate</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={apyHistory} margin={{top:4,right:4,left:-16,bottom:0}}>
                  <defs>
                    <linearGradient id="gDep" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10B981" stopOpacity={.2}/><stop offset="95%" stopColor="#10B981" stopOpacity={0}/></linearGradient>
                    <linearGradient id="gVar" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F97316" stopOpacity={.16}/><stop offset="95%" stopColor="#F97316" stopOpacity={0}/></linearGradient>
                    <linearGradient id="gStbl" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F59E0B" stopOpacity={.12}/><stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 5" stroke="#0A1628" vertical={false}/>
                  <XAxis dataKey="label" tick={{fill:"#1E3050",fontSize:9}} axisLine={false} tickLine={false} interval={apyTick}/>
                  <YAxis tick={{fill:"#1E3050",fontSize:9}} tickFormatter={v=>`${v.toFixed(1)}%`} axisLine={false} tickLine={false}/>
                  <Tooltip content={<Tip isUSD={false} assetName={pool.name}/>}/>
                  {showDeposit  && <Area type="monotone" dataKey="depositAPY"    name="Deposit APY"         stroke="#10B981" fill="url(#gDep)"  strokeWidth={2}   dot={false} activeDot={{r:4,strokeWidth:0}}/>}
                  {showVariable && <Area type="monotone" dataKey="varBorrowAPY"  name="Variable Borrow APY"  stroke="#F97316" fill="url(#gVar)"  strokeWidth={2}   dot={false} activeDot={{r:4,strokeWidth:0}}/>}
                  {showStable   && <Area type="monotone" dataKey="stblBorrowAPY" name="Stable Borrow APY"   stroke="#F59E0B" fill="url(#gStbl)" strokeWidth={1.5} strokeDasharray="5 3" dot={false} activeDot={{r:4,strokeWidth:0}}/>}
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>

          {/* ── CHART 2: Amounts ── */}
          <Card style={{overflow:"visible"}}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:14,gap:12,flexWrap:"wrap"}}>
              <div>
                <div style={{fontSize:13,fontWeight:600,color:"#94A3B8"}}>Deposit & Borrow Amount</div>
                <div style={{fontSize:10,color:"#2E4A68",marginTop:2}}>Historical liquidity over selected period</div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <div style={{display:"flex",gap:5}}>
                  <button className={`unit-btn ${amountUnit==="usd"?"on":""}`} onClick={()=>setAmountUnit("usd")}>USD</button>
                  <button className={`unit-btn ${amountUnit==="token"?"on":""}`} onClick={()=>setAmountUnit("token")}>{pool.name.replace("ISO ","")}</button>
                </div>
                <div style={{width:1,height:20,background:"#0C1628"}}/>
                <RangePicker
                  rangeKey={amtRangeKey} fromMs={amtFrom} toMs={amtTo}
                  onChange={handleAmtRange}
                  onCustomApply={(f,t)=>{ setAmtFrom(f); setAmtTo(t); }}
                />
              </div>
            </div>

            <div style={{display:"flex",gap:14,marginBottom:14}}>
              {[{label:"Deposited",color:pool.color},{label:"Borrowed",color:"#F97316"}].map((item,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:5,fontSize:10,color:item.color}}>
                  <span style={{width:12,height:2,background:item.color,display:"inline-block",borderRadius:1}}/>
                  {item.label}
                </div>
              ))}
            </div>

            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={amtHistory} margin={{top:4,right:4,left:-16,bottom:0}}>
                <defs>
                  <linearGradient id="gAmt"  x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={pool.color} stopOpacity={.25}/><stop offset="95%" stopColor={pool.color} stopOpacity={0}/></linearGradient>
                  <linearGradient id="gBAmt" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#F97316" stopOpacity={.16}/><stop offset="95%" stopColor="#F97316" stopOpacity={0}/></linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 5" stroke="#0A1628" vertical={false}/>
                <XAxis dataKey="label" tick={{fill:"#1E3050",fontSize:9}} axisLine={false} tickLine={false} interval={amtTick}/>
                <YAxis tick={{fill:"#1E3050",fontSize:9}} tickFormatter={v=>amountUnit==="usd"?`$${fmt(v)}`:fmt(v)} axisLine={false} tickLine={false}/>
                <Tooltip content={<Tip isUSD={amountUnit==="usd"} assetName={pool.name.replace("ISO ","")}/>}/>
                <Area type="monotone" dataKey={amountUnit==="usd"?"depositUSD":"depositAmt"} name="Deposited" stroke={pool.color} fill="url(#gAmt)"  strokeWidth={2} dot={false} activeDot={{r:4,strokeWidth:0}}/>
                <Area type="monotone" dataKey={amountUnit==="usd"?"borrowUSD":"borrowAmt"}   name="Borrowed"  stroke="#F97316"   fill="url(#gBAmt)" strokeWidth={2} dot={false} activeDot={{r:4,strokeWidth:0}}/>
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* ── CAPS ── */}
          <Card>
            <div style={{marginBottom:14}}>
              <div style={{fontSize:13,fontWeight:600,color:"#94A3B8"}}>Collateral Cap & Borrow Cap</div>
              <div style={{fontSize:10,color:"#2E4A68",marginTop:2}}>Current liquidity vs protocol caps — realtime snapshot</div>
            </div>
            <div style={{display:"flex",gap:10,marginBottom:18,flexWrap:"wrap"}}>
              {[
                {label:"Collateralized Amount",pct:collatPct,cur:pool.totalDeposits,cap:pool.collateralCap,c:pool.color},
                {label:"Borrowed Amount",      pct:borrowPct, cur:pool.totalBorrow,  cap:pool.borrowCap,   c:"#F97316"},
              ].map((b,i)=>{
                const warn=parseFloat(b.pct)>80;
                return (
                  <div key={i} style={{flex:1,minWidth:200,background:"#060A14",border:`1px solid ${warn?"#F9731640":b.c+"22"}`,borderRadius:10,padding:"12px 14px"}}>
                    <div style={{fontSize:9,textTransform:"uppercase",letterSpacing:.7,color:"#2E4A68",fontWeight:600,marginBottom:6}}>{b.label}</div>
                    <div style={{height:5,background:"#0A1628",borderRadius:3,overflow:"hidden",marginBottom:5}}>
                      <div style={{height:"100%",width:`${Math.min(100,parseFloat(b.pct))}%`,background:warn?"#F97316":b.c,borderRadius:3}}/>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:10,fontFamily:"'DM Mono',monospace"}}>
                      <span style={{color:warn?"#F97316":b.c,fontWeight:600}}>{b.pct}%{warn?" ⚠":""}</span>
                      <span style={{color:"#2E4A68"}}>{fmt(b.cur)} / {fmt(b.cap)} {pool.name.replace("ISO ","")}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              {[
                {title:"Collateral Cap",c:pool.color,data:[{name:"Deposited",value:pool.totalDeposits*pool.price,amt:pool.totalDeposits},{name:"Cap",value:pool.collateralCap*pool.price,amt:pool.collateralCap}]},
                {title:"Borrow Cap",    c:"#F97316",  data:[{name:"Borrowed", value:pool.totalBorrow*pool.price,  amt:pool.totalBorrow},  {name:"Cap",value:pool.borrowCap*pool.price,    amt:pool.borrowCap}]},
              ].map((chart,ci)=>(
                <div key={ci}>
                  <div style={{fontSize:10,color:"#3A5270",fontWeight:600,marginBottom:10,display:"flex",alignItems:"center",gap:6}}>
                    <span style={{width:8,height:8,borderRadius:2,background:chart.c,display:"inline-block"}}/>{chart.title}
                  </div>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={chart.data} margin={{top:4,right:4,left:-16,bottom:0}} barCategoryGap="35%">
                      <CartesianGrid strokeDasharray="2 5" stroke="#0A1628" vertical={false}/>
                      <XAxis dataKey="name" tick={{fill:"#2E4A68",fontSize:10}} axisLine={false} tickLine={false}/>
                      <YAxis tick={{fill:"#1E3050",fontSize:9}} tickFormatter={v=>`$${fmt(v)}`} axisLine={false} tickLine={false}/>
                      <Tooltip content={({active,payload,label})=>{
                        if(!active||!payload?.length) return null;
                        const d=payload[0].payload;
                        return (
                          <div style={{background:"#0A1220",border:"1px solid #162032",borderRadius:8,padding:"9px 13px",fontSize:11,fontFamily:"'DM Mono',monospace"}}>
                            <p style={{color:"#3A5270",marginBottom:4,fontSize:10}}>{label}</p>
                            <p style={{color:chart.c}}>{fmtUSD(d.value)}</p>
                            <p style={{color:"#4A6380",marginTop:2}}>{fmt(d.amt)} {pool.name.replace("ISO ","")}</p>
                          </div>
                        );
                      }}/>
                      <Bar dataKey="value" radius={[5,5,0,0]}>
                        <Cell fill={`${chart.c}cc`}/>
                        <Cell fill={`${chart.c}22`} stroke={chart.c} strokeWidth={1} strokeDasharray="4 2"/>
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ))}
            </div>
          </Card>

        </div>
      </div>
    </div>
  );
}
