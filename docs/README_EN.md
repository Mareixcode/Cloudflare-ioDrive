# ioDrive

<p align="center">
  <img src="./images/logo/logo.svg" width="120" alt="ioDrive Logo">
</p>

<h3 align="center">
  Lightweight Cloudflare File Sharing System
</h3>

<div align="center">
  <a href="https://demo.iodevo.com">Demo Site</a>
</div>

<p align="center">
  A high-performance file management and sharing platform built on Cloudflare Workers + Hono + S3-compatible storage
</p>

<p align="center">

![License](https://img.shields.io/github/license/Mareixcode/Cloudflare-ioDrive?style=for-the-badge)
![Stars](https://img.shields.io/github/stars/Mareixcode/Cloudflare-ioDrive?style=for-the-badge)
![Forks](https://img.shields.io/github/forks/Mareixcode/Cloudflare-ioDrive?style=for-the-badge)
![Issues](https://img.shields.io/github/issues/Mareixcode/Cloudflare-ioDrive?style=for-the-badge)

</p>

<p align="center">

<a href="#-background">Background</a> ·
<a href="#-screenshots">Screenshots</a> ·
<a href="#-features">Features</a> ·
<a href="#-architecture">Architecture</a> ·
<a href="#-quick-start">Quick Start</a> ·
<a href="#-configuration">Configuration</a> ·
<a href="#-api-reference">API</a> ·
<a href="#-deployment">Deployment</a> ·
<a href="#-roadmap">Roadmap</a>

</p>

<p align="center">

[中文](../README.md) | **English** | [日本語](./README_JA.md)

</p>

---

## 👋 Background

I've long struggled to find a suitable cloud drive that allows multiple people to download and upload without logging in. Most cloud drives on the market require login to download, have strict speed limits, and there's no good file collection system — that's why this project was born.

ioDrive is a lightweight file management system that runs entirely on Cloudflare's edge network. With just a Cloudflare account, you can deploy your own file sharing platform in minutes — no servers, no databases, no maintenance.

### Why ioDrive?

- **Zero Server Costs**: Runs entirely within Cloudflare Workers free tier (100,000 requests/day)
- **Flexible Storage**: Supports R2, AWS S3, MinIO, and any S3-compatible storage with multiple backends
- **Lightning-Fast Access**: 330+ global data centers, users download from the nearest edge
- **Deploy in One Command**: No database or server configuration needed
- **Secure & Reliable**: JWT authentication + Turnstile CAPTCHA to prevent abuse

---

## 🚀 One-Click Deploy

<p align="center">
  <a href="https://github.com/Mareixcode/Cloudflare-Drive/fork">
    <img src="https://img.shields.io/badge/⚡_Deploy_to_Cloudflare-F6821F?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Deploy to Cloudflare" height="48">
  </a>
</p>

> Cloudflare doesn't have a native Deploy Button like Vercel, so we use a **Fork → Configure → One-Click Deploy** workflow. Simply click the button above to fork the repo, then click "Run workflow" in the Actions tab to deploy.

<details>
<summary><b>📖 Full Deploy Guide (click to expand)</b></summary>

### Step 1: Fork the Repository

Click the **⚡ Deploy to Cloudflare** button above to fork the repository to your GitHub account.

### Step 2: Configure GitHub Secrets

Go to your forked repo → **Settings** → **Secrets and variables** → **Actions**, add the following Secrets:

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token | [Create Token](https://dash.cloudflare.com/profile/api-tokens) → Use "Edit Cloudflare Workers" template |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID | Dashboard homepage → Right side API section |
| `ADMIN_PASS` | Admin password | Set your own |
| `JWT_SECRET` | JWT signing key | Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `TURNSTILE_SECRET` | Turnstile secret | Turnstile → Your site → API keys |
| `TURNSTILE_SITE_KEY` | Turnstile site key | Turnstile → Your site → Site key |
| `R2_ACCESS_KEY` | R2 Access Key | R2 → Manage R2 API Tokens |
| `R2_SECRET_KEY` | R2 Secret Key | Same as above |

### Step 3: One-Click Deploy

Go to repo → **Actions** → **🚀 One-Click Deploy ioDrive** → **Run workflow**, fill in the configuration parameters and run.

### Subsequent Updates

After configuration, every push to the `main` branch will automatically trigger deployment (via the `deploy.yml` workflow).

</details>

### Method 1: Setup Script (Recommended for Local Deploy)

Interactive guided configuration, auto-generates config files, deploy with one command:

```bash
git clone https://github.com/Mareixcode/Cloudflare-Drive.git
cd Cloudflare-Drive
chmod +x setup.sh
./setup.sh
```

The script automatically guides you through:
- ✅ Checking prerequisites (Node.js, npm, wrangler)
- ✅ Collecting Cloudflare account information
- ✅ Configuring domain and R2 bucket
- ✅ Setting up Turnstile CAPTCHA
- ✅ Generating `wrangler.toml` and `.dev.vars`
- ✅ Auto-creating R2 bucket and deploying

### Method 2: GitHub Actions One-Click Deploy (Recommended for Continuous Deploy)

> ⚠️ **Prerequisite**: You must first **[Fork this repository](https://github.com/Mareixcode/Cloudflare-Drive/fork)** to your GitHub account.

**Step 1: Configure GitHub Secrets**

Go to your repo → **Settings** → **Secrets and variables** → **Actions**, add the following Secrets:

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `CLOUDFLARE_API_TOKEN` | Cloudflare API Token | [Create Token](https://dash.cloudflare.com/profile/api-tokens) → Use "Edit Cloudflare Workers" template |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID | Dashboard homepage → Right side API section |
| `ADMIN_PASS` | Admin password | Set your own |
| `JWT_SECRET` | JWT signing key | Run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `TURNSTILE_SECRET` | Turnstile secret | Turnstile → Your site → API keys |
| `TURNSTILE_SITE_KEY` | Turnstile site key | Turnstile → Your site → Site key |
| `R2_ACCESS_KEY` | R2 Access Key | R2 → Manage R2 API Tokens |
| `R2_SECRET_KEY` | R2 Secret Key | Same as above |

**Step 2: Trigger Deploy**

Go to repo → **Actions** → **🚀 One-Click Deploy ioDrive** → **Run workflow**, fill in the configuration parameters and run.

**Subsequent Updates**

After configuration, every push to the `main` branch will automatically trigger deployment (via the existing `deploy.yml` workflow).

---

## 📸 Screenshots

### Admin Dashboard

<img src="./images/screenshots/dashboard.jpg" width="100%" alt="Admin Dashboard">

### File Upload

<img src="./images/screenshots/upload.png" width="100%" alt="File Upload">
<img src="./images/screenshots/upload-link-1.png" width="100%" alt="Upload Link Management">

### Share Pages

<img src="./images/screenshots/share-link-1.png" width="100%" alt="Share Page - Desktop">
<img src="./images/screenshots/share-link-2.png" width="100%" alt="Share Page - CLI Download">
<img src="./images/screenshots/share.png" width="100%" alt="Share Page">
<img src="./images/screenshots/share-1.png" width="100%" alt="Share Page - Mobile">

---

## ✨ Features

### 📁 File Management

- **Folder Operations**: Create, browse, breadcrumb navigation
- **File Upload**: Drag-and-drop and click-to-upload, single file and multipart upload (auto-chunking for >20MB)
- **File Moving**: Visual folder picker with cross-directory move support
- **Batch Operations**: Multi-select files for batch delete, share, and move
- **File Search**: Real-time filename search within current directory
- **Concurrent Uploads**: Up to 6 concurrent chunk uploads for multipart

### 🔗 Share System

- **One-Click Share Links**: Single file and batch generation
- **Share Link Management**: View all share records, download count tracking
- **Ad-Free Option**: Optional "no ad" mode (disables S3 backup download)
- **Secure Deletion**: Single or batch removal of share links

### 🌍 Public Upload

- **No Login Required**: Anyone can upload files via the `/upload` page
- **Turnstile CAPTCHA**: Prevents malicious uploads and abuse
- **Configurable Upload Path**: Specify public upload directory via environment variable
- **Upload Source Tracking**: Distinguishes between `dashboard`, `public`, and `upload-key` sources

### ⏳ Upload Links

- **Dedicated Upload URLs**: Generate unique `/u/:keyId` upload pages
- **Custom Expiration**: Set link expiry in hours
- **Target Directory**: Each upload link can specify a different destination folder
- **Centralized Management**: Create, view, delete upload links with usage tracking

### 📊 Download Statistics

Every download is logged in detail:

| Field | Description |
|------|------|
| IP Address | Downloader's IP |
| Country/Region | Cloudflare IP geolocation |
| Browser | Chrome / Safari / Firefox / Edge, etc. |
| Operating System | Windows / macOS / iOS / Android / Linux |
| Device Type | Desktop / Mobile / Tablet |
| Download Time | ISO timestamp |
| Download Source | R2 / S3 / R2+S3 |
| Share Source | Which share link was used |
| Completion Status | Whether download completed (beacon tracking) |

### 📊 Upload Statistics

Every upload is logged in detail:

| Field | Description |
|------|------|
| IP Address | Uploader's IP |
| Country/Region | Cloudflare IP geolocation |
| Browser / OS / Device | Full UA parsing |
| Upload Source | `dashboard` / `public` / `upload-key` |
| Upload Key Label | Which upload link was used |

### ☁️ Multi-Backend Storage

- **Cloudflare R2** (Recommended): Zero egress fees, native Cloudflare storage
- **Multiple S3-Compatible Backends**: Configure multiple S3-compatible storage providers simultaneously, auto-sync on upload
- **Automatic Path-Style Detection**: Automatically selects virtual-hosted or path-style based on the storage provider
- **Supported Storage Platforms**:

| Provider | Identifier | Description |
|----------|------------|-------------|
| Cloudflare R2 | `r2` | Zero egress fees (recommended) |
| AWS S3 | `aws` | Amazon object storage |
| Backblaze B2 | `b2` | Low-cost cloud storage |
| MinIO | `minio` | Self-hosted S3-compatible |
| Alibaba Cloud OSS | `alibaba` | Major Chinese cloud storage |
| Tencent Cloud COS | `tencent` | Major Chinese cloud storage |
| Wasabi | `wasabi` | Unlimited free egress |
| DigitalOcean Spaces | `digitalocean` | Developer-friendly storage |
| Volcengine TOS | `volcengine` | ByteDance cloud storage |
| Custom | `custom` | Any S3-compatible service |

- **Dual-Channel Downloads**: Share pages offer presigned download links from all configured backends

### 🌙 User Experience

- **Dark Mode**: One-click toggle, preference persisted to localStorage
- **Responsive Layout**: Adapts to desktop, tablet, and mobile
- **Mobile Sidebar**: Bottom navigation bar + collapsible side menu
- **Upload Progress Bar**: Real-time upload progress (single and multipart)
- **Clipboard Copy**: One-click copy of share links
- **Curl / Aria2 Commands**: Auto-generated CLI download commands on share pages

---

## 🏗️ Architecture

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

### Data Storage Design

ioDrive doesn't rely on traditional databases — all metadata is stored as JSON files in R2:

| Path Prefix | Content | Description |
|----------|------|------|
| `uploads/` | User Files | All uploaded files |
| `_shares/` | Share Records | `{token}.json` stores share metadata |
| `_dl_logs/` | Download Logs | `{source}_{ts}_{rand}.json` |
| `_ul_logs/` | Upload Logs | `{source}_{ts}_{rand}.json` |
| `_upload_keys/` | Upload Links | `{id}.json` stores upload link config |
| `_s3/` | S3 Multipart Metadata | Temporary S3 multipart uploadId storage |

### Download Flow

```text
User visits /s/:token
       │
       ▼
  Display file info + Turnstile challenge
       │
       ▼
  User completes Turnstile verification
       │
       ▼
  POST /api/download/token
       │
       ├──► Generate R2 presigned URL (5 min validity)
       ├──► Generate S3 presigned URL (5 min validity, if configured)
       └──► Record download log
       │
       ▼
  User clicks download link
       │
       ▼
  sendBeacon reports download completion
```

### Upload Flow

```text
Dashboard Upload               Public Upload / Upload Link
     │                                  │
     ├── JWT Auth                       ├── Turnstile Verification
     │                                  ├── Upload Key Validation (optional)
     │                                  │
     └──────────┬───────────────────────┘
                │
         ┌──────▼──────┐
         │  Size Check  │
         └──────┬──────┘
                │
      ┌─────────┴─────────┐
      │                   │
   ≤ 20MB              > 20MB
      │                   │
  R2 PutObject      R2 CreateMultipartUpload
  + S3 PutObject    │
      │             ├── Concurrent chunk upload (max 6)
      │             │   R2 uploadPart + S3 uploadPart
      │             │
      │             R2 CompleteMultipartUpload
      │             + S3 CompleteMultipartUpload
      │                   │
      └─────────┬─────────┘
                │
          Record upload log
```

---

## 🧰 Tech Stack

<p align="center">

<img src="https://skillicons.dev/icons?i=ts" height="48" alt="TypeScript"/>
<img src="https://hono.dev/images/logo-large.png" height="48" alt="Hono"/>
<img src="https://www.vectorlogo.zone/logos/cloudflare/cloudflare-icon.svg" height="48" alt="Cloudflare"/>

</p>

| Technology | Version | Purpose |
|------|------|------|
| [TypeScript](https://www.typescriptlang.org/) | ^5.0 | Type-safe development language |
| [Hono](https://hono.dev/) | ^4.0 | Lightweight web framework optimized for edge computing |
| [Cloudflare Workers](https://workers.cloudflare.com/) | - | Serverless runtime, global edge deployment |
| [Cloudflare R2](https://www.cloudflare.com/r2/) | - | Object storage (optional), zero egress fees |
| [S3-Compatible Storage](https://aws.amazon.com/s3/) | - | Primary storage backend, supports AWS S3, MinIO, B2, etc. |
| [Cloudflare Turnstile](https://www.cloudflare.com/products/turnstile/) | - | Privacy-friendly CAPTCHA |
| [jose](https://github.com/panva/jose) | ^6.0 | JWT signing and verification (HS256) |
| [Wrangler](https://developers.cloudflare.com/workers/wrangler/) | ^4.0 | Cloudflare CLI for dev and deployment |

### Why Hono?

- Purpose-built for Cloudflare Workers with minimal runtime footprint
- Express-like API, low learning curve
- Built-in CORS, middleware, and more out of the box
- Supports JSX and template string HTML rendering

### Why No Database?

- R2's `list()` / `get()` / `put()` / `delete()` operations are sufficient for metadata CRUD
- No need to configure D1 or external databases
- Fewer dependencies, lower operational complexity
- JSON file storage is flexible and easy to export/backup

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Cloudflare Account](https://dash.cloudflare.com/sign-up)
- **Workers** service enabled in your Cloudflare account
- At least one S3-compatible storage service (AWS S3, Cloudflare R2, MinIO, Backblaze B2, Alibaba OSS, Tencent COS, etc.)
- A domain (managed on Cloudflare DNS)

### Step 1: Clone the Project

```bash
git clone https://github.com/Mareixcode/Cloudflare-Drive.git
cd Cloudflare-Drive
npm install
```

### Step 2: Configure Cloudflare Resources

#### Create an R2 Bucket

1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. Go to **R2** → **Create bucket**
3. Enter a bucket name (e.g., `iodrive`)
4. Note the bucket name for later configuration

#### Get R2 API Credentials

1. Go to **R2** → **Manage R2 API Tokens**
2. Create an API token with "Admin Read/Write" permissions
3. Note the **Access Key ID** and **Secret Access Key**

#### Get Account ID

1. Go to the Cloudflare Dashboard homepage
2. Copy the **Account ID** from the "API" section on the right

#### Get Turnstile Keys

1. Go to the **Turnstile** page
2. Add a site, select "Managed" mode
3. Note the **Site Key** and **Secret Key**

### Step 3: Configure Environment Variables

Copy the example configuration file:

```bash
cp wrangler.toml.example wrangler.toml
```

Edit `wrangler.toml` with your settings:

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

# Optional S3 Sync
S3_ENDPOINT = "YOUR_S3_ENDPOINT"
S3_BUCKET = "YOUR_S3_BUCKET"
S3_REGION = "YOUR_S3_REGION"
PUBLIC_UPLOAD_PATH = "uploads/public/"

[[r2_buckets]]
binding = "DRIVE"
bucket_name = "YOUR_R2_BUCKET"
```

### Step 4: Configure Secrets

Set sensitive information via `wrangler secret`:

```bash
# Required secrets
wrangler secret put ADMIN_PASS      # Admin password
wrangler secret put JWT_SECRET      # JWT signing key (recommend a randomly generated 64-char string)
wrangler secret put TURNSTILE_SECRET # Turnstile secret
wrangler secret put R2_ACCESS_KEY   # R2 Access Key
wrangler secret put R2_SECRET_KEY   # R2 Secret Key

# Optional S3 secrets (if S3 sync is needed)
wrangler secret put S3_ACCESS_KEY
wrangler secret put S3_SECRET_KEY
```

> 💡 **Generate JWT_SECRET**: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### Step 5: Local Development

Create a `.dev.vars` file for local development (this file is gitignored):

```bash
# .dev.vars
ADMIN_PASS=your_admin_password
JWT_SECRET=your_jwt_secret
TURNSTILE_SECRET=your_turnstile_secret
R2_ACCESS_KEY=your_r2_access_key
R2_SECRET_KEY=your_r2_secret_key
S3_ACCESS_KEY=your_s3_access_key     # Optional
S3_SECRET_KEY=your_s3_secret_key     # Optional
```

Start the local development server:

```bash
npm run dev
```

### Step 6: Deploy

```bash
npm run deploy
```

After deployment, visit `https://YOUR_DOMAIN` to start using ioDrive.

---

## ⚙️ Configuration

### Complete Environment Variable Reference

#### Required Variables (wrangler.toml vars)

| Variable | Description | Example |
|------|------|------|
| `ADMIN_USER` | Admin username | `admin` |
| `R2_PUBLIC_DOMAIN` | R2 public access domain | `r2.example.com` |
| `R2_BUCKET` | R2 bucket name | `iodrive` |
| `R2_ACCOUNT_ID` | Cloudflare account ID | `b06463110442db176b96e67a7fd4eb8e` |
| `TURNSTILE_SITE_KEY` | Turnstile site key (public) | `0x4AAAAAADnkUbPb8iGro2Vh` |

#### Required Secrets (wrangler secret)

| Variable | Description |
|------|------|
| `ADMIN_PASS` | Admin password |
| `JWT_SECRET` | JWT HS256 signing key (64-char random string recommended) |
| `TURNSTILE_SECRET` | Turnstile secret (for server-side verification) |
| `R2_ACCESS_KEY` | R2 Access Key (for generating presigned download URLs) |
| `R2_SECRET_KEY` | R2 Secret Key (for generating presigned download URLs) |

#### Optional Variables

| Variable | Description | Default |
|------|------|--------|
| `S3_ENDPOINT` | S3-compatible storage endpoint | - |
| `S3_BUCKET` | S3 bucket name | - |
| `S3_REGION` | S3 region | - |
| `S3_ACCESS_KEY` | S3 Access Key (secret) | - |
| `S3_SECRET_KEY` | S3 Secret Key (secret) | - |
| `PUBLIC_UPLOAD_PATH` | Default public upload path | `uploads/public/` |

### Route Configuration

```toml
# Production
routes = [{ pattern = "drive.example.com/*", zone_name = "example.com" }]

# If you don't need a custom domain, you can use the workers.dev subdomain
# Remove the routes config and it will auto-assign <worker-name>.<subdomain>.workers.dev
```

### R2 Bucket Binding

```toml
[[r2_buckets]]
binding = "DRIVE"       # Binding name used in code — do not modify
bucket_name = "iodrive" # Your R2 bucket name
```

### CORS Configuration

All origins are allowed for `/api/*` paths by default. To restrict, modify `src/index.ts`:

```typescript
app.use('/api/*', cors({
  origin: 'https://your-domain.com',
  allowMethods: ['GET', 'POST', 'DELETE'],
}));
```

---

## 📁 Project Structure

```
drive/
├── .github/
│   └── workflows/
│       └── ci.yml                    # GitHub Actions CI/CD configuration
├── docs/
│   ├── README_EN.md                  # English documentation
│   ├── README_JA.md                  # Japanese documentation
│   └── images/
│       ├── logo/
│       │   └── logo.svg              # Project logo
│       └── screenshots/
│           ├── dashboard.jpg         # Admin dashboard screenshot
│           ├── upload.png            # Upload screenshot
│           ├── upload-link-1.png     # Upload link screenshot
│           ├── share.png             # Share screenshot
│           ├── share-1.png           # Share screenshot - mobile
│           ├── share-link-1.png      # Share link screenshot - desktop
│           └── share-link-2.png      # Share link screenshot - CLI download
├── src/
│   ├── index.ts                      # 🚀 App entry: route registration, page routes, SEO
│   ├── auth.ts                       # 🔐 JWT auth: login, JWT signing/verification middleware, rate limiting
│   ├── files.ts                      # 📁 File CRUD: list, create folder, delete, batch delete, move
│   ├── upload.ts                     # 📤 Dashboard upload: single, multipart (init/part/complete/abort)
│   ├── upload-public.ts              # 🌍 Public upload: Turnstile verification + optional upload key
│   ├── upload-keys.ts                # 🔑 Upload key management: create, list, delete, validate
│   ├── upload-logs.ts                # 📊 Upload logs: list, clear, delete, log writer
│   ├── upload-utils.ts               # 🛠 Upload utilities: MIME type mapping, unique filename generation
│   ├── download.ts                   # ⬇️ Download service: presigned URL generation, download logs, beacon tracking
│   ├── share.ts                      # 🔗 Share service: create, list, delete, batch, public info
│   ├── s3-upload.ts                  # ☁️ S3 upload: AWS Signature V4 implementation (single + multipart)
│   ├── turnstile.ts                  # 🛡 Turnstile verification: server-side token validation
│   ├── ua-parser.ts                  # 🔍 UA parser: browser, OS, device type detection
│   ├── types.ts                      # 📐 Type definitions: Env, JwtPayload, FileMeta, ShareRecord, etc.
│   └── html/
│       ├── dashboard.ts              # Admin SPA (files/downloads/uploads/shares/upload keys — five views)
│       ├── login.ts                  # Login page
│       ├── share.ts                  # Public share download page
│       ├── upload-key.ts             # Upload link page (time-limited upload)
│       ├── public-upload.ts          # Public upload page (no login required)
│       └── demo.ts                   # Demo site landing page
├── wrangler.toml                     # Production deployment config
├── wrangler.toml.example             # Configuration file template
├── wrangler.demo.toml                # Demo environment deployment config
├── tsconfig.json                     # TypeScript configuration
├── package.json                      # Project dependencies and scripts
├── LICENSE                           # GPL-3.0 License
└── README.md                         # Project documentation
```

---

## 📡 API Reference

All API paths are prefixed with `/api` and support CORS cross-origin access.

### Authentication

- **JWT Auth**: Include `Authorization: Bearer <token>` in request headers
- **Turnstile Verification**: Include the `turnstile` field in the request body (token generated by the client Turnstile widget)
- JWT validity: 24 hours

---

### Auth API

#### `POST /api/auth/login`

Login to obtain a JWT token.

**Request Body:**

```json
{
  "username": "admin",
  "password": "your_password",
  "turnstile": "turnstile_token"
}
```

**Success Response:**

```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9..."
}
```

**Error Responses:**

- `400` - Missing CAPTCHA verification
- `401` - Incorrect username or password
- `403` - CAPTCHA verification failed
- `429` - Too many login attempts (locked for 5 minutes after 5 failures)

---

### File Management API (JWT Required)

#### `GET /api/files?prefix=uploads/`

List files and folders in a directory.

**Response:**

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

Recursively list all folders (for the move file picker).

#### `GET /api/files/:key`

Get metadata for a single file.

#### `POST /api/files/folder`

Create a folder.

**Request Body:**

```json
{ "path": "uploads/new-folder/" }
```

#### `DELETE /api/files/:key`

Delete a file or folder (folders are recursively deleted with all contents).

#### `POST /api/files/batch-delete`

Batch delete files or folders.

**Request Body:**

```json
{ "keys": ["uploads/file1.pdf", "uploads/folder/"] }
```

#### `POST /api/files/move`

Move files to a target folder.

**Request Body:**

```json
{
  "keys": ["uploads/file1.pdf"],
  "targetPath": "uploads/docs/"
}
```

---

### Dashboard Upload API (JWT Required)

#### `POST /api/upload/single`

Single file upload (≤ 20MB). Uses `multipart/form-data`.

**Form Fields:**

| Field | Type | Description |
|------|------|------|
| `file` | File | The file to upload |
| `path` | string | Target path (default `uploads/`) |

#### `POST /api/upload/init`

Initialize multipart upload (> 20MB).

**Request Body:**

```json
{
  "filename": "large-file.zip",
  "size": 104857600,
  "path": "uploads/"
}
```

**Response:**

```json
{
  "uploadId": "abc123...",
  "key": "uploads/large-file.zip"
}
```

#### `POST /api/upload/part`

Upload a chunk. Uses `multipart/form-data`.

**Form Fields:**

| Field | Type | Description |
|------|------|------|
| `uploadId` | string | Upload session ID |
| `key` | string | File key |
| `partNumber` | number | Chunk number (1-based) |
| `chunk` | File | Chunk data |

#### `POST /api/upload/complete`

Complete multipart upload.

**Request Body:**

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

Abort multipart upload.

**Request Body:**

```json
{
  "uploadId": "abc123...",
  "key": "uploads/large-file.zip"
}
```

---

### Public Upload API (Turnstile Required)

Same interface as Dashboard Upload with the `/api/upload-public` prefix, plus a required `turnstile` field.

#### `POST /api/upload-public/single`

Public single file upload. Additional form fields:

| Field | Type | Description |
|------|------|------|
| `turnstile` | string | Turnstile verification token |
| `uploadKeyId` | string | Optional, upload key ID |

#### `POST /api/upload-public/init`

Initialize public multipart upload. Additional request body fields:

```json
{
  "filename": "file.zip",
  "size": 104857600,
  "turnstile": "turnstile_token",
  "uploadKeyId": "optional_key_id"
}
```

---

### Download API

#### `GET /api/download/presign/:key` (JWT Required)

Generate an R2 presigned download URL (for dashboard use), with download logging.

#### `POST /api/download/token` (Turnstile Required)

Generate presigned download URLs from a share token.

**Request Body:**

```json
{
  "shareToken": "abc123...",
  "turnstile": "turnstile_token"
}
```

**Response:**

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

Download completion tracking (called by browser via `sendBeacon`).

**Request Body:**

```json
{
  "logKey": "_dl_logs/abc123_1234567890_abc123.json",
  "event": "complete"
}
```

---

### Download Logs API (JWT Required)

#### `GET /api/download/logs`

Get download log list (latest 500 entries).

#### `DELETE /api/download/logs`

Clear all download logs.

#### `DELETE /api/download/logs/:logKey`

Delete a single download log entry.

---

### Upload Logs API (JWT Required)

#### `GET /api/upload-logs/logs`

Get upload log list (latest 500 entries).

#### `DELETE /api/upload-logs/logs`

Clear all upload logs.

#### `DELETE /api/upload-logs/logs/:logKey`

Delete a single upload log entry.

---

### Share API

#### `POST /api/share` (JWT Required)

Create a share link.

**Request Body:**

```json
{
  "key": "uploads/example.pdf",
  "name": "example.pdf",
  "noAd": false
}
```

#### `POST /api/share/batch` (JWT Required)

Batch create share links.

**Request Body:**

```json
{ "keys": ["uploads/file1.pdf", "uploads/file2.pdf"] }
```

#### `GET /api/share` (JWT Required)

Get all share records.

#### `DELETE /api/share/:token` (JWT Required)

Delete a specific share link.

#### `GET /api/share/info/:token` (Public)

Get share file info (no authentication required).

---

### Upload Keys API

#### `POST /api/upload-keys` (JWT Required)

Create an upload key.

**Request Body:**

```json
{
  "label": "Project File Collection",
  "path": "uploads/project-a/",
  "expiresHours": 72
}
```

#### `GET /api/upload-keys` (JWT Required)

Get all upload keys.

#### `DELETE /api/upload-keys/:id` (JWT Required)

Delete a specific upload key.

#### `GET /api/upload-keys/validate/:id` (Public)

Validate an upload key.

---

## 🚢 Deployment

### Method 1: Manual Deployment

```bash
# Install dependencies
npm install

# Type check
npx tsc --noEmit

# Deploy to Cloudflare Workers
npm run deploy
```

### Method 2: GitHub Actions Auto-Deploy

> ⚠️ **Prerequisite**: Before using this method, you must **Fork this repository** to your GitHub account. Otherwise, you won't have permission to configure Secrets and trigger automatic deployments.

The project includes a CI/CD pipeline (`.github/workflows/deploy.yml`):

- **Push to `main` branch** → Auto-deploy to production (drive.iodevo.com)
- **Push to `demo` branch** → Auto-deploy to demo environment (demo.iodevo.com)
- **PR to `main` or `demo`** → Auto-run type check and tests

#### Configuring GitHub Actions

1. After forking, in your own repository, go to **Settings** → **Secrets and variables** → **Actions**, add the following Secrets:
   
   - `CLOUDFLARE_API_TOKEN`: Cloudflare API token (needs Workers deploy permission)
   - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID

2. Create a Cloudflare API Token:
   
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **My Profile** → **API Tokens**
   - Create Token → Use "Edit Cloudflare Workers" template
   - Select your account and zone

3. Get Cloudflare Account ID:
   
   - Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → Select your domain → **Overview** page, you can find the **Account ID** on the right side

### Demo Environment

The project also provides a demo site configured in `wrangler.demo.toml`:

- Demo site: [demo.iodevo.com](https://demo.iodevo.com)
- The demo site blocks actual upload requests, only showing the UI

Deploy the demo environment:

```bash
npm run deploy:demo
```

### Post-Deployment Checklist

- [ ] Visit your domain and confirm the admin dashboard loads correctly
- [ ] Log in with the configured admin credentials
- [ ] Test file upload, share, and download workflows
- [ ] Test the public upload page `/upload`
- [ ] Check that files are correctly written to the R2 bucket

---

## 🛣️ Roadmap

### ✅ Completed

- [x] File upload (single + multipart)
- [x] Folder management (create, navigate, breadcrumbs)
- [x] File moving and batch operations
- [x] Share links (single + batch)
- [x] Download logs (IP, country, browser, OS, device type)
- [x] Upload logs (source tracking)
- [x] Upload links (time-limited + target directory)
- [x] Public upload (Turnstile verification)
- [x] R2 + S3 dual storage support
- [x] Dark mode
- [x] Responsive layout / mobile adaptation
- [x] Curl / Aria2 CLI download support

### 🚧 Planned

- [ ] File preview (images, video, documents)
- [ ] Recycle bin (soft delete + restore)
- [ ] File tags and categorization
- [ ] Multi-user system (multiple admins + permissions)
- [ ] OAuth login (GitHub / Google)
- [ ] API tokens (programmatic access)
- [ ] Image hosting mode (one-click Markdown / BBCode copy)
- [ ] Direct link management
- [ ] Webhook notifications (upload/download events)
- [ ] Internationalization i18n (more languages)

---

## 🤝 Contributing

All forms of contribution are welcome! Whether it's bug reports, feature suggestions, or pull requests.

### Submitting Issues

- Use a clear title describing the problem
- Provide reproduction steps and environment details
- Search existing issues before submitting

### Submitting Pull Requests

1. Fork this repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'feat: add amazing feature'`
4. Push branch: `git push origin feature/amazing-feature`
5. Submit a Pull Request

### Development Notes

- Run `npx tsc --noEmit` to ensure type checking passes
- HTML templates are in `src/html/`, using TypeScript template strings
- API routes are in `src/`, organized by functional module
- Follow the existing code style (module-based organization)

---

## ⭐ Star History

If this project has helped you, a Star ⭐ is much appreciated!

[![Star History Chart](https://api.star-history.com/svg?repos=Mareixcode/Cloudflare-Drive&type=Date)](https://star-history.com/#Mareixcode/Cloudflare-Drive&Date)

---

## 📜 License

GPL-3.0 License © 2026 [Mareixcode](https://github.com/Mareixcode)

---

Thank you to the developers of the LINUXDO community for their support of this project​ [**LINUX.DO**](https://linux.do)


<p align="center">
  <sub>Built with ❤️ on Cloudflare's edge network</sub>
</p>

