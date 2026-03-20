import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, Sparkles, Play, Zap, Shield, Users,
  Brain, Workflow, BarChart3, Layers,
  CheckCircle2, TrendingUp, Clock, Lock,
} from "lucide-react";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";

// ─── SVG ASSETS ──────────────────────────────────────────────────────────────
import MyCanvas        from "../../assets/my-canvas.png";
import FeatureModeling from "../../assets/feature-modeling.svg";
import FeatureAI       from "../../assets/feature-ai.svg";
import FeatureCollab   from "../../assets/feature-collaboration.svg";
import FeatureAudit    from "../../assets/feature-audit.svg";
import CtaIllust       from "../../assets/cta-illustration.svg";
// ─────────────────────────────────────────────────────────────────────────────


// ── Counter ───────────────────────────────────────────────────────────────────
function useCounter(target, dur=1800) {
  const [v,setV]=useState(0);
  const ref=useRef(null);
  useEffect(()=>{
    const obs=new IntersectionObserver(([e])=>{
      if(!e.isIntersecting) return;
      const s=performance.now();
      const t=n=>{const p=Math.min((n-s)/dur,1);setV(Math.floor(p*target));if(p<1)requestAnimationFrame(t);};
      requestAnimationFrame(t); obs.disconnect();
    },{threshold:0.5});
    if(ref.current) obs.observe(ref.current);
    return ()=>obs.disconnect();
  },[target,dur]);
  return [v,ref];
}

// ── Fade in on scroll ────────────────────────────────────────────────────────
function FadeIn({children,delay=0,className=""}) {
  const ref=useRef(null);
  const [vis,setVis]=useState(false);
  useEffect(()=>{
    const obs=new IntersectionObserver(([e])=>{if(e.isIntersecting){setVis(true);obs.disconnect();}},{threshold:0.08});
    if(ref.current) obs.observe(ref.current);
    return ()=>obs.disconnect();
  },[]);
  return <div ref={ref} className={className} style={{
    transition:`opacity 0.65s ease ${delay}ms,transform 0.65s ease ${delay}ms`,
    opacity:vis?1:0,transform:vis?"translateY(0)":"translateY(22px)",
  }}>{children}</div>;
}

// ── Typed text ────────────────────────────────────────────────────────────────
function TypedText({phrases}) {
  const [pi,setPi]=useState(0);
  const [ci,setCi]=useState(0);
  const [del,setDel]=useState(false);
  useEffect(()=>{
    const cur=phrases[pi];
    const d=del?(ci===0?900:44):(ci===cur.length?2000:72);
    const t=setTimeout(()=>{
      if(!del&&ci<cur.length) setCi(c=>c+1);
      else if(!del) setDel(true);
      else if(del&&ci>0) setCi(c=>c-1);
      else {setDel(false);setPi(i=>(i+1)%phrases.length);}
    },d);
    return ()=>clearTimeout(t);
  },[ci,del,pi,phrases]);
  return <span>{phrases[pi].slice(0,ci)}<span style={{borderRight:"3px solid #2563eb",animation:"blink 1s step-end infinite"}}>&nbsp;</span></span>;
}

// ── DATA ──────────────────────────────────────────────────────────────────────
const FEATURES=[
  {icon:Layers,    title:"Visual Architecture Canvas",tag:"Modeling",     color:"blue",   img:FeatureModeling,body:"Model systems, service boundaries, and dependencies in a structured workspace your whole team can read — not just you."},
  {icon:Brain,     title:"AI Trade-off Evaluator",    tag:"AI Engine",    color:"violet", img:FeatureAI,     body:"Surface risk hotspots, compare architecture alternatives, and get recommendation context generated directly from your model."},
  {icon:Users,     title:"Cross-functional Reviews",  tag:"Collaboration",color:"sky",    img:FeatureCollab, body:"Align architects, engineering leads, and operations through shared async review workflows. No more decision debt from missed meetings."},
  {icon:Lock,      title:"Decision Audit Trail",      tag:"Governance",   color:"emerald",img:FeatureAudit,  body:"Every architectural choice carries traceable rationale. Compliant by default — never reconstruct decisions from Slack threads again."},
];

