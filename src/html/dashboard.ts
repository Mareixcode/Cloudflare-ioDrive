export function renderDashboard(isDemo: boolean = false): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ioDrive</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='24' font-size='24'>☁️</text></svg>">
  <style>
    :root{--bg:#f5f5f7;--card:#fff;--border:#e5e5e5;--text:#111;--sub:#888;--accent:#111;--accent-fg:#fff;--hover:#f0f0f0;--row-hover:#f8f8fa;--shadow:0 2px 12px rgba(0,0,0,0.06);--fab-shadow:0 4px 16px rgba(0,0,0,0.15);--up-bg:#fff;--modal-shadow:0 8px 32px rgba(0,0,0,0.12)}
    [data-theme="dark"]{--bg:#09090b;--card:#18181b;--border:#27272a;--text:#fafafa;--sub:#71717a;--accent:#fafafa;--accent-fg:#18181b;--hover:#27272a;--row-hover:#1f1f23;--shadow:0 2px 12px rgba(0,0,0,0.3);--fab-shadow:0 4px 16px rgba(0,0,0,0.4);--up-bg:#18181b;--modal-shadow:0 8px 32px rgba(0,0,0,0.4)}
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:var(--text);background:var(--bg);transition:background .35s,color .35s}
    .layout{display:flex;height:100vh;overflow:hidden}
    .side{width:220px;background:var(--card);border-right:1px solid var(--border);padding:20px 0;display:flex;flex-direction:column;transition:background .35s,border .35s,transform .3s cubic-bezier(.34,1.56,.64,1);flex-shrink:0;z-index:50}
    .side-logo{display:flex;align-items:center;gap:8px;padding:4px 20px 24px;font-size:17px;font-weight:700;color:var(--text)}
    .side-logo svg{width:26px;height:26px;transition:transform .4s cubic-bezier(.34,1.56,.64,1)}
    .side-logo:hover svg{transform:rotate(-10deg) scale(1.12)}
    .nav{display:flex;align-items:center;gap:10px;padding:9px 20px;color:var(--sub);font-size:13px;font-weight:500;cursor:pointer;border-radius:0 10px 10px 0;transition:all .2s cubic-bezier(.34,1.56,.64,1);text-decoration:none;margin-right:12px}
    .nav:hover{background:var(--hover);color:var(--text);transform:translateX(2px)}
    .nav.on{background:var(--hover);color:var(--text);font-weight:600}
    .nav svg{width:18px;height:18px;flex-shrink:0}
    .side-bottom{margin-top:auto;padding:16px 20px}
    .pill{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:10px;cursor:pointer;transition:all .2s;font-size:13px;color:var(--sub)}
    .pill:hover{background:var(--hover);color:var(--text)}
    .pill .dot{width:28px;height:28px;border-radius:50%;background:var(--accent);color:var(--accent-fg);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600}
    .main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
    #page-files,#page-downloads,#page-uploads,#page-uploadkeys{flex:1;display:flex;flex-direction:column;overflow:hidden}
    #page-downloads>div,#page-uploads>div,#page-shares>div,#page-uploadkeys>div{flex:1;min-height:0}

    /* ── Hamburger ── */
    .hamburger{display:none;background:none;border:none;cursor:pointer;padding:6px;color:var(--text);flex-shrink:0;border-radius:6px;transition:background .2s}
    .hamburger:hover{background:var(--hover)}
    .hamburger svg{width:22px;height:22px}

    /* ── Mobile sidebar overlay ── */
    .side-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:40;backdrop-filter:blur(2px)}
    .side-overlay.on{display:block}
    .side-close{display:none;align-items:center;justify-content:space-between;padding:4px 12px 16px}
    .side-close button{background:none;border:none;cursor:pointer;padding:6px;border-radius:6px;color:var(--sub);transition:all .2s}
    .side-close button:hover{background:var(--hover);color:var(--text)}

    .topbar{display:flex;align-items:center;padding:12px 24px;gap:12px;border-bottom:1px solid var(--border);background:var(--card);transition:all .35s;flex-shrink:0}
    .search{flex:1;max-width:560px;position:relative;min-width:140px}
    .search input{width:100%;padding:9px 14px 9px 38px;border:1.5px solid var(--border);border-radius:10px;font-size:14px;outline:none;background:var(--bg);color:var(--text);transition:all .25s}
    .search input:focus{border-color:var(--accent);background:var(--card);box-shadow:0 0 0 3px rgba(100,100,100,0.08)}
    .search svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:var(--sub)}
    .topbar-actions{display:flex;align-items:center;gap:8px;flex-shrink:0}
    .theme-btn{background:none;border:1.5px solid var(--border);cursor:pointer;padding:7px 10px;border-radius:8px;font-size:15px;transition:all .2s;color:var(--sub)}
    .theme-btn:hover{background:var(--hover);transform:scale(1.08)}
    .icon-btn{background:none;border:1.5px solid var(--border);cursor:pointer;padding:7px;border-radius:8px;font-size:15px;transition:all .2s;color:var(--sub);line-height:1;display:inline-flex;align-items:center;justify-content:center}
    .icon-btn:hover{background:var(--hover);transform:scale(1.08)}
    .icon-btn svg{width:16px;height:16px}

    /* ── Breadcrumbs ── */
    .breadcrumbs{display:flex;align-items:center;gap:4px;padding:8px 24px;font-size:13px;color:var(--sub);border-bottom:1px solid var(--border);flex-shrink:0;flex-wrap:wrap}
    .breadcrumbs .bc-item{cursor:pointer;transition:color .2s;padding:2px 4px;border-radius:4px}
    .breadcrumbs .bc-item:hover{color:var(--text);background:var(--hover)}
    .breadcrumbs .bc-item.bc-cur{color:var(--text);font-weight:500;cursor:default}
    .breadcrumbs .bc-item.bc-cur:hover{background:none}
    .breadcrumbs .bc-sep{color:var(--border);margin:0 2px}

    /* ── Selection toolbar ── */
    .sel-toolbar{display:none;align-items:center;gap:12px;padding:8px 24px;background:var(--card);border-bottom:1px solid var(--border);font-size:13px;flex-shrink:0;animation:fadeIn .2s ease}
    .sel-toolbar .sel-count{color:var(--sub);font-weight:500;margin-right:auto}
    .sel-toolbar .sel-actions{display:flex;gap:6px}
    @keyframes fadeIn{0%{opacity:0}100%{opacity:1}}

    /* ── List grid (6 columns with checkbox) ── */
    .list-head{display:grid;grid-template-columns:28px 28px 1fr 100px 140px 80px;padding:10px 24px;font-size:12px;font-weight:600;color:var(--sub);text-transform:uppercase;letter-spacing:0.3px;border-bottom:1px solid var(--border);flex-shrink:0;align-items:center}
    .list-head input[type=checkbox]{cursor:pointer;accent-color:var(--accent)}
    .list{flex:1;overflow-y:auto}
    .row{display:grid;grid-template-columns:28px 28px 1fr 100px 140px 80px;align-items:center;padding:10px 24px;font-size:14px;border-bottom:1px solid transparent;cursor:pointer;transition:background .15s,transform .2s cubic-bezier(.34,1.56,.64,1);animation:slideUp .35s cubic-bezier(.34,1.56,.64,1) both}
    .row:hover{background:var(--row-hover);transform:scale(1.005)}
    .row .chk{display:flex;align-items:center;justify-content:center}
    .row .chk input[type=checkbox]{cursor:pointer;accent-color:var(--accent)}
    @keyframes slideUp{0%{opacity:0;transform:translateY(12px)}100%{opacity:1;transform:translateY(0)}}
    .row .ic{font-size:18px;transition:transform .3s cubic-bezier(.34,1.56,.64,1);text-align:center}
    .row:hover .ic{transform:scale(1.15) rotate(-5deg)}
    .row .nm{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .row .sz,.row .dt{color:var(--sub);font-size:13px}
    .row .ac{display:flex;gap:2px;opacity:0;transition:opacity .15s,transform .2s;transform:translateX(4px)}
    .row:hover .ac{opacity:1;transform:translateX(0)}
    .folder-row{color:var(--text)}
    .folder-row .nm{font-weight:600}
    .folder-row:hover{background:var(--row-hover);transform:scale(1.005)}
    .ac button{background:none;border:none;cursor:pointer;padding:5px;border-radius:6px;font-size:15px;color:var(--sub);transition:all .15s}
    .ac button:hover{background:var(--hover);color:var(--text);transform:scale(1.2)}
    .empty{padding:80px;text-align:center;color:var(--sub);font-size:14px}
    .fab{position:fixed;bottom:24px;right:24px;width:52px;height:52px;border-radius:16px;background:var(--accent);color:var(--accent-fg);border:none;cursor:pointer;font-size:24px;box-shadow:var(--fab-shadow);transition:all .25s cubic-bezier(.34,1.56,.64,1);z-index:100;display:flex;align-items:center;justify-content:center}
    .fab:hover{transform:scale(1.1) rotate(90deg)}
    .up-panel{position:fixed;bottom:0;right:24px;width:360px;max-width:calc(100vw - 16px);background:var(--up-bg);border-radius:16px 16px 0 0;box-shadow:var(--modal-shadow);z-index:150;display:none}
    .up-panel.on{display:block;animation:slideUp .4s cubic-bezier(.34,1.56,.64,1)}
    .up-head{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid var(--border);font-size:13px;font-weight:600}
    .up-head button{background:none;border:none;font-size:18px;cursor:pointer;color:var(--sub)}
    .up-item{padding:12px 18px;border-bottom:1px solid var(--border)}
    .up-item .nm{font-size:13px;font-weight:500;margin-bottom:6px;word-break:break-all}
    .up-bar{height:4px;background:var(--border);border-radius:2px;overflow:hidden}
    .up-bar .fl{height:100%;background:var(--accent);border-radius:2px;transition:width .2s}
    .up-item .st{font-size:11px;color:var(--sub);margin-top:4px}
    .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;z-index:200;backdrop-filter:blur(4px);padding:16px}
    .modal{background:var(--card);border-radius:18px;padding:30px;min-width:340px;max-width:500px;width:100%;box-shadow:var(--modal-shadow);animation:pop .4s cubic-bezier(.34,1.56,.64,1);transition:background .35s}
    @keyframes pop{0%{opacity:0;transform:scale(.9) translateY(12px)}100%{opacity:1;transform:scale(1) translateY(0)}}
    .modal h2{font-size:17px;font-weight:700;margin-bottom:14px}
    .modal label{font-size:12px;font-weight:600;color:var(--sub);text-transform:uppercase;letter-spacing:0.3px}
    .modal input[type=text]{width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;margin:6px 0 12px;outline:none;background:var(--bg);color:var(--text);transition:all .2s}
    .modal input:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(100,100,100,0.08)}
    .btn-row{display:flex;gap:8px;justify-content:flex-end;margin-top:8px;flex-wrap:wrap}
    .btn{padding:9px 20px;border-radius:10px;border:none;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s}
    .btn:hover{transform:translateY(-1px)}
    .btn:active{transform:scale(0.96)}
    .btn-p{background:var(--accent);color:var(--accent-fg)}
    .btn-s{background:var(--bg);color:var(--text);border:1px solid var(--border)}
    .drop{position:fixed;inset:0;z-index:50;display:none;pointer-events:none;background:rgba(100,100,100,0.06);border:3px dashed var(--accent);backdrop-filter:blur(2px)}
    .drop.on{display:flex;align-items:center;justify-content:center;pointer-events:auto}
    .drop-text{font-size:20px;font-weight:700;color:var(--accent);opacity:0.6;text-align:center;padding:16px}

    /* ── Downloads / Uploads log pages ── */
    .dl-stats{display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap}
    .dl-stat{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px 20px;min-width:100px;flex:1 1 auto;transition:all .35s}
    .dl-stat .num{font-size:24px;font-weight:700;color:var(--text)}
    .dl-stat .label{font-size:12px;color:var(--sub);margin-top:2px}
    .log-search{width:100%;max-width:320px;margin-bottom:16px}
    .log-search input{width:100%;padding:9px 14px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:var(--bg);color:var(--text);outline:none}
    .log-search input:focus{border-color:var(--accent);background:var(--card)}
    .log-list{display:flex;flex-direction:column;gap:10px}
    .log-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:14px;cursor:pointer;transition:all .2s}
    .log-card:hover{background:var(--row-hover);transform:scale(1.005);border-color:var(--accent)}
    .log-card .lc-icon{width:40px;height:40px;border-radius:10px;background:var(--bg);display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}
    .log-card .lc-main{flex:1;min-width:0}
    .log-card .lc-name{font-weight:600;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text)}
    .log-card .lc-meta{font-size:12px;color:var(--sub);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .log-card .lc-tags{display:flex;align-items:center;gap:8px;flex-shrink:0;flex-wrap:wrap;justify-content:flex-end}
    .log-card .lc-tag{font-size:11px;padding:4px 8px;border-radius:6px;background:var(--bg);color:var(--sub);border:1px solid var(--border);white-space:nowrap}
    .log-card .lc-tag.src-r2{color:#3b82f6;background:rgba(59,130,246,0.08);border-color:rgba(59,130,246,0.2)}
    .log-card .lc-tag.src-s3{color:#f59e0b;background:rgba(245,158,11,0.08);border-color:rgba(245,158,11,0.2)}
    .log-card .lc-tag.src-dashboard{color:#22c55e;background:rgba(34,197,94,0.08);border-color:rgba(34,197,94,0.2)}
    .log-card .lc-tag.src-public{color:#8b5cf6;background:rgba(139,92,246,0.08);border-color:rgba(139,92,246,0.2)}
    .log-card .lc-tag.src-upload-key{color:#06b6d4;background:rgba(6,182,212,0.08);border-color:rgba(6,182,212,0.2)}
    .log-card .lc-actions{display:flex;gap:4px;margin-left:4px}
    .log-card .lc-actions button{background:none;border:none;cursor:pointer;padding:5px;border-radius:6px;font-size:13px;color:var(--sub);transition:all .15s}
    .log-card .lc-actions button:hover{background:var(--hover);color:var(--text)}
    .log-card .lc-actions button.danger:hover{color:#ef4444;background:rgba(239,68,68,0.08)}
    .log-empty{padding:80px 20px;text-align:center;color:var(--sub)}
    .log-empty .icon{font-size:40px;margin-bottom:12px;opacity:0.5}

    /* ── Public upload card ── */
    .public-upload-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:18px 20px;margin-bottom:20px}
    .public-upload-card input[type=text]{flex:1;min-width:200px;font-family:monospace;font-size:12px}

    /* ── Upload keys table ── */
    .dl-table-wrap{overflow-x:auto;border:1px solid var(--border);border-radius:12px;background:var(--card)}
    .dl-table{width:100%;border-collapse:collapse;font-size:13px}
    .dl-table thead{background:var(--bg);position:sticky;top:0;z-index:1}
    .dl-table th{padding:12px 16px;text-align:left;font-weight:600;color:var(--sub);font-size:12px;text-transform:uppercase;letter-spacing:0.3px;border-bottom:1px solid var(--border);white-space:nowrap}
    .dl-table td{padding:12px 16px;border-bottom:1px solid var(--border);color:var(--text);vertical-align:middle}
    .dl-table tr:last-child td{border-bottom:none}
    .dl-table tr:hover{background:var(--row-hover)}
    .dl-table .btn{font-size:12px;padding:6px 12px}
    .dl-table .btn-danger{color:#ef4444}
    .dl-table .btn-danger:hover{background:rgba(239,68,68,0.08)}

    /* ── Modal select ── */
    .modal select{width:100%;padding:10px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;margin:6px 0 12px;outline:none;background:var(--bg);color:var(--text);transition:all .2s;cursor:pointer}
    .modal select:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(100,100,100,0.08)}
    .batch-share-list{max-height:260px;overflow-y:auto;margin:8px 0;border:1px solid var(--border);border-radius:8px}
    .batch-share-item{display:flex;align-items:center;justify-content:space-between;padding:8px 12px;border-bottom:1px solid var(--border);font-size:12px;gap:8px}
    .batch-share-item:last-child{border-bottom:none}
    .batch-share-item .bs-name{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
    .batch-share-item .bs-url{color:var(--sub);font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
    .batch-share-item .bs-cp{flex-shrink:0}

    /* ── Demo mode ── */
    body.demo .fab, body.demo .up-panel, body.demo .drop { display: none !important; }
    .demo-banner { display:flex; align-items:center; justify-content:center; gap:8px; padding:8px 16px; background:var(--accent); color:var(--accent-fg); font-size:13px; font-weight:600; flex-shrink:0; }
    body.demo .demo-hidden { display: none !important; }

    /* ════════════════════════════════════════════
       RESPONSIVE BREAKPOINTS
       ════════════════════════════════════════════ */

    /* ── Tablet (≤1024px) ── */
    @media(max-width:1024px){
      .side{width:200px}
      .list-head,.row{grid-template-columns:24px 24px 1fr 80px 100px 50px;padding-left:16px;padding-right:16px;font-size:13px}
      .row .chk input[type=checkbox]{transform:scale(0.9)}
    }

    /* ── Small tablet / landscape phone (≤768px) ── */
    @media(max-width:768px){
      .side{position:fixed;left:0;top:0;bottom:0;transform:translateX(-100%);box-shadow:4px 0 20px rgba(0,0,0,0.15)}
      .side.open{transform:translateX(0)}
      .side-close{display:flex}
      .hamburger{display:flex}
      .topbar{padding:10px 16px;gap:8px}
      .search{max-width:none}
      .search input{padding:8px 12px 8px 34px;font-size:13px}
      .search svg{left:10px;width:16px;height:16px}
      .breadcrumbs{padding:6px 12px;font-size:12px}
      .sel-toolbar{padding:6px 12px;font-size:12px;flex-wrap:wrap}
      .list-head,.row{grid-template-columns:24px 24px 1fr;padding-left:12px;padding-right:12px}
      .list-head .sz,.row .sz,.list-head .dt,.row .dt{display:none}
      .row .chk input[type=checkbox]{transform:scale(0.85)}
      .ac button{padding:4px;font-size:14px}
      .row .ac{opacity:1;transform:none}
      .empty{padding:60px 16px;font-size:13px}
      .fab{bottom:24px;right:16px;width:48px;height:48px;border-radius:14px;font-size:22px}
      .up-panel{right:8px;width:calc(100vw - 16px);max-width:360px;border-radius:14px 14px 0 0}
      .modal{min-width:unset;margin:0;padding:24px 20px}
      .dl-stat{padding:12px 16px;min-width:80px}
      .dl-stat .num{font-size:20px}
      .log-card{padding:12px 14px;gap:10px}
      .log-card .lc-icon{width:36px;height:36px;font-size:18px}
      .log-card .lc-tags{display:none}
      .dl-table-wrap{margin:0 -12px;border-radius:0;border-left:none;border-right:none}
      .dl-table th:nth-child(3),.dl-table td:nth-child(3),
      .dl-table th:nth-child(4),.dl-table td:nth-child(4){display:none}
    }

    /* ── Phone (≤480px) ── */
    @media(max-width:480px){
      .topbar{padding:8px 12px;gap:6px}
      .search input{font-size:12px;padding:7px 10px 7px 30px}
      .search svg{left:8px;width:14px;height:14px}
      .breadcrumbs{padding:4px 10px;font-size:11px}
      .list-head,.row{grid-template-columns:22px 22px 1fr;padding-left:10px;padding-right:10px;font-size:13px}
      .row .ic{font-size:16px}
      .row .chk input[type=checkbox]{transform:scale(0.8)}
      .dl-stats{gap:8px}
      .dl-stat{padding:10px 12px;min-width:70px;flex:1 0 40%;border-radius:10px}
      .dl-stat .num{font-size:18px}
      .dl-stat .label{font-size:11px}
      .modal h2{font-size:15px}
      .modal input[type=text]{font-size:12px;padding:8px 10px}
      .btn{padding:8px 16px;font-size:12px}
      .fab{bottom:20px;right:12px;width:44px;height:44px;border-radius:12px;font-size:20px}
      .up-panel{right:4px;width:calc(100vw - 8px);border-radius:12px 12px 0 0}
      .row .ac{opacity:1;transform:none}
      .row .nm{font-size:13px}
      .dl-table th:nth-child(5),.dl-table td:nth-child(5),
      .dl-table th:nth-child(6),.dl-table td:nth-child(6){display:none}
      .dl-table td{padding:10px 12px}
    }
    /* ── Touch device: disable sticky hover ── */
    @media(hover:none){.row:hover{background:none;transform:none}.log-card:hover{background:none;transform:none;border-color:var(--border)}.nav:hover{background:none;transform:none}.pill:hover{background:none}}

    /* ── Storage config ── */
    .storage-card{background:var(--card);border:1.5px solid var(--border);border-radius:12px;padding:16px 20px;margin-bottom:12px;transition:all .2s}
    .storage-card:hover{border-color:var(--accent);box-shadow:var(--shadow)}
    .storage-card .sc-head{display:flex;align-items:center;justify-content:space-between;gap:12px}
    .storage-card .sc-name{font-weight:700;font-size:14px;display:flex;align-items:center;gap:8px}
    .storage-card .sc-badge{font-size:10px;padding:2px 8px;border-radius:6px;font-weight:600;background:var(--hover);color:var(--sub)}
    .storage-card .sc-badge.primary{background:#10b981;color:#fff}
    .storage-card .sc-badge.sync{background:#3b82f6;color:#fff}
    .storage-card .sc-info{font-size:12px;color:var(--sub);margin-top:8px;display:flex;gap:16px;flex-wrap:wrap}
    .storage-card .sc-actions{display:flex;gap:4px;margin-top:10px}
    .form-group{margin-bottom:14px}
    .form-group label{display:block;font-size:12px;font-weight:600;color:var(--sub);margin-bottom:5px;text-transform:uppercase;letter-spacing:0.3px}
    .form-group input,.form-group select{width:100%;padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;font-size:13px;background:var(--bg);color:var(--text);outline:none;transition:all .2s}
    .form-group input:focus,.form-group select:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(100,100,100,0.08)}
  </style>
</head>
<body${isDemo ? ' class="demo"' : ''}>
  ${isDemo ? '<div class="demo-banner">🔒 演示环境 — 文件上传已禁用，仅可浏览和下载</div>' : ''}
  <div class="side-overlay" id="side-overlay" onclick="closeSide()"></div>
  <div class="layout">
    <nav class="side" id="side">
      <div class="side-logo">
        <svg viewBox="0 0 72 72" fill="none"><path d="M22 40c-4.4 0-8-3.6-8-8 0-3.7 2.5-6.8 6-7.7C21 18.5 26.8 14 34 14c6 0 11.2 3.8 13.2 9.2C51.5 23.6 55 27.5 55 32c0 4.4-3.6 8-8 8H22z" fill="var(--accent)"/><path d="M36 44v12M30 50l6 6 6-6" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
        ioDrive
      </div>
      <div class="side-close" id="side-close">
        <span style="font-size:12px;color:var(--sub)">菜单</span>
        <button onclick="closeSide()" title="关闭">✕</button>
      </div>
      <a class="nav on" data-nav="files" onclick="go('files')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M13 2v7h7"/></svg>
        文件
      </a>
      <a class="nav" data-nav="uploads" onclick="go('uploads')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>
        上传记录
      </a>
      <a class="nav" data-nav="downloads" onclick="go('downloads')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M7 10l5 5 5-5"/><path d="M12 15V3"/></svg>
        下载记录
      </a>
      <a class="nav" data-nav="shares" onclick="go('shares')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>
        分享链接
      </a>
      <a class="nav" data-nav="uploadkeys" onclick="go('uploadkeys')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/></svg>
        上传链接
      </a>
      <a class="nav" data-nav="storage" onclick="go('storage')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
        存储配置
      </a>
      <div class="side-bottom">
        <div class="pill" onclick="localStorage.removeItem('iodrive_token');location.href='/login'">
          <div class="dot">A</div>
          <span>退出</span>
        </div>
      </div>
    </nav>
    <div class="main">
      <header class="topbar">
        <button class="hamburger" id="hamburger" onclick="toggleSide()" title="菜单">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
        </button>
        <div class="search">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          <input type="text" placeholder="搜索文件" id="q" oninput="render()">
        </div>
        <div class="topbar-actions">
          <button class="icon-btn demo-hidden" onclick="createFolder()" title="新建文件夹">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
          </button>
          <button class="theme-btn" onclick="toggleTheme()" title="外观" id="theme-btn">🌙</button>
        </div>
      </header>

      <!-- Files page -->
      <div id="page-files">
        <div class="breadcrumbs" id="breadcrumbs"></div>
        <div class="sel-toolbar" id="sel-toolbar">
          <span class="sel-count" id="sel-count">已选择 0 项</span>
          <div class="sel-actions">
            <button class="btn btn-s" onclick="batchShare()">分享</button>
            <button class="btn btn-s" onclick="batchMove()">移动</button>
            <button class="btn btn-s demo-hidden" style="color:#ef4444" onclick="batchDelete()">删除</button>
          </div>
          <button class="btn btn-s" onclick="clearSelection()">取消</button>
        </div>
        <div class="list-head"><span><input type="checkbox" id="select-all" onchange="toggleSelectAll(this.checked)"></span><span></span><span>名称</span><span class="sz">大小</span><span class="dt">修改日期</span><span></span></div>
        <div class="list" id="file-list"></div>
      </div>

      <!-- Downloads page -->
      <div id="page-downloads" style="display:none">
        <div style="padding:20px 24px;overflow-y:auto;height:100%">
          <div class="dl-stats" id="dl-stats"></div>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
            <div class="log-search"><input type="text" id="dl-search" placeholder="搜索文件或 IP" oninput="renderLogs('downloads')"></div>
            <button class="btn btn-s demo-hidden" style="color:#ef4444" onclick="clearDownloadLogs()">清空</button>
          </div>
          <div class="log-list" id="dl-list"></div>
          <div id="dl-empty" style="display:none" class="log-empty"><div class="icon">📊</div><div style="font-size:15px;font-weight:600">暂无下载记录</div><div style="font-size:12px;margin-top:6px">文件被下载后，记录会显示在这里。</div></div>
        </div>
      </div>

      <!-- Shares page -->
      <div id="page-shares" style="display:none">
        <div style="padding:20px 24px;overflow-y:auto;height:100%">
          <div class="dl-stats" id="sh-stats"></div>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
            <div class="log-search"><input type="text" id="sh-search" placeholder="搜索文件或路径" oninput="renderShares()"></div>
            <button class="btn btn-s demo-hidden" style="color:#ef4444" onclick="clearShares()">清空</button>
          </div>
          <div class="log-list" id="sh-list"></div>
          <div id="sh-empty" style="display:none" class="log-empty"><div class="icon">🔗</div><div style="font-size:15px;font-weight:600">暂无分享链接</div><div style="font-size:12px;margin-top:6px">在文件列表中点击“分享”创建链接。</div></div>
        </div>
      </div>

      <!-- Uploads page -->
      <div id="page-uploads" style="display:none">
        <div style="padding:20px 24px;overflow-y:auto;height:100%">
          <div class="dl-stats" id="ul-stats"></div>
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap">
            <div class="log-search"><input type="text" id="ul-search" placeholder="搜索文件或 IP" oninput="renderLogs('uploads')"></div>
            <button class="btn btn-s demo-hidden" style="color:#ef4444" onclick="clearUploadLogs()">清空</button>
          </div>
          <div class="log-list" id="ul-list"></div>
          <div id="ul-empty" style="display:none" class="log-empty"><div class="icon">📤</div><div style="font-size:15px;font-weight:600">暂无上传统计</div><div style="font-size:12px;margin-top:6px">文件上传成功后，记录会显示在这里。</div></div>
        </div>
      </div>

      <!-- Upload Keys page -->
      <div id="page-uploadkeys" style="display:none">
        <div style="padding:20px 24px;overflow-y:auto;height:100%">
          <div class="public-upload-card">
            <div style="font-size:15px;font-weight:700;color:var(--text)">公开上传</div>
            <div style="font-size:12px;color:var(--sub);margin-top:4px;line-height:1.5">无需账号，完成验证即可上传。文件会保存到 uploads/public/。</div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:12px;flex-wrap:wrap">
              <input type="text" readonly id="public-upload-url" style="flex:1;min-width:200px;padding:8px 10px;border:1.5px solid var(--border);border-radius:10px;background:var(--bg);color:var(--text);outline:none">
              <button class="btn btn-p" style="font-size:12px;padding:8px 16px" onclick="copyPublicUploadUrl()">复制</button>
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:8px">
            <div style="font-size:16px;font-weight:700;color:var(--text)">上传链接</div>
            <button class="btn btn-p demo-hidden" onclick="createUploadKey()">+ 新建</button>
          </div>
          <div class="dl-table-wrap">
            <table class="dl-table">
              <thead><tr><th>标签</th><th>路径</th><th>创建时间</th><th>过期时间</th><th>使用次数</th><th>状态</th><th>操作</th></tr></thead>
              <tbody id="uk-tbody"></tbody>
            </table>
          </div>
          <div id="uk-empty" style="display:none;padding:60px;text-align:center;color:var(--sub)">暂无上传链接</div>
        </div>
      </div>

      <!-- Storage Config page -->
      <div id="page-storage" style="display:none">
        <div style="padding:20px 24px;overflow-y:auto;height:100%">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:8px">
            <div>
              <div style="font-size:16px;font-weight:700;color:var(--text)">存储后端</div>
              <div style="font-size:12px;color:var(--sub);margin-top:4px">管理文件存储后端，支持 R2、AWS S3、MinIO 等多种 S3 兼容存储</div>
            </div>
            <button class="btn btn-p demo-hidden" onclick="showAddStorage()">+ 添加后端</button>
          </div>
          <div id="storage-list"></div>
          <div id="storage-empty" style="display:none;padding:60px;text-align:center;color:var(--sub)">
            <div style="font-size:32px;margin-bottom:12px">☁️</div>
            <div style="font-size:15px;font-weight:600">暂未配置额外存储后端</div>
            <div style="font-size:12px;margin-top:6px">点击「添加后端」配置 S3 兼容存储作为备用下载源</div>
          </div>
        </div>
      </div>

      <!-- Storage Add/Edit Modal -->
      <div id="storage-modal" style="display:none;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.4);backdrop-filter:blur(2px);align-items:center;justify-content:center">
        <div style="background:var(--card);border-radius:16px;box-shadow:var(--modal-shadow);width:520px;max-width:calc(100vw - 32px);max-height:90vh;overflow-y:auto">
          <div style="display:flex;align-items:center;justify-content:space-between;padding:16px 20px;border-bottom:1px solid var(--border)">
            <div style="font-size:15px;font-weight:700" id="storage-modal-title">添加存储后端</div>
            <button onclick="closeStorageModal()" style="background:none;border:none;font-size:18px;cursor:pointer;color:var(--sub)">✕</button>
          </div>
          <div style="padding:20px">
            <div class="form-group">
              <label>提供商</label>
              <select id="sm-provider" onchange="onProviderChange()">
                <option value="aws">AWS S3</option>
                <option value="r2">Cloudflare R2 (S3 API)</option>
                <option value="b2">Backblaze B2</option>
                <option value="minio">MinIO (自建)</option>
                <option value="alibaba">阿里云 OSS</option>
                <option value="tencent">腾讯云 COS</option>
                <option value="wasabi">Wasabi</option>
                <option value="digitalocean">DigitalOcean Spaces</option>
                <option value="volcengine">火山引擎 TOS</option>
                <option value="custom">自定义 S3 兼容</option>
              </select>
            </div>
            <div class="form-group">
              <label>名称 <span style="color:var(--sub);font-size:11px">(唯一标识)</span></label>
              <input type="text" id="sm-name" placeholder="例: backup, b2-main">
            </div>
            <div class="form-group">
              <label>Endpoint</label>
              <input type="text" id="sm-endpoint" placeholder="s3.amazonaws.com">
            </div>
            <div class="form-group">
              <label>存储桶</label>
              <input type="text" id="sm-bucket" placeholder="my-bucket">
            </div>
            <div class="form-group">
              <label>Region</label>
              <input type="text" id="sm-region" placeholder="us-east-1">
            </div>
            <div class="form-group">
              <label>Access Key</label>
              <input type="text" id="sm-accesskey" placeholder="Access Key ID">
            </div>
            <div class="form-group">
              <label>Secret Key</label>
              <input type="password" id="sm-secretkey" placeholder="Secret Access Key">
            </div>
            <div style="display:flex;gap:16px;margin:12px 0">
              <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
                <input type="checkbox" id="sm-primary"> 设为主存储
              </label>
              <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
                <input type="checkbox" id="sm-sync" checked> 上传时同步
              </label>
            </div>
            <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:16px">
              <button class="btn btn-s" onclick="testStorageConnection()" id="sm-test-btn">测试连接</button>
              <button class="btn btn-p" onclick="saveStorageBackend()" id="sm-save-btn">保存</button>
            </div>
            <div id="sm-test-result" style="margin-top:10px;font-size:12px;display:none"></div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <button class="fab demo-hidden" onclick="pickFile()" title="上传">+</button>
  <div class="up-panel" id="up-panel">
    <div class="up-head"><span>上传中</span><button onclick="document.getElementById('up-panel').classList.remove('on')">×</button></div>
    <div id="up-list"></div>
  </div>
  <div class="drop" id="drop"><div class="drop-text">拖拽文件到此处上传</div></div>

  <script>
    if(!localStorage.getItem('iodrive_token'))location.href='/login';
    const PS=20*1024*1024,MC=6;
    const IS_DEMO=${isDemo ? 'true' : 'false'};
    let files=[],downloads=[],uploads=[],shares=[],folders=[],currentPath='uploads/',ancestors=[];
    let selectedKeys=new Set();

    // Theme
    function initTheme(){var t=localStorage.getItem('iodrive_theme')||'light';if(t==='dark')document.documentElement.setAttribute('data-theme','dark');updThemeUI()}
    function toggleTheme(){var d=document.documentElement.getAttribute('data-theme')==='dark';if(d){document.documentElement.removeAttribute('data-theme');localStorage.setItem('iodrive_theme','light')}else{document.documentElement.setAttribute('data-theme','dark');localStorage.setItem('iodrive_theme','dark')}updThemeUI()}
    function updThemeUI(){var d=document.documentElement.getAttribute('data-theme')==='dark';document.getElementById('theme-btn').textContent=d?'☀️':'🌙'}
    initTheme();

    function fmt(b){if(!b)return'0 B';var u=['B','KB','MB','GB','TB'],i=0,s=b;while(s>=1024&&i<u.length-1){s/=1024;i++}return s.toFixed(i?1:0)+' '+u[i]}
    function fmtS(b){return fmt(b)+'/s'}
    function fmtE(s){if(!s||!isFinite(s))return'';if(s<60)return Math.ceil(s)+'s';if(s<3600)return Math.ceil(s/60)+'m';return(s/3600).toFixed(1)+'h'}
    function fi(n){var e=n.split('.').pop().toLowerCase(),m={pdf:'\\u{1F4C4}',doc:'\\u{1F4DD}',txt:'\\u{1F4DD}',jpg:'\\u{1F5BC}',png:'\\u{1F5BC}',mp4:'\\u{1F3AC}',mp3:'\\u{1F3B5}',zip:'\\u{1F4E6}',rar:'\\u{1F4E6}',exe:'\\u2699\\uFE0F'};return m[e]||'\\u{1F4C4}'}
    function fmtTime(iso){var d=new Date(iso);return d.toLocaleDateString('zh-CN')+' '+d.toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'})}
    function relTime(iso){var d=new Date(iso),now=new Date(),diff=(now.getTime()-d.getTime())/1000;if(diff<60)return'刚刚';if(diff<3600)return Math.floor(diff/60)+' 分钟前';if(diff<86400)return Math.floor(diff/3600)+' 小时前';if(diff<604800)return Math.floor(diff/86400)+' 天前';return fmtTime(iso)}
    function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
    function trunc(s,n){if(!s||s.length<=n)return s;return s.slice(0,n)+'…'}
    function checkDlScroll(){var w=document.getElementById('dl-table-wrap'),t=w?w.querySelector('table'):null;if(!w||!t)return;w.classList.toggle('can-scroll',t.scrollWidth>w.clientWidth)}

    async function api(p,o){o=o||{};var h=o.headers||{};var t=localStorage.getItem('iodrive_token');if(t)h['Authorization']='Bearer '+t;o.headers=h;try{var r=await fetch(p,o);if(r.status===401){localStorage.removeItem('iodrive_token');location.href='/login';return}return r}catch(e){console.error('API:',e);return null}}

    // Navigation
    function go(page){
      document.querySelectorAll('.nav').forEach(function(n){n.classList.remove('on')});
      var el=document.querySelector('[data-nav="'+page+'"]');if(el)el.classList.add('on');
      document.getElementById('page-files').style.display=page==='files'?'':'none';
      document.getElementById('page-uploads').style.display=page==='uploads'?'':'none';
      document.getElementById('page-downloads').style.display=page==='downloads'?'':'none';
      document.getElementById('page-shares').style.display=page==='shares'?'':'none';
      document.getElementById('page-uploadkeys').style.display=page==='uploadkeys'?'':'none';
      document.getElementById('page-storage').style.display=page==='storage'?'':'none';
      if(page==='files')loadFiles();
      if(page==='uploads')loadUploads();
      if(page==='downloads')loadDownloads();
      if(page==='shares')loadShares();
      if(page==='uploadkeys')loadUploadKeys();
      if(page==='storage')loadStorageBackends();
      closeSide();
    }

    // Mobile sidebar
    function toggleSide(){document.getElementById('side').classList.toggle('open');document.getElementById('side-overlay').classList.toggle('on')}
    function closeSide(){document.getElementById('side').classList.remove('open');document.getElementById('side-overlay').classList.remove('on')}

    // ── Files ──
    async function loadFiles(){
      var r=await api('/api/files?prefix='+encodeURIComponent(currentPath));
      if(!r)return;var d=await r.json();
      files=d.files||[];folders=d.folders||[];ancestors=d.ancestors||[];
      clearSelection();render();
    }

    // Breadcrumbs
    function renderBreadcrumbs(){
      var bc=document.getElementById('breadcrumbs');
      var h='<span class="bc-item" onclick="navigateTo(&apos;uploads/&apos;)">\u{1F4C2} 根目录</span>';
      for(var i=0;i<ancestors.length;i++){
        var a=ancestors[i];
        h+='<span class="bc-sep">/</span>';
        if(i===ancestors.length-1)h+='<span class="bc-item bc-cur">'+esc(a.name)+'</span>';
        else h+='<span class="bc-item" onclick="navigateTo(&apos;'+esc(a.path)+'&apos;)">'+esc(a.name)+'</span>';
      }
      bc.innerHTML=h;
    }
    function navigateTo(path){currentPath=path;loadFiles()}

    // Selection
    function toggleSelectAll(checked){
      document.querySelectorAll('.row-chk').forEach(function(cb){
        cb.checked=checked;var key=cb.dataset.key;
        if(checked)selectedKeys.add(key);else selectedKeys.delete(key);
      });
      updSelUI();
    }
    function updSelUI(){
      var tb=document.getElementById('sel-toolbar'),cnt=document.getElementById('sel-count');
      var n=selectedKeys.size;
      if(n>0){tb.style.display='flex';cnt.textContent='已选择 '+n+' 项'}
      else{tb.style.display='none';document.getElementById('select-all').checked=false}
    }
    function clearSelection(){
      selectedKeys.clear();
      document.querySelectorAll('.row-chk').forEach(function(cb){cb.checked=false});
      document.getElementById('select-all').checked=false;
      updSelUI();
    }

    function render(){
      var c=document.getElementById('file-list');if(!c)return;
      renderBreadcrumbs();
      var q=(document.getElementById('q').value||'').toLowerCase();
      var h='';
      // Folders
      for(var i=0;i<folders.length;i++){
        var f=folders[i];
        h+='<div class="row folder-row" data-fpath="'+esc(f.path)+'" style="animation-delay:'+Math.min(i*30,300)+'ms">'+
          '<div class="chk"><input type="checkbox" class="row-chk" data-key="'+esc(f.path)+'"></div>'+
          '<div class="ic">\u{1F4C1}</div>'+
          '<div class="nm" title="'+esc(f.name)+'">'+esc(f.name)+'</div>'+
          '<div class="sz">--</div><div class="dt"></div><div class="ac"></div></div>';
      }
      // Files
      var ff=q?files.filter(function(x){return x.name.toLowerCase().includes(q)}):files;
      for(var i=0;i<ff.length;i++){
        var x=ff[i],e=esc(x.name),fiIdx=folders.length+i;
        h+='<div class="row" data-i="'+i+'" style="animation-delay:'+Math.min(fiIdx*30,300)+'ms">'+
          '<div class="chk"><input type="checkbox" class="row-chk" data-key="'+esc(x.key)+'"></div>'+
          '<div class="ic">'+fi(x.name)+'</div>'+
          '<div class="nm" title="'+e+'">'+e+'</div>'+
          '<div class="sz">'+fmt(x.size)+'</div>'+
          '<div class="dt">'+new Date(x.uploaded).toLocaleDateString('zh-CN')+'</div>'+
          '<div class="ac"><button data-act="share" data-i="'+i+'" title="分享">\u{1F4E4}</button>'+
          '<button data-act="dl" data-i="'+i+'" title="下载">⬇️</button>'+
          (IS_DEMO?'':'<button data-act="del" data-i="'+i+'" title="删除">\u{1F5D1}️</button>')+'</div></div>';
      }
      if(!h)h='<div class="empty">'+(q?'未找到匹配的文件':(IS_DEMO?'此文件夹为空':'此文件夹为空<br><span style="font-size:12px;margin-top:8px;display:inline-block;color:var(--sub)">将文件拖到这里，或点击右下角 +</span>'))+'</div>';
      c.innerHTML=h;
    }

    document.addEventListener('change',function(e){
      if(e.target.classList.contains('row-chk')){
        var key=e.target.dataset.key;
        if(e.target.checked)selectedKeys.add(key);else selectedKeys.delete(key);
        updSelUI();
      }
    });

    document.addEventListener('click',function(e){
      // 如果点击的是复选框，不触发进入文件夹
      if(e.target.classList.contains('row-chk'))return;
      var folderRow=e.target.closest('[data-fpath]');
      if(folderRow){currentPath=folderRow.dataset.fpath;loadFiles();return}
      var btn=e.target.closest('[data-act]');if(!btn)return;
      var idx=parseInt(btn.dataset.i),f=files[idx];if(!f)return;
      if(btn.dataset.act==='share')share(f.key,f.name);
      else if(btn.dataset.act==='dl')dl(f.key,f.name);
      else if(btn.dataset.act==='del')del(f.key,f.name);
    });

    // ── Downloads ──
    async function loadDownloads(){
      var stats=document.getElementById('dl-stats');
      try{
        var r=await api('/api/download/logs');
        if(!r){stats.innerHTML='<div class="dl-stat"><div class="num" style="color:var(--sub)">-</div><div class="label">加载失败</div></div>';return}
        var d=await r.json();downloads=d.logs||[];
        var total=downloads.length,ips=new Set(downloads.map(function(x){return x.ip||''})).size,sources={r2:0,s3:0};
        downloads.forEach(function(x){if(x.source==='s3')sources.s3++;else sources.r2++});
        stats.innerHTML='<div class="dl-stat"><div class="num">'+total+'</div><div class="label">总下载</div></div><div class="dl-stat"><div class="num">'+ips+'</div><div class="label">独立IP</div></div><div class="dl-stat"><div class="num">'+sources.r2+'</div><div class="label">R2</div></div><div class="dl-stat"><div class="num">'+sources.s3+'</div><div class="label">S3</div></div>';
        renderLogs('downloads');
      }catch(e){console.error('loadDownloads:',e);stats.innerHTML='<div class="dl-stat"><div class="num" style="color:var(--sub)">-</div><div class="label">加载失败</div></div>'}
    }

    // ── Uploads ──
    async function loadUploads(){
      var stats=document.getElementById('ul-stats');
      try{
        var r=await api('/api/upload-logs/logs');
        if(!r){stats.innerHTML='<div class="dl-stat"><div class="num" style="color:var(--sub)">-</div><div class="label">加载失败</div></div>';return}
        var d=await r.json();uploads=d.logs||[];
        var total=uploads.length,sources={dashboard:0,public:0,'upload-key':0};
        uploads.forEach(function(x){if(sources[x.source]!==undefined)sources[x.source]++});
        stats.innerHTML='<div class="dl-stat"><div class="num">'+total+'</div><div class="label">总上传</div></div><div class="dl-stat"><div class="num">'+sources.dashboard+'</div><div class="label">后台</div></div><div class="dl-stat"><div class="num">'+sources.public+'</div><div class="label">公开</div></div><div class="dl-stat"><div class="num">'+sources['upload-key']+'</div><div class="label">链接</div></div>';
        renderLogs('uploads');
      }catch(e){console.error('loadUploads:',e);stats.innerHTML='<div class="dl-stat"><div class="num" style="color:var(--sub)">-</div><div class="label">加载失败</div></div>'}
    }

    function renderLogs(type){
      var arr=type==='downloads'?downloads:uploads;
      var list=document.getElementById(type==='downloads'?'dl-list':'ul-list');
      var empty=document.getElementById(type==='downloads'?'dl-empty':'ul-empty');
      var q=(document.getElementById(type==='downloads'?'dl-search':'ul-search').value||'').toLowerCase();
      var filtered=q?arr.filter(function(x){return (x.name||'').toLowerCase().includes(q)||(x.ip||'').toLowerCase().includes(q)}):arr;
      if(!filtered.length){list.innerHTML='';empty.style.display='block';return}
      empty.style.display='none';
      var h='';
      for(var i=filtered.length-1;i>=0&&i>=filtered.length-200;i--){
        var x=filtered[i],idx=arr.indexOf(x);
        var icon=fi(x.name||x.key||'');
        var tags='';
        if(type==='downloads'){
          var srcClass=x.source==='s3'?'src-s3':'src-r2';
          tags+='<span class="lc-tag '+srcClass+'">'+(x.source==='s3'?'S3':'R2')+'</span>';
          tags+='<span class="lc-tag">'+(x.completed?'已完成':'下载中')+'</span>';
        }else{
          var srcMap={dashboard:['src-dashboard','后台'],public:['src-public','公开'],'upload-key':['src-upload-key','链接']};
          var sm=srcMap[x.source]||['','-'];
          tags+='<span class="lc-tag '+sm[0]+'">'+sm[1]+'</span>';
          if(x.uploadKeyLabel)tags+='<span class="lc-tag">'+esc(trunc(x.uploadKeyLabel,16))+'</span>';
        }
        h+='<div class="log-card" onclick="showLogDetail(&apos;'+type+'&apos;,'+idx+')">'+
          '<div class="lc-icon">'+icon+'</div>'+
          '<div class="lc-main">'+
            '<div class="lc-name">'+esc(x.name||x.key)+'</div>'+
            '<div class="lc-meta">'+relTime(x.time)+' · '+fmt(x.size)+' · '+esc(x.ip||'-')+' · '+esc(x.country||'-')+'</div>'+
          '</div>'+
          '<div class="lc-tags">'+tags+'</div>'+
          '<div class="lc-actions" onclick="event.stopPropagation()">'+
            '<button onclick="showLogDetail(&apos;'+type+'&apos;,'+idx+')" title="详情">ℹ️</button>'+
            '<button class="danger" onclick="deleteLog(&apos;'+type+'&apos;,&apos;'+esc(x.logKey||'')+'&apos;)" title="删除">🗑</button>'+
          '</div>'+
        '</div>';
      }
      list.innerHTML=h;
    }

    // ── Shares ──
    async function loadShares(){
      var stats=document.getElementById('sh-stats');
      try{
        var r=await api('/api/share');
        if(!r){stats.innerHTML='<div class="dl-stat"><div class="num" style="color:var(--sub)">-</div><div class="label">加载失败</div></div>';return}
        var d=await r.json();shares=d.shares||[];
        var total=shares.length,expired=0,downloads=0;
        shares.forEach(function(x){if(x.expires&&new Date(x.expires)<new Date())expired++;downloads+=x.downloads||0});
        stats.innerHTML='<div class="dl-stat"><div class="num">'+total+'</div><div class="label">总分享</div></div><div class="dl-stat"><div class="num">'+downloads+'</div><div class="label">总下载</div></div><div class="dl-stat"><div class="num">'+expired+'</div><div class="label">已过期</div></div>';
        renderShares();
      }catch(e){console.error('loadShares:',e);stats.innerHTML='<div class="dl-stat"><div class="num" style="color:var(--sub)">-</div><div class="label">加载失败</div></div>'}
    }

    function renderShares(){
      var list=document.getElementById('sh-list');
      var empty=document.getElementById('sh-empty');
      var q=(document.getElementById('sh-search').value||'').toLowerCase();
      var filtered=q?shares.filter(function(x){return (x.name||'').toLowerCase().includes(q)||(x.key||'').toLowerCase().includes(q)}):shares;
      if(!filtered.length){list.innerHTML='';empty.style.display='block';return}
      empty.style.display='none';
      var h='';
      filtered.sort(function(a,b){return new Date(b.created)-new Date(a.created)});
      for(var i=0;i<filtered.length;i++){
        var x=filtered[i],url=location.origin+'/s/'+x.token;
        var expired=x.expires&&new Date(x.expires)<new Date();
        var statusTag=expired?'<span class="lc-tag" style="color:#ef4444;background:rgba(239,68,68,0.08);border-color:rgba(239,68,68,0.2)">已过期</span>':'<span class="lc-tag" style="color:#22c55e;background:rgba(34,197,94,0.08);border-color:rgba(34,197,94,0.2)">有效</span>';
        var icon=fi(x.name||x.key||'');
        h+='<div class="log-card">'+
          '<div class="lc-icon">'+icon+'</div>'+
          '<div class="lc-main">'+
            '<div class="lc-name">'+esc(x.name||x.key)+'</div>'+
            '<div class="lc-meta">'+fmtTime(x.created)+' · '+esc(x.key)+' · 下载 '+(x.downloads||0)+' 次</div>'+
          '</div>'+
          '<div class="lc-tags">'+statusTag+'</div>'+
          '<div class="lc-actions">'+
            '<button onclick="var b=this;navigator.clipboard.writeText(&apos;'+url+'&apos;);b.textContent=&apos;✓&apos;;setTimeout(function(){b.textContent=&apos;复制&apos;},1000)" title="复制链接">📋</button>'+
            '<button onclick="deleteShare(&apos;'+x.token+'&apos;,&apos;'+esc(x.name||x.key)+'&apos;)" class="danger" title="删除">🗑</button>'+
          '</div>'+
        '</div>';
      }
      list.innerHTML=h;
    }

    async function deleteShare(token,name){
      if(IS_DEMO)return;
      if(!confirm('删除分享「'+(name||token)+'」？'))return;
      var r=await api('/api/share/'+token,{method:'DELETE'});
      if(r&&r.ok)loadShares();
    }

    async function clearShares(){
      if(IS_DEMO)return;
      if(!shares.length)return;
      if(!confirm('清空全部 '+shares.length+' 条分享链接？'))return;
      var ok=0;
      for(var i=0;i<shares.length;i++){
        var r=await api('/api/share/'+shares[i].token,{method:'DELETE'});
        if(r&&r.ok)ok++;
      }
      alert('已删除 '+ok+' 条分享');loadShares();
    }

    function showLogDetail(type,idx){
      var arr=type==='downloads'?downloads:uploads;
      var x=arr[idx];if(!x)return;
      var isDl=type==='downloads';
      var o=document.createElement('div');o.className='overlay';
      var m=document.createElement('div');m.className='modal';
      var html='<h2>'+(isDl?'下载详情':'上传详情')+'</h2>'+
        '<div style="font-size:13px;color:var(--text);line-height:1.7;word-break:break-word">'+
        '<p><b>时间：</b>'+fmtTime(x.time)+'</p>'+
        '<p><b>文件：</b>'+esc(x.name||x.key)+'</p>'+
        '<p><b>路径：</b><span style="word-break:break-all;font-family:monospace;font-size:12px;color:var(--sub)">'+esc(x.key||'-')+'</span></p>'+
        '<p><b>大小：</b>'+fmt(x.size)+'</p>';
      if(isDl){
        html+='<p><b>来源：</b>'+esc(x.source||'-')+'</p>'+
          '<p><b>分享令牌：</b>'+esc(x.shareToken||'-')+'</p>';
      }else{
        var srcMap={dashboard:'后台',public:'公开上传','upload-key':'上传链接'};
        html+='<p><b>来源：</b>'+(srcMap[x.source]||x.source)+'</p>';
        if(x.uploadKeyLabel)html+='<p><b>链接标签：</b>'+esc(x.uploadKeyLabel)+'</p>';
      }
      html+='<p><b>IP：</b>'+esc(x.ip||'-')+'</p>'+
        '<p><b>地区：</b>'+esc(x.country||'-')+'</p>'+
        '<p><b>浏览器：</b>'+esc(x.browser||'-')+'</p>'+
        '<p><b>系统：</b>'+esc(x.os||'-')+'</p>'+
        '<p><b>设备：</b>'+esc(x.deviceType||'-')+'</p>'+
        '<p><b>UA：</b><span style="word-break:break-all;font-size:12px;color:var(--sub)">'+esc(x.ua||'-')+'</span></p>';
      if(x.referer)html+='<p><b>Referer：</b>'+esc(x.referer)+'</p>';
      if(isDl&&x.completed!==undefined)html+='<p><b>完成状态：</b>'+(x.completed?'已完成':'未完成')+'</p>';
      html+='</div><div class="btn-row"><button class="btn btn-s" onclick="this.closest(&apos;.overlay&apos;).remove()">关闭</button></div>';
      m.innerHTML=html;o.appendChild(m);document.body.appendChild(o);
      o.addEventListener('click',function(e){if(e.target===o)o.remove()});
    }

    async function deleteLog(type,logKey){
      if(IS_DEMO)return;
      if(!logKey||!confirm('删除这条记录？'))return;
      var endpoint=type==='downloads'?'/api/download/logs/':'/api/upload-logs/logs/';
      var r=await api(endpoint+logKey.split('/').map(encodeURIComponent).join('/'),{method:'DELETE'});
      if(r&&r.ok){if(type==='downloads')loadDownloads();else loadUploads();}
    }

    async function clearUploadLogs(){
      if(IS_DEMO)return;
      if(!confirm('清空所有上传记录？'))return;
      var r=await api('/api/upload-logs/logs',{method:'DELETE'});
      if(r&&r.ok){var d=await r.json();alert('已清空 '+d.deleted+' 条记录');loadUploads()}
    }

    // ── Upload ──
    function pickFile(){if(IS_DEMO)return;var i=document.createElement('input');i.type='file';i.multiple=true;i.onchange=function(){for(var j=0;j<i.files.length;j++)up(i.files[j])};i.click()}
    async function up(file){if(IS_DEMO)return;document.getElementById('up-panel').classList.add('on');var id='u'+Date.now()+Math.random().toString(36).slice(2,6);document.getElementById('up-list').insertAdjacentHTML('beforeend','<div class="up-item" id="'+id+'"><div class="nm">'+file.name+' ('+fmt(file.size)+')</div><div class="up-bar"><div class="fl" style="width:0%"></div></div><div class="st">准备...</div></div>');try{if(file.size<=PS)await upS(file,id);else await upM(file,id);st(id,'✅ 完成');loadFiles()}catch(e){st(id,'❌ '+e.message)}}
    function xhrUp(url,fd,id){return new Promise(function(ok,no){var x=new XMLHttpRequest(),t0=Date.now();x.open('POST',url);var tk=localStorage.getItem('iodrive_token');if(tk)x.setRequestHeader('Authorization','Bearer '+tk);x.upload.onprogress=function(e){if(e.lengthComputable){var el=(Date.now()-t0)/1000,sp=el>0?e.loaded/el:0,pct=Math.round(e.loaded/e.total*100),rm=sp>0?(e.total-e.loaded)/sp:0;prog(id,pct);st(id,fmtS(sp)+' · '+pct+'% · 剩余 '+fmtE(rm))}};x.onload=function(){if(x.status>=200&&x.status<300){try{ok(JSON.parse(x.responseText))}catch{ok(x.responseText)}}else{try{no(new Error(JSON.parse(x.responseText).error))}catch{no(new Error('失败 '+x.status))}}};x.onerror=function(){no(new Error('网络错误'))};x.send(fd)})}
    async function upS(f,id){var fd=new FormData();fd.append('file',f);fd.append('path',currentPath);await xhrUp('/api/upload/single',fd,id)}
    async function upM(f,id){var r=await api('/api/upload/init',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filename:f.name,size:f.size,path:currentPath})});if(!r||!r.ok)throw new Error('初始化失败');var d=await r.json(),uid=d.uploadId,key=d.key;var tp=Math.ceil(f.size/PS),parts=[],pp=new Array(tp).fill(0),t0=Date.now(),q=[];for(var i=0;i<tp;i++){(function(pi,pn){var s=pi*PS,e=Math.min(s+PS,f.size),ch=f.slice(s,e);q.push(function(){return new Promise(function(ok,no){var fd=new FormData();fd.append('uploadId',uid);fd.append('key',key);fd.append('partNumber',String(pn));fd.append('chunk',ch);var x=new XMLHttpRequest();x.open('POST','/api/upload/part');var tk=localStorage.getItem('iodrive_token');if(tk)x.setRequestHeader('Authorization','Bearer '+tk);x.upload.onprogress=function(ev){if(ev.lengthComputable){pp[pi]=ev.loaded;var td=0;for(var j=0;j<pp.length;j++)td+=pp[j];var el=(Date.now()-t0)/1000,sp=el>0?td/el:0,pct=Math.round(td/f.size*100),rm=sp>0?(f.size-td)/sp:0;prog(id,pct);st(id,fmtS(sp)+' · '+pct+'% (分片 '+pn+'/'+tp+') · '+fmtE(rm))}};x.onload=function(){if(x.status>=200&&x.status<300){parts.push({partNumber:pn,etag:JSON.parse(x.responseText).etag});ok()}else{no(new Error('分片'+pn+'失败'))}};x.onerror=function(){no(new Error('网络错误'))};x.send(fd)})})})(i,i+1)}await conc(q,MC);parts.sort(function(a,b){return a.partNumber-b.partNumber});var cr=await api('/api/upload/complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uploadId:uid,key:key,parts:parts})});if(!cr||!cr.ok)throw new Error('完成失败')}
    async function conc(ts,lim){var ex=new Set();for(var i=0;i<ts.length;i++){let p=ts[i]().then(function(){ex.delete(p)});ex.add(p);if(ex.size>=lim)await Promise.race(ex)}await Promise.all(ex)}
    function prog(id,p){var f=document.querySelector('#'+id+' .fl');if(f)f.style.width=p+'%'}
    function st(id,t){var e=document.querySelector('#'+id+' .st');if(e)e.textContent=t}
    if(!IS_DEMO){
      var dz=document.getElementById('drop'),dragT;
      document.addEventListener('dragenter',function(e){e.preventDefault();clearTimeout(dragT);dz.classList.add('on')});
      dz.addEventListener('dragleave',function(){dragT=setTimeout(function(){dz.classList.remove('on')},80)});
      dz.addEventListener('dragover',function(e){e.preventDefault()});
      dz.addEventListener('drop',function(e){e.preventDefault();dz.classList.remove('on');for(var i=0;i<e.dataTransfer.files.length;i++)up(e.dataTransfer.files[i])});
    }

    // ── Share single file ──
    async function share(key,name){
      var r=await api('/api/share',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:key,name:name})});
      if(!r||!r.ok)return alert('分享失败');var d=await r.json(),url=location.origin+'/s/'+d.token;
      showShareModal(url,name);
    }
    function showShareModal(url,name){
      var o=document.createElement('div');o.className='overlay';
      var m=document.createElement('div');m.className='modal';
      m.innerHTML='<h2>分享</h2><p style="color:var(--sub);font-size:13px;margin-bottom:14px">'+esc(name)+'</p><label>链接</label><input type="text" readonly><div class="btn-row"><button class="btn btn-s">关闭</button><button class="btn btn-p">复制</button></div>';
      var inp=m.querySelector('input');inp.value=url;inp.onclick=function(){this.select()};
      m.querySelector('.btn-s').onclick=function(){o.remove()};
      m.querySelector('.btn-p').onclick=function(){var b=this;navigator.clipboard.writeText(url);b.textContent='已复制';setTimeout(function(){b.textContent='复制'},1200)};
      o.appendChild(m);document.body.appendChild(o);
      o.addEventListener('click',function(e){if(e.target===o)o.remove()});
    }

    // ── Download (direct via presigned URL + beacon) ──
    async function dl(key,name){
      if(!key)return;
      var r=await api('/api/download/presign/'+key.split('/').map(encodeURIComponent).join('/'));
      if(!r||!r.ok)return;
      var d=await r.json();
      // 使用 <a> 标签下载，避免 window.open 被弹窗拦截
      var a=document.createElement('a');a.href=d.url;a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
      if(d.logKey){
        setTimeout(function(){try{navigator.sendBeacon('/api/download/beacon',JSON.stringify({logKey:d.logKey,event:'complete'}))}catch(e){}},5000);
      }
    }

    // ── Delete ──
    async function del(key,name){
      if(IS_DEMO)return;
      if(!confirm('删除「'+name+'」？'))return;
      var r=await api('/api/files/'+key.split('/').map(encodeURIComponent).join('/'),{method:'DELETE'});
      if(r&&r.ok)loadFiles();
    }

    // ── Create folder ──
    function createFolder(){
      if(IS_DEMO)return;
      var o=document.createElement('div');o.className='overlay';
      var m=document.createElement('div');m.className='modal';
      m.innerHTML='<h2>新建文件夹</h2><label>名称</label><input type="text" id="new-folder-name" placeholder="文件夹名称" autofocus><div class="btn-row"><button class="btn btn-s" onclick="this.closest(&apos;.overlay&apos;).remove()">取消</button><button class="btn btn-p" id="cf-btn">创建</button></div>';
      o.appendChild(m);document.body.appendChild(o);
      m.querySelector('#cf-btn').onclick=async function(){
        var name=document.getElementById('new-folder-name').value.trim();
        if(!name)return;
        var r=await api('/api/files/folder',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({path:currentPath+name})});
        if(r&&r.ok){o.remove();loadFiles()}else if(r){r.json().then(function(d){alert(d.error||'创建失败')})}
      };
      m.querySelector('input').onkeydown=function(e){if(e.key==='Enter')m.querySelector('#cf-btn').click()};
      setTimeout(function(){document.getElementById('new-folder-name').focus()},100);
    }

    // ── Batch operations ──
    async function batchDelete(){
      if(IS_DEMO)return;
      if(!selectedKeys.size)return;
      if(!confirm('删除选中的 '+selectedKeys.size+' 个项目？'))return;
      var keys=Array.from(selectedKeys);
      var r=await api('/api/files/batch-delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({keys})});
      if(r&&r.ok){clearSelection();loadFiles()}
    }

    async function batchShare(){
      if(!selectedKeys.size)return;
      var keys=Array.from(selectedKeys);
      var r=await api('/api/share/batch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({keys})});
      if(!r||!r.ok)return;
      var d=await r.json();
      if(!d.shares||!d.shares.length){alert('没有可分享的文件');return}
      var o=document.createElement('div');o.className='overlay';
      var m=document.createElement('div');m.className='modal';
      var html='<h2>分享 '+d.shares.length+' 个文件</h2><div class="batch-share-list">';
      for(var i=0;i<d.shares.length;i++){
        var s=d.shares[i],url=location.origin+'/s/'+s.token;
        html+='<div class="batch-share-item"><span class="bs-name">'+esc(s.name)+'</span><span class="bs-url">'+url+'</span><button class="cp bs-cp" onclick="var b=this;navigator.clipboard.writeText(&apos;'+url+'&apos;);b.textContent=&apos;✓&apos;;setTimeout(function(){b.textContent=&apos;复制&apos;},1000)">复制</button></div>';
      }
      html+='</div><div class="btn-row"><button class="btn btn-p" onclick="var t=[];document.querySelectorAll(&apos;.bs-url&apos;).forEach(function(e){t.push(e.textContent)});navigator.clipboard.writeText(t.join(&apos;\\n&apos;));this.textContent=&apos;已复制&apos;;var b=this;setTimeout(function(){b.textContent=&apos;复制所有链接&apos;},1200)">复制所有链接</button><button class="btn btn-s" onclick="this.closest(&apos;.overlay&apos;).remove()">关闭</button></div>';
      m.innerHTML=html;o.appendChild(m);document.body.appendChild(o);
      o.addEventListener('click',function(e){if(e.target===o)o.remove()});
      clearSelection();
    }

    async function batchMove(){
      if(!selectedKeys.size)return;
      var r=await api('/api/files/folders');
      if(!r||!r.ok)return;
      var d=await r.json();
      var allFolders=d.folders||[];
      var o=document.createElement('div');o.className='overlay';
      var m=document.createElement('div');m.className='modal';
      var html='<h2>移动到文件夹</h2><label>目标位置</label><select id="move-target">';
      html+='<option value="uploads/">根目录</option>';
      for(var i=0;i<allFolders.length;i++){var f=allFolders[i];
        if(f===currentPath)continue;
        html+='<option value="'+esc(f)+'">'+esc(f.replace('uploads/',''))+'</option>';
      }
      html+='</select><div class="btn-row"><button class="btn btn-s" onclick="this.closest(&apos;.overlay&apos;).remove()">取消</button><button class="btn btn-p" id="bm-btn">移动</button></div>';
      m.innerHTML=html;o.appendChild(m);document.body.appendChild(o);
      m.querySelector('#bm-btn').onclick=async function(){
        var target=document.getElementById('move-target').value;
        var keys=Array.from(selectedKeys);
        var r2=await api('/api/files/move',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({keys:keys,targetPath:target})});
        if(r2&&r2.ok){o.remove();clearSelection();loadFiles()}
      };
      o.addEventListener('click',function(e){if(e.target===o)o.remove()});
    }

    // ── Upload Keys ──
    async function loadUploadKeys(){
      document.getElementById('public-upload-url').value=location.origin+'/upload';
      var tbody=document.getElementById('uk-tbody');
      var empty=document.getElementById('uk-empty');
      try{
        var r=await api('/api/upload-keys');
        if(!r||!r.ok){tbody.innerHTML='';empty.style.display='block';empty.textContent='加载失败';return}
        var d=await r.json();var keys=d.keys||[];
        if(!keys.length){tbody.innerHTML='';empty.style.display='block';empty.innerHTML='<div style="padding:60px;text-align:center;color:var(--sub)"><div style="font-size:32px;margin-bottom:12px">🔗</div><p>暂无上传链接</p><p style="font-size:12px;margin-top:8px">点击 + 新建一个</p></div>';return}
        empty.style.display='none';
        var h='';
        for(var i=0;i<keys.length;i++){
          var k=keys[i];
          var expired=new Date(k.expires)<new Date();
          var status=expired?'<span style="color:#ef4444">已过期</span>':k.active?'<span style="color:#22c55e">有效</span>':'<span style="color:var(--sub)">已停用</span>';
          h+='<tr><td>'+esc(k.label)+'</td><td style="font-family:monospace;font-size:12px">'+esc(k.path)+'</td>'+
            '<td>'+fmtTime(k.created)+'</td><td>'+fmtTime(k.expires)+'</td><td>'+k.usedCount+'</td><td>'+status+'</td>'+
            '<td><button class="btn btn-s" onclick="copyUploadUrl(&apos;'+k.id+'&apos;)">复制</button> '+
            '<button class="btn btn-s btn-danger" onclick="deleteUploadKey(&apos;'+k.id+'&apos;)">删除</button></td></tr>';
        }
        tbody.innerHTML=h;
      }catch(e){console.error('loadUploadKeys:',e);tbody.innerHTML='';empty.style.display='block';empty.textContent='加载失败'}
    }
    function copyPublicUploadUrl(){
      var url=location.origin+'/upload';
      navigator.clipboard.writeText(url).then(function(){alert('已复制 '+url)});
    }
    function copyUploadUrl(id){
      var url=location.origin+'/u/'+id;
      navigator.clipboard.writeText(url).then(function(){alert('已复制 '+url)});
    }
    function createUploadKey(){
      if(IS_DEMO)return;
      var o=document.createElement('div');o.className='overlay';
      var m=document.createElement('div');m.className='modal';
      m.innerHTML='<h2>新建上传链接</h2>'+
        '<label>标签</label><input type="text" id="uk-label" placeholder="例如：客户资料">'+
        '<label>路径</label><input type="text" id="uk-path" placeholder="uploads/" value="uploads/">'+
        '<label>有效期</label><select id="uk-expires"><option value="1">1 小时</option><option value="6">6 小时</option><option value="24" selected>24 小时</option><option value="168">7 天</option><option value="720">30 天</option></select>'+
        '<div class="btn-row"><button class="btn btn-s" onclick="this.closest(&apos;.overlay&apos;).remove()">取消</button><button class="btn btn-p" id="uk-submit">创建</button></div>';
      o.appendChild(m);document.body.appendChild(o);
      o.addEventListener('click',function(e){if(e.target===o)o.remove()});
      m.querySelector('#uk-submit').onclick=async function(){
        var label=document.getElementById('uk-label').value.trim();
        var path=document.getElementById('uk-path').value.trim()||'uploads/';
        var hours=parseInt(document.getElementById('uk-expires').value);
        if(!label){alert('输入标签以继续');return}
        var r=await api('/api/upload-keys',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({label:label,path:path,expiresHours:hours})});
        if(!r||!r.ok){alert('创建失败，请重试');return}
        var d=await r.json();
        o.remove();
        var url=location.origin+'/u/'+d.id;
        var o2=document.createElement('div');o2.className='overlay';
        var m2=document.createElement('div');m2.className='modal';
        m2.innerHTML='<h2>链接已创建</h2><label>上传链接</label><input type="text" readonly id="uk-url-input" style="font-family:monospace;font-size:13px">'+
          '<p style="font-size:12px;color:var(--sub);margin-top:4px">过期时间：'+fmtTime(d.expires)+'</p>'+
          '<div class="btn-row"><button class="btn btn-s" onclick="this.closest(&apos;.overlay&apos;).remove()">关闭</button><button class="btn btn-p" id="uk-copy">复制</button></div>';
        o2.appendChild(m2);document.body.appendChild(o2);
        document.getElementById('uk-url-input').value=url;
        document.getElementById('uk-url-input').onclick=function(){this.select()};
        document.getElementById('uk-copy').onclick=function(){navigator.clipboard.writeText(url);this.textContent='已复制';var b=this;setTimeout(function(){b.textContent='复制'},1200)};
        o2.addEventListener('click',function(e){if(e.target===o2)o2.remove()});
        loadUploadKeys();
      };
    }
    async function deleteUploadKey(id){
      if(IS_DEMO)return;
      if(!confirm('删除此上传链接？'))return;
      var r=await api('/api/upload-keys/'+id,{method:'DELETE'});
      if(r&&r.ok)loadUploadKeys();
    }

    // ── Clear download logs ──
    async function clearDownloadLogs(){
      if(IS_DEMO)return;
      if(!confirm('清空所有下载记录？'))return;
      var r=await api('/api/download/logs',{method:'DELETE'});
      if(r&&r.ok){var d=await r.json();alert('已清空 '+d.deleted+' 条记录');loadDownloads()}
    }

    // ── Storage config ──
    var PROVIDER_PRESETS={};
    var _editingName='';

    async function loadProviderPresets(){
      var r=await api('/api/storage/providers');
      if(r){try{PROVIDER_PRESETS=await r.json()}catch{}}
    }
    loadProviderPresets();

    async function loadStorageBackends(){
      var r=await api('/api/storage/backends');
      if(!r)return;var d=await r.json();
      var list=document.getElementById('storage-list');
      var empty=document.getElementById('storage-empty');
      if(!d.backends||d.backends.length===0){
        list.innerHTML='';empty.style.display='';return;
      }
      empty.style.display='none';
      var html='';
      d.backends.forEach(function(b){
        var badges='';
        if(b.primary)badges+='<span class="sc-badge primary">主存储</span>';
        if(b.sync)badges+='<span class="sc-badge sync">同步</span>';
        var providerName=PROVIDER_PRESETS[b.provider]?PROVIDER_PRESETS[b.provider].name:b.provider;
        html+='<div class="storage-card">'+
          '<div class="sc-head">'+
            '<div class="sc-name"><span>'+esc(b.name)+'</span>'+badges+'</div>'+
            '<div class="sc-actions">'+
              '<button class="btn btn-s" onclick="editStorageBackend(\\''+esc(b.name)+'\\')">编辑</button>'+
              '<button class="btn btn-s" style="color:#ef4444" onclick="deleteStorageBackend(\\''+esc(b.name)+'\\')">删除</button>'+
            '</div>'+
          '</div>'+
          '<div class="sc-info">'+
            '<span>📦 '+esc(providerName)+'</span>'+
            '<span>🪣 '+esc(b.bucket)+'</span>'+
            '<span>🌐 '+esc(b.endpoint)+'</span>'+
            '<span>📍 '+esc(b.region)+'</span>'+
            (b.hasCredentials?'<span>🔑 已配置</span>':'<span style="color:#ef4444">🔑 未配置</span>')+
          '</div>'+
        '</div>';
      });
      list.innerHTML=html;
    }

    function showAddStorage(){
      _editingName='';
      document.getElementById('storage-modal-title').textContent='添加存储后端';
      document.getElementById('sm-name').value='';document.getElementById('sm-name').disabled=false;
      document.getElementById('sm-endpoint').value='';
      document.getElementById('sm-bucket').value='';
      document.getElementById('sm-region').value='';
      document.getElementById('sm-accesskey').value='';
      document.getElementById('sm-secretkey').value='';
      document.getElementById('sm-primary').checked=false;
      document.getElementById('sm-sync').checked=true;
      document.getElementById('sm-test-result').style.display='none';
      document.getElementById('sm-save-btn').textContent='保存';
      document.getElementById('storage-modal').style.display='flex';
    }

    function closeStorageModal(){
      document.getElementById('storage-modal').style.display='none';
    }

    function onProviderChange(){
      var p=document.getElementById('sm-provider').value;
      var preset=PROVIDER_PRESETS[p];
      if(!preset)return;
      if(preset.endpoint)document.getElementById('sm-endpoint').value=preset.endpoint;
      if(preset.regions&&preset.regions.length>0)document.getElementById('sm-region').value=preset.regions[0];
    }

    async function editStorageBackend(name){
      var r=await api('/api/storage/backends');
      if(!r)return;var d=await r.json();
      var b=d.backends.find(function(x){return x.name===name});
      if(!b)return;
      _editingName=name;
      document.getElementById('storage-modal-title').textContent='编辑存储后端';
      document.getElementById('sm-provider').value=b.provider;
      document.getElementById('sm-name').value=b.name;document.getElementById('sm-name').disabled=true;
      document.getElementById('sm-endpoint').value=b.endpoint;
      document.getElementById('sm-bucket').value=b.bucket;
      document.getElementById('sm-region').value=b.region;
      document.getElementById('sm-accesskey').value='';
      document.getElementById('sm-secretkey').value='';
      document.getElementById('sm-primary').checked=!!b.primary;
      document.getElementById('sm-sync').checked=b.sync!==false;
      document.getElementById('sm-test-result').style.display='none';
      document.getElementById('sm-save-btn').textContent='更新';
      document.getElementById('storage-modal').style.display='flex';
    }

    async function saveStorageBackend(){
      var name=document.getElementById('sm-name').value.trim();
      var provider=document.getElementById('sm-provider').value;
      var endpoint=document.getElementById('sm-endpoint').value.trim();
      var bucket=document.getElementById('sm-bucket').value.trim();
      var region=document.getElementById('sm-region').value.trim();
      var accessKey=document.getElementById('sm-accesskey').value.trim();
      var secretKey=document.getElementById('sm-secretkey').value.trim();
      var primary=document.getElementById('sm-primary').checked;
      var sync=document.getElementById('sm-sync').checked;

      if(!name||!endpoint||!bucket||!region){alert('请填写所有必填字段');return}
      if(!_editingName&&(!accessKey||!secretKey)){alert('请填写 Access Key 和 Secret Key');return}

      var body={name:name,provider:provider,endpoint:endpoint,bucket:bucket,region:region,primary:primary,sync:sync};
      if(accessKey)body.accessKey=accessKey;
      if(secretKey)body.secretKey=secretKey;

      var r;
      if(_editingName){
        r=await api('/api/storage/backends/'+encodeURIComponent(_editingName),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      }else{
        r=await api('/api/storage/backends',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      }
      if(r&&r.ok){closeStorageModal();loadStorageBackends()}
      else if(r){var e=await r.json().catch(function(){return{error:'操作失败'}});alert(e.error||'操作失败')}
      else{alert('网络异常，请重试')}
    }

    async function deleteStorageBackend(name){
      if(!confirm('确定删除存储后端「'+name+'」？'))return;
      var r=await api('/api/storage/backends/'+encodeURIComponent(name),{method:'DELETE'});
      if(r&&r.ok)loadStorageBackends();
    }

    async function testStorageConnection(){
      var endpoint=document.getElementById('sm-endpoint').value.trim();
      var bucket=document.getElementById('sm-bucket').value.trim();
      var region=document.getElementById('sm-region').value.trim();
      var accessKey=document.getElementById('sm-accesskey').value.trim();
      var secretKey=document.getElementById('sm-secretkey').value.trim();
      if(!endpoint||!bucket||!region||!accessKey||!secretKey){alert('请填写所有字段后再测试');return}

      var btn=document.getElementById('sm-test-btn');
      var result=document.getElementById('sm-test-result');
      btn.textContent='测试中...';btn.disabled=true;result.style.display='none';

      var r=await api('/api/storage/test',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:endpoint,bucket:bucket,region:region,accessKey:accessKey,secretKey:secretKey})});
      btn.textContent='测试连接';btn.disabled=false;
      if(r){var d=await r.json();result.style.display='block';
        if(d.ok){result.style.color='#10b981';result.textContent='✅ '+d.message}
        else{result.style.color='#ef4444';result.textContent='❌ '+(d.error||'连接失败')}
      }
    }

    loadFiles();
  </script>
</body>
</html>`;
}
