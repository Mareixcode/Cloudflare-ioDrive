export function renderLogin(siteKey: string): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ioDrive - 登录</title>
  <meta name="description" content="ioDrive 高速云盘">
  <meta name="robots" content="index, follow">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'><text y='24' font-size='24'>☁️</text></svg>">
  <script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer></script>
  <style>
    :root{--bg:#f5f5f7;--card:#fff;--text:#111;--sub:#888;--border:#e5e5e5;--input-bg:#fafafa;--accent:#111;--accent-hover:#333;--err-bg:#fef2f2;--err-border:#fecaca;--err-text:#dc2626}
    @media(prefers-color-scheme:dark){:root{--bg:#0a0a0a;--card:#18181b;--text:#fafafa;--sub:#71717a;--border:#27272a;--input-bg:#27272a;--accent:#fafafa;--accent-hover:#d4d4d8;--err-bg:#2a1215;--err-border:#5c1a1a;--err-text:#f87171}}
    *{margin:0;padding:0;box-sizing:border-box}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--bg);font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;transition:background .4s;padding:16px}
    .card{width:380px;max-width:100%;background:var(--card);border-radius:20px;padding:48px 36px;box-shadow:0 2px 24px rgba(0,0,0,0.06);animation:pop .5s cubic-bezier(.34,1.56,.64,1);transition:background .4s,box-shadow .4s}
    @keyframes pop{0%{opacity:0;transform:scale(.92) translateY(16px)}100%{opacity:1;transform:scale(1) translateY(0)}}
    .logo-row{display:flex;align-items:center;gap:10px;margin-bottom:36px}
    .logo-row svg{width:32px;height:32px;transition:transform .3s cubic-bezier(.34,1.56,.64,1)}
    .logo-row:hover svg{transform:rotate(-8deg) scale(1.1)}
    .logo-row span{font-size:20px;font-weight:700;color:var(--text);letter-spacing:-0.3px}
    .card h1{font-size:22px;font-weight:700;color:var(--text);margin-bottom:4px}
    .card .sub{font-size:14px;color:var(--sub);margin-bottom:28px}
    .field{margin-bottom:18px}
    .field label{display:block;font-size:12px;font-weight:600;color:var(--sub);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.5px}
    .field input{width:100%;padding:11px 14px;border:1.5px solid var(--border);border-radius:10px;font-size:15px;color:var(--text);background:var(--input-bg);outline:none;transition:border .25s,background .25s,box-shadow .25s,transform .15s}
    .field input:focus{border-color:var(--accent);background:var(--card);box-shadow:0 0 0 3px rgba(100,100,100,0.1);transform:scale(1.01)}
    .field input::placeholder{color:var(--sub)}
    .cf-wrap{margin:20px 0;min-height:65px;display:flex;justify-content:center}
    .submit{width:100%;padding:13px;border:none;border-radius:10px;background:var(--accent);color:var(--bg);font-size:15px;font-weight:600;cursor:pointer;transition:opacity .2s,transform .15s,box-shadow .2s;margin-top:4px}
    .submit:hover:not(:disabled){opacity:0.85;transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,0.15)}
    .submit:active:not(:disabled){transform:scale(0.98)}
    .submit:disabled{opacity:0.35;cursor:not-allowed}
    .err{background:var(--err-bg);color:var(--err-text);padding:10px 14px;border-radius:8px;font-size:13px;margin-top:14px;display:none;border:1px solid var(--err-border);animation:shake .4s cubic-bezier(.36,.07,.19,.97)}
    @keyframes shake{10%,90%{transform:translateX(-1px)}20%,80%{transform:translateX(2px)}30%,50%,70%{transform:translateX(-3px)}40%,60%{transform:translateX(3px)}}

    /* ── Tablet (≤600px) ── */
    @media(max-width:600px){.card{border-radius:16px;padding:40px 28px}}

    /* ── Phone (≤440px) ── */
    @media(max-width:440px){body{padding:12px;align-items:flex-start;padding-top:10vh}.card{border-radius:14px;padding:28px 20px}.logo-row{margin-bottom:28px}.card h1{font-size:20px}.field input{padding:10px 12px;font-size:14px}.submit{padding:12px;font-size:14px}.cf-wrap{transform:scale(0.85);margin:16px -10px}}
  </style>
</head>
<body>
  <div class="card">
    <div class="logo-row">
      <svg viewBox="0 0 72 72" fill="none"><path d="M22 40c-4.4 0-8-3.6-8-8 0-3.7 2.5-6.8 6-7.7C21 18.5 26.8 14 34 14c6 0 11.2 3.8 13.2 9.2C51.5 23.6 55 27.5 55 32c0 4.4-3.6 8-8 8H22z" fill="var(--accent)"/><path d="M36 44v12M30 50l6 6 6-6" stroke="var(--accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span>ioDrive</span>
    </div>
    <h1>登录</h1>
    <p class="sub">输入账号和密码以继续</p>
    <div class="field"><label>用户名</label><input type="text" id="username" placeholder="admin" autocomplete="username"></div>
    <div class="field"><label>密码</label><input type="password" id="password" placeholder="密码" autocomplete="current-password"></div>
    <div class="cf-wrap"><div class="cf-turnstile" data-sitekey="${siteKey.replace(/"/g,'&quot;')}" data-callback="onTS"></div></div>
    <button class="submit" id="login-btn" disabled>登录</button>
    <div class="err" id="login-error"></div>
  </div>
  <script>
    let tsToken='';
    function onTS(t){tsToken=t;document.getElementById('login-btn').disabled=false}
    async function doLogin(){
      const u=document.getElementById('username').value,p=document.getElementById('password').value,e=document.getElementById('login-error'),b=document.getElementById('login-btn');
      if(!u||!p){e.textContent='请输入用户名和密码';e.style.display='block';return}
      if(!tsToken){e.textContent='请先完成验证';e.style.display='block';return}
      b.disabled=true;b.textContent='登录中…';e.style.display='none';
      try{const r=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p,turnstile:tsToken})});const d=await r.json();
      if(d.token){localStorage.setItem('iodrive_token',d.token);location.href='/dashboard'}else{e.textContent=d.error||'登录失败，请重试';e.style.display='block';b.disabled=false;b.textContent='登录'}}
      catch(x){e.textContent='网络异常，请检查连接';e.style.display='block';b.disabled=false;b.textContent='登录'}
    }
    document.getElementById('login-btn').onclick=doLogin;
    document.getElementById('password').onkeydown=function(e){if(e.key==='Enter')doLogin()};
    document.getElementById('username').onkeydown=function(e){if(e.key==='Enter')document.getElementById('password').focus()};
  </script>
</body>
</html>`;
}
