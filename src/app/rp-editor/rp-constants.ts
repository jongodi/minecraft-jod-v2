export const BG="#0d0f12",BG2="#13161b",BG3="#1a1e26",BORDER="#2a3040";
export const ACCENT="#4ade80",ACCENT2="#22d3ee",DIM="#4a5568",TEXT="#e2e8f0",TEXT2="#94a3b8",WARN="#f59e0b",ERR="#f87171";
export const PX=`font-family:'Courier New',monospace`;
export const VANILLA_PREFIXES=["block/","item/","entity/","gui/","environment/","font/","map/","misc/","mob_effect/","painting/","particle/","colormap/","effect/","models/","textures/","sounds/"];
export function isLikelyVanilla(p:string){return VANILLA_PREFIXES.some(v=>p.toLowerCase().includes(v));}

export const css=`
*{box-sizing:border-box;margin:0;padding:0}
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:${BG}}
::-webkit-scrollbar-thumb{background:${BORDER};border-radius:2px}
.root{display:flex;flex-direction:column;height:100vh;min-height:600px;background:${BG};${PX};font-size:13px;color:${TEXT};overflow:hidden;position:relative}
.topbar{display:flex;align-items:center;gap:10px;padding:8px 12px;background:${BG2};border-bottom:2px solid ${BORDER};flex-shrink:0}
.logo{color:${ACCENT};font-size:15px;font-weight:700;letter-spacing:2px}.logo span{color:${ACCENT2}}
.btn{background:${BG3};border:1px solid ${BORDER};color:${TEXT};padding:5px 12px;cursor:pointer;font-family:inherit;font-size:12px;letter-spacing:1px;text-transform:uppercase;transition:border-color 0.2s,color 0.2s}
.btn:hover{border-color:${ACCENT};color:${ACCENT}}.btn.active{border-color:${ACCENT};color:${ACCENT};background:#0a1a0a}
.btn.sm{padding:2px 8px;font-size:10px;letter-spacing:0.5px}
.btn.danger:hover{border-color:${ERR};color:${ERR}}
.btn.fixbtn:hover{border-color:${WARN};color:${WARN};background:${WARN}0d}
.btn.apply:hover{border-color:${ACCENT};background:${ACCENT}0d}
.navtabs{display:flex;background:${BG2};border-bottom:2px solid ${BORDER};flex-shrink:0;padding:0 12px}
.navtab{padding:9px 18px;cursor:pointer;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:${DIM};border-bottom:2px solid transparent;margin-bottom:-2px;transition:color 0.2s;display:flex;align-items:center;gap:6px}
.navtab:hover{color:${TEXT2}}.navtab.active{color:${ACCENT};border-bottom-color:${ACCENT}}
.navtab .cnt{background:${ERR}22;color:${ERR};border:1px solid ${ERR}44;padding:0 5px;font-size:9px;letter-spacing:0;border-radius:2px}
.tab-content{flex:1;overflow:hidden;display:flex;flex-direction:column}
.scroll-area{flex:1;overflow-y:auto;padding:20px 24px}
.stat-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;margin-bottom:28px}
.stat-card{background:${BG2};border:1px solid ${BORDER};padding:16px}
.stat-num{font-size:26px;font-weight:700;line-height:1;margin-bottom:4px}
.stat-label{font-size:9px;color:${DIM};letter-spacing:2px;text-transform:uppercase}
.stat-card.c-err .stat-num{color:${ERR}}.stat-card.c-warn .stat-num{color:${WARN}}
.stat-card.c-ok .stat-num{color:${ACCENT}}.stat-card.c-info .stat-num{color:${ACCENT2}}
.sh{font-size:9px;color:${DIM};letter-spacing:3px;text-transform:uppercase;margin-bottom:12px;padding-bottom:8px;border-bottom:1px solid ${BORDER};display:flex;align-items:center;gap:8px}
.sh .cnt{color:${TEXT2};font-size:10px;letter-spacing:0;background:${BG3};padding:1px 6px;border:1px solid ${BORDER}}
.filter-row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;padding:12px 20px;border-bottom:1px solid ${BORDER};flex-shrink:0}
.search{background:${BG3};border:1px solid ${BORDER};color:${TEXT};padding:5px 10px;font-family:inherit;font-size:11px;outline:none;min-width:160px;flex:1;max-width:260px}
.search:focus{border-color:${ACCENT2}}
.tex-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:6px}
.tex-card{background:${BG2};border:1px solid ${BORDER};cursor:pointer;overflow:hidden;transition:border-color 0.15s,transform 0.15s}
.tex-card:hover{transform:translateY(-2px)}
.tex-card.linked{border-color:${ACCENT}55}.tex-card.vanilla{border-color:${ACCENT2}55}.tex-card.unlinked{border-color:${WARN}55}
.tex-card:hover.linked{border-color:${ACCENT}}.tex-card:hover.vanilla{border-color:${ACCENT2}}.tex-card:hover.unlinked{border-color:${WARN}}
.tex-thumb{width:100%;aspect-ratio:1;display:flex;align-items:center;justify-content:center;background:#070910;padding:6px}
.tex-thumb img{max-width:100%;max-height:100%;image-rendering:pixelated;object-fit:contain}
.tex-info{padding:5px 6px;border-top:1px solid ${BORDER}66}
.tex-name{font-size:9px;color:${TEXT2};white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tex-st{font-size:8px;margin-top:2px;letter-spacing:1px;text-transform:uppercase}
.tex-st.linked{color:${ACCENT}}.tex-st.vanilla{color:${ACCENT2}}.tex-st.unlinked{color:${WARN}}
.model-list{display:flex;flex-direction:column;gap:4px}
.mc{background:${BG2};border:1px solid ${BORDER}}.mc.has-issues{border-color:${ERR}44}
.mc-head{padding:9px 12px;display:flex;align-items:center;gap:8px;cursor:pointer;user-select:none}
.mc-head:hover{background:${BG3}}
.mc-name{flex:1;font-size:11px;color:${TEXT2};overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mc-badge{font-size:9px;padding:2px 6px;border:1px solid;letter-spacing:1px;flex-shrink:0}
.mc-badge.ok{border-color:${ACCENT}44;color:${ACCENT}}.mc-badge.err{border-color:${ERR}44;color:${ERR}}.mc-badge.none{border-color:${BORDER};color:${DIM}}
.mc-refs{border-top:1px solid ${BORDER};padding:8px 12px;display:flex;flex-direction:column;gap:3px}
.ref-row{display:grid;grid-template-columns:80px 1fr 30px;align-items:start;gap:8px;padding:5px 8px;background:${BG3}}
.ref-key{font-size:9px;color:${DIM};letter-spacing:1px;padding-top:3px}
.ref-main{display:flex;flex-direction:column;gap:4px;min-width:0}
.ref-val{font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ref-val.found{color:${ACCENT}}.ref-val.vanilla{color:${ACCENT2}}.ref-val.broken{color:${ERR}}
.ref-hint{font-size:9px;color:${DIM};letter-spacing:0.5px}
.ref-hint.found{color:${ACCENT}88}.ref-hint.vanilla{color:${ACCENT2}88}.ref-hint.broken{color:${ERR}88}
.ref-preview{width:30px;height:30px;background:#070910;border:1px solid ${BORDER};image-rendering:pixelated;object-fit:contain}
.ref-nopreview{width:30px;height:30px;background:#070910;border:1px solid ${BORDER};display:flex;align-items:center;justify-content:center;font-size:10px;color:${DIM}}
.fix-wrap{display:flex;gap:4px;align-items:center;flex-wrap:wrap;background:#150c0c;padding:5px 6px;margin-top:2px}
.fix-sel{background:${BG};border:1px solid ${WARN}44;color:${TEXT};padding:3px 6px;font-family:inherit;font-size:10px;outline:none;flex:1;min-width:0}
.fix-sel:focus{border-color:${WARN}}
.fix-inp{background:${BG};border:1px solid ${BORDER};color:${TEXT};padding:3px 6px;font-family:inherit;font-size:10px;outline:none;width:140px}
.fix-inp:focus{border-color:${WARN}}
.fix-or{font-size:9px;color:${DIM};flex-shrink:0}
.issue-list{display:flex;flex-direction:column;gap:4px}
.issue-item{background:${BG2};border:1px solid ${ERR}33;padding:10px 14px;display:flex;gap:12px}
.issue-meta{flex:1;min-width:0;display:flex;flex-direction:column;gap:4px}
.issue-model{font-size:9px;color:${DIM};letter-spacing:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.issue-key{font-size:10px;color:${TEXT2}}
.issue-ref{font-size:12px;color:${ERR};overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.editor-layout{flex:1;display:flex;overflow:hidden}
.sidebar{width:220px;min-width:180px;background:${BG2};border-right:2px solid ${BORDER};display:flex;flex-direction:column;overflow:hidden}
.sidebar-title{padding:8px 10px;font-size:10px;color:${DIM};letter-spacing:2px;text-transform:uppercase;border-bottom:1px solid ${BORDER};flex-shrink:0}
.tree{flex:1;overflow-y:auto;padding:4px 0}
.tree-node{padding:3px 8px 3px calc(8px + var(--depth)*14px);cursor:pointer;display:flex;align-items:center;gap:6px;color:${TEXT2};font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.tree-node:hover{background:${BG3};color:${TEXT}}
.tree-node.selected{background:#0a1a0a;color:${ACCENT};border-left:2px solid ${ACCENT}}
.center{flex:1;display:flex;flex-direction:column;overflow:hidden}
.tab-bar{display:flex;background:${BG2};border-bottom:2px solid ${BORDER};flex-shrink:0;overflow-x:auto}
.tab{padding:6px 14px;cursor:pointer;font-size:11px;letter-spacing:1px;text-transform:uppercase;color:${DIM};border-right:1px solid ${BORDER};white-space:nowrap;flex-shrink:0}
.tab:hover{color:${TEXT2}}.tab.active{color:${ACCENT};background:${BG};border-bottom:2px solid ${ACCENT}}
.editor-area{flex:1;overflow:auto;padding:16px}
.drop-zone{border:2px dashed ${BORDER};padding:40px;text-align:center;color:${DIM};cursor:pointer;transition:border-color 0.2s}
.drop-zone:hover,.drop-zone.drag{border-color:${ACCENT};color:${TEXT}}
.field{margin-bottom:14px}.field label{display:block;font-size:10px;color:${DIM};letter-spacing:1px;text-transform:uppercase;margin-bottom:4px}
.field input,.field textarea{width:100%;background:${BG3};border:1px solid ${BORDER};color:${TEXT};padding:6px 8px;font-family:inherit;font-size:12px;outline:none}
.field input:focus,.field textarea:focus{border-color:${ACCENT}}.field textarea{resize:vertical;min-height:80px}
.err-line{background:#2a1010;color:${ERR};font-size:11px;padding:3px 8px;border-left:2px solid ${ERR};margin-bottom:2px;white-space:pre-wrap;word-break:break-all}
.json-editor-wrap{position:relative;width:100%}
.line-nums{position:absolute;left:0;top:0;width:36px;padding:10px 4px;font-size:11px;line-height:1.5;color:${DIM};text-align:right;user-select:none;pointer-events:none;white-space:pre}
textarea.code{background:${BG};border:1px solid ${BORDER};color:${ACCENT2};font-size:11px;padding:10px 10px 10px 44px;width:100%;min-height:300px;resize:vertical;outline:none;font-family:'Courier New',monospace;line-height:1.5;tab-size:2}
textarea.code:focus{border-color:${ACCENT2}}textarea.code.has-errors{border-color:${ERR}}
.status-bar{background:${BG2};border-top:1px solid ${BORDER};padding:4px 12px;font-size:11px;color:${DIM};flex-shrink:0;display:flex;gap:16px;flex-wrap:wrap}
.status-bar b{color:${ACCENT}}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadein{from{opacity:0}to{opacity:1}}
.spinner{width:26px;height:26px;border:2px solid ${BORDER};border-top-color:${ACCENT};border-radius:50%;animation:spin 0.65s linear infinite}
.loading-overlay{position:absolute;inset:0;background:rgba(13,15,18,0.82);display:flex;align-items:center;justify-content:center;z-index:200;backdrop-filter:blur(3px);animation:fadein 0.12s ease}
.loading-box{display:flex;flex-direction:column;align-items:center;gap:14px;background:${BG2};border:1px solid ${BORDER};padding:28px 36px}
.loading-label{font-size:10px;color:${ACCENT};letter-spacing:3px;text-transform:uppercase}
.loading-sub{font-size:9px;color:${DIM};letter-spacing:1px}`;
