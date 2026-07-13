'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Design tokens + the liquid-glass system for the Pack Editor.
//
// Two colour languages, deliberately separate:
//   • Brand/chrome — driven by the site's CSS variables (--accent, --bg…), so
//     the whole instrument flips with the matrix/western theme.
//   • Semantics   — FIXED severity hues (error/review/used/info). Meaning must
//     stay legible in any theme, like a traffic light, so it is not themed.
//
// The glass is real optics: layered specular + rim light, an inner shadow for
// thickness, faint refraction (SVG displacement) with chromatic edges, and a
// pointer-reactive highlight. Everything degrades gracefully (no backdrop
// filter → tinted solid; reduced motion → static).
// ─────────────────────────────────────────────────────────────────────────────

/** Fixed semantic colors for JS inline styles (charts, chips built in TSX). */
export const SEV = {
  error: '#ff5773',
  warning: '#f0a500',
  used: '#2fd07f',
  info: '#5aa7ff',
  neutral: '#8b93a7',
} as const;

export const RP_CSS = `
.rp-root{
  --s1:4px; --s2:8px; --s3:12px; --s4:16px; --s5:24px; --s6:32px; --s7:48px;
  --sev-error:#ff5773; --sev-warning:#f0a500; --sev-used:#2fd07f; --sev-info:#5aa7ff;
  --panel:rgba(var(--text-rgb),0.015);
  --hair:rgba(var(--text-rgb),0.08);
  --hair-strong:rgba(var(--text-rgb),0.14);
  --ink:var(--text);
  --ink-dim:#8b93a7;
  --ink-faint:var(--muted);
  --radius:14px;
  position:fixed; inset:0; z-index:1; display:flex; flex-direction:column;
  background:
    radial-gradient(120% 80% at 80% -10%, rgba(var(--accent-rgb),0.06), transparent 60%),
    radial-gradient(90% 70% at -10% 110%, rgba(var(--accent-rgb),0.05), transparent 55%),
    var(--bg);
  color:var(--ink);
  font-family:var(--font-mono);
  font-size:13px; overflow:hidden;
}
.rp-root *{box-sizing:border-box; margin:0; padding:0;}
.rp-root ::-webkit-scrollbar{width:8px; height:8px;}
.rp-root ::-webkit-scrollbar-track{background:transparent;}
.rp-root ::-webkit-scrollbar-thumb{background:var(--hair-strong); border-radius:6px; border:2px solid transparent; background-clip:padding-box;}
.rp-root ::-webkit-scrollbar-thumb:hover{background:rgba(var(--accent-rgb),0.5); background-clip:padding-box;}

/* ── Typography ─────────────────────────────────────────────── */
.rp-num{font-family:var(--font-display); font-weight:700; letter-spacing:-0.02em; line-height:0.95; font-variant-numeric:tabular-nums;}
.rp-title{font-family:var(--font-display); font-weight:800; letter-spacing:-0.02em;}
.rp-label{font-family:var(--font-mono); text-transform:uppercase; letter-spacing:0.24em; font-size:0.58rem; color:var(--ink-faint);}
.rp-mono{font-family:var(--font-mono);}
.rp-path{font-family:var(--font-mono); font-size:0.72rem; word-break:break-all; color:var(--ink-dim);}

/* ── Liquid glass ───────────────────────────────────────────── */
.glass{
  position:relative; border-radius:var(--radius);
  background:
    linear-gradient(157deg, rgba(var(--text-rgb),0.06), rgba(var(--text-rgb),0.012) 42%, rgba(0,0,0,0.10)),
    rgba(var(--accent-rgb),0.022);
  border:1px solid var(--hair);
  box-shadow:
    inset 0 1px 0 rgba(var(--text-rgb),0.20),
    inset 0 0 0 1px rgba(var(--accent-rgb),0.035),
    inset 0 -30px 60px -42px rgba(0,0,0,0.8),
    0 14px 46px -18px rgba(0,0,0,0.6);
  backdrop-filter:blur(16px) saturate(1.6) brightness(1.05);
  -webkit-backdrop-filter:blur(16px) saturate(1.6) brightness(1.05);
  overflow:hidden;
}
/* specular sheen — follows the pointer via --mx/--my */
.glass::before{
  content:''; position:absolute; inset:0; pointer-events:none; border-radius:inherit; z-index:0;
  background:
    radial-gradient(220px 220px at calc(var(--mx,0.5)*100%) calc(var(--my,0.0)*100%), rgba(var(--text-rgb),0.16), transparent 62%),
    linear-gradient(150deg, rgba(var(--text-rgb),0.12), transparent 34%);
  mix-blend-mode:screen; opacity:0.85; transition:opacity 0.4s ease;
}
/* faint chromatic refraction edges */
.glass::after{
  content:''; position:absolute; inset:0; pointer-events:none; border-radius:inherit; z-index:0;
  box-shadow:
    inset 1.5px 0 1px -1px rgba(90,170,255,0.35),
    inset -1.5px 0 1px -1px rgba(255,90,150,0.30),
    inset 0 1.5px 1px -1px rgba(120,255,220,0.20);
  mix-blend-mode:screen; opacity:0.6;
}
.glass > *{position:relative; z-index:1;}
.glass.tint-accent{background:linear-gradient(157deg, rgba(var(--accent-rgb),0.10), rgba(var(--accent-rgb),0.02) 45%, rgba(0,0,0,0.10));}
.glass.flush{border-radius:0;}

/* refraction displacement — enhancement only, capable browsers */
@supports (backdrop-filter: url(#rp-refract)){
  .rp-refract-on .glass{ backdrop-filter:blur(13px) saturate(1.6) brightness(1.05) url(#rp-refract); }
}
/* no backdrop-filter → solid tinted fallback (weak devices) */
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))){
  .glass{ background:linear-gradient(157deg, var(--bg-card), var(--bg-elevated)); }
}

/* ── Shell layout ───────────────────────────────────────────── */
.rp-top{display:flex; align-items:center; gap:var(--s3); padding:10px 16px; border-bottom:1px solid var(--hair); flex-shrink:0; position:relative; z-index:5;}
.rp-brand{font-family:var(--font-display); font-weight:900; letter-spacing:0.02em; font-size:1rem; color:var(--ink);}
.rp-brand b{color:var(--accent);}
.rp-brand span{color:var(--ink-faint); font-weight:400; font-size:0.62rem; letter-spacing:0.2em; text-transform:uppercase; margin-left:6px;}
.rp-tabs{display:flex; gap:2px; padding:0 12px; flex-shrink:0; position:relative; z-index:5; overflow-x:auto; border-bottom:1px solid var(--hair);}
.rp-tab{padding:11px 16px; cursor:pointer; font-size:0.58rem; letter-spacing:0.2em; text-transform:uppercase; color:var(--ink-faint); border-bottom:2px solid transparent; margin-bottom:-1px; white-space:nowrap; display:flex; align-items:center; gap:7px; transition:color 0.2s;}
.rp-tab:hover{color:var(--ink-dim);}
.rp-tab.active{color:var(--ink); border-bottom-color:var(--accent);}
.rp-tab .tabnum{font-size:0.6rem; padding:1px 6px; border-radius:20px; background:rgba(var(--text-rgb),0.06); color:var(--ink-dim); letter-spacing:0;}
.rp-tab .tabnum.err{background:rgba(255,87,115,0.14); color:var(--sev-error);}
.rp-more{position:relative;}
/* Rendered in a portal at the document root (fixed), so the tab bar's
   overflow-x:auto can never clip it. Coordinates are set inline at open time. */
.rp-more-menu{position:fixed; min-width:230px; background:var(--bg-card); border:1px solid var(--hair-strong); border-radius:10px; padding:5px; z-index:120; box-shadow:0 14px 40px rgba(0,0,0,0.5);}
.rp-more-item{display:flex; align-items:baseline; gap:10px; padding:8px 11px; border-radius:7px; cursor:pointer; font-size:0.6rem; letter-spacing:0.16em; text-transform:uppercase; color:var(--ink-dim); transition:background 0.15s, color 0.15s;}
.rp-more-item:hover{background:rgba(var(--text-rgb),0.05); color:var(--ink);}
.rp-more-item.active{color:var(--accent);}
.rp-more-item .hint{margin-left:auto; font-size:0.52rem; letter-spacing:0.04em; text-transform:none; color:var(--ink-faint);}
.rp-body{flex:1; overflow:hidden; display:flex; flex-direction:column; position:relative; z-index:2;}
.rp-scroll{flex:1; overflow-y:auto; padding:var(--s6) clamp(16px, 4vw, 40px);}
.rp-status{display:flex; gap:16px; align-items:center; padding:6px 16px; border-top:1px solid var(--hair); font-size:0.6rem; color:var(--ink-faint); letter-spacing:0.05em; flex-shrink:0; flex-wrap:wrap; position:relative; z-index:5;}
.rp-status b{color:var(--ink); font-weight:600;}

/* ── Buttons ────────────────────────────────────────────────── */
.rp-btn{background:rgba(var(--text-rgb),0.03); border:1px solid var(--hair); color:var(--ink-dim); padding:6px 13px; cursor:pointer; font-family:var(--font-mono); font-size:0.62rem; letter-spacing:0.14em; text-transform:uppercase; border-radius:8px; transition:border-color 0.2s, color 0.2s, background 0.2s; white-space:nowrap;}
.rp-btn:hover{border-color:rgba(var(--accent-rgb),0.6); color:var(--ink);}
.rp-btn.active{border-color:var(--accent); color:var(--accent); background:rgba(var(--accent-rgb),0.08);}
.rp-btn.sm{padding:3px 8px; font-size:0.55rem; letter-spacing:0.08em; border-radius:6px;}
.rp-btn.primary{background:var(--accent); color:var(--bg); border-color:var(--accent); font-weight:700;}
.rp-btn.primary:hover{background:var(--accent-dim); color:var(--bg);}
.rp-btn.danger:hover{border-color:var(--sev-error); color:var(--sev-error);}
.rp-btn.apply:hover{border-color:var(--sev-used); color:var(--sev-used);}
.rp-btn:disabled{opacity:0.4; cursor:default;}

/* ── Chips + meters ─────────────────────────────────────────── */
.rp-chip{display:inline-flex; align-items:center; gap:5px; font-size:0.55rem; letter-spacing:0.1em; text-transform:uppercase; padding:2px 8px; border-radius:20px; border:1px solid; white-space:nowrap;}
.rp-chip.error{color:var(--sev-error); border-color:rgba(255,87,115,0.4); background:rgba(255,87,115,0.08);}
.rp-chip.warning{color:var(--sev-warning); border-color:rgba(240,165,0,0.4); background:rgba(240,165,0,0.08);}
.rp-chip.used{color:var(--sev-used); border-color:rgba(47,208,127,0.4); background:rgba(47,208,127,0.08);}
.rp-chip.info{color:var(--sev-info); border-color:rgba(90,167,255,0.4); background:rgba(90,167,255,0.08);}
.rp-chip.neutral{color:var(--ink-dim); border-color:var(--hair-strong);}
.rp-chip .dot{width:6px; height:6px; border-radius:50%; background:currentColor; flex-shrink:0;}

.rp-conf{display:inline-flex; gap:2px; align-items:center;}
.rp-conf i{width:4px; height:10px; border-radius:1px; background:var(--hair-strong); display:inline-block;}
.rp-conf i.on{background:currentColor;}

/* ── Section header ─────────────────────────────────────────── */
.rp-sh{display:flex; align-items:baseline; gap:12px; margin-bottom:var(--s4); padding-bottom:var(--s3); border-bottom:1px solid var(--hair);}
.rp-sh h2{font-family:var(--font-display); font-weight:800; font-size:1.05rem; letter-spacing:-0.01em; color:var(--ink);}
.rp-sh .rp-label{margin-left:auto;}

/* ── Findings ───────────────────────────────────────────────── */
.rp-finding{border-radius:12px; margin-bottom:8px; overflow:hidden; position:relative;}
.rp-finding .rail{position:absolute; left:0; top:0; bottom:0; width:3px;}
.rp-finding.error .rail{background:var(--sev-error);}
.rp-finding.warning .rail{background:var(--sev-warning);}
.rp-finding.cleanup .rail{background:var(--sev-used);}
.rp-finding.info .rail{background:var(--sev-info);}
.rp-finding-head{display:flex; align-items:flex-start; gap:12px; padding:13px 16px 13px 20px; cursor:pointer; user-select:none;}
.rp-finding-head:hover{background:rgba(var(--text-rgb),0.03);}
.rp-finding-icon{width:26px; height:26px; border-radius:7px; display:flex; align-items:center; justify-content:center; font-size:13px; flex-shrink:0; border:1px solid;}
.rp-finding.error .rp-finding-icon{color:var(--sev-error); border-color:rgba(255,87,115,0.35); background:rgba(255,87,115,0.06);}
.rp-finding.warning .rp-finding-icon{color:var(--sev-warning); border-color:rgba(240,165,0,0.35); background:rgba(240,165,0,0.06);}
.rp-finding.cleanup .rp-finding-icon{color:var(--sev-used); border-color:rgba(47,208,127,0.35); background:rgba(47,208,127,0.06);}
.rp-finding.info .rp-finding-icon{color:var(--sev-info); border-color:rgba(90,167,255,0.35); background:rgba(90,167,255,0.06);}
.rp-finding-main{flex:1; min-width:0; display:flex; flex-direction:column; gap:4px;}
.rp-finding-title{font-size:0.82rem; color:var(--ink); font-weight:500; line-height:1.35;}
.rp-finding-detail{font-size:0.72rem; color:var(--ink-dim); line-height:1.55;}
.rp-finding-meta{display:flex; align-items:center; gap:8px; flex-shrink:0; padding-top:2px;}
.rp-caret{color:var(--ink-faint); font-size:0.7rem; transition:transform 0.2s; flex-shrink:0; margin-top:4px;}
.rp-caret.open{transform:rotate(90deg);}
.rp-evidence{padding:2px 16px 15px 20px; display:flex; flex-direction:column; gap:9px; animation:rp-fade 0.2s ease;}
.rp-ev-block{border-left:2px solid var(--hair); padding:2px 0 2px 12px; display:flex; flex-direction:column; gap:5px;}
.rp-ev-h{font-size:0.52rem; letter-spacing:0.2em; text-transform:uppercase; color:var(--ink-faint);}
.rp-ev-row{display:flex; gap:8px; align-items:baseline; font-size:0.7rem; color:var(--ink-dim); line-height:1.5;}
.rp-ev-row .tag{flex-shrink:0; width:80px; font-size:0.5rem; letter-spacing:0.1em; text-transform:uppercase; color:var(--ink-faint); padding-top:1px;}
.rp-ev-row .src{color:var(--accent); cursor:pointer; text-decoration:none;}
.rp-ev-row .src:hover{text-decoration:underline;}
.rp-consequence{font-size:0.7rem; color:var(--ink-dim); background:rgba(var(--text-rgb),0.03); border-radius:8px; padding:9px 12px; line-height:1.55; border:1px solid var(--hair);}
.rp-consequence b{color:var(--ink);}

/* ── Stat cards ─────────────────────────────────────────────── */
.rp-stats{display:grid; grid-template-columns:repeat(auto-fill, minmax(150px,1fr)); gap:12px; margin-bottom:var(--s6);}
.rp-stat{padding:18px 18px 16px; display:flex; flex-direction:column; gap:8px;}
.rp-stat .rp-num{font-size:2.1rem;}
.rp-stat .cap{font-size:0.55rem; letter-spacing:0.18em; text-transform:uppercase; color:var(--ink-faint);}
.rp-stat.err .rp-num{color:var(--sev-error);} .rp-stat.warn .rp-num{color:var(--sev-warning);}
.rp-stat.ok .rp-num{color:var(--sev-used);} .rp-stat.info .rp-num{color:var(--sev-info);}

/* ── Health bar ─────────────────────────────────────────────── */
.rp-health{display:flex; height:10px; border-radius:6px; overflow:hidden; border:1px solid var(--hair); background:rgba(0,0,0,0.2);}
.rp-health i{height:100%;}

/* ── Asset grid + inspector ─────────────────────────────────── */
.rp-filters{display:flex; gap:6px; flex-wrap:wrap; align-items:center; padding:12px 0 16px;}
.rp-search{background:rgba(var(--text-rgb),0.04); border:1px solid var(--hair); color:var(--ink); padding:6px 11px; font-family:var(--font-mono); font-size:0.7rem; outline:none; border-radius:8px; min-width:180px; flex:0 1 260px;}
.rp-search:focus{border-color:rgba(var(--accent-rgb),0.6);}
.rp-grid{display:grid; grid-template-columns:repeat(auto-fill, minmax(88px,1fr)); gap:8px;}
.rp-cell{border-radius:10px; cursor:pointer; overflow:hidden; position:relative; transition:transform 0.15s ease; border:1px solid var(--hair);}
.rp-cell:hover{transform:translateY(-3px);}
.rp-cell .thumb{aspect-ratio:1; display:flex; align-items:center; justify-content:center; background:repeating-conic-gradient(#0a0d13 0% 25%, #070a0f 0% 50%) 50% / 12px 12px; padding:8px;}
.rp-cell .thumb img{max-width:100%; max-height:100%; image-rendering:pixelated; object-fit:contain;}
.rp-cell .cap{padding:5px 7px; border-top:1px solid var(--hair);}
.rp-cell .nm{font-size:0.58rem; color:var(--ink-dim); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
.rp-cell .v{font-size:0.5rem; letter-spacing:0.08em; text-transform:uppercase; margin-top:3px; display:flex; align-items:center; gap:4px;}
.rp-cell.v-used{border-color:rgba(47,208,127,0.4);} .rp-cell.v-used .v{color:var(--sev-used);}
.rp-cell.v-review{border-color:rgba(240,165,0,0.4);} .rp-cell.v-review .v{color:var(--sev-warning);}
.rp-cell.v-safe-remove{border-color:rgba(255,87,115,0.4);} .rp-cell.v-safe-remove .v{color:var(--sev-error);}
.rp-cell.v-error{border-color:rgba(255,87,115,0.5);} .rp-cell.v-error .v{color:var(--sev-error);}
.rp-cell.sel{outline:2px solid var(--accent); outline-offset:-2px;}
.rp-cell .cbx{position:absolute; top:5px; left:5px; width:13px; height:13px; border-radius:3px; border:1px solid var(--hair-strong); z-index:2; pointer-events:none;}
.rp-cell .cbx.on{background:var(--accent); border-color:var(--accent);}

.rp-drawer{width:min(380px, 40vw); border-left:1px solid var(--hair); flex-shrink:0; display:flex; flex-direction:column; overflow:hidden; background:rgba(var(--bg-rgb),0.5);}
.rp-drawer-head{padding:14px 16px; border-bottom:1px solid var(--hair); display:flex; gap:12px; align-items:center;}
.rp-drawer-body{flex:1; overflow-y:auto; padding:16px;}

/* ── Editor sub-UI (tree, code, fields) ─────────────────────── */
.rp-editor-layout{flex:1; display:flex; overflow:hidden;}
.rp-sidebar{width:250px; min-width:200px; border-right:1px solid var(--hair); display:flex; flex-direction:column; overflow:hidden; background:rgba(var(--bg-rgb),0.4);}
.rp-sidebar-title{padding:10px 12px; font-size:0.55rem; color:var(--ink-faint); letter-spacing:0.2em; text-transform:uppercase; border-bottom:1px solid var(--hair); flex-shrink:0;}
.rp-tree{flex:1; overflow-y:auto; padding:6px 0;}
.tree-node{padding:3px 8px 3px calc(10px + var(--depth,0)*14px); cursor:pointer; display:flex; align-items:center; gap:6px; color:var(--ink-dim); font-size:0.72rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-family:var(--font-mono);}
.tree-node:hover{background:rgba(var(--text-rgb),0.04); color:var(--ink);}
.tree-node.selected{background:rgba(var(--accent-rgb),0.08); color:var(--accent); border-left:2px solid var(--accent);}
.rp-center{flex:1; display:flex; flex-direction:column; overflow:hidden;}
.rp-tabbar{display:flex; flex-shrink:0; overflow-x:auto; border-bottom:1px solid var(--hair);}
.rp-subtab{padding:8px 14px; cursor:pointer; font-size:0.6rem; letter-spacing:0.1em; text-transform:uppercase; color:var(--ink-faint); border-right:1px solid var(--hair); white-space:nowrap; flex-shrink:0;}
.rp-subtab:hover{color:var(--ink-dim);}
.rp-subtab.active{color:var(--accent); border-bottom:2px solid var(--accent);}
.rp-editarea{flex:1; overflow:auto; padding:18px;}
.rp-field{margin-bottom:14px;} .rp-field label{display:block; font-size:0.55rem; color:var(--ink-faint); letter-spacing:0.12em; text-transform:uppercase; margin-bottom:5px;}
.rp-field input, .rp-field textarea{width:100%; background:rgba(var(--text-rgb),0.04); border:1px solid var(--hair); color:var(--ink); padding:7px 9px; font-family:var(--font-mono); font-size:0.75rem; outline:none; border-radius:8px;}
.rp-field input:focus, .rp-field textarea:focus{border-color:rgba(var(--accent-rgb),0.6);} .rp-field textarea{resize:vertical; min-height:80px;}
.rp-errline{background:rgba(255,87,115,0.1); color:var(--sev-error); font-size:0.7rem; padding:4px 9px; border-left:2px solid var(--sev-error); margin-bottom:3px; white-space:pre-wrap; word-break:break-all; border-radius:4px;}
.rp-json-wrap{position:relative; width:100%;}
.rp-linenums{position:absolute; left:0; top:0; width:38px; padding:11px 5px; font-size:0.7rem; line-height:1.5; color:var(--ink-faint); text-align:right; user-select:none; pointer-events:none; white-space:pre; font-family:var(--font-mono);}
.rp-code{background:rgba(0,0,0,0.25); border:1px solid var(--hair); color:var(--sev-info); font-size:0.72rem; padding:11px 11px 11px 46px; width:100%; min-height:320px; resize:vertical; outline:none; font-family:var(--font-mono); line-height:1.5; tab-size:2; border-radius:8px;}
.rp-code:focus{border-color:rgba(var(--accent-rgb),0.5);} .rp-code.has-errors{border-color:var(--sev-error);}

/* ── Dropzone ───────────────────────────────────────────────── */
.rp-drop{border:1.5px dashed var(--hair-strong); border-radius:16px; padding:clamp(32px,6vw,64px); text-align:center; cursor:pointer; transition:border-color 0.25s, background 0.25s;}
.rp-drop:hover, .rp-drop.drag{border-color:var(--accent); background:rgba(var(--accent-rgb),0.03);}

/* ── Overlay / spinner ──────────────────────────────────────── */
.rp-overlay{position:absolute; inset:0; background:rgba(var(--bg-rgb),0.72); display:flex; align-items:center; justify-content:center; z-index:200; backdrop-filter:blur(6px); animation:rp-fade 0.15s ease;}
.rp-spin{width:30px; height:30px; border:2px solid var(--hair); border-top-color:var(--accent); border-radius:50%; animation:rp-spin 0.7s linear infinite;}
.rp-progress{width:220px; height:3px; border-radius:2px; background:var(--hair); overflow:hidden;}
.rp-progress i{display:block; height:100%; background:var(--accent); transition:width 0.2s ease;}

@keyframes rp-spin{to{transform:rotate(360deg);}}
@keyframes rp-fade{from{opacity:0;} to{opacity:1;}}
@keyframes rp-rise{from{opacity:0; transform:translateY(10px);} to{opacity:1; transform:translateY(0);}}
.rp-rise{animation:rp-rise 0.5s cubic-bezier(0.16,1,0.3,1) both;}

/* ── Reduced motion / weak-device fallbacks ─────────────────── */
@media (prefers-reduced-motion: reduce){
  .rp-root *{transition-duration:0.01ms !important; animation-duration:0.01ms !important;}
  .glass::before{background:linear-gradient(150deg, rgba(var(--text-rgb),0.10), transparent 34%);}
  .rp-cell:hover{transform:none;}
}

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 720px){
  .rp-drawer{position:absolute; right:0; top:0; bottom:0; width:min(320px,88vw); z-index:20;}
  .rp-sidebar{width:190px; min-width:160px;}
  .rp-scroll{padding:var(--s5) var(--s4);}
}
`;

/** The SVG displacement filter that powers glass refraction on capable browsers. */
export function GlassFilterDefs() {
  return (
    <svg aria-hidden width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
      <filter id="rp-refract" x="-20%" y="-20%" width="140%" height="140%">
        <feTurbulence type="fractalNoise" baseFrequency="0.012 0.016" numOctaves={2} seed={7} result="n" />
        <feDisplacementMap in="SourceGraphic" in2="n" scale="7" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </svg>
  );
}