const STEPS=[
  {n:"01",title:"Model the system",      body:"Drag and connect components, set boundaries, and capture assumptions in one structured canvas everyone can see.",icon:Workflow},
  {n:"02",title:"Evaluate with AI",      body:"Run AI-assisted analysis across multiple scenarios. Spot risks, compare trade-offs, and quantify real impact.",    icon:Brain   },
  {n:"03",title:"Decide with confidence",body:"Present stakeholder-ready recommendations with clear rationale and a full decision history attached.",             icon:BarChart3},
];

const PERSONAS=[
  {role:"System Architects",      pain:"Decisions live in whiteboards and Slack — invisible to everyone else.",            gain:"One canonical model, always current. Share a link instead of scheduling another meeting.",icon:Layers   },
  {role:"Engineering Leadership", pain:"Hard to prioritize architecture investments without measuring risk vs. impact.",    gain:"AI-scored trade-off analysis surfaces what actually needs your attention.",              icon:TrendingUp},
  {role:"Operations Teams",       pain:"Reliability gaps discovered in incidents, not in planning.",                        gain:"Model operational bottlenecks before they become outages.",                             icon:Clock    },
  {role:"Security & Compliance",  pain:"Audit prep means reconstructing decisions nobody documented properly.",            gain:"Every decision carries its rationale. Audits take hours, not weeks.",                    icon:Shield   },
];

const LOGOS=["Meridian Capital","TechStack Inc.","CloudNine Systems","Apex Engineering","Vantage Platforms","Ironclad Labs","NovaBuild","Stratex Group"];

