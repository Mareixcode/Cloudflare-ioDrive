export function renderUploadKeyPage(keyId: string, siteKey: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ioDrive - 上传文件</title>
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='24' font-size='24'>☁️</text></svg>">
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
  <style>
    :root{--bg:#f5f5f7;--card:#fff;--text:#111;--sub:#888;--border:#e5e5e5;--accent:#111;--accent-fg:#fff;--glow:rgba(0,0,0,0.08)}
    @media(prefers-color-scheme:dark){:root{--bg:#09090b;--card:#18181b;--text:#fafafa;--sub:#71717a;--border:#27272a;--accent:#fafafa;--accent-fg:#18181b;--glow:rgba(255,255,255,0.06)}}
    *{margin:0;padding:0;box-sizing:border-box}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;transition:background .4s;padding:16px}
    .card{width:480px;max-width:100%;background:var(--card);border-radius:22px;padding:48px 36px 36px;box-shadow:0 2px 24px rgba(0,0,0,0.06);text-align:center;animation:pop .5s cubic-bezier(.34,1.56,.64,1);transition:background .4s}
    @keyframes pop{0%{opacity:0;transform:scale(.92) translateY(16px)}100%{opacity:1;transform:scale(1) translateY(0)}}
    .file-icon{font-size:56px;margin-bottom:14px}
    .title{font-size:19px;font-weight:700;color:var(--text);margin-bottom:4px}
    .sub{font-size:14px;color:var(--sub);margin-bottom:24px}
    .ts-section{margin:20px 0}.ts-hint{font-size:13px;color:var(--sub);margin-bottom:14px}
    .ts-box{display:flex;justify-content:center;min-height:65px}
    .drop-zone{border:2px dashed var(--border);border-radius:14px;padding:40px 20px;margin:20px 0;cursor:pointer;transition:all .25s;color:var(--sub);font-size:14px}
    .drop-zone:hover,.drop-zone.dragover{border-color:var(--accent);background:var(--glow)}
    .drop-zone .icon{font-size:36px;margin-bottom:8px}
    .file-list{text-align:left;margin:16px 0;max-height:200px;overflow-y:auto}
    .file-item{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border:1px solid var(--border);border-radius:10px;margin-bottom:8px;font-size:13px}
    .file-item .name{font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:60%}
    .file-item .size{color:var(--sub);font-size:12px}
    .file-item .remove{background:none;border:none;cursor:pointer;color:var(--sub);font-size:16px;padding:2px 6px;border-radius:4px}
    .file-item .remove:hover{color:#ef4444;background:rgba(239,68,68,0.1)}
    .upload-btn{width:100%;padding:14px;border:none;border-radius:12px;background:var(--accent);color:var(--accent-fg);font-size:16px;font-weight:700;cursor:pointer;transition:all .25s;margin-top:12px}
    .upload-btn:hover:not(:disabled){opacity:0.85;transform:translateY(-1px)}
    .upload-btn:disabled{opacity:0.35;cursor:not-allowed}
    .upload-btn.going{opacity:0.7;pointer-events:none}
    .progress-wrap{margin:16px 0;text-align:left}
    .progress-item{margin-bottom:12px}
    .progress-item .pi-name{font-size:13px;font-weight:500;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .progress-bar{height:4px;background:var(--border);border-radius:2px;overflow:hidden}
    .progress-bar .fill{height:100%;background:var(--accent);border-radius:2px;transition:width .2s}
    .progress-item .pi-status{font-size:11px;color:var(--sub);margin-top:4px}
    .done{text-align:center;padding:20px 0}
    .done .icon{font-size:48px;margin-bottom:12px}
    .done .msg{font-size:15px;color:var(--text);font-weight:600}
    .done .sub2{font-size:13px;color:var(--sub);margin-top:4px}
    .error-icon{font-size:48px;margin-bottom:12px}
    .error-text{font-size:15px;color:var(--sub)}
    .foot{margin-top:28px;font-size:11px;color:var(--sub)}
    @media(max-width:500px){.card{border-radius:14px;padding:32px 16px 24px}.title{font-size:17px}.drop-zone{padding:30px 16px}}
  </style>
</head>
<body>
  <div class="card" id="card">
    <div id="loading"><div class="file-icon" style="opacity:0.3">📄</div><div class="title" style="color:var(--sub)">正在验证…</div></div>
    <div id="upload-view" style="display:none">
      <div class="file-icon">📤</div>
      <div class="title" id="key-label"></div>
      <div class="sub">选择要上传的文件</div>
      <div class="ts-section"><div class="ts-hint">完成验证后开始上传</div><div class="ts-box"><div class="cf-turnstile" data-sitekey="${siteKey}" data-callback="onTS"></div></div></div>
      <div id="file-area" style="display:none">
        <div class="drop-zone" id="drop-zone"><div class="icon">📁</div>点击选择或拖拽文件到此处</div>
        <div class="file-list" id="file-list"></div>
        <button class="upload-btn" id="upload-btn" disabled onclick="startUpload()">上传</button>
      </div>
      <div class="progress-wrap" id="progress-wrap" style="display:none"></div>
      <div class="done" id="done-view" style="display:none"><div class="icon">✅</div><div class="msg">上传完成</div><div class="sub2" id="done-count"></div></div>
    </div>
    <div id="error-view" style="display:none"><div class="error-icon">❌</div><div class="error-text" id="error-text"></div></div>
    <div class="foot">ioDrive</div>
  </div>
  <input type="file" id="file-input" multiple style="display:none">
  <script>
    var KEY_ID='${keyId}';
    var tsToken='',uploadPath='uploads/',selectedFiles=[];
    var PS=20*1024*1024,MC=6;

    function onTS(t){tsToken=t;document.getElementById('upload-btn').disabled=selectedFiles.length===0?true:false;document.getElementById('file-area').style.display=''}
    function fmt(b){if(!b)return'0 B';var u=['B','KB','MB','GB','TB'],i=0,s=b;while(s>=1024&&i<u.length-1){s/=1024;i++}return s.toFixed(i?1:0)+' '+u[i]}
    function fmtS(b){return fmt(b)+'/s'}
    function fmtE(s){if(!s||!isFinite(s))return'';if(s<60)return Math.ceil(s)+'s';if(s<3600)return Math.ceil(s/60)+'m';return(s/3600).toFixed(1)+'h'}

    async function init(){
      try{
        var r=await fetch('/api/upload-keys/validate/'+KEY_ID);
        if(!r.ok){showError('链接不存在');return}
        var d=await r.json();
        if(!d.valid){showError(d.error||'链接无效');return}
        uploadPath=d.path||'uploads/';
        document.getElementById('key-label').textContent=d.label||'上传文件';
        document.getElementById('loading').style.display='none';
        document.getElementById('upload-view').style.display='block';
      }catch(e){showError('验证失败，请重试')}
    }
    function showError(msg){
      document.getElementById('loading').style.display='none';
      document.getElementById('upload-view').style.display='none';
      document.getElementById('error-text').textContent=msg;
      document.getElementById('error-view').style.display='block';
    }

    // File selection
    var fileInput=document.getElementById('file-input');
    var dropZone=document.getElementById('drop-zone');
    dropZone.onclick=function(){fileInput.click()};
    fileInput.onchange=function(){addFiles(fileInput.files)};
    dropZone.ondragover=function(e){e.preventDefault();dropZone.classList.add('dragover')};
    dropZone.ondragleave=function(){dropZone.classList.remove('dragover')};
    dropZone.ondrop=function(e){e.preventDefault();dropZone.classList.remove('dragover');addFiles(e.dataTransfer.files)};
    function addFiles(fl){
      for(var i=0;i<fl.length;i++)selectedFiles.push(fl[i]);
      renderFiles();
      if(tsToken)document.getElementById('upload-btn').disabled=selectedFiles.length===0;
    }
    function removeFile(i){selectedFiles.splice(i,1);renderFiles();if(tsToken)document.getElementById('upload-btn').disabled=selectedFiles.length===0}
    function renderFiles(){
      var el=document.getElementById('file-list');
      if(!selectedFiles.length){el.innerHTML='';document.getElementById('file-area').style.display='';return}
      document.getElementById('file-area').style.display='';
      var h='';
      for(var i=0;i<selectedFiles.length;i++){
        var f=selectedFiles[i];
        h+='<div class="file-item"><span class="name">'+esc(f.name)+'</span><span class="size">'+fmt(f.size)+'</span><button class="remove" onclick="removeFile('+i+')">✕</button></div>';
      }
      el.innerHTML=h;
    }
    function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}

    async function startUpload(){
      if(!tsToken||!selectedFiles.length)return;
      document.getElementById('upload-btn').classList.add('going');
      document.getElementById('upload-btn').textContent='上传中…';
      document.getElementById('progress-wrap').style.display='';
      var pw=document.getElementById('progress-wrap');
      pw.innerHTML='';
      for(var i=0;i<selectedFiles.length;i++){
        pw.innerHTML+='<div class="progress-item" id="pi'+i+'"><div class="pi-name">'+esc(selectedFiles[i].name)+' ('+fmt(selectedFiles[i].size)+')</div><div class="progress-bar"><div class="fill" style="width:0%"></div></div><div class="pi-status">准备...</div></div>';
      }
      var ok=0,fail=0;
      for(var i=0;i<selectedFiles.length;i++){
        try{
          if(selectedFiles[i].size<=PS)await upSingle(selectedFiles[i],i);
          else await upMulti(selectedFiles[i],i);
          piStatus(i,'✅ 完成');ok++;
        }catch(e){piStatus(i,'❌ '+e.message);fail++}
      }
      document.getElementById('progress-wrap').style.display='none';
      document.getElementById('done-view').style.display='';
      document.getElementById('done-count').textContent='成功 '+ok+' 个'+(fail?'，失败 '+fail+' 个':'');
    }
    function piProg(i,p){var f=document.querySelector('#pi'+i+' .fill');if(f)f.style.width=p+'%'}
    function piStatus(i,t){var e=document.querySelector('#pi'+i+' .st');if(e)e.textContent=t}

    function xhrUp(url,fd,idx){
      return new Promise(function(ok,no){
        var x=new XMLHttpRequest(),t0=Date.now();
        x.open('POST',url);
        x.upload.onprogress=function(e){
          if(e.lengthComputable){
            var el=(Date.now()-t0)/1000,sp=el>0?e.loaded/el:0,pct=Math.round(e.loaded/e.total*100),rm=sp>0?(e.total-e.loaded)/sp:0;
            piProg(idx,pct);piStatus(idx,fmtS(sp)+' · '+pct+'% · 剩余 '+fmtE(rm));
          }
        };
        x.onload=function(){
          if(x.status>=200&&x.status<300){try{ok(JSON.parse(x.responseText))}catch{ok(x.responseText)}}
          else{try{no(new Error(JSON.parse(x.responseText).error))}catch{no(new Error('上传失败 '+x.status))}}
        };
        x.onerror=function(){no(new Error('网络异常'))};
        x.send(fd);
      });
    }

    async function upSingle(f,idx){
      var fd=new FormData();fd.append('file',f);fd.append('path',uploadPath);fd.append('turnstile',tsToken);fd.append('uploadKeyId',KEY_ID);
      await xhrUp('/api/upload-public/single',fd,idx);
    }

    async function upMulti(f,idx){
      var r=await fetch('/api/upload-public/init',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({filename:f.name,size:f.size,path:uploadPath,turnstile:tsToken,uploadKeyId:KEY_ID})});
      if(!r.ok)throw new Error('无法开始上传');
      var d=await r.json(),uid=d.uploadId,key=d.key;
      var tp=Math.ceil(f.size/PS),parts=[],pp=new Array(tp).fill(0),t0=Date.now(),q=[];
      for(var i=0;i<tp;i++){
        (function(pi,pn){
          var s=pi*PS,e=Math.min(s+PS,f.size),ch=f.slice(s,e);
          q.push(function(){
            return new Promise(function(ok,no){
              var fd=new FormData();fd.append('uploadId',uid);fd.append('key',key);fd.append('partNumber',String(pn));fd.append('chunk',ch);
              var x=new XMLHttpRequest();x.open('POST','/api/upload-public/part');
              x.upload.onprogress=function(ev){
                if(ev.lengthComputable){
                  pp[pi]=ev.loaded;var td=0;for(var j=0;j<pp.length;j++)td+=pp[j];
                  var el=(Date.now()-t0)/1000,sp=el>0?td/el:0,pct=Math.round(td/f.size*100),rm=sp>0?(f.size-td)/sp:0;
                  piProg(idx,pct);piStatus(idx,fmtS(sp)+' · '+pct+'% (分片 '+pn+'/'+tp+') · '+fmtE(rm));
                }
              };
              x.onload=function(){if(x.status>=200&&x.status<300){parts.push({partNumber:pn,etag:JSON.parse(x.responseText).etag});ok()}else{no(new Error('分片 '+pn+' 上传失败'))}};
              x.onerror=function(){no(new Error('网络异常'))};
              x.send(fd);
            });
          });
        })(i,i+1);
      }
      await conc(q,MC);
      parts.sort(function(a,b){return a.partNumber-b.partNumber});
      var cr=await fetch('/api/upload-public/complete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({uploadId:uid,key:key,parts:parts})});
      if(!cr.ok)throw new Error('上传完成失败');
    }

    async function conc(ts,lim){
      var ex=new Set();
      for(var i=0;i<ts.length;i++){var p=ts[i]().then(function(){ex.delete(p)});ex.add(p);if(ex.size>=lim)await Promise.race(ex)}
      await Promise.all(ex);
    }

    init();
  </script>
</body>
</html>`;
}
