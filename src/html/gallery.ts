export function renderGallery(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ioDrive 图库</title>
  <style>
    :root {
      --bg: #f5f5f7;
      --card: #fff;
      --text: #111;
      --sub: #888;
      --hover: rgba(0,0,0,0.05);
      --border: #e5e5e5;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #09090b;
        --card: #18181b;
        --text: #fafafa;
        --sub: #71717a;
        --hover: rgba(255,255,255,0.1);
        --border: #27272a;
      }
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: var(--bg); color: var(--text); padding: 40px 20px; }
    .header { max-width: 1200px; margin: 0 auto 30px; text-align: center; }
    .header h1 { font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { color: var(--sub); font-size: 14px; margin-top: 8px; }
    
    .gallery-container {
      max-width: 1200px;
      margin: 0 auto;
      column-count: 4;
      column-gap: 16px;
    }
    @media (max-width: 1024px) { .gallery-container { column-count: 3; } }
    @media (max-width: 768px) { .gallery-container { column-count: 2; } }
    @media (max-width: 480px) { .gallery-container { column-count: 1; } }

    .gallery-item {
      break-inside: avoid;
      margin-bottom: 16px;
      background: var(--card);
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid var(--border);
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
      position: relative;
    }
    .gallery-item:hover {
      transform: translateY(-4px);
      box-shadow: 0 10px 20px rgba(0,0,0,0.1);
    }
    .gallery-item img {
      width: 100%;
      display: block;
      object-fit: cover;
      background: var(--hover);
      min-height: 100px;
    }
    .gallery-item .info {
      padding: 12px;
      font-size: 13px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .gallery-item .name {
      color: var(--text);
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 70%;
    }
    .gallery-item .size {
      color: var(--sub);
      font-size: 12px;
    }

    /* Lightbox */
    .lightbox {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.9);
      display: none; align-items: center; justify-content: center;
      z-index: 1000;
      opacity: 0; transition: opacity 0.3s;
    }
    .lightbox.active { display: flex; opacity: 1; }
    .lightbox img { max-width: 90%; max-height: 90vh; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.5); }
    .lightbox-close { position: absolute; top: 20px; right: 20px; color: #fff; font-size: 30px; cursor: pointer; opacity: 0.7; }
    .lightbox-close:hover { opacity: 1; }
    
    .loading { text-align: center; color: var(--sub); padding: 40px; font-size: 14px; }
  </style>
</head>
<body>

  <div class="header">
    <h1>📷 公共图库</h1>
    <p>展示 /gallery 目录下的所有公开图片</p>
  </div>

  <div id="loading" class="loading">加载中...</div>
  <div id="gallery" class="gallery-container"></div>

  <div id="lightbox" class="lightbox">
    <div class="lightbox-close" onclick="closeLightbox()">&times;</div>
    <img id="lightbox-img" src="" alt="">
  </div>

  <script>
    function formatSize(bytes) {
      if (bytes === 0) return '0 B';
      const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function esc(value) {
      return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function openLightbox(url) {
      document.getElementById('lightbox-img').src = url;
      const lb = document.getElementById('lightbox');
      lb.style.display = 'flex';
      setTimeout(() => lb.classList.add('active'), 10);
    }
    function closeLightbox() {
      const lb = document.getElementById('lightbox');
      lb.classList.remove('active');
      setTimeout(() => {
        lb.style.display = 'none';
        document.getElementById('lightbox-img').src = '';
      }, 300);
    }

    async function loadGallery() {
      try {
        const res = await fetch('/api/gallery/list');
        const data = await res.json();
        
        document.getElementById('loading').style.display = 'none';
        const container = document.getElementById('gallery');
        
        if (!data.ok || !data.items || data.items.length === 0) {
          container.innerHTML = '<div style="text-align:center;color:var(--sub);grid-column:1/-1">空空如也~</div>';
          return;
        }

        let html = '';
        data.items.forEach(item => {
          html += '<div class="gallery-item" data-url="' + esc(item.url) + '" onclick="openLightbox(this.dataset.url)">' +
                  '<img src="' + esc(item.url) + '" loading="lazy" alt="' + esc(item.name) + '">' +
                  '<div class="info">' +
                  '<span class="name" title="' + esc(item.name) + '">' + esc(item.name) + '</span>' +
                  '<span class="size">' + formatSize(item.size) + '</span>' +
                  '</div></div>';
        });
        container.innerHTML = html;
      } catch (e) {
        document.getElementById('loading').innerText = '加载失败，请刷新重试';
      }
    }

    loadGallery();
  </script>
</body>
</html>`;
}