// ── MAIN ──────────────────────────────────────────────────────────────────────
export default function Lander() {
  const navigate=useNavigate();
  const [activeF,setActiveF]=useState(0);
  const [showGains,setShowGains]=useState(false);

  useEffect(()=>{
    const t=setInterval(()=>setActiveF(p=>(p+1)%FEATURES.length),4000);
    return ()=>clearInterval(t);
  },[]);

  const colMap={blue:"#2563eb",violet:"#7c3aed",sky:"#0284c7",emerald:"#059669"};
  const bgMap ={blue:"#eff6ff",violet:"#f5f3ff",sky:"#e0f2fe",emerald:"#ecfdf5"};

  return (
    <div style={{background:"#fff",color:"#0f172a",fontFamily:"'DM Sans',system-ui,sans-serif",minHeight:"100vh"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=DM+Mono:wght@400;500&family=Plus+Jakarta+Sans:wght@700;800&display=swap');
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        @keyframes scrollX{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .logo-scroll{animation:scrollX 32s linear infinite}
        .btn-p{display:inline-flex;align-items:center;gap:8px;background:#2563eb;color:#fff;font-weight:600;border-radius:10px;padding:13px 28px;font-size:14px;border:none;cursor:pointer;transition:background .2s,transform .15s;font-family:'DM Sans',sans-serif}
        .btn-p:hover{background:#1d4ed8;transform:translateY(-1px)}
        .btn-o{display:inline-flex;align-items:center;gap:8px;background:transparent;color:#374151;font-weight:500;border-radius:10px;padding:13px 28px;font-size:14px;border:1.5px solid #d1d5db;cursor:pointer;transition:border-color .2s,color .2s;font-family:'DM Sans',sans-serif}
        .btn-o:hover{border-color:#2563eb;color:#2563eb}
        .pill{display:inline-flex;align-items:center;gap:6px;background:#f3f4f6;border:1px solid #111827;color:#111827;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:5px 13px;border-radius:99px}
        .ftab{width:100%;text-align:left;border-radius:12px;border:1.5px solid #e2e8f0;background:#fff;padding:18px 20px;cursor:pointer;transition:border-color .2s,background .2s,box-shadow .2s}
        .ftab:hover{border-color:#93c5fd;background:#f8fbff}
        .ftab.active{border-color:#2563eb;background:#f0f7ff;box-shadow:0 2px 12px rgba(37,99,235,.07)}
        .step-card{background:#fff;border:1.5px solid #e2e8f0;border-radius:16px;padding:32px 28px;position:relative;overflow:hidden;transition:border-color .25s,box-shadow .25s}
        .step-card:hover{border-color:#93c5fd;box-shadow:0 4px 24px rgba(37,99,235,.07)}
        .persona-toggle{display:inline-flex;align-items:center;gap:6px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:999px;padding:4px}
        .persona-toggle button{border:none;background:transparent;color:#1e3a8a;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:8px 14px;border-radius:999px;cursor:pointer;transition:background .2s,color .2s,box-shadow .2s}
        .persona-toggle button:hover{background:rgba(37,99,235,.08)}
        .persona-toggle button.active{background:#2563eb;color:#fff;box-shadow:0 4px 14px rgba(37,99,235,.28)}
        .persona-card{background:#fff;border:1.5px solid #dbe4f0;border-radius:18px;padding:22px;transition:border-color .2s,box-shadow .25s,transform .2s;height:100%;position:relative;overflow:hidden}
        .persona-card::after{content:"";position:absolute;right:-30px;top:-30px;width:110px;height:110px;border-radius:50%;background:radial-gradient(circle,#dbeafe 0%,rgba(219,234,254,0) 70%);pointer-events:none}
        .persona-card:hover{border-color:#93c5fd;box-shadow:0 8px 28px rgba(15,23,42,.08);transform:translateY(-2px)}
        .persona-head{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:14px}
        .persona-title{display:flex;align-items:center;gap:12px;min-width:0}
        .persona-icon{width:42px;height:42px;border-radius:12px;background:#eff6ff;border:1px solid #dbeafe;display:flex;align-items:center;justify-content:center;flex-shrink:0}
        .persona-state{font-size:10px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;padding:5px 10px;border-radius:999px;border:1px solid}
        .persona-state.challenge{color:#b91c1c;background:#fef2f2;border-color:#fecaca}
        .persona-state.value{color:#1d4ed8;background:#eff6ff;border-color:#bfdbfe}
        .persona-copy{font-size:0.915rem;line-height:1.7;color:#64748b;margin:0}
        .persona-copy strong{font-weight:700}
        .persona-copy .lead-challenge{color:#dc2626}
        .persona-copy .lead-value{color:#2563eb}
        .hero-typed{white-space:nowrap}
        h1,h2,h3,.djf{font-family:'Plus Jakarta Sans','DM Sans',sans-serif}

        /* Responsive */
        .hero-grid{display:grid;grid-template-columns:1fr 1fr}
        .features-grid{display:grid;grid-template-columns:1fr 1fr}
        .steps-grid{display:grid;grid-template-columns:repeat(3,1fr)}
        .personas-grid{display:grid;grid-template-columns:repeat(2,1fr);align-items:stretch}
        .personas-grid .persona-card{height:100%}
        .stats-grid{display:grid;grid-template-columns:repeat(3,1fr)}

        /* ── Tablet (≤1024px) ── */
        @media (max-width: 1024px){
          .hero-grid{grid-template-columns:1fr;gap:40px;max-width:680px;margin-left:auto;margin-right:auto}
          .hero-media{order:2}
          .hero-copy{order:1;text-align:center}
          .hero-copy .pill{justify-content:center}
          .hero-copy p{margin-left:auto;margin-right:auto}
          .hero-actions{justify-content:center}
          .hero-trust{justify-content:center}
          .stats-grid{grid-template-columns:repeat(3,1fr)}
          .features-grid{grid-template-columns:1fr;gap:2rem;max-width:680px;margin-left:auto;margin-right:auto}
          .steps-grid{grid-template-columns:1fr;gap:1.25rem;max-width:640px;margin-left:auto;margin-right:auto}
          .personas-grid{grid-template-columns:1fr 1fr;gap:1rem}
        }

        /* ── Mobile (≤640px) ── */
        @media (max-width: 640px){
          .hero{padding:64px 0 56px}
          .hero-inner{padding:0 1.25rem}
          .logo-strip{padding:14px 0}
          .stats-grid{grid-template-columns:1fr 1fr;gap:.75rem}
          .hero-actions{width:100%;flex-direction:column}
          .hero-actions button{width:100%}
          .hero-trust{flex-direction:column;align-items:center;gap:10px}
          .cta{padding:72px 1.25rem}
          .cta-actions{flex-direction:column;align-items:stretch}
          .cta-actions button{width:100%}
          .personas-grid{grid-template-columns:1fr}
          .features-section{padding:72px 1.25rem}
          .process-section{padding:72px 1.25rem}
          .personas-section{padding:72px 1.25rem}
          .ftab{padding:14px 16px}
          .step-card{padding:24px 20px}
          .persona-card{padding:18px}
          .persona-toggle{display:flex;width:100%;max-width:340px}
          .persona-toggle button{flex:1;text-align:center;padding:8px 10px}
          .persona-head{align-items:flex-start}
          .persona-state{align-self:flex-start}
          h2{font-size:clamp(1.6rem,6vw,2.2rem) !important}
          .hero-copy h1{font-size:clamp(2.1rem,9vw,2.8rem) !important}
          .hero-typed{white-space:normal}
          .hero-chrome{padding:8px 10px !important;gap:6px !important}
          .hero-url{font-size:10px !important;padding:2px 8px !important;margin-left:6px !important}
          .hero-eval{display:none}
        }

        /* ── Small mobile (≤390px) ── */
        @media (max-width: 390px){
          .stats-grid{grid-template-columns:1fr}
          .hero-inner{padding:0 1rem}
        }
      `}</style>

      <Navbar/>

      {/* ──── HERO ──────────────────────────────── */}
      <section className="hero" style={{
        background:"linear-gradient(180deg,#f0f7ff 0%,#fff 100%)",
        borderBottom:"1px solid #e2e8f0",
        padding:"96px 0 80px",
        position:"relative",overflow:"hidden",
      }}>
        <div style={{
          position:"absolute",inset:0,pointerEvents:"none",
          backgroundImage:"radial-gradient(#dbeafe 1px,transparent 1px)",
          backgroundSize:"28px 28px",opacity:0.6,
        }}/>
        <div className="hero-inner" style={{maxWidth:1200,margin:"0 auto",padding:"0 2rem",position:"relative"}}>
          <div className="hero-grid" style={{gap:"56px",alignItems:"center"}}>

            {/* Left */}
            <div className="hero-copy">
              <div className="pill" style={{marginBottom:20}}>
                <Sparkles size={11}/> AI-Native Decision Intelligence
              </div>
              <h1 style={{
                fontSize:"clamp(2.5rem,3.8vw,3.5rem)",fontWeight:800,lineHeight:1.1,
                color:"#0f172a",marginBottom:20,letterSpacing:"-0.025em",
              }}>
                Architecture decisions<br/>
                <span className="hero-typed" style={{display:"block",color:"#2563eb",minHeight:"1.2em"}}>
                  <TypedText phrases={["never get lost.","scale with you.","close in hours.","earn trust."]}/>
                </span>
              </h1>
              <p style={{fontSize:"1.05rem",color:"#64748b",lineHeight:1.8,maxWidth:480,marginBottom:32}}>
                Structra gives engineering teams a shared model for architecture,
                an AI layer for trade-off analysis, and a governance trail that
                makes audits effortless.
              </p>
              <div className="hero-actions" style={{display:"flex",gap:12,flexWrap:"wrap",marginBottom:28}}>
                <button className="btn-p" onClick={()=>navigate("/signup")}>
                  Start free trial <ArrowRight size={15}/>
                </button>
                <button className="btn-o" onClick={()=>navigate("/demo")}>
                  <Play size={13}/> Watch demo
                </button>
              </div>
              <div className="hero-trust" style={{display:"flex",gap:20,flexWrap:"wrap",fontSize:13,color:"#94a3b8"}}>
                {[[CheckCircle2,"No credit card required"],[Shield,"SOC 2 aligned"],[Zap,"Ready in 5 minutes"]].map(([Icon,label])=>(
                  <span key={label} style={{display:"flex",alignItems:"center",gap:5}}>
                    <Icon size={13} style={{color:"#2563eb"}}/> {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Right — browser frame with user's canvas */}
            <div className="hero-media" style={{position:"relative"}}>
              <div style={{
                background:"#fff",borderRadius:16,
                border:"1.5px solid #e2e8f0",overflow:"hidden",
                boxShadow:"0 8px 40px rgba(15,23,42,0.1)",
              }}>
                {/* browser chrome */}
                <div className="hero-chrome" style={{
                  background:"#f8fafc",borderBottom:"1px solid #e2e8f0",
                  padding:"10px 16px",display:"flex",alignItems:"center",gap:7,
                }}>
                  {["#ef4444","#f59e0b","#22c55e"].map(c=>(
                    <div key={c} style={{width:10,height:10,borderRadius:"50%",background:c}}/>
                  ))}
                  <div className="hero-url" style={{
                    marginLeft:10,background:"#fff",border:"1px solid #e2e8f0",borderRadius:6,
                    padding:"3px 14px",fontSize:11,color:"#94a3b8",
                    fontFamily:"DM Mono,monospace",flex:1,
                  }}>
                    structra.cloud<span style={{color:"#2563eb"}}>/app/ws</span>
                  </div>
                  <span className="hero-eval" style={{
                    background:"#eff6ff",border:"1px solid #bfdbfe",
                    color:"#1d4ed8",fontSize:11,fontWeight:600,
                    borderRadius:99,padding:"3px 12px",whiteSpace:"nowrap",
                  }}>✦ Evaluate</span>
                </div>
                {/* canvas screenshot */}
                <img
                  src={MyCanvas}
                  alt="Structra architecture canvas"
                  style={{display:"block",width:"100%",objectFit:"cover"}}
                />
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ──── LOGO STRIP ────────────────────────── */}
      <div className="logo-strip" style={{borderBottom:"1px solid #111827",borderTop:"1px solid #111827",background:"#f3f4f6",padding:"18px 0",overflow:"hidden",position:"relative"}}>
        <div style={{position:"absolute",left:0,top:0,bottom:0,width:80,background:"linear-gradient(90deg,#f3f4f6,transparent)",zIndex:2}}/>
        <div style={{position:"absolute",right:0,top:0,bottom:0,width:80,background:"linear-gradient(270deg,#f3f4f6,transparent)",zIndex:2}}/>
        <div className="logo-scroll" style={{display:"flex",gap:"3rem",width:"max-content"}}>
          {[...LOGOS,...LOGOS].map((n,i)=>(
            <span key={i} style={{fontSize:12,fontWeight:700,color:"#111827",letterSpacing:"0.1em",textTransform:"uppercase",whiteSpace:"nowrap"}}>{n}</span>
          ))}
        </div>
      </div>

      {/* ──── FEATURES ──────────────────────────── */}
      <section className="features-section" style={{padding:"96px 2rem",maxWidth:1200,margin:"0 auto"}}>
        <FadeIn>
          <div style={{textAlign:"center",marginBottom:"3.5rem"}}>
            <div className="pill" style={{marginBottom:16}}>Platform Capabilities</div>
            <h2 style={{fontSize:"clamp(1.9rem,3vw,2.6rem)",fontWeight:800,color:"#0f172a",letterSpacing:"-0.02em",marginBottom:14}}>
              Built for serious architecture work
            </h2>
            <p style={{color:"#64748b",maxWidth:480,margin:"0 auto",lineHeight:1.75,fontSize:"1rem"}}>
              Purpose-built for complex distributed systems — not retrofitted from a generic diagramming tool.
            </p>
          </div>
        </FadeIn>

        <div className="features-grid" style={{gap:"3rem",alignItems:"center"}}>
          {/* illustration */}
          <FadeIn>
            <div style={{
              background:"#f0f7ff",borderRadius:16,border:"1.5px solid #dbeafe",
              padding:"2.5rem",display:"flex",alignItems:"center",justifyContent:"center",
              minHeight:340,
            }}>
              <img src={FEATURES[activeF].img} alt={FEATURES[activeF].title}
                style={{width:"100%",maxWidth:360,objectFit:"contain"}}/>
            </div>
          </FadeIn>

          {/* tabs */}
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {FEATURES.map((f,i)=>{
              const Icon=f.icon;
              const isActive=i===activeF;
              const col=colMap[f.color];
              const bg=bgMap[f.color];
              return (
                <button key={f.title} className={`ftab${isActive?" active":""}`} onClick={()=>setActiveF(i)}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:14}}>
                    <div style={{
                      width:38,height:38,borderRadius:10,flexShrink:0,
                      background:isActive?bg:"#f8fafc",
                      display:"flex",alignItems:"center",justifyContent:"center",
                    }}>
                      <Icon size={18} style={{color:isActive?col:"#94a3b8"}}/>
                    </div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:10,fontWeight:700,letterSpacing:"0.1em",textTransform:"uppercase",color:isActive?col:"#94a3b8",marginBottom:4}}>{f.tag}</div>
                      <h3 style={{fontSize:"1rem",fontWeight:700,color:"#0f172a",marginBottom:isActive?6:0}}>{f.title}</h3>
                      {isActive&&<p style={{fontSize:"0.875rem",color:"#64748b",lineHeight:1.65,marginTop:4}}>{f.body}</p>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ──── HOW IT WORKS ──────────────────────── */}
      <section className="process-section" style={{background:"#f8fafc",borderTop:"1px solid #e2e8f0",borderBottom:"1px solid #e2e8f0",padding:"96px 2rem"}}>
        <div style={{maxWidth:1100,margin:"0 auto"}}>
          <FadeIn>
            <div style={{textAlign:"center",marginBottom:"3.5rem"}}>
              <div className="pill" style={{marginBottom:16}}>Process</div>
              <h2 style={{fontSize:"clamp(1.9rem,3vw,2.6rem)",fontWeight:800,color:"#0f172a",letterSpacing:"-0.02em"}}>
                From whiteboard to decision —<br/>in one workflow
              </h2>
            </div>
          </FadeIn>

          <div className="steps-grid" style={{gap:"1.5rem"}}>
            {STEPS.map((s,i)=>{
              const Icon=s.icon;
              return (
                <FadeIn key={s.n} delay={i*100}>
                  <div className="step-card">
                    <div style={{
                      position:"absolute",top:-8,right:14,
                      fontSize:"5rem",fontWeight:800,color:"#f0f7ff",
                      fontFamily:"'Plus Jakarta Sans',sans-serif",lineHeight:1,
                      userSelect:"none",letterSpacing:"-0.04em",
                    }}>{s.n}</div>
                    <div style={{
                      width:44,height:44,borderRadius:12,
                      background:"#eff6ff",display:"flex",
                      alignItems:"center",justifyContent:"center",marginBottom:20,
                    }}>
                      <Icon size={20} style={{color:"#2563eb"}}/>
                    </div>
                    <div style={{fontSize:11,fontWeight:700,letterSpacing:"0.12em",textTransform:"uppercase",color:"#2563eb",marginBottom:10}}>
                      Step {s.n}
                    </div>
                    <h3 style={{fontSize:"1.15rem",fontWeight:700,color:"#0f172a",marginBottom:10}}>{s.title}</h3>
                    <p style={{fontSize:"0.875rem",color:"#64748b",lineHeight:1.75}}>{s.body}</p>
                  </div>
                </FadeIn>
              );
            })}
          </div>
        </div>
      </section>

      {/* ──── PERSONAS ──────────────────────────── */}
      <section className="personas-section" style={{padding:"96px 2rem",maxWidth:1200,margin:"0 auto"}}>
        <FadeIn>
          <div style={{textAlign:"center",marginBottom:"3.5rem"}}>
            <div className="pill" style={{marginBottom:16}}>Who it's for</div>
            <h2 style={{fontSize:"clamp(1.9rem,3vw,2.6rem)",fontWeight:800,color:"#0f172a",letterSpacing:"-0.02em"}}>
              Built for every team that touches<br/>architecture decisions
            </h2>
            <p style={{margin:"14px auto 0",maxWidth:560,fontSize:"0.95rem",lineHeight:1.7,color:"#64748b"}}>
              Switch perspectives to compare each team's current friction with the outcomes they get using Structra.
            </p>
            <div style={{marginTop:18,display:"flex",justifyContent:"center"}}>
              <div className="persona-toggle" role="tablist" aria-label="Persona perspective">
                <button
                  type="button"
                  className={!showGains ? "active" : ""}
                  onClick={() => setShowGains(false)}
                  role="tab"
                  aria-selected={!showGains}
                >
                  Current reality
                </button>
                <button
                  type="button"
                  className={showGains ? "active" : ""}
                  onClick={() => setShowGains(true)}
                  role="tab"
                  aria-selected={showGains}
                >
                  <Sparkles size={12} style={{display:"inline-block",marginRight:6,verticalAlign:"-1px"}}/>
                  With Structra
                </button>
              </div>
            </div>
          </div>
        </FadeIn>

        <div className="personas-grid" style={{gap:"1.25rem"}}>
          {PERSONAS.map((p,i)=>{
            const Icon=p.icon;
            return (
              <FadeIn key={p.role} delay={i*80}>
                <div className="persona-card">
                  <div className="persona-head">
                    <div className="persona-title">
                      <div className="persona-icon">
                        <Icon size={18} style={{color:"#2563eb"}}/>
                      </div>
                      <h3 style={{fontSize:"1.1rem",fontWeight:700,color:"#0f172a",margin:0}}>{p.role}</h3>
                    </div>
                    <span className={`persona-state ${showGains ? "value" : "challenge"}`}>
                      {showGains ? "Outcome" : "Challenge"}
                    </span>
                  </div>
                  <p className="persona-copy">
                    {showGains ? (
                      <>
                        <strong className="lead-value">With Structra:</strong> {p.gain}
                      </>
                    ) : (
                      <>
                        <strong className="lead-challenge">Challenge:</strong> {p.pain}
                      </>
                    )}
                  </p>
                  {!showGains && (
                    <div style={{marginTop:12,fontSize:"0.78rem",color:"#94a3b8",fontWeight:600}}>
                      Toggle to <span style={{color:"#2563eb"}}>With Structra</span> to preview their improved state.
                    </div>
                  )}
                  {showGains && (
                    <div style={{marginTop:12,fontSize:"0.78rem",color:"#94a3b8",fontWeight:600}}>
                      Result is tailored for <span style={{color:"#0f172a"}}>{p.role}</span>.
                    </div>
                  )}
                </div>
              </FadeIn>
            );
          })}
        </div>
      </section>

      {/* ──── CTA ───────────────────────────────── */}
      <section className="cta" style={{background:"linear-gradient(135deg,#1d4ed8 0%,#0284c7 100%)",padding:"100px 2rem",textAlign:"center"}}>
        <FadeIn>
          <div style={{maxWidth:700,margin:"0 auto"}}>
            <div style={{
              display:"inline-flex",alignItems:"center",gap:7,
              background:"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.3)",
              borderRadius:99,padding:"5px 16px",
              fontSize:11,fontWeight:700,color:"#fff",
              letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:24,
            }}>
              <Sparkles size={11}/> Start free today
            </div>

            <h2 style={{
              fontSize:"clamp(2.2rem,4vw,3.2rem)",fontWeight:800,
              color:"#fff",lineHeight:1.12,marginBottom:20,letterSpacing:"-0.02em",
            }}>
              Your team's architecture decisions deserve better than Confluence.
            </h2>

            <p style={{fontSize:"1.05rem",color:"rgba(255,255,255,0.75)",lineHeight:1.8,marginBottom:36}}>
              Launch a workspace in minutes. Bring architects, engineering leads,
              and ops into one shared model — with AI that actually helps you decide.
            </p>

            <div className="cta-actions" style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap"}}>
              <button
                onClick={()=>navigate("/signup")}
                style={{
                  display:"inline-flex",alignItems:"center",gap:8,
                  background:"#fff",color:"#1d4ed8",fontWeight:700,
                  borderRadius:10,padding:"14px 32px",fontSize:15,
                  border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",
                  transition:"transform .15s",
                }}
                onMouseOver={e=>e.currentTarget.style.transform="translateY(-1px)"}
                onMouseOut={e=>e.currentTarget.style.transform="none"}
              >
                Start free trial <ArrowRight size={16}/>
              </button>
              <button
                onClick={()=>navigate("/pricing")}
                style={{
                  display:"inline-flex",alignItems:"center",gap:8,
                  background:"transparent",color:"rgba(255,255,255,0.9)",fontWeight:600,
                  borderRadius:10,padding:"14px 28px",fontSize:15,
                  border:"1.5px solid rgba(255,255,255,0.4)",cursor:"pointer",
                  fontFamily:"'DM Sans',sans-serif",transition:"border-color .2s",
                }}
                onMouseOver={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.8)"}
                onMouseOut={e=>e.currentTarget.style.borderColor="rgba(255,255,255,0.4)"}
              >
                View pricing
              </button>
            </div>

            <p style={{marginTop:20,fontSize:12,color:"rgba(255,255,255,0.4)"}}>
              No credit card required · Cancel anytime · SOC 2 aligned
            </p>
          </div>
        </FadeIn>

        <div style={{maxWidth:480,margin:"48px auto 0"}}>
          <img src={CtaIllust} alt="Get started with Structra" style={{width:"100%",objectFit:"contain"}}/>
        </div>
      </section>

      <Footer/>
    </div>
  );
}
