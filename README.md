# ioDrive

<p align="center">
  <img src="./docs/images/logo/logo.svg" width="120" alt="ioDrive Logo">
</p>

<h3 align="center">
  轻量级 Cloudflare 文件分享系统
</h3>

<div align="center">
  <a href="https://demo.iodevo.com">演示站</a>
</div>

<p align="center">
  基于 Cloudflare Workers + Hono + R2 构建的高性能文件管理与分享平台
</p>

<p align="center">

![License](https://img.shields.io/github/license/Mareixcode/Cloudflare-ioDrive?style=for-the-badge)
![Stars](https://img.shields.io/github/stars/Mareixcode/Cloudflare-ioDrive?style=for-the-badge)
![Forks](https://img.shields.io/github/forks/Mareixcode/Cloudflare-ioDrive?style=for-the-badge)
![Issues](https://img.shields.io/github/issues/Mareixcode/Cloudflare-ioDrive?style=for-the-badge)

</p>

<p align="center">

<a href="#-写在前面">背景</a> ·
<a href="#-项目截图">截图</a> ·
<a href="#-功能特性">功能</a> ·
<a href="#-架构设计">架构</a> ·
<a href="#-快速开始">快速开始</a> ·
<a href="#-配置说明">配置</a> ·
<a href="#-api-文档">API</a> ·
<a href="#-部署指南">部署</a> ·
<a href="#-roadmap">Roadmap</a>

</p>

<p align="center">

**中文** | [English](./docs/README_EN.md) | [日本語](./docs/README_JA.md)

</p>

---

## 👋 写在前面

一直苦恼于找不到一个合适的网盘可供多人免登录下载上传，市面上的网盘基本都需要登录才能下载，还有严格的限速，而且没有发现一个很好的文件收集系统，因此诞生了这个项目。

ioDrive 是一个完全运行在 Cloudflare 边缘网络上的轻量级文件管理系统。你只需要一个 Cloudflare 账号，即可在几分钟内部署属于自己的文件分享平台——无需服务器、无需数据库、无需运维。

### 为什么选择 ioDrive？

- **零服务器成本**：全部运行在 Cloudflare Workers 免费额度内（每日 10 万次请求）
- **无限存储潜力**：基于 R2 对象存储，零出口流量费
- **极速访问**：Cloudflare 全球 330+ 数节点，用户可就近下载
- **开箱即用**：一条命令部署，无需配置数据库或服务器
- **安全可靠**：JWT 认证 + Turnstile 人机验证，防滥用防攻击

---

## 📸 项目截图

### 管理后台

<img src="./docs/images/screenshots/dashboard.jpg" width="100%" alt="管理后台">

### 文件上传

<img src="./docs/images/screenshots/upload.png" width="100%" alt="文件上传">
<img src="./docs/images/screenshots/upload-link-1.png" width="100%" alt="上传链接管理">

### 分享页面

<img src="./docs/images/screenshots/share-link-1.png" width="100%" alt="分享页面-桌面端">
<img src="./docs/images/screenshots/share-link-2.png" width="100%" alt="分享页面-命令下载">
<img src="./docs/images/screenshots/share.png" width="100%" alt="分享页面">
<img src="./docs/images/screenshots/share-1.png" width="100%" alt="分享页面-移动端">

---

## ✨ 功能特性

### 📁 文件管理

- **文件夹操作**：创建、浏览、面包屑导航
- **文件上传**：支持拖拽上传、点击上传，单文件与分片上传（>20MB 自动分片）
- **文件移动**：可视化的文件夹选择器，支持跨目录移动
- **批量操作**：多选文件后批量删除、批量分享、批量移动
- **文件搜索**：在当前目录下按文件名实时搜索
- **并发上传**：分片上传支持最多 6 个并发分片

### 🔗 分享系统

- **一键创建分享链接**：支持单个文件和批量生成
- **分享链接管理**：查看所有分享记录、下载次数统计
- **无广告干扰**：可选「无广告」模式（关闭 S3 备用下载）
- **安全删除**：支持单个或批量清除分享链接

### 🌍 公共上传

- **无需登录**：任何人可通过 `/upload` 页面上传文件
- **Turnstile 人机验证**：防止恶意上传和滥用
- **可限制上传目录**：通过环境变量指定公共上传路径
- **上传来源记录**：区分来自「面板」「公共上传」「上传链接」的来源

### ⏳ 上传链接

- **独立上传地址**：生成专属的 `/u/:keyId` 上传页面
- **自定义有效期**：按小时设置链接过期时间
- **指定上传目录**：每个上传链接可指定不同的目标文件夹
- **后台统一管理**：创建、查看、删除上传链接，追踪使用次数

### 📊 下载统计

每次下载详细记录：

| 字段 | 说明 |
|------|------|
| IP 地址 | 下载者 IP |
| 国家/地区 | Cloudflare IP 地理信息 |
| 浏览器 | Chrome / Safari / Firefox / Edge 等 |
| 操作系统 | Windows / macOS / iOS / Android / Linux |
| 设备类型 | 桌面端 / 移动端 / 平板 |
| 下载时间 | ISO 时间戳 |
| 下载来源 | R2 / S3 / R2+S3 |
| 分享来源 | 通过哪个分享链接下载 |
| 完成状态 | 是否完成下载（beacon 追踪） |

### 📊 上传统计

每次上传详细记录：

| 字段 | 说明 |
|------|------|
| IP 地址 | 上传者 IP |
| 国家/地区 | Cloudflare IP 地理信息 |
| 浏览器 / 操作系统 / 设备 | 完整的 UA 解析 |
| 上传来源 | `dashboard` / `public` / `upload-key` |
| 上传链接标签 | 通过哪个上传链接上传 |

### ☁️ 双存储支持

- **Cloudflare R2**（主存储）：零出口流量费
- **可选 S3 同步**：上传文件同时写入 R2 和 S3 兼容存储
- **支持的 S3 兼容平台**：AWS S3、Cloudflare R2（通过 S3 API）、MinIO、Backblaze B2、腾讯云 COS、阿里云 OSS 等
- **双通道下载**：分享页面同时提供 R2 和 S3 的预签名下载链接

### 🌙 用户体验

- **深色模式**：一键切换，偏好持久化到 localStorage
- **响应式布局**：适配桌面端、平板、手机
- **移动端侧边栏**：底部导航栏 + 可折叠侧边菜单
- **上传进度条**：实时显示上传进度（单文件与分片均支持）
- **剪贴板复制**：一键复制分享链接
- **Curl / Aria2 命令**：分享页面自动生成命令行下载指令

---

## 🏗️ 架构设计

```text
┌──────────────────────────┐
                          │     Cloudflare Worker     │
                          │     (Hono Framework)      │
                          │                           │
        ┌─────────────────┼───────────────────────────┼─────────────────┐
        │                 │                           │                 │
   ┌────▼────┐      ┌─────▼──────┐           ┌───────▼──────┐   ┌──────▼──────┐
   │  JWT    │      │   File     │           │   Share      │   │   Upload    │
   │  Auth   │      │   CRUD     │           │   Service    │   │   Service   │
   └─────────┘      └─────┬──────┘           └───────┬──────┘   └──────┬──────┘
                          │                          │                 │
                          └──────────┬───────────────┘                 │
                                     │                                 │
                              ┌──────▼──────┐                   ┌──────▼──────┐
                              │  Cloudflare │                   │  Cloudflare │
                              │     R2      │                   │  Turnstile  │
                              └──────┬──────┘                   └─────────────┘
                                     │
                              ┌──────▼──────┐
                              │  Optional   │
                              │  S3 Sync    │
                              └─────────────┘
```

### 数据存储设计

ioDrive 不依赖传统数据库，所有元数据以 JSON 文件形式存储在 R2 中：

| 路径前缀 | 内容 | 说明 |
|----------|------|------|
| `uploads/` | 用户文件 | 所有上传的文件 |
| `_shares/` | 分享记录 | `{token}.json` 存储分享元数据 |
| `_dl_logs/` | 下载日志 | `{source}_{ts}_{rand}.json` |
| `_ul_logs/` | 上传日志 | `{source}_{ts}_{rand}.json` |
| `_upload_keys/` | 上传链接 | `{id}.json` 存储上传链接配置 |
| `_s3/` | S3 多部分元数据 | 临时存储 S3 分片上传的 uploadId |

### 下载流程

```text
用户访问 /s/:token
       │
       ▼
  展示文件信息 + Turnstile 验证
       │
       ▼
  用户完成 Turnstile 验证
       │
       ▼
  POST /api/download/token
       │
       ├──► 生成 R2 预签名 URL（5 分钟有效）
       ├──► 生成 S3 预签名 URL（5 分钟有效，如已配置）
       └──► 记录下载日志
       │
       ▼
  用户点击下载链接
       │
       ▼
  sendBeacon 上报下载完成状态
```

### 上传流程

```text
Dashboard 上传                   公共上传 / 上传链接
     │                                  │
     ├── JWT 认证                       ├── Turnstile 验证
     │                                  ├── 上传链接验证（可选）
     │                                  │
     └──────────┬───────────────────────┘
                │
         ┌──────▼──────┐
         │ 文件大小判断  │
         └──────┬──────┘
                │
      ┌─────────┴─────────┐
      │                   │
   ≤ 20MB              > 20MB
      │                   │
  R2 PutObject      R2 CreateMultipartUpload
  + S3 PutObject    │
      │             ├── 并发上传分片（最多 6 个）
      │             │   R2 uploadPart + S3 uploadPart
      │             │
      │             R2 CompleteMultipartUpload
      │             + S3 CompleteMultipartUpload
      │                   │
      └─────────┬─────────┘
                │
          记录上传日志
```

---

## 🧰 技术栈

<p align="center">

<img src="https://skillicons.dev/icons?i=ts" height="48" alt="TypeScript"/>
<img src="https://hono.dev/images/logo-large.png" height="48" alt="Hono"/>
<img src="https://www.vectorlogo.zone/logos/cloudflare/cloudflare-icon.svg" height="48" alt="Cloudflare"/>

</p>

| 技术 | 版本 | 用途 |
|------|------|------|
| [TypeScript](https://www.typescriptlang.org/) | ^5.0 | 类型安全的开发语言 |
| [Hono](https://hono.dev/) | ^4.0 | 轻量级 Web 框架，专为边缘计算优化 |
| [Cloudflare Workers](https://workers.cloudflare.com/) | - | Serverless 运行时，全球边缘部署 |
| [Cloudflare R2](https://www.cloudflare.com/r2/) | - | 对象存储，零出口流量费 |
| [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) | - | 隐私友好的人机验证 |
| [jose](https://github.com/panva/jose) | ^6.0 | JWT 签名与验证（HS256） |
| [Wrangler](https://developers.cloudflare.com/workers/wrangler/) | ^4.0 | Cloudflare CLI 开发部署工具 |

### 为什么选择 Hono？

- 专为 Cloudflare Workers 设计，极小的运行时体积
- 类 Express 的 API，学习成本低
- 内置 CORS、中间件等开箱即用
- 支持 JSX 和模板字符串渲染 HTML

### 为什么不用数据库？

- R2 的 `list()` / `get()` / `put()` / `delete()` 操作足以覆盖元数据 CRUD
- 无需额外配置 D1 或外部数据库
- 减少依赖，降低运维复杂度
- JSON 文件存储灵活，方便导出和备份

---

## 🚀 快速开始

### 前置要求

- [Node.js](https://nodejs.org/) >= 18
- [Cloudflare 账号](https://dash.cloudflare.com/sign-up)
- Cloudflare 账号中已开通 **Workers** 和 **R2** 服务
- 一个域名（托管在 Cloudflare DNS 上）

### 第一步：克隆项目

```bash
git clone https://github.com/Mareixcode/Cloudflare-Drive.git
cd Cloudflare-Drive
npm install
```

### 第二步：配置 Cloudflare 资源

#### 创建 R2 存储桶

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 进入 **R2** → **创建存储桶**
3. 填写存储桶名称（如 `iodrive`）
4. 记录存储桶名称，稍后填入配置

#### 获取 R2 API 密钥

1. 进入 **R2** → **管理 R2 API 令牌**
2. 创建 API 令牌，权限选择「管理员读/写」
3. 记录 **Access Key ID** 和 **Secret Access Key**

#### 获取 Account ID

1. 进入 Cloudflare Dashboard 首页
2. 右侧「API」区域复制 **Account ID**

#### 获取 Turnstile 密钥

1. 进入 **Turnstile** 页面
2. 添加站点，选择「托管」模式
3. 记录 **Site Key** 和 **Secret Key**

### 第三步：配置环境变量

复制示例配置文件：

```bash
cp wrangler.toml.example wrangler.toml
```

编辑 `wrangler.toml`，填入你的配置：

```toml
name = "iodrive"
main = "src/index.ts"
compatibility_date = "2024-12-01"
routes = [{ pattern = "YOUR_DOMAIN/*", zone_name = "YOUR_ZONE" }]

[vars]
ADMIN_USER = "admin"
R2_PUBLIC_DOMAIN = "YOUR_R2_PUBLIC_DOMAIN"
R2_BUCKET = "YOUR_R2_BUCKET"
R2_ACCOUNT_ID = "YOUR_R2_ACCOUNT_ID"
TURNSTILE_SITE_KEY = "YOUR_TURNSTILE_SITE_KEY"

# 可选 S3 同步
S3_ENDPOINT = "YOUR_S3_ENDPOINT"
S3_BUCKET = "YOUR_S3_BUCKET"
S3_REGION = "YOUR_S3_REGION"
PUBLIC_UPLOAD_PATH = "uploads/public/"

[[r2_buckets]]
binding = "DRIVE"
bucket_name = "YOUR_R2_BUCKET"
```

### 第四步：配置密钥

通过 `wrangler secret` 设置敏感信息：

```bash
# 必需密钥
wrangler secret put ADMIN_PASS      # 管理员密码
wrangler secret put JWT_SECRET      # JWT 签名密钥（建议使用随机生成的 64 位字符串）
wrangler secret put TURNSTILE_SECRET # Turnstile 密钥
wrangler secret put R2_ACCESS_KEY   # R2 Access Key
wrangler secret put R2_SECRET_KEY   # R2 Secret Key

# 可选 S3 密钥（如需 S3 同步）
wrangler secret put S3_ACCESS_KEY
wrangler secret put S3_SECRET_KEY
```

> 💡 **生成 JWT_SECRET**：`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 第五步：本地开发

创建 `.dev.vars` 文件用于本地开发（此文件已加入 `.gitignore`）：

```bash
# .dev.vars
ADMIN_PASS=your_admin_password
JWT_SECRET=your_jwt_secret
TURNSTILE_SECRET=your_turnstile_secret
R2_ACCESS_KEY=your_r2_access_key
R2_SECRET_KEY=your_r2_secret_key
S3_ACCESS_KEY=your_s3_access_key     # 可选
S3_SECRET_KEY=your_s3_secret_key     # 可选
```

启动本地开发服务器：

```bash
npm run dev
```

### 第六步：部署

```bash
npm run deploy
```

部署完成后访问 `https://YOUR_DOMAIN` 即可使用。

---

## ⚙️ 配置说明

### 环境变量完整列表

#### 必需变量（wrangler.toml vars）

| 变量 | 说明 | 示例 |
|------|------|------|
| `ADMIN_USER` | 管理员用户名 | `admin` |
| `R2_PUBLIC_DOMAIN` | R2 公开访问域名 | `r2.example.com` |
| `R2_BUCKET` | R2 存储桶名称 | `iodrive` |
| `R2_ACCOUNT_ID` | Cloudflare 账户 ID | `b06463110442db176b96e67a7fd4eb8e` |
| `TURNSTILE_SITE_KEY` | Turnstile 站点密钥（公开） | `0x4AAAAAADnkUbPb8iGro2Vh` |

#### 必需密钥（wrangler secret）

| 变量 | 说明 |
|------|------|
| `ADMIN_PASS` | 管理员密码 |
| `JWT_SECRET` | JWT HS256 签名密钥（建议 64 位随机字符串） |
| `TURNSTILE_SECRET` | Turnstile 密钥（用于服务端验证） |
| `R2_ACCESS_KEY` | R2 Access Key（用于生成预签名下载链接） |
| `R2_SECRET_KEY` | R2 Secret Key（用于生成预签名下载链接） |

#### 可选变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `S3_ENDPOINT` | S3 兼容存储端点 | - |
| `S3_BUCKET` | S3 存储桶名称 | - |
| `S3_REGION` | S3 区域 | - |
| `S3_ACCESS_KEY` | S3 Access Key（密钥） | - |
| `S3_SECRET_KEY` | S3 Secret Key（密钥） | - |
| `PUBLIC_UPLOAD_PATH` | 公共上传默认路径 | `uploads/public/` |

### 路由配置

```toml
# 生产环境
routes = [{ pattern = "drive.example.com/*", zone_name = "example.com" }]

# 如果不需要自定义域名，也可以使用 workers.dev 子域名
# 删除 routes 配置即可自动分配 <worker-name>.<subdomain>.workers.dev
```

### R2 存储桶绑定

```toml
[[r2_buckets]]
binding = "DRIVE"       # 代码中使用的绑定名，不可修改
bucket_name = "iodrive" # 你的 R2 存储桶名称
```

### CORS 配置

默认允许所有来源访问 `/api/*` 路径。如需限制，可在 `src/index.ts` 中修改：

```typescript
app.use('/api/*', cors({
  origin: 'https://your-domain.com',
  allowMethods: ['GET', 'POST', 'DELETE'],
}));
```

---

## 📁 项目结构

```
drive/
├── .github/
│   └── workflows/
│       └── ci.yml                    # GitHub Actions CI/CD 配置
├── docs/
│   ├── README_EN.md                  # 英文文档
│   ├── README_JA.md                  # 日文文档
│   └── images/
│       ├── logo/
│       │   └── logo.svg              # 项目 Logo
│       └── screenshots/
│           ├── dashboard.jpg         # 管理后台截图
│           ├── upload.png            # 上传截图
│           ├── upload-link-1.png     # 上传链接截图
│           ├── share.png             # 分享截图
│           ├── share-1.png           # 分享截图-移动端
│           ├── share-link-1.png      # 分享链接截图-桌面端
│           └── share-link-2.png      # 分享链接截图-命令下载
├── src/
│   ├── index.ts                      # 🚀 应用入口：路由注册、页面路由、SEO
│   ├── auth.ts                       # 🔐 JWT 认证：登录、JWT 签发与验证中间件、频率限制
│   ├── files.ts                      # 📁 文件 CRUD：列表、创建文件夹、删除、批量删除、移动
│   ├── upload.ts                     # 📤 仪表盘上传：单文件、分片上传（init/part/complete/abort）
│   ├── upload-public.ts              # 🌍 公共上传：Turnstile 验证 + 可选上传链接
│   ├── upload-keys.ts                # 🔑 上传链接管理：创建、列表、删除、验证
│   ├── upload-logs.ts                # 📊 上传日志：列表、清空、删除、日志写入
│   ├── upload-utils.ts               # 🛠 上传工具：MIME 类型映射、唯一文件名生成
│   ├── download.ts                   # ⬇️ 下载服务：预签名 URL 生成、下载日志、beacon 追踪
│   ├── share.ts                      # 🔗 分享服务：创建、列表、删除、批量分享、公开信息查询
│   ├── s3-upload.ts                  # ☁️ S3 上传：AWS Signature V4 实现（单文件 + 分片）
│   ├── turnstile.ts                  # 🛡 Turnstile 验证：服务端 token 校验
│   ├── ua-parser.ts                  # 🔍 UA 解析：浏览器、操作系统、设备类型识别
│   ├── types.ts                      # 📐 类型定义：Env、JwtPayload、FileMeta、ShareRecord 等
│   └── html/
│       ├── dashboard.ts              # 管理后台 SPA（文件/下载/上传/分享/上传链接五个视图）
│       ├── login.ts                  # 登录页面
│       ├── share.ts                  # 公开分享下载页面
│       ├── upload-key.ts             # 上传链接页面（限时上传）
│       ├── public-upload.ts          # 公共上传页面（无需登录）
│       └── demo.ts                   # 演示站 Landing Page
├── wrangler.toml                     # 生产环境部署配置
├── wrangler.toml.example             # 配置文件模板
├── wrangler.demo.toml                # 演示环境部署配置
├── tsconfig.json                     # TypeScript 配置
├── package.json                      # 项目依赖与脚本
├── LICENSE                           # GPL-3.0 许可证
└── README.md                         # 项目文档
```

---

## 📡 API 文档

所有 API 路径以 `/api` 为前缀，支持 CORS 跨域访问。

### 认证说明

- **JWT 认证**：在请求头中携带 `Authorization: Bearer <token>`
- **Turnstile 验证**：在请求体中携带 `turnstile` 字段（token 由客户端 Turnstile widget 生成）
- JWT 有效期：24 小时

---

### 认证 API

#### `POST /api/auth/login`

登录获取 JWT Token。

**请求体：**

```json
{
  "username": "admin",
  "password": "your_password",
  "turnstile": "turnstile_token"
}
```

**成功响应：**

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**错误响应：**

- `400` - 缺少人机验证
- `401` - 用户名或密码错误
- `403` - 人机验证失败
- `429` - 登录尝试过多（5 次失败后锁定 5 分钟）

---

### 文件管理 API（需要 JWT）

#### `GET /api/files?prefix=uploads/`

列出指定目录下的文件和文件夹。

**响应：**

```json
{
  "files": [
    {
      "key": "uploads/example.pdf",
      "name": "example.pdf",
      "size": 1024000,
      "uploaded": "2025-01-01T00:00:00.000Z",
      "contentType": "application/pdf"
    }
  ],
  "folders": [{ "name": "docs", "path": "uploads/docs/" }],
  "currentPath": "uploads/",
  "ancestors": []
}
```

#### `GET /api/files/folders`

递归获取所有文件夹列表（用于移动文件选择器）。

#### `GET /api/files/:key`

获取单个文件元数据。

#### `POST /api/files/folder`

创建文件夹。

**请求体：**

```json
{ "path": "uploads/new-folder/" }
```

#### `DELETE /api/files/:key`

删除文件或文件夹（文件夹会递归删除其下所有文件）。

#### `POST /api/files/batch-delete`

批量删除文件或文件夹。

**请求体：**

```json
{ "keys": ["uploads/file1.pdf", "uploads/folder/"] }
```

#### `POST /api/files/move`

移动文件到目标文件夹。

**请求体：**

```json
{
  "keys": ["uploads/file1.pdf"],
  "targetPath": "uploads/docs/"
}
```

---

### 仪表盘上传 API（需要 JWT）

#### `POST /api/upload/single`

单文件上传（≤ 20MB）。使用 `multipart/form-data`。

**表单字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `file` | File | 上传的文件 |
| `path` | string | 目标路径（默认 `uploads/`） |

#### `POST /api/upload/init`

初始化分片上传（> 20MB）。

**请求体：**

```json
{
  "filename": "large-file.zip",
  "size": 104857600,
  "path": "uploads/"
}
```

**响应：**

```json
{
  "uploadId": "abc123...",
  "key": "uploads/large-file.zip"
}
```

#### `POST /api/upload/part`

上传分片。使用 `multipart/form-data`。

**表单字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `uploadId` | string | 上传会话 ID |
| `key` | string | 文件 key |
| `partNumber` | number | 分片编号（从 1 开始） |
| `chunk` | File | 分片数据 |

#### `POST /api/upload/complete`

完成分片上传。

**请求体：**

```json
{
  "uploadId": "abc123...",
  "key": "uploads/large-file.zip",
  "parts": [
    { "partNumber": 1, "etag": "abc" },
    { "partNumber": 2, "etag": "def" }
  ]
}
```

#### `POST /api/upload/abort`

取消分片上传。

**请求体：**

```json
{
  "uploadId": "abc123...",
  "key": "uploads/large-file.zip"
}
```

---

### 公共上传 API（需要 Turnstile）

接口与仪表盘上传相同，路径前缀为 `/api/upload-public`，额外需要 `turnstile` 字段。

#### `POST /api/upload-public/single`

公共单文件上传。表单额外字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `turnstile` | string | Turnstile 验证 token |
| `uploadKeyId` | string | 可选，上传链接 ID |

#### `POST /api/upload-public/init`

公共分片上传初始化。请求体额外字段：

```json
{
  "filename": "file.zip",
  "size": 104857600,
  "turnstile": "turnstile_token",
  "uploadKeyId": "optional_key_id"
}
```

---

### 下载 API

#### `GET /api/download/presign/:key`（需要 JWT）

生成 R2 预签名下载链接（仪表盘内使用），同时记录下载日志。

#### `POST /api/download/token`（需要 Turnstile）

通过分享链接生成预签名下载链接。

**请求体：**

```json
{
  "shareToken": "abc123...",
  "turnstile": "turnstile_token"
}
```

**响应：**

```json
{
  "r2Url": "https://bucket.r2.cloudflarestorage.com/...",
  "s3Url": "https://bucket.s3.amazonaws.com/...",
  "logKey": "_dl_logs/...",
  "name": "example.pdf",
  "size": 1024000
}
```

#### `POST /api/download/beacon`

下载完成追踪（浏览器通过 `sendBeacon` 调用）。

**请求体：**

```json
{
  "logKey": "_dl_logs/abc123_1234567890_abc123.json",
  "event": "complete"
}
```

---

### 下载日志 API（需要 JWT）

#### `GET /api/download/logs`

获取下载日志列表（最近 500 条）。

#### `DELETE /api/download/logs`

清空所有下载日志。

#### `DELETE /api/download/logs/:logKey`

删除单条下载日志。

---

### 上传日志 API（需要 JWT）

#### `GET /api/upload-logs/logs`

获取上传日志列表（最近 500 条）。

#### `DELETE /api/upload-logs/logs`

清空所有上传日志。

#### `DELETE /api/upload-logs/logs/:logKey`

删除单条上传日志。

---

### 分享 API

#### `POST /api/share`（需要 JWT）

创建分享链接。

**请求体：**

```json
{
  "key": "uploads/example.pdf",
  "name": "example.pdf",
  "noAd": false
}
```

#### `POST /api/share/batch`（需要 JWT）

批量创建分享链接。

**请求体：**

```json
{ "keys": ["uploads/file1.pdf", "uploads/file2.pdf"] }
```

#### `GET /api/share`（需要 JWT）

获取所有分享记录。

#### `DELETE /api/share/:token`（需要 JWT）

删除指定分享链接。

#### `GET /api/share/info/:token`（公开）

获取分享文件信息（无需认证）。

---

### 上传链接 API

#### `POST /api/upload-keys`（需要 JWT）

创建上传链接。

**请求体：**

```json
{
  "label": "项目文件收集",
  "path": "uploads/project-a/",
  "expiresHours": 72
}
```

#### `GET /api/upload-keys`（需要 JWT）

获取所有上传链接列表。

#### `DELETE /api/upload-keys/:id`（需要 JWT）

删除指定上传链接。

#### `GET /api/upload-keys/validate/:id`（公开）

验证上传链接是否有效。

---

## 🚢 部署指南

### 方式一：手动部署

```bash
# 安装依赖
npm install

# 类型检查
npx tsc --noEmit

# 部署到 Cloudflare Workers
npm run deploy
```

### 方式二：GitHub Actions 自动部署

> ⚠️ **前置步骤**：使用此方式前，你须先 **Fork 本仓库** 到你的 GitHub 账号下。否则将无权配置 Secrets，无法触发自动部署。

项目已配置 CI/CD 流水线（`.github/workflows/ci.yml`）：

- **推送到 `main` 分支** → 自动部署到生产环境
- **推送到 `demo` 分支** → 自动部署到演示环境
- **创建 PR 到 `main`** → 自动运行类型检查

#### 配置 GitHub Actions

1. Fork 本仓库后，在你自己的仓库中进入 **Settings** → **Secrets and variables** → **Actions**，添加以下 Secret：
   
   - `CLOUDFLARE_API_TOKEN`：Cloudflare API 令牌（需要有 Workers 部署权限）
2. 创建 Cloudflare API Token：
   
   - 进入 [Cloudflare Dashboard](https://dash.cloudflare.com/) → **我的个人资料** → **API 令牌**
   - 创建令牌 → 使用「编辑 Cloudflare Workers」模板
   - 选择你的账户和区域

### 部署后检查

- [ ] 访问你的域名，确认管理后台正常加载
- [ ] 使用配置的管理员账号登录
- [ ] 测试文件上传、分享、下载流程
- [ ] 测试公共上传页面 `/upload`
- [ ] 检查 R2 存储桶中的文件是否正常写入

---

## 🛣️ Roadmap

### ✅ 已完成

- [x] 文件上传（单文件 + 分片上传）
- [x] 文件夹管理（创建、导航、面包屑）
- [x] 文件移动与批量操作
- [x] 分享链接（单个 + 批量）
- [x] 下载日志（IP、国家、浏览器、OS、设备类型）
- [x] 上传日志（来源追踪）
- [x] 上传链接（限时 + 指定目录）
- [x] 公共上传（Turnstile 验证）
- [x] R2 + S3 双存储支持
- [x] 深色模式
- [x] 响应式布局 / 移动端适配
- [x] Curl / Aria2 命令行下载支持

### 🚧 计划中

- [ ] 文件预览（图片、视频、文档在线预览）
- [ ] 回收站（软删除 + 恢复机制）
- [ ] 文件标签与分类
- [ ] 多用户系统（多管理员 + 权限控制）
- [ ] OAuth 登录（GitHub / Google）
- [ ] API Token（程序化访问）
- [ ] 图床功能（一键复制 Markdown / BBCode）
- [ ] 文件直链管理
- [ ] Webhook 通知（上传/下载事件通知）
- [ ] 国际化 i18n（English / 日本語）

---

## 🤝 贡献指南

欢迎各种形式的贡献！无论是提 Bug、建议新功能还是提交 PR。

### 提交 Issue

- 使用清晰的标题描述问题
- 提供复现步骤和环境信息
- 提交前先搜索是否已有相同问题

### 提交 Pull Request

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/amazing-feature`
3. 提交更改：`git commit -m 'feat: add amazing feature'`
4. 推送分支：`git push origin feature/amazing-feature`
5. 提交 Pull Request

### 开发注意事项

- 运行 `npx tsc --noEmit` 确保类型检查通过
- HTML 模板在 `src/html/` 目录中，使用 TypeScript 模板字符串
- API 路由在 `src/` 根目录，按功能模块拆分
- 遵循现有代码风格（中文注释，功能模块化）

---

## ⭐ Star History

如果这个项目对你有帮助，欢迎点一个 Star ⭐

[![Star History Chart](https://api.star-history.com/svg?repos=Mareixcode/Cloudflare-Drive&type=Date)](https://star-history.com/#Mareixcode/Cloudflare-Drive&Date)

---

## 📬 联系方式

* ​**开发者**​: MareixHunk
* ​**Email**​: [ceohunk@gmail.com](mailto:ericterminal@gmail.com)
* ​**GitHub**​: [MareixHunk](https://github.com/Mareixcode)

## 📜 License

GPL-3.0 License © 2026 [MareixHunk](https://github.com/Mareixcode)

---

<p align="center">
  <sub>Built with ❤️ on Cloudflare's edge network</sub>
</p>

