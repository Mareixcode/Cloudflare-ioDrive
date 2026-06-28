export function renderSharePage(token: string, siteKey: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ioDrive - 下载</title>
  <meta name="description" content="ioDrive 文件下载">
  <meta name="robots" content="index, follow">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='24' font-size='24'>☁️</text></svg>">
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
  <style>
    :root{--bg:#f5f5f7;--card:#fff;--text:#111;--sub:#888;--border:#e5e5e5;--accent:#111;--accent-fg:#fff;--code-bg:#18181b;--code-text:#e4e4e7;--code-sub:#a1a1aa;--glow:rgba(0,0,0,0.08)}
    @media(prefers-color-scheme:dark){:root{--bg:#09090b;--card:#18181b;--text:#fafafa;--sub:#71717a;--border:#27272a;--accent:#fafafa;--accent-fg:#18181b;--code-bg:#09090b;--code-text:#d4d4d8;--code-sub:#71717a;--glow:rgba(255,255,255,0.06)}}
    *{margin:0;padding:0;box-sizing:border-box}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;transition:background .4s;padding:16px}

    .card{width:440px;max-width:100%;background:var(--card);border-radius:22px;padding:48px 36px 36px;box-shadow:0 2px 24px rgba(0,0,0,0.06);text-align:center;animation:pop .5s cubic-bezier(.34,1.56,.64,1);transition:background .4s}
    @keyframes pop{0%{opacity:0;transform:scale(.92) translateY(16px)}100%{opacity:1;transform:scale(1) translateY(0)}}

    /* File info */
    .file-info{margin-bottom:32px;animation:slideUp .5s cubic-bezier(.34,1.56,.64,1) .1s both}
    @keyframes slideUp{0%{opacity:0;transform:translateY(14px)}100%{opacity:1;transform:translateY(0)}}
    .file-icon{font-size:56px;margin-bottom:14px;display:inline-block;animation:bounce .6s cubic-bezier(.34,1.56,.64,1) .15s both}
    @keyframes bounce{0%{opacity:0;transform:scale(0) rotate(-12deg)}60%{transform:scale(1.1) rotate(3deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
    .file-name{font-size:19px;font-weight:700;color:var(--text);margin-bottom:4px;word-break:break-all;line-height:1.3}
    .file-size{font-size:14px;color:var(--sub)}

    /* Turnstile */
    .ts-section{margin:24px 0;animation:slideUp .5s cubic-bezier(.34,1.56,.64,1) .2s both}
    .ts-hint{font-size:13px;color:var(--sub);margin-bottom:14px}
    .ts-box{display:flex;justify-content:center;min-height:65px}

    /* Download button */
    .dl-section{display:none;margin:24px 0}
    .dl-section.show{display:block;animation:pop .5s cubic-bezier(.34,1.56,.64,1)}
    .dl-btn{display:inline-flex;align-items:center;gap:10px;padding:16px 44px;border:none;border-radius:14px;background:var(--accent);color:var(--accent-fg);font-size:17px;font-weight:700;cursor:pointer;transition:all .25s cubic-bezier(.34,1.56,.64,1);position:relative;overflow:hidden;letter-spacing:0.3px;max-width:100%}
    .dl-btn::after{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 50%,var(--glow),transparent 70%);animation:pulse 2s ease-in-out infinite;pointer-events:none}
    @keyframes pulse{0%,100%{opacity:0;transform:scale(0.8)}50%{opacity:1;transform:scale(1.4)}}
    .dl-btn:hover{transform:translateY(-3px) scale(1.04);box-shadow:0 8px 28px rgba(0,0,0,0.18)}
    .dl-btn:active{transform:scale(0.97)}
    .dl-btn.going{opacity:0.7;pointer-events:none}
    .dl-btn-s3{margin-top:8px;padding:12px 36px;font-size:15px;background:var(--sub);color:var(--bg);display:inline-flex;align-items:center;gap:8px;border:none;border-radius:12px;font-weight:700;cursor:pointer;transition:all .25s cubic-bezier(.34,1.56,.64,1);max-width:100%}
    .dl-btn-s3.hidden{display:none}
    .dl-btn-s3.going{opacity:0.7;pointer-events:none}

    /* More options toggle */
    .more-toggle{margin-top:20px;font-size:13px;color:var(--sub);cursor:pointer;transition:color .2s;user-select:none;display:inline-flex;align-items:center;gap:4px}
    .more-toggle:hover{color:var(--text)}
    .more-toggle .arrow{transition:transform .3s;display:inline-block}
    .more-toggle.open .arrow{transform:rotate(180deg)}

    /* curl section */
    .curl-wrap{max-height:0;overflow:hidden;transition:max-height .4s cubic-bezier(.34,1.56,.64,1),opacity .3s;opacity:0}
    .curl-wrap.open{max-height:400px;opacity:1}
    .curl-inner{padding-top:16px;text-align:left}
    .curl-title{font-size:12px;font-weight:600;color:var(--sub);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:10px}
    .curl-box{background:var(--code-bg);color:var(--code-text);padding:12px 36px 12px 14px;border-radius:10px;font-family:'SF Mono','Fira Code',Consolas,monospace;font-size:12px;margin-bottom:6px;position:relative;word-break:break-all;line-height:1.7;transition:background .3s;overflow-x:auto}
    .curl-box code{white-space:pre-wrap;word-break:break-all}
    .curl-box .lbl{color:var(--code-sub);font-size:11px;margin-bottom:2px;display:block}
    .cp{position:absolute;top:8px;right:8px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);color:var(--code-sub);padding:3px 10px;border-radius:6px;cursor:pointer;font-size:11px;transition:all .2s cubic-bezier(.34,1.56,.64,1);flex-shrink:0}
    .cp:hover{background:rgba(255,255,255,0.12);color:var(--code-text);transform:scale(1.05)}
    .cp:active{transform:scale(0.95)}

    /* Error */
    .error-icon{font-size:48px;margin-bottom:12px}
    .error-text{font-size:15px;color:var(--sub)}

    .foot{margin-top:28px;font-size:11px;color:var(--sub)}

    /* ── Tablet (≤600px) ── */
    @media(max-width:600px){.card{border-radius:16px;padding:40px 28px 32px}.dl-btn{padding:14px 32px;font-size:16px}.curl-box{font-size:11px;padding:10px 32px 10px 12px}}

    /* ── Phone (≤500px) ── */
    @media(max-width:500px){.card{border-radius:14px;padding:32px 16px 24px}.file-icon{font-size:44px}.file-name{font-size:17px}.dl-btn{padding:14px 24px;font-size:15px;width:100%;justify-content:center}.dl-btn-s3{width:100%;justify-content:center;padding:12px 20px;font-size:14px}.curl-box{font-size:10px;padding:8px 28px 8px 10px;border-radius:8px}.cp{padding:2px 8px;font-size:10px;top:6px;right:6px}.ts-section{transform:scale(0.9)}.more-toggle{font-size:12px}}
  </style>
</head>
<body>
  <div class="card" id="card">
    <!-- Loading -->
    <div id="loading">
      <div class="file-icon" style="animation:none;opacity:0.3">\u{1F4C4}</div>
      <div class="file-name" style="color:var(--sub)">加载中...</div>
    </div>

    <!-- File info (shown after load) -->
    <div id="file-info" class="file-info" style="display:none">
      <div class="file-icon" id="fi">\u{1F4C4}</div>
      <div class="file-name" id="fn"></div>
      <div class="file-size" id="fs"></div>
    </div>

    <!-- Turnstile -->
    <div id="ts-section" class="ts-section">
      <div class="ts-hint">完成验证后即可下载</div>
      <div class="ts-box">
        <div class="cf-turnstile" data-sitekey="${siteKey.replace(/"/g,'&quot;')}" data-callback="onVerified"></div>
      </div>
    </div>

    <!-- Download (hidden until verified) -->
    <div id="dl-section" class="dl-section">
      <button class="dl-btn" id="dl-btn" onclick="doDownload()">⬇️ 下载</button>
      <button class="dl-btn-s3 hidden" id="dl-btn-s3" onclick="doDownloadS3()">📦 S3 下载</button>
      <div class="more-toggle" id="more-toggle" onclick="toggleMore()"><span class="arrow">▼</span> 更多方式</div>
      <div class="curl-wrap" id="curl-wrap">
        <div class="curl-inner">
          <div class="curl-title">curl 命令 (R2)</div>
          <div class="curl-box"><button class="cp" onclick="cpCmd(this)">复制</button><span class="lbl">断点续传</span><code id="c1"></code></div>
          <div class="curl-box"><button class="cp" onclick="cpCmd(this)">复制</button><span class="lbl">8 线程并行 (aria2)</span><code id="c2"></code></div>
          <div id="curl-s3" style="display:none">
            <div class="curl-title" style="margin-top:12px">curl 命令 (S3)</div>
            <div class="curl-box"><button class="cp" onclick="cpCmd(this)">复制</button><span class="lbl">断点续传</span><code id="c3"></code></div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error -->
    <div id="error-view" style="display:none">
      <div class="error-icon">❌</div>
      <div class="error-text" id="error-text"></div>
    </div>

    <div class="foot">ioDrive · Cloudflare R2</div>
  </div>

  <script>
    function _js(s){return s.replace(/\\\\/g,'\\\\\\\\').replace(/'/g,"\\\\'").replace(/</g,'\\x3c')}
    var SHARE_TOKEN=_js('${token}');
    var r2Url='',s3Url='',dlName='',logKey='';

    // Load share info (NO URL exposed)
    async function load(){
      try{
        var r=await fetch('/api/share/info/'+SHARE_TOKEN);
        if(!r.ok){showError('链接不存在或已过期');return}
        var d=await r.json();
        dlName=d.name;
        document.getElementById('fn').textContent=d.name;
        document.getElementById('fs').textContent=fmt(d.size);
        var ext=d.name.split('.').pop().toLowerCase();
        var ic={pdf:'\u{1F4C4}',jpg:'\u{1F5BC}',jpeg:'\u{1F5BC}',png:'\u{1F5BC}',gif:'\u{1F5BC}',webp:'\u{1F5BC}',mp4:'\u{1F3AC}',mkv:'\u{1F3AC}',mp3:'\u{1F3B5}',wav:'\u{1F3B5}',zip:'\u{1F4E6}',rar:'\u{1F4E6}','7z':'\u{1F4E6}',exe:'⚙️'};
        document.getElementById('fi').textContent=ic[ext]||'\u{1F4C4}';
        document.getElementById('loading').style.display='none';
        document.getElementById('file-info').style.display='block';
      }catch(e){showError('加载失败，请重试')}
    }

    function showError(msg){
      document.getElementById('loading').style.display='none';
      document.getElementById('file-info').style.display='none';
      document.getElementById('ts-section').style.display='none';
      document.getElementById('error-text').textContent=msg;
      document.getElementById('error-view').style.display='block';
    }

    function fmt(b){if(!b)return'0 B';var u=['B','KB','MB','GB','TB'],i=0,s=b;while(s>=1024&&i<u.length-1){s/=1024;i++}return s.toFixed(i?1:0)+' '+u[i]}

    function fireBeacon(){
      if(logKey){
        try{navigator.sendBeacon('/api/download/beacon',JSON.stringify({logKey:logKey,event:'complete'}))}catch(e){}
      }
    }

    // Turnstile callback — verify server-side, get presigned URLs
    async function onVerified(tsResponse){
      document.getElementById('ts-section').style.display='none';
      try{
        var r=await fetch('/api/download/token',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({shareToken:SHARE_TOKEN,turnstile:tsResponse})});
        if(!r.ok){var d=await r.json();showError(d.error||'验证失败，请重试');return}
        var d=await r.json();
        r2Url=d.r2Url;s3Url=d.s3Url;logKey=d.logKey||'';
        document.getElementById('c1').textContent='curl -C - -o "'+dlName+'" "'+r2Url+'"';
        document.getElementById('c2').textContent='aria2c -x 8 -s 8 -o "'+dlName+'" "'+r2Url+'"';
        if(s3Url){
          document.getElementById('dl-btn-s3').classList.remove('hidden');
          document.getElementById('c3').textContent='curl -C - -o "'+dlName+'" "'+s3Url+'"';
          document.getElementById('curl-s3').style.display='block';
        }
        document.getElementById('dl-section').classList.add('show');
      }catch(e){showError('网络异常，请检查连接')}
    }

    function doDownload(){
      if(!r2Url)return;
      var btn=document.getElementById('dl-btn');
      btn.classList.add('going');btn.innerHTML='⏳ 正在打开…';
      var a=document.createElement('a');a.href=r2Url;a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
      fireBeacon();
      setTimeout(function(){btn.classList.remove('going');btn.innerHTML='⬇️ 下载'},2000);
    }

    function doDownloadS3(){
      if(!s3Url)return;
      var btn=document.getElementById('dl-btn-s3');
      btn.classList.add('going');btn.innerHTML='⏳ 正在打开…';
      var a=document.createElement('a');a.href=s3Url;a.target='_blank';a.rel='noopener';document.body.appendChild(a);a.click();a.remove();
      fireBeacon();
      setTimeout(function(){btn.classList.remove('going');btn.innerHTML='📦 S3 下载'},2000);
    }

    function toggleMore(){
      var t=document.getElementById('more-toggle'),w=document.getElementById('curl-wrap');
      t.classList.toggle('open');w.classList.toggle('open');
    }

    function cpCmd(btn){
      var code=btn.parentElement.querySelector('code');
      navigator.clipboard.writeText(code.textContent).then(function(){
        btn.textContent='✓';btn.style.transform='scale(1.15)';
        setTimeout(function(){btn.textContent='复制';btn.style.transform=''},1200);
      });
    }

    load();
  </script>
</body>
</html>`;
}
