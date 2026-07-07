export function renderImgbed(siteKey: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ioDrive 图床 - 免费图片托管</title>
  <meta name="description" content="ioDrive 图床 - 免费上传图片，即时获取外链，支持 Markdown/HTML/BBCode 格式">
  <meta name="robots" content="index, follow">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='24' font-size='24'>🖼️</text></svg>">
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
  <style>
    :root{--bg:#f5f5f7;--card:#fff;--text:#111;--sub:#888;--border:#e5e5e5;--accent:#111;--accent-fg:#fff;--glow:rgba(0,0,0,0.08);--success:#22c55e;--danger:#ef4444}
    @media(prefers-color-scheme:dark){:root{--bg:#09090b;--card:#18181b;--text:#fafafa;--sub:#71717a;--border:#27272a;--accent:#fafafa;--accent-fg:#18181b;--glow:rgba(255,255,255,0.06);--success:#4ade80;--danger:#f87171}}
    *{margin:0;padding:0;box-sizing:border-box}
    body{min-height:100vh;background:var(--bg);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:var(--text);transition:background .4s,color .4s}
    .container{max-width:720px;margin:0 auto;padding:40px 20px 60px}
    @media(max-width:500px){.container{padding:24px 16px 40px}}

    /* Header */
    .header{text-align:center;margin-bottom:36px;animation:fadeDown .5s cubic-bezier(.34,1.56,.64,1)}
    @keyframes fadeDown{0%{opacity:0;transform:translateY(-16px)}100%{opacity:1;transform:translateY(0)}}
    .header .logo{font-size:42px;margin-bottom:8px}
    .header h1{font-size:24px;font-weight:700;letter-spacing:-0.5px}
    .header .subtitle{font-size:14px;color:var(--sub);margin-top:6px}
    .header .back{display:inline-block;margin-top:12px;font-size:13px;color:var(--sub);text-decoration:none;transition:color .2s}
    .header .back:hover{color:var(--text)}

    /* Turnstile */
    .ts-section{text-align:center;margin-bottom:28px;animation:fadeIn .5s .1s both}
    @keyframes fadeIn{0%{opacity:0}100%{opacity:1}}
    .ts-hint{font-size:13px;color:var(--sub);margin-bottom:14px}
    .ts-box{display:flex;justify-content:center;min-height:65px}

    /* Upload zone */
    .upload-zone{border:2px dashed var(--border);border-radius:14px;padding:48px 20px;text-align:center;cursor:pointer;transition:all .3s cubic-bezier(.34,1.56,.64,1);color:var(--sub);font-size:14px;margin-bottom:28px;animation:pop .5s .2s cubic-bezier(.34,1.56,.64,1) both;position:relative}
    @keyframes pop{0%{opacity:0;transform:scale(.92) translateY(12px)}100%{opacity:1;transform:scale(1) translateY(0)}}
    .upload-zone:hover,.upload-zone.dragover{border-color:var(--accent);background:var(--glow);transform:scale(1.01)}
    .upload-zone .uz-icon{font-size:42px;margin-bottom:10px;transition:transform .3s}
    .upload-zone:hover .uz-icon{transform:scale(1.1) rotate(-5deg)}
    .upload-zone .uz-text{font-size:15px;font-weight:500;color:var(--text)}
    .upload-zone .uz-sub{font-size:12px;color:var(--sub);margin-top:6px}
    .upload-zone.uploading{pointer-events:none;opacity:.7}

    /* Progress */
    .progress-bar{height:4px;background:var(--border);border-radius:2px;overflow:hidden;margin:8px 0}
    .progress-bar .fill{height:100%;background:var(--accent);border-radius:2px;transition:width .2s;width:0}
    .progress-status{font-size:12px;color:var(--sub);text-align:center}

    /* Results */
    .results{display:flex;flex-direction:column;gap:12px}
    .result-card{background:var(--card);border:1px solid var(--border);border-radius:12px;padding:16px;display:flex;gap:14px;animation:slideUp .35s cubic-bezier(.34,1.56,.64,1) both;transition:transform .2s,box-shadow .2s}
    .result-card:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,0.08)}
    @keyframes slideUp{0%{opacity:0;transform:translateY(16px)}100%{opacity:1;transform:translateY(0)}}
    .result-thumb{width:80px;height:80px;border-radius:8px;object-fit:cover;background:var(--glow);flex-shrink:0;cursor:pointer;transition:transform .2s}
    .result-thumb:hover{transform:scale(1.05)}
    .result-info{flex:1;min-width:0;display:flex;flex-direction:column;gap:6px}
    .result-name{font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .result-meta{font-size:12px;color:var(--sub)}
    .result-url-row{display:flex;gap:6px;align-items:center}
    .result-url{flex:1;padding:7px 10px;border:1.5px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg);color:var(--text);outline:none;font-family:monospace;min-width:0;cursor:text}
    .result-url:focus{border-color:var(--accent)}
    .copy-btn{padding:7px 14px;border:none;border-radius:8px;background:var(--accent);color:var(--accent-fg);font-size:12px;font-weight:600;cursor:pointer;transition:all .2s;white-space:nowrap;flex-shrink:0}
    .copy-btn:hover{opacity:.85;transform:scale(1.03)}
    .copy-btn.copied{background:var(--success);color:#fff}
    .format-btns{display:flex;gap:4px;flex-wrap:wrap}
    .fmt-btn{padding:4px 10px;border:1.5px solid var(--border);border-radius:6px;background:transparent;color:var(--sub);font-size:11px;font-weight:600;cursor:pointer;transition:all .2s}
    .fmt-btn:hover{border-color:var(--accent);color:var(--text)}
    .fmt-btn.active{background:var(--accent);color:var(--accent-fg);border-color:var(--accent)}

    /* Delete button */
    .del-btn{background:none;border:none;color:var(--sub);font-size:14px;cursor:pointer;padding:4px;border-radius:4px;transition:all .2s;flex-shrink:0;align-self:flex-start}
    .del-btn:hover{color:var(--danger);background:rgba(239,68,68,0.1)}

    /* Lightbox */
    .lightbox{position:fixed;inset:0;background:rgba(0,0,0,0.9);display:none;align-items:center;justify-content:center;z-index:1000;opacity:0;transition:opacity .3s}
    .lightbox.active{display:flex;opacity:1}
    .lightbox img{max-width:90%;max-height:90vh;border-radius:8px;box-shadow:0 4px 24px rgba(0,0,0,0.5)}
    .lightbox-close{position:absolute;top:20px;right:20px;color:#fff;font-size:30px;cursor:pointer;opacity:.7;background:none;border:none}
    .lightbox-close:hover{opacity:1}

    /* Empty state */
    .empty{text-align:center;padding:40px 20px;color:var(--sub)}
    .empty .icon{font-size:48px;margin-bottom:12px}

    /* Section title */
    .section-title{font-size:14px;font-weight:600;color:var(--sub);margin-bottom:12px;text-transform:uppercase;letter-spacing:.5px}

    @media(max-width:500px){
      .result-card{flex-direction:column;align-items:center;text-align:center}
      .result-thumb{width:120px;height:80px}
      .result-url-row{flex-direction:column}
      .format-btns{justify-content:center}
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🖼️</div>
      <h1>ioDrive 图床</h1>
      <div class="subtitle">免费图片托管 · 上传即获取外链</div>
      <a class="back" href="/">← 返回首页</a>
    </div>

    <div class="ts-section" id="ts-section">
      <div class="ts-hint">完成人机验证后开始上传</div>
      <div class="ts-box">
        <div class="cf-turnstile" data-sitekey="${siteKey.replace(/"/g, '&quot;')}" data-callback="onTS"></div>
      </div>
    </div>

    <div id="upload-area" style="display:none">
      <div class="upload-zone" id="upload-zone">
        <div class="uz-icon">📁</div>
        <div class="uz-text">点击选择或拖拽图片到此处</div>
        <div class="uz-sub">支持 JPG / PNG / GIF / WebP / SVG · 最大 10MB</div>
      </div>
      <div id="upload-progress" style="display:none">
        <div class="progress-bar"><div class="fill" id="progress-fill"></div></div>
        <div class="progress-status" id="progress-status">准备中...</div>
      </div>
    </div>

    <div id="results-section" style="display:none">
      <div class="section-title">📋 上传结果</div>
      <div class="results" id="results"></div>
    </div>
  </div>

  <!-- Lightbox -->
  <div id="lightbox" class="lightbox">
    <button class="lightbox-close" onclick="closeLightbox()">&times;</button>
    <img id="lightbox-img" src="" alt="">
  </div>

  <input type="file" id="file-input" multiple accept="image/*" style="display:none">

  <script>
    var tsToken = '';
    var uploadedItems = [];

    function onTS(t) {
      tsToken = t;
      document.getElementById('upload-area').style.display = '';
      document.getElementById('ts-section').style.display = 'none';
    }

    function fmt(b) {
      if (!b) return '0 B';
      var u = ['B', 'KB', 'MB', 'GB'], i = 0, s = b;
      while (s >= 1024 && i < u.length - 1) { s /= 1024; i++; }
      return s.toFixed(i ? 1 : 0) + ' ' + u[i];
    }
    function fmtS(b) { return fmt(b) + '/s'; }
    function fmtE(s) { if (!s || !isFinite(s)) return ''; if (s < 60) return Math.ceil(s) + 's'; if (s < 3600) return Math.ceil(s / 60) + 'm'; return (s / 3600).toFixed(1) + 'h'; }
    function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

    // Upload zone
    var zone = document.getElementById('upload-zone');
    var fileInput = document.getElementById('file-input');
    zone.onclick = function() { fileInput.click(); };
    fileInput.onchange = function() { if (fileInput.files.length) uploadFiles(fileInput.files); fileInput.value = ''; };
    zone.ondragover = function(e) { e.preventDefault(); zone.classList.add('dragover'); };
    zone.ondragleave = function() { zone.classList.remove('dragover'); };
    zone.ondrop = function(e) { e.preventDefault(); zone.classList.remove('dragover'); if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files); };

    async function uploadFiles(fileList) {
      var files = [];
      for (var i = 0; i < fileList.length; i++) {
        var f = fileList[i];
        if (!f.type.startsWith('image/')) { alert(f.name + ' 不是图片文件'); continue; }
        if (f.size > 10 * 1024 * 1024) { alert(f.name + ' 超过 10MB 限制'); continue; }
        files.push(f);
      }
      if (!files.length) return;

      zone.classList.add('uploading');
      var progWrap = document.getElementById('upload-progress');
      progWrap.style.display = '';

      for (var i = 0; i < files.length; i++) {
        document.getElementById('progress-status').textContent = '上传中 (' + (i + 1) + '/' + files.length + ') ' + files[i].name;
        document.getElementById('progress-fill').style.width = '0%';
        try {
          var result = await uploadSingle(files[i]);
          if (result && result.ok) {
            uploadedItems.unshift({ url: result.url, key: result.key, name: result.name || files[i].name, size: files[i].size });
          }
        } catch (e) {
          alert('上传 ' + files[i].name + ' 失败: ' + (e.message || e));
        }
      }

      progWrap.style.display = 'none';
      zone.classList.remove('uploading');
      renderResults();
    }

    function uploadSingle(file) {
      return new Promise(function(resolve, reject) {
        var fd = new FormData();
        fd.append('file', file);
        fd.append('turnstile', tsToken);
        var x = new XMLHttpRequest();
        var t0 = Date.now();
        x.open('POST', '/api/imgbed/upload');
        x.upload.onprogress = function(e) {
          if (e.lengthComputable) {
            var pct = Math.round(e.loaded / e.total * 100);
            var el = (Date.now() - t0) / 1000;
            var sp = el > 0 ? e.loaded / el : 0;
            var rm = sp > 0 ? (e.total - e.loaded) / sp : 0;
            document.getElementById('progress-fill').style.width = pct + '%';
            document.getElementById('progress-status').textContent = pct + '% · ' + fmtS(sp) + ' · 剩余 ' + fmtE(rm);
          }
        };
        x.onload = function() {
          if (x.status >= 200 && x.status < 300) {
            try { resolve(JSON.parse(x.responseText)); } catch { resolve(null); }
          } else {
            try { reject(new Error(JSON.parse(x.responseText).error || '上传失败')); } catch { reject(new Error('上传失败 ' + x.status)); }
          }
        };
        x.onerror = function() { reject(new Error('网络异常')); };
        x.send(fd);
      });
    }

    function getLink(item, format) {
      if (format === 'markdown') return '![' + item.name + '](' + item.url + ')';
      if (format === 'html') return '<img src="' + item.url + '" alt="' + esc(item.name) + '" />';
      if (format === 'bbcode') return '[img]' + item.url + '[/img]';
      return item.url;
    }

    function renderResults() {
      var section = document.getElementById('results-section');
      var container = document.getElementById('results');
      if (!uploadedItems.length) { section.style.display = 'none'; return; }
      section.style.display = '';

      var html = '';
      for (var i = 0; i < uploadedItems.length; i++) {
        var item = uploadedItems[i];
        var idx = i;
        html += '<div class="result-card" style="animation-delay:' + Math.min(i * 50, 300) + 'ms">' +
          '<img class="result-thumb" src="' + esc(item.url) + '" alt="' + esc(item.name) + '" onclick="openLightbox(\\'' + esc(item.url).replace(/'/g, "\\\\'") + '\\')" loading="lazy">' +
          '<div class="result-info">' +
            '<div class="result-name" title="' + esc(item.name) + '">' + esc(item.name) + '</div>' +
            '<div class="result-meta">' + fmt(item.size) + '</div>' +
            '<div class="format-btns">' +
              '<button class="fmt-btn active" data-idx="' + idx + '" data-fmt="direct" onclick="switchFmt(this)">直链</button>' +
              '<button class="fmt-btn" data-idx="' + idx + '" data-fmt="markdown" onclick="switchFmt(this)">Markdown</button>' +
              '<button class="fmt-btn" data-idx="' + idx + '" data-fmt="html" onclick="switchFmt(this)">HTML</button>' +
              '<button class="fmt-btn" data-idx="' + idx + '" data-fmt="bbcode" onclick="switchFmt(this)">BBCode</button>' +
            '</div>' +
            '<div class="result-url-row">' +
              '<input class="result-url" id="url-' + idx + '" readonly value="' + esc(item.url) + '" onclick="this.select()">' +
              '<button class="copy-btn" id="copy-' + idx + '" onclick="copyUrl(' + idx + ')">复制</button>' +
            '</div>' +
          '</div>' +
          '<button class="del-btn" onclick="removeItem(' + idx + ')" title="移除">✕</button>' +
        '</div>';
      }
      container.innerHTML = html;
    }

    function switchFmt(btn) {
      var idx = parseInt(btn.dataset.idx);
      var format = btn.dataset.fmt;
      var item = uploadedItems[idx];
      if (!item) return;

      // Update active state
      var siblings = btn.parentElement.querySelectorAll('.fmt-btn');
      for (var i = 0; i < siblings.length; i++) siblings[i].classList.remove('active');
      btn.classList.add('active');

      // Update URL input
      var input = document.getElementById('url-' + idx);
      if (input) input.value = getLink(item, format);
    }

    function copyUrl(idx) {
      var input = document.getElementById('url-' + idx);
      var btn = document.getElementById('copy-' + idx);
      if (!input || !btn) return;
      var text = input.value;
      navigator.clipboard.writeText(text).then(function() {
        btn.textContent = '已复制';
        btn.classList.add('copied');
        setTimeout(function() { btn.textContent = '复制'; btn.classList.remove('copied'); }, 1500);
      }).catch(function() {
        input.select();
        document.execCommand('copy');
        btn.textContent = '已复制';
        setTimeout(function() { btn.textContent = '复制'; }, 1500);
      });
    }

    function removeItem(idx) {
      uploadedItems.splice(idx, 1);
      renderResults();
    }

    // Lightbox
    function openLightbox(url) {
      document.getElementById('lightbox-img').src = url;
      var lb = document.getElementById('lightbox');
      lb.style.display = 'flex';
      setTimeout(function() { lb.classList.add('active'); }, 10);
    }
    function closeLightbox() {
      var lb = document.getElementById('lightbox');
      lb.classList.remove('active');
      setTimeout(function() { lb.style.display = 'none'; document.getElementById('lightbox-img').src = ''; }, 300);
    }
    document.getElementById('lightbox').onclick = function(e) { if (e.target === this) closeLightbox(); };
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeLightbox(); });
  </script>
</body>
</html>`;
}
