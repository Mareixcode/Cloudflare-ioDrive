export function renderDemo(): string {
  const IMG = 'https://raw.githubusercontent.com/Mareixcode/Cloudflare-Drive/main/docs/images/screenshots';
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ioDrive - 轻量级 Cloudflare 文件分享系统</title>
  <meta name="description" content="ioDrive - 基于 Cloudflare Workers + Hono + R2 构建的轻量级文件管理与分享平台">
  <meta property="og:title" content="ioDrive - 轻量级云文件分享">
  <meta property="og:description" content="基于 Cloudflare Workers + Hono + R2 构建的高性能文件管理与分享平台">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='24' font-size='24'>☁️</text></svg>">
  <style>
    :root{--bg:#f5f5f7;--card:#fff;--text:#111;--sub:#666;--sub2:#888;--border:#e5e5e5;--accent:#111;--accent-fg:#fff;--hover:#f0f0f0;--shadow:0 2px 12px rgba(0,0,0,0.06);--shadow-lg:0 8px 32px rgba(0,0,0,0.1)}
    [data-theme="dark"]{--bg:#09090b;--card:#18181b;--text:#fafafa;--sub:#a1a1aa;--sub2:#71717a;--border:#27272a;--accent:#fafafa;--accent-fg:#18181b;--hover:#27272a;--shadow:0 2px 12px rgba(0,0,0,0.3);--shadow-lg:0 8px 32px rgba(0,0,0,0.4)}
    *{margin:0;padding:0;box-sizing:border-box}
    html{scroll-behavior:smooth}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:var(--text);background:var(--bg);transition:background .35s,color .35s;overflow-x:hidden;-webkit-font-smoothing:antialiased}
    ::selection{background:var(--accent);color:var(--accent-fg)}
    a{color:inherit;text-decoration:none}

    /* ── Nav ── */
    .nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:0 40px;height:60px;display:flex;align-items:center;justify-content:space-between;background:rgba(245,245,247,0.8);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);transition:all .3s}
    [data-theme="dark"] .nav{background:rgba(9,9,11,0.8)}
    .nav.scrolled{border-bottom:1px solid var(--border)}
    .nav-logo{display:flex;align-items:center;gap:8px;font-weight:700;font-size:16px}
    .nav-logo svg{width:24px;height:24px;transition:transform .3s cubic-bezier(.34,1.56,.64,1)}
    .nav-logo:hover svg{transform:rotate(-8deg) scale(1.1)}
    .nav-links{display:flex;gap:28px}
    .nav-links a{font-size:14px;font-weight:500;color:var(--sub);transition:color .2s}
    .nav-links a:hover{color:var(--text)}
    .nav-right{display:flex;align-items:center;gap:8px}
    .theme-btn{background:none;border:1.5px solid var(--border);cursor:pointer;width:36px;height:36px;border-radius:8px;font-size:16px;display:flex;align-items:center;justify-content:center;transition:all .2s;color:var(--sub)}
    .theme-btn:hover{background:var(--hover);transform:scale(1.08)}
    .hamburger{display:none;background:none;border:none;cursor:pointer;padding:6px;color:var(--text)}
    .hamburger svg{width:22px;height:22px}

    /* ── Mobile menu ── */
    .mobile-menu{display:none;position:fixed;top:60px;left:0;right:0;background:var(--card);border-bottom:1px solid var(--border);padding:16px 24px;z-index:99;animation:slideDown .25s ease}
    .mobile-menu.open{display:block}
    .mobile-menu a{display:block;padding:12px 0;font-size:15px;font-weight:500;color:var(--text);border-bottom:1px solid var(--border)}
    .mobile-menu a:last-child{border-bottom:none}
    @keyframes slideDown{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}

    /* ── Hero ── */
    .hero{min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:100px 24px 60px;position:relative}
    .hero::before{content:'';position:absolute;top:50%;left:50%;width:600px;height:600px;transform:translate(-50%,-55%);background:radial-gradient(circle,rgba(0,0,0,0.03) 0%,transparent 70%);pointer-events:none;border-radius:50%}
    [data-theme="dark"] .hero::before{background:radial-gradient(circle,rgba(255,255,255,0.02) 0%,transparent 70%)}
    .hero-logo{margin-bottom:24px;animation:bounceIn .7s cubic-bezier(.34,1.56,.64,1)}
    .hero-logo svg{width:72px;height:72px}
    .hero h1{font-size:48px;font-weight:800;letter-spacing:-1.5px;margin-bottom:12px;animation:fadeUp .6s .15s both}
    .hero .subtitle{font-size:20px;color:var(--sub);margin-bottom:8px;font-weight:500;animation:fadeUp .6s .25s both}
    .hero .desc{font-size:15px;color:var(--sub2);max-width:480px;line-height:1.6;margin-bottom:36px;animation:fadeUp .6s .35s both}
    .hero-btns{display:flex;gap:12px;animation:fadeUp .6s .45s both}
    .btn-p{padding:12px 28px;background:var(--accent);color:var(--accent-fg);border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:6px}
    .btn-p:hover{opacity:.85;transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,0.15)}
    .btn-s{padding:12px 28px;background:var(--card);color:var(--text);border:1.5px solid var(--border);border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;transition:all .2s;display:inline-flex;align-items:center;gap:6px}
    .btn-s:hover{background:var(--hover);transform:translateY(-1px);box-shadow:var(--shadow)}
    @keyframes bounceIn{0%{opacity:0;transform:scale(.6) translateY(20px)}60%{transform:scale(1.05) translateY(-4px)}100%{opacity:1;transform:scale(1) translateY(0)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}

    /* ── Sections ── */
    .section{padding:80px 24px;max-width:1040px;margin:0 auto}
    .section-title{text-align:center;font-size:28px;font-weight:700;letter-spacing:-0.5px;margin-bottom:8px}
    .section-desc{text-align:center;font-size:15px;color:var(--sub2);margin-bottom:48px}
    .scroll-reveal{opacity:0;transform:translateY(28px);transition:opacity .6s cubic-bezier(.34,1.56,.64,1),transform .6s cubic-bezier(.34,1.56,.64,1)}
    .scroll-reveal.revealed{opacity:1;transform:translateY(0)}

    /* ── Features ── */
    .features{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
    .feature-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:28px;transition:all .25s cubic-bezier(.34,1.56,.64,1);cursor:default}
    .feature-card:hover{transform:translateY(-4px);box-shadow:var(--shadow-lg);border-color:var(--sub2)}
    .feature-icon{width:44px;height:44px;background:var(--bg);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:22px;margin-bottom:16px;transition:transform .3s cubic-bezier(.34,1.56,.64,1)}
    .feature-card:hover .feature-icon{transform:scale(1.1) rotate(-5deg)}
    .feature-card h3{font-size:16px;font-weight:600;margin-bottom:8px}
    .feature-card p{font-size:13px;color:var(--sub);line-height:1.6}

    /* ── Screenshots ── */
    .screenshots-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:24px}
    .device-frame{background:var(--card);border:1px solid var(--border);border-radius:12px;overflow:hidden;box-shadow:var(--shadow);transition:all .3s cubic-bezier(.34,1.56,.64,1)}
    .device-frame:hover{transform:translateY(-4px);box-shadow:var(--shadow-lg)}
    .device-bar{height:32px;background:var(--bg);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 12px;gap:6px}
    .device-bar .dot{width:8px;height:8px;border-radius:50%;background:var(--border)}
    .device-bar .dot.r{background:#ff5f57}.device-bar .dot.y{background:#febc2e}.device-bar .dot.g{background:#28c840}
    .device-bar .url{flex:1;margin-left:12px;height:16px;background:var(--card);border:1px solid var(--border);border-radius:4px;font-size:10px;color:var(--sub2);display:flex;align-items:center;padding:0 8px}
    .device-frame img{width:100%;display:block}
    .device-caption{text-align:center;padding:12px;font-size:13px;color:var(--sub);font-weight:500}

    /* ── Architecture ── */
    .arch-container{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:start}
    .arch-diagram{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:32px;box-shadow:var(--shadow)}
    .arch-node{background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:10px 16px;text-align:center;font-size:13px;font-weight:600;margin:0 auto;max-width:220px}
    .arch-arrow{text-align:center;color:var(--sub2);font-size:16px;padding:4px 0}
    .arch-branches{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin:8px 0}
    .arch-branches .arch-node{font-size:11px;padding:8px 6px}
    .tech-list{display:grid;grid-template-columns:1fr 1fr;gap:12px}
    .tech-item{background:var(--card);border:1px solid var(--border);border-radius:10px;padding:16px;display:flex;align-items:center;gap:12px;transition:all .2s}
    .tech-item:hover{border-color:var(--sub2);transform:translateY(-2px);box-shadow:var(--shadow)}
    .tech-icon{width:36px;height:36px;background:var(--bg);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}
    .tech-item h4{font-size:14px;font-weight:600;margin-bottom:2px}
    .tech-item p{font-size:11px;color:var(--sub)}

    /* ── Trial ── */
    .trial-box{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:40px;text-align:center;box-shadow:var(--shadow);max-width:560px;margin:0 auto}
    .trial-box h3{font-size:20px;font-weight:700;margin-bottom:8px}
    .trial-box .sub{font-size:14px;color:var(--sub2);margin-bottom:24px}
    .trial-creds{background:var(--bg);border:1px solid var(--border);border-radius:10px;padding:16px 24px;display:inline-flex;gap:28px;margin-bottom:28px;font-family:'SF Mono',SFMono-Regular,Consolas,'Liberation Mono',Menlo,monospace}
    .trial-creds .label{font-size:11px;color:var(--sub2);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}
    .trial-creds .value{font-size:15px;font-weight:600}
    .trial-btns{display:flex;gap:12px;justify-content:center}
    .trial-btns .btn-p,.trial-btns .btn-s{padding:10px 24px;font-size:14px}

    /* ── Steps ── */
    .steps{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
    .step{position:relative}
    .step-num{width:32px;height:32px;background:var(--accent);color:var(--accent-fg);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;margin-bottom:12px}
    .step h4{font-size:15px;font-weight:600;margin-bottom:10px}
    .step .code-block{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:10px 14px;font-family:'SF Mono',SFMono-Regular,Consolas,'Liberation Mono',Menlo,monospace;font-size:13px;display:flex;align-items:center;justify-content:space-between;gap:8px}
    .step .code-block code{color:var(--text)}
    .step .code-block .copy{background:none;border:1px solid var(--border);border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer;color:var(--sub);transition:all .2s;flex-shrink:0}
    .step .code-block .copy:hover{background:var(--hover);color:var(--text)}
    .step p{font-size:13px;color:var(--sub);margin-top:8px;line-height:1.5}

    /* ── Footer ── */
    .footer{border-top:1px solid var(--border);padding:32px 24px;text-align:center}
    .footer-inner{max-width:1040px;margin:0 auto;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px}
    .footer-brand{display:flex;align-items:center;gap:8px;font-size:14px;font-weight:600}
    .footer-brand svg{width:20px;height:20px}
    .footer-info{font-size:13px;color:var(--sub)}
    .footer a{transition:color .2s}
    .footer a:hover{color:var(--text)}

    /* ── Responsive ── */
    @media(max-width:768px){
      .nav{padding:0 20px}
      .nav-links{display:none}
      .hamburger{display:flex}
      .hero{padding:80px 20px 40px;min-height:auto}
      .hero h1{font-size:36px}
      .hero .subtitle{font-size:17px}
      .hero .desc{font-size:14px}
      .hero-btns{flex-direction:column;width:100%;max-width:280px}
      .hero-btns .btn-p,.hero-btns .btn-s{justify-content:center}
      .section{padding:48px 20px}
      .section-title{font-size:24px}
      .features{grid-template-columns:repeat(2,1fr);gap:14px}
      .feature-card{padding:22px}
      .screenshots-grid{grid-template-columns:1fr}
      .arch-container{grid-template-columns:1fr;gap:28px}
      .tech-list{grid-template-columns:1fr}
      .steps{grid-template-columns:1fr;gap:20px}
      .trial-creds{flex-direction:column;gap:12px}
      .trial-btns{flex-direction:column}
      .trial-btns .btn-p,.trial-btns .btn-s{width:100%;justify-content:center}
      .footer-inner{flex-direction:column;text-align:center}
    }
    @media(max-width:480px){
      .hero h1{font-size:30px}
      .hero .subtitle{font-size:15px}
      .features{grid-template-columns:1fr}
      .trial-box{padding:28px 20px}
      .trial-creds{padding:12px 16px}
      .step .code-block{font-size:12px;padding:8px 10px}
    }
  </style>
</head>
<body>

<!-- ── Nav ── -->
<nav class="nav" id="nav">
  <a href="#" class="nav-logo">
    <svg viewBox="0 0 72 72" fill="none"><path d="M22 40c-4.4 0-8-3.6-8-8 0-3.7 2.5-6.8 6-7.7C21 18.5 26.8 14 34 14c6 0 11.2 3.8 13.2 9.2C51.5 23.6 55 27.5 55 32c0 4.4-3.6 8-8 8H22z" fill="var(--accent)"/><path d="M36 44v12M30 50l6 6 6-6" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
    ioDrive
  </a>
  <div class="nav-links">
    <a href="#features">核心功能</a>
    <a href="#screenshots">产品展示</a>
    <a href="#arch">技术架构</a>
    <a href="#trial">立即体验</a>
    <a href="#start">快速开始</a>
  </div>
  <div class="nav-right">
    <button class="theme-btn" id="theme-btn" onclick="toggleTheme()">🌙</button>
    <button class="hamburger" id="hamburger" onclick="toggleMenu()">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
    </button>
  </div>
</nav>
<div class="mobile-menu" id="mobile-menu">
  <a href="#features" onclick="closeMenu()">核心功能</a>
  <a href="#screenshots" onclick="closeMenu()">产品展示</a>
  <a href="#arch" onclick="closeMenu()">技术架构</a>
  <a href="#trial" onclick="closeMenu()">立即体验</a>
  <a href="#start" onclick="closeMenu()">快速开始</a>
</div>

<!-- ── Hero ── -->
<section class="hero">
  <div class="hero-logo">
    <svg viewBox="0 0 72 72" fill="none"><path d="M22 40c-4.4 0-8-3.6-8-8 0-3.7 2.5-6.8 6-7.7C21 18.5 26.8 14 34 14c6 0 11.2 3.8 13.2 9.2C51.5 23.6 55 27.5 55 32c0 4.4-3.6 8-8 8H22z" fill="var(--accent)"/><path d="M36 44v12M30 50l6 6 6-6" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </div>
  <h1>ioDrive</h1>
  <p class="subtitle">轻量级 Cloudflare 文件分享系统</p>
  <p class="desc">基于 Cloudflare Workers + Hono + R2 构建的高性能文件管理与分享平台，支持双云存储、公开上传、分享链接等功能</p>
  <div class="hero-btns">
    <a href="#features" class="btn-p">了解更多 ↓</a>
    <a href="https://github.com/Mareixcode/Cloudflare-Drive" target="_blank" class="btn-s">GitHub ↗</a>
  </div>
</section>

<!-- ── Features ── -->
<section class="section" id="features">
  <h2 class="section-title scroll-reveal">核心功能</h2>
  <p class="section-desc scroll-reveal">一站式文件管理与分享解决方案</p>
  <div class="features">
    <div class="feature-card scroll-reveal">
      <div class="feature-icon">📁</div>
      <h3>文件管理</h3>
      <p>文件夹创建、上传、移动、批量删除和批量分享，一站式管理您的云端文件。</p>
    </div>
    <div class="feature-card scroll-reveal">
      <div class="feature-icon">🔗</div>
      <h3>分享系统</h3>
      <p>一键创建分享链接，支持有效期设置、下载统计和链接管理。</p>
    </div>
    <div class="feature-card scroll-reveal">
      <div class="feature-icon">📤</div>
      <h3>公共上传</h3>
      <p>无需登录即可上传，Turnstile 人机验证保护，支持自定义上传目录。</p>
    </div>
    <div class="feature-card scroll-reveal">
      <div class="feature-icon">🔑</div>
      <h3>上传链接</h3>
      <p>独立上传地址，自定义有效期和目录，适合团队协作和外部接收文件。</p>
    </div>
    <div class="feature-card scroll-reveal">
      <div class="feature-icon">📊</div>
      <h3>下载统计</h3>
      <p>记录 IP、地区、浏览器、操作系统和设备类型，全面了解文件分发情况。</p>
    </div>
    <div class="feature-card scroll-reveal">
      <div class="feature-icon">☁️</div>
      <h3>双云存储</h3>
      <p>同时支持 Cloudflare R2 和 S3 兼容存储，Presigned URL 直接下载。</p>
    </div>
  </div>
</section>

<!-- ── Screenshots ── -->
<section class="section" id="screenshots">
  <h2 class="section-title scroll-reveal">产品展示</h2>
  <p class="section-desc scroll-reveal">简洁的界面设计，支持深色/浅色主题</p>
  <div class="screenshots-grid">
    <div class="device-frame scroll-reveal">
      <div class="device-bar"><div class="dot r"></div><div class="dot y"></div><div class="dot g"></div><div class="url">drive.iodevo.com</div></div>
      <img src="${IMG}/dashboard.jpg" alt="管理后台" loading="lazy">
      <div class="device-caption">管理后台</div>
    </div>
    <div class="device-frame scroll-reveal">
      <div class="device-bar"><div class="dot r"></div><div class="dot y"></div><div class="dot g"></div><div class="url">drive.iodevo.com/upload</div></div>
      <img src="${IMG}/upload.png" alt="文件上传" loading="lazy">
      <div class="device-caption">文件上传</div>
    </div>
    <div class="device-frame scroll-reveal">
      <div class="device-bar"><div class="dot r"></div><div class="dot y"></div><div class="dot g"></div><div class="url">drive.iodevo.com/s/...</div></div>
      <img src="${IMG}/share-link-1.png" alt="分享页面" loading="lazy">
      <div class="device-caption">分享页面</div>
    </div>
    <div class="device-frame scroll-reveal">
      <div class="device-bar"><div class="dot r"></div><div class="dot y"></div><div class="dot g"></div><div class="url">drive.iodevo.com/s/...</div></div>
      <img src="${IMG}/share-link-2.png" alt="分享下载" loading="lazy">
      <div class="device-caption">分享下载</div>
    </div>
  </div>
</section>

<!-- ── Architecture ── -->
<section class="section" id="arch">
  <h2 class="section-title scroll-reveal">技术架构</h2>
  <p class="section-desc scroll-reveal">完全运行在 Cloudflare 边缘网络</p>
  <div class="arch-container">
    <div class="arch-diagram scroll-reveal">
      <div class="arch-node">用户请求</div>
      <div class="arch-arrow">↓</div>
      <div class="arch-node" style="background:var(--accent);color:var(--accent-fg)">Cloudflare Workers</div>
      <div class="arch-arrow">↓</div>
      <div class="arch-node">Hono Framework</div>
      <div class="arch-arrow">↓</div>
      <div class="arch-branches">
        <div class="arch-node">JWT 认证</div>
        <div class="arch-node">分享服务</div>
        <div class="arch-node">上传服务</div>
      </div>
      <div class="arch-arrow">↓</div>
      <div class="arch-node" style="background:var(--accent);color:var(--accent-fg)">Cloudflare R2</div>
      <div class="arch-arrow">↓</div>
      <div class="arch-node">可选 S3 同步</div>
    </div>
    <div class="tech-list">
      <div class="tech-item scroll-reveal">
        <div class="tech-icon">💻</div>
        <div><h4>TypeScript</h4><p>类型安全的开发语言</p></div>
      </div>
      <div class="tech-item scroll-reveal">
        <div class="tech-icon">⚡</div>
        <div><h4>Hono</h4><p>轻量级 Web 框架</p></div>
      </div>
      <div class="tech-item scroll-reveal">
        <div class="tech-icon">☁️</div>
        <div><h4>Cloudflare Workers</h4><p>边缘计算运行时</p></div>
      </div>
      <div class="tech-item scroll-reveal">
        <div class="tech-icon">🩣</div>
        <div><h4>Cloudflare R2</h4><p>S3 兼容对象存储</p></div>
      </div>
      <div class="tech-item scroll-reveal">
        <div class="tech-icon">🛡️</div>
        <div><h4>Cloudflare Turnstile</h4><p>免费人机验证</p></div>
      </div>
      <div class="tech-item scroll-reveal">
        <div class="tech-icon">🔄</div>
        <div><h4>S3 兼容存储</h4><p>AWS S3 / MinIO / B2</p></div>
      </div>
    </div>
  </div>
</section>

<!-- ── Trial ── -->
<section class="section" id="trial">
  <h2 class="section-title scroll-reveal">立即体验</h2>
  <p class="section-desc scroll-reveal">使用以下账号登录体验完整功能</p>
  <div class="trial-box scroll-reveal">
    <h3>🔐 演示账号</h3>
    <p class="sub">直接使用以下凭据登录管理后台</p>
    <div class="trial-creds">
      <div><div class="label">用户名</div><div class="value">admin</div></div>
      <div><div class="label">密码</div><div class="value">admin</div></div>
    </div>
    <div class="trial-btns">
      <a href="/login" class="btn-p">立即登录</a>
      <button class="btn-s" disabled style="opacity:.5;cursor:not-allowed">演示环境已禁用上传</button>
    </div>
  </div>
</section>

<!-- ── Quick Start ── -->
<section class="section" id="start">
  <h2 class="section-title scroll-reveal">快速开始</h2>
  <p class="section-desc scroll-reveal">三步部署您自己的 ioDrive</p>
  <div class="steps">
    <div class="step scroll-reveal">
      <div class="step-num">1</div>
      <h4>安装依赖</h4>
      <div class="code-block"><code>npm install</code><button class="copy" onclick="copyCode(this)">复制</button></div>
      <p>克隆项目仓库并安装依赖包</p>
    </div>
    <div class="step scroll-reveal">
      <div class="step-num">2</div>
      <h4>本地开发</h4>
      <div class="code-block"><code>npm run dev</code><button class="copy" onclick="copyCode(this)">复制</button></div>
      <p>启动本地开发服务器进行调试</p>
    </div>
    <div class="step scroll-reveal">
      <div class="step-num">3</div>
      <h4>部署上线</h4>
      <div class="code-block"><code>npm run deploy</code><button class="copy" onclick="copyCode(this)">复制</button></div>
      <p>一键部署到 Cloudflare Workers</p>
    </div>
  </div>
  <div style="text-align:center;margin-top:36px" class="scroll-reveal">
    <a href="https://github.com/Mareixcode/Cloudflare-Drive" target="_blank" class="btn-s">查看 GitHub 仓库 ↗</a>
  </div>
</section>

<!-- ── Footer ── -->
<footer class="footer">
  <div class="footer-inner">
    <div class="footer-brand">
      <svg viewBox="0 0 72 72" fill="none"><path d="M22 40c-4.4 0-8-3.6-8-8 0-3.7 2.5-6.8 6-7.7C21 18.5 26.8 14 34 14c6 0 11.2 3.8 13.2 9.2C51.5 23.6 55 27.5 55 32c0 4.4-3.6 8-8 8H22z" fill="var(--accent)"/><path d="M36 44v12M30 50l6 6 6-6" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      ioDrive
    </div>
    <div class="footer-info">Cloudflare Workers + Hono + R2</div>
    <div class="footer-info"><a href="https://github.com/Mareixcode/Cloudflare-Drive" target="_blank">GitHub</a> · GPL-3.0 License © 2026</div>
  </div>
</footer>

<script>
  /* Theme */
  function initTheme(){
    var t=localStorage.getItem('iodrive_theme');
    if(!t) t=window.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';
    if(t==='dark') document.documentElement.setAttribute('data-theme','dark');
    updateBtn();
  }
  function toggleTheme(){
    var d=document.documentElement.getAttribute('data-theme')==='dark';
    if(d){document.documentElement.removeAttribute('data-theme');localStorage.setItem('iodrive_theme','light')}
    else{document.documentElement.setAttribute('data-theme','dark');localStorage.setItem('iodrive_theme','dark')}
    updateBtn();
  }
  function updateBtn(){document.getElementById('theme-btn').textContent=document.documentElement.getAttribute('data-theme')==='dark'?'☀️':'🌙'}
  initTheme();

  /* Nav scroll */
  var nav=document.getElementById('nav');
  window.addEventListener('scroll',function(){nav.classList.toggle('scrolled',window.scrollY>50)});

  /* Mobile menu */
  function toggleMenu(){document.getElementById('mobile-menu').classList.toggle('open')}
  function closeMenu(){document.getElementById('mobile-menu').classList.remove('open')}

  /* Scroll reveal */
  var obs=new IntersectionObserver(function(entries){
    entries.forEach(function(e){if(e.isIntersecting){e.target.classList.add('revealed');obs.unobserve(e.target)}})
  },{threshold:0.1,rootMargin:'0px 0px -40px 0px'});
  document.querySelectorAll('.scroll-reveal').forEach(function(el,i){
    el.style.transitionDelay=(i%6)*80+'ms';
    obs.observe(el);
  });

  /* Copy */
  function copyCode(btn){
    var code=btn.parentElement.querySelector('code');
    navigator.clipboard.writeText(code.textContent).then(function(){
      btn.textContent='✓';setTimeout(function(){btn.textContent='复制'},1200);
    });
  }
</script>
</body>
</html>`;
}
