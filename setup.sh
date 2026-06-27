#!/usr/bin/env bash
# ============================================================
#  ioDrive 一键部署脚本
#  交互式引导配置 → 自动生成配置文件 → 部署到 Cloudflare
# ============================================================

set -euo pipefail

# ── 颜色定义 ──────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # 无颜色

# ── 工具函数 ──────────────────────────────────
info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[✓]${NC} $1"; }
warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
error()   { echo -e "${RED}[✗]${NC} $1"; }
title()   { echo -e "\n${CYAN}${BOLD}═══ $1 ═══${NC}\n"; }

# ── Banner ────────────────────────────────────
echo -e "${CYAN}${BOLD}"
cat << 'EOF'
  ╔══════════════════════════════════════════╗
  ║         ioDrive 一键部署脚本             ║
  ║   轻量级 Cloudflare 文件分享系统         ║
  ╚══════════════════════════════════════════╝
EOF
echo -e "${NC}"

# ── 检查前置依赖 ──────────────────────────────
title "检查前置依赖"

check_cmd() {
  if command -v "$1" &> /dev/null; then
    success "$1 已安装: $(command -v "$1")"
    return 0
  else
    error "$1 未安装"
    return 1
  fi
}

MISSING=0
check_cmd node  || MISSING=1
check_cmd npm   || MISSING=1
check_cmd git   || MISSING=1

if [ "$MISSING" -eq 1 ]; then
  error "缺少必要依赖，请先安装后重新运行此脚本"
  exit 1
fi

# 检查 Node.js 版本
NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  error "Node.js 版本过低 ($(node -v))，需要 >= 18"
  exit 1
fi
success "Node.js 版本: $(node -v)"

# 检查 wrangler
if ! command -v wrangler &> /dev/null; then
  warn "wrangler 未安装，正在安装..."
  npm install -g wrangler
  success "wrangler 安装完成"
else
  success "wrangler 已安装: $(wrangler --version 2>/dev/null || echo 'unknown')"
fi

# ── 安装项目依赖 ──────────────────────────────
title "安装项目依赖"

if [ ! -f "package.json" ]; then
  error "未找到 package.json，请在项目根目录运行此脚本"
  exit 1
fi

info "正在安装依赖..."
npm install
success "依赖安装完成"

# ── 收集配置信息 ──────────────────────────────
title "Cloudflare 账户配置"

# Account ID
echo -e "${YELLOW}获取方式: Cloudflare Dashboard → 右侧「API」区域 → Account ID${NC}"
read -rp "$(echo -e "${BOLD}请输入 Cloudflare Account ID: ${NC}")" ACCOUNT_ID
if [ -z "$ACCOUNT_ID" ]; then
  error "Account ID 不能为空"
  exit 1
fi

# API Token
echo -e "\n${YELLOW}获取方式: Cloudflare Dashboard → 我的个人资料 → API 令牌 → 创建令牌${NC}"
echo -e "${YELLOW}推荐使用「编辑 Cloudflare Workers」模板${NC}"
read -rsp "$(echo -e "${BOLD}请输入 Cloudflare API Token: ${NC}")" API_TOKEN
echo
if [ -z "$API_TOKEN" ]; then
  error "API Token 不能为空"
  exit 1
fi

# 验证 API Token
info "正在验证 API Token..."
if wrangler whoami --api-token "$API_TOKEN" &> /dev/null 2>&1; then
  success "API Token 验证通过"
else
  warn "无法验证 API Token（可能是权限限制），继续配置..."
fi

# ── 域名配置 ──────────────────────────────────
title "域名配置"

echo -e "${YELLOW}你的域名需要托管在 Cloudflare DNS 上${NC}"
read -rp "$(echo -e "${BOLD}请输入你的域名 (例: example.com): ${NC}")" DOMAIN
if [ -z "$DOMAIN" ]; then
  error "域名不能为空"
  exit 1
fi

read -rp "$(echo -e "${BOLD}请输入 Workers 路由前缀 (默认: drive): ${NC}")" ROUTE_PREFIX
ROUTE_PREFIX=${ROUTE_PREFIX:-drive}

WORKER_NAME="iodrive"
read -rp "$(echo -e "${BOLD}请输入 Worker 名称 (默认: iodrive): ${NC}")" INPUT_NAME
WORKER_NAME=${INPUT_NAME:-iodrive}

# ── R2 存储桶配置 ─────────────────────────────
title "存储配置"

echo -e "${YELLOW}ioDrive 支持多种存储后端，可同时配置多个${NC}"
echo -e "${YELLOW}R2 是 Cloudflare 原生存储，零出口流量费（推荐作为主存储）${NC}"
echo ""

# R2 作为默认主存储
read -rp "$(echo -e "${BOLD}是否使用 Cloudflare R2 作为主存储？(Y/n): ${NC}")" USE_R2
USE_R2=${USE_R2:-Y}

R2_BUCKET=""
R2_PUBLIC_DOMAIN=""
R2_ACCESS_KEY=""
R2_SECRET_KEY=""
R2_ENABLED="false"

if [[ "$USE_R2" =~ ^[Yy]$ ]]; then
  R2_ENABLED="true"
  read -rp "$(echo -e "${BOLD}请输入 R2 存储桶名称 (默认: ${WORKER_NAME}): ${NC}")" R2_BUCKET
  R2_BUCKET=${R2_BUCKET:-$WORKER_NAME}

  echo -e "\n${YELLOW}R2 公开访问域名用于生成预签名下载链接${NC}"
  echo -e "${YELLOW}需要在 Cloudflare Dashboard → R2 → 你的桶 → 设置 中开启「公共访问」并绑定自定义域名${NC}"
  read -rp "$(echo -e "${BOLD}请输入 R2 公开访问域名 (例: r2.${DOMAIN}): ${NC}")" R2_PUBLIC_DOMAIN
  if [ -z "$R2_PUBLIC_DOMAIN" ]; then
    R2_PUBLIC_DOMAIN="r2.${DOMAIN}"
  fi

  echo -e "\n${YELLOW}获取方式: R2 → 管理 R2 API 令牌 → 创建令牌 → 管理员读/写${NC}"
  read -rsp "$(echo -e "${BOLD}请输入 R2 Access Key ID: ${NC}")" R2_ACCESS_KEY
  echo
  read -rsp "$(echo -e "${BOLD}请输入 R2 Secret Access Key: ${NC}")" R2_SECRET_KEY
  echo
fi

# ── 额外存储后端（S3 兼容） ──────────────────
STORAGE_CONFIG="[]"
S3_CREDENTIALS="{}"
EXTRA_BACKEND_COUNT=0

echo ""
read -rp "$(echo -e "${BOLD}是否添加额外的 S3 兼容存储后端？(y/N): ${NC}")" ADD_S3

if [[ "$ADD_S3" =~ ^[Yy]$ ]]; then
  echo ""
  echo -e "${CYAN}请选择存储提供商：${NC}"
  echo -e "  ${BOLD}1)${NC} AWS S3"
  echo -e "  ${BOLD}2)${NC} Backblaze B2"
  echo -e "  ${BOLD}3)${NC} MinIO（自建）"
  echo -e "  ${BOLD}4)${NC} 阿里云 OSS"
  echo -e "  ${BOLD}5)${NC} 腾讯云 COS"
  echo -e "  ${BOLD}6)${NC} Wasabi"
  echo -e "  ${BOLD}7)${NC} DigitalOcean Spaces"
  echo -e "  ${BOLD}8)${NC} 火山引擎 TOS"
  echo -e "  ${BOLD}9)${NC} 自定义 S3 兼容"
  echo ""
  read -rp "$(echo -e "${BOLD}请选择 [1-9]: ${NC}")" PROVIDER_CHOICE

  # 预设 endpoint 和 region
  case "$PROVIDER_CHOICE" in
    1) PROVIDER="aws";         DEFAULT_ENDPOINT="s3.amazonaws.com";                     DEFAULT_REGION="us-east-1" ;;
    2) PROVIDER="b2";          DEFAULT_ENDPOINT="s3.us-west-004.backblazeb2.com";       DEFAULT_REGION="us-west-004" ;;
    3) PROVIDER="minio";       DEFAULT_ENDPOINT="";                                     DEFAULT_REGION="us-east-1" ;;
    4) PROVIDER="alibaba";     DEFAULT_ENDPOINT="oss-cn-hangzhou.aliyuncs.com";         DEFAULT_REGION="cn-hangzhou" ;;
    5) PROVIDER="tencent";     DEFAULT_ENDPOINT="cos.ap-guangzhou.myqcloud.com";        DEFAULT_REGION="ap-guangzhou" ;;
    6) PROVIDER="wasabi";      DEFAULT_ENDPOINT="s3.us-east-1.wasabisys.com";           DEFAULT_REGION="us-east-1" ;;
    7) PROVIDER="digitalocean";DEFAULT_ENDPOINT="nyc3.digitaloceanspaces.com";           DEFAULT_REGION="nyc3" ;;
    8) PROVIDER="volcengine";  DEFAULT_ENDPOINT="tos-cn-beijing.volces.com";             DEFAULT_REGION="cn-beijing" ;;
    *) PROVIDER="custom";      DEFAULT_ENDPOINT="";                                     DEFAULT_REGION="us-east-1" ;;
  esac

  read -rp "$(echo -e "${BOLD}后端名称 (用于标识，如 backup): ${NC}")" BACKEND_NAME
  if [ -z "$BACKEND_NAME" ]; then
    BACKEND_NAME="s3-${PROVIDER}"
  fi

  read -rp "$(echo -e "${BOLD}Endpoint (默认: ${DEFAULT_ENDPOINT}): ${NC}")" S3_ENDPOINT
  S3_ENDPOINT=${S3_ENDPOINT:-$DEFAULT_ENDPOINT}

  read -rp "$(echo -e "${BOLD}存储桶名称: ${NC}")" S3_BUCKET

  read -rp "$(echo -e "${BOLD}Region (默认: ${DEFAULT_REGION}): ${NC}")" S3_REGION
  S3_REGION=${S3_REGION:-$DEFAULT_REGION}

  read -rsp "$(echo -e "${BOLD}Access Key: ${NC}")" S3_ACCESS_KEY
  echo
  read -rsp "$(echo -e "${BOLD}Secret Key: ${NC}")" S3_SECRET_KEY
  echo

  # 构建 STORAGE_CONFIG JSON
  STORAGE_CONFIG="[{\"name\":\"${BACKEND_NAME}\",\"provider\":\"${PROVIDER}\",\"endpoint\":\"${S3_ENDPOINT}\",\"bucket\":\"${S3_BUCKET}\",\"region\":\"${S3_REGION}\",\"sync\":true}]"
  S3_CREDENTIALS="{\"${BACKEND_NAME}\":{\"accessKey\":\"${S3_ACCESS_KEY}\",\"secretKey\":\"${S3_SECRET_KEY}\"}}"
  EXTRA_BACKEND_COUNT=1

  # 是否继续添加更多后端？
  while true; do
    echo ""
    read -rp "$(echo -e "${BOLD}是否继续添加更多存储后端？(y/N): ${NC}")" ADD_MORE
    if [[ ! "$ADD_MORE" =~ ^[Yy]$ ]]; then
      break
    fi

    read -rp "$(echo -e "${BOLD}后端名称: ${NC}")" MORE_NAME
    read -rp "$(echo -e "${BOLD}Provider (aws/b2/minio/alibaba/tencent/wasabi/digitalocean/volcengine/custom): ${NC}")" MORE_PROVIDER
    read -rp "$(echo -e "${BOLD}Endpoint: ${NC}")" MORE_ENDPOINT
    read -rp "$(echo -e "${BOLD}存储桶: ${NC}")" MORE_BUCKET
    read -rp "$(echo -e "${BOLD}Region: ${NC}")" MORE_REGION
    read -rsp "$(echo -e "${BOLD}Access Key: ${NC}")" MORE_AK
    echo
    read -rsp "$(echo -e "${BOLD}Secret Key: ${NC}")" MORE_SK
    echo

    # 追加到 JSON（用 node 处理，避免 bash JSON 转义问题）
    STORAGE_CONFIG=$(node -e "
      const cfg = JSON.parse(process.argv[1]);
      cfg.push({name:'${MORE_NAME}',provider:'${MORE_PROVIDER}',endpoint:'${MORE_ENDPOINT}',bucket:'${MORE_BUCKET}',region:'${MORE_REGION}',sync:true});
      console.log(JSON.stringify(cfg));
    " "$STORAGE_CONFIG")

    S3_CREDENTIALS=$(node -e "
      const c = JSON.parse(process.argv[1]);
      c['${MORE_NAME}'] = {accessKey:'${MORE_AK}',secretKey:'${MORE_SK}'};
      console.log(JSON.stringify(c));
    " "$S3_CREDENTIALS")

    EXTRA_BACKEND_COUNT=$((EXTRA_BACKEND_COUNT + 1))
  done
fi

# ── Turnstile 配置 ────────────────────────────
title "Cloudflare Turnstile 配置"

echo -e "${YELLOW}Turnstile 用于人机验证，防止恶意上传和登录${NC}"
echo -e "${YELLOW}获取方式: Cloudflare Dashboard → Turnstile → 添加站点${NC}"
read -rp "$(echo -e "${BOLD}请输入 Turnstile Site Key: ${NC}")" TURNSTILE_SITE_KEY
read -rsp "$(echo -e "${BOLD}请输入 Turnstile Secret Key: ${NC}")" TURNSTILE_SECRET
echo

# ── 管理员账户 ────────────────────────────────
title "管理员账户配置"

read -rp "$(echo -e "${BOLD}请输入管理员用户名 (默认: admin): ${NC}")" ADMIN_USER
ADMIN_USER=${ADMIN_USER:-admin}

read -rsp "$(echo -e "${BOLD}请输入管理员密码: ${NC}")" ADMIN_PASS
echo
if [ -z "$ADMIN_PASS" ]; then
  error "管理员密码不能为空"
  exit 1
fi

# ── 生成 JWT Secret ───────────────────────────
title "生成安全密钥"

JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
success "JWT Secret 已自动生成"

# ── 生成配置文件 ──────────────────────────────
title "生成配置文件"

# 备份已有配置
if [ -f "wrangler.toml" ]; then
  cp wrangler.toml wrangler.toml.bak
  warn "已备份原 wrangler.toml → wrangler.toml.bak"
fi
if [ -f ".dev.vars" ]; then
  cp .dev.vars .dev.vars.bak
  warn "已备份原 .dev.vars → .dev.vars.bak"
fi

# 生成 wrangler.toml
cat > wrangler.toml << EOF
name = "${WORKER_NAME}"
main = "src/index.ts"
compatibility_date = "2024-12-01"
account_id = "${ACCOUNT_ID}"
routes = [{ pattern = "${ROUTE_PREFIX}.${DOMAIN}/*", zone_name = "${DOMAIN}" }]

[vars]
ADMIN_USER = "${ADMIN_USER}"
TURNSTILE_SITE_KEY = "${TURNSTILE_SITE_KEY}"
PUBLIC_UPLOAD_PATH = "uploads/public/"
EOF

# R2 相关配置
if [ "$R2_ENABLED" = "true" ]; then
  cat >> wrangler.toml << EOF
R2_PUBLIC_DOMAIN = "${R2_PUBLIC_DOMAIN}"
R2_BUCKET = "${R2_BUCKET}"
R2_ACCOUNT_ID = "${ACCOUNT_ID}"
EOF
fi

# 多后端存储配置
if [ "$EXTRA_BACKEND_COUNT" -gt 0 ]; then
  # 使用 node 将 JSON 格式化为单行 TOML 字符串
  STORAGE_CONFIG_TOML=$(node -e "console.log(JSON.stringify(JSON.parse(process.argv[1])))" "$STORAGE_CONFIG")
  S3_CREDENTIALS_TOML=$(node -e "console.log(JSON.stringify(JSON.parse(process.argv[1])))" "$S3_CREDENTIALS")
  cat >> wrangler.toml << EOF
STORAGE_CONFIG = '${STORAGE_CONFIG_TOML}'
EOF
fi

# R2 绑定
if [ "$R2_ENABLED" = "true" ]; then
  cat >> wrangler.toml << EOF

[[r2_buckets]]
binding = "DRIVE"
bucket_name = "${R2_BUCKET}"
EOF
fi

# 日志配置
cat >> wrangler.toml << EOF

[observability.logs]
enabled = true
invocation_logs = true
EOF

success "wrangler.toml 已生成"

# 生成 .dev.vars
cat > .dev.vars << EOF
# 管理员密码
ADMIN_PASS=${ADMIN_PASS}

# Cloudflare Turnstile
TURNSTILE_SECRET=${TURNSTILE_SECRET}
TURNSTILE_SITE_KEY=${TURNSTILE_SITE_KEY}

# JWT 密钥
JWT_SECRET=${JWT_SECRET}
EOF

# R2 密钥
if [ "$R2_ENABLED" = "true" ]; then
  cat >> .dev.vars << EOF

# R2 存储访问密钥
R2_ACCESS_KEY=${R2_ACCESS_KEY}
R2_SECRET_KEY=${R2_SECRET_KEY}
EOF
fi

# S3 多后端密钥
if [ "$EXTRA_BACKEND_COUNT" -gt 0 ]; then
  S3_CREDENTIALS_TOML=$(node -e "console.log(JSON.stringify(JSON.parse(process.argv[1])))" "$S3_CREDENTIALS")
  cat >> .dev.vars << EOF

# S3 多后端存储密钥 (JSON 格式)
S3_CREDENTIALS=${S3_CREDENTIALS_TOML}
EOF
fi

success ".dev.vars 已生成"

# ── 创建 R2 存储桶 ───────────────────────────
if [ "$R2_ENABLED" = "true" ]; then
  title "创建 R2 存储桶"

  read -rp "$(echo -e "${BOLD}是否自动创建 R2 存储桶「${R2_BUCKET}」？(Y/n): ${NC}")" CREATE_R2
  if [[ ! "$CREATE_R2" =~ ^[Nn]$ ]]; then
    info "正在创建 R2 存储桶..."
    if CLOUDFLARE_API_TOKEN="$API_TOKEN" wrangler r2 bucket create "$R2_BUCKET" 2>/dev/null; then
      success "R2 存储桶「${R2_BUCKET}」创建成功"
    else
      warn "存储桶可能已存在或创建失败，请手动检查"
    fi
  fi
fi

# ── 部署 ──────────────────────────────────────
title "部署到 Cloudflare"

echo -e "${YELLOW}配置已生成完毕，以下是摘要：${NC}"
echo ""
echo -e "  ${BOLD}Worker 名称:${NC}   ${WORKER_NAME}"
echo -e "  ${BOLD}访问域名:${NC}     ${ROUTE_PREFIX}.${DOMAIN}"
echo -e "  ${BOLD}管理员用户:${NC}   ${ADMIN_USER}"
if [ "$R2_ENABLED" = "true" ]; then
  echo -e "  ${BOLD}R2 存储桶:${NC}    ${R2_BUCKET}"
  echo -e "  ${BOLD}R2 公开域名:${NC}  ${R2_PUBLIC_DOMAIN}"
fi
if [ "$EXTRA_BACKEND_COUNT" -gt 0 ]; then
  echo -e "  ${BOLD}额外后端:${NC}     ${EXTRA_BACKEND_COUNT} 个 S3 兼容存储"
fi
echo ""

read -rp "$(echo -e "${BOLD}是否立即部署？(Y/n): ${NC}")" DEPLOY_NOW
if [[ ! "$DEPLOY_NOW" =~ ^[Nn]$ ]]; then
  info "正在部署..."
  echo ""

  # 设置 secrets
  info "配置密钥..."
  echo "$ADMIN_PASS"      | wrangler secret put ADMIN_PASS
  echo "$JWT_SECRET"      | wrangler secret put JWT_SECRET
  echo "$TURNSTILE_SECRET"| wrangler secret put TURNSTILE_SECRET

  if [ "$R2_ENABLED" = "true" ]; then
    echo "$R2_ACCESS_KEY"   | wrangler secret put R2_ACCESS_KEY
    echo "$R2_SECRET_KEY"   | wrangler secret put R2_SECRET_KEY
  fi

  if [ "$EXTRA_BACKEND_COUNT" -gt 0 ]; then
    echo "$S3_CREDENTIALS" | wrangler secret put S3_CREDENTIALS
  fi

  success "密钥配置完成"

  # 部署
  info "部署 Worker..."
  npm run deploy
  echo ""

  success "部署完成！"
  echo ""
  echo -e "  ${GREEN}${BOLD}访问地址: https://${ROUTE_PREFIX}.${DOMAIN}${NC}"
  echo -e "  ${YELLOW}首次登录请使用管理员账户: ${ADMIN_USER}${NC}"
  echo ""
else
  echo ""
  info "跳过部署，你可以稍后手动执行："
  echo ""
  echo -e "  ${CYAN}npm run deploy${NC}"
  echo ""
  info "或者使用 GitHub Actions 自动部署（推送到 main 分支）"
  echo ""
  echo -e "  ${YELLOW}需要配置以下 GitHub Secrets：${NC}"
  echo -e "    CLOUDFLARE_API_TOKEN"
  echo -e "    CLOUDFLARE_ACCOUNT_ID"
  echo ""
fi

# ── GitHub 部署引导 ───────────────────────────
title "GitHub 自动部署（可选）"

read -rp "$(echo -e "${BOLD}是否查看 GitHub Actions 自动部署配置说明？(y/N): ${NC}")" SHOW_GH
if [[ "$SHOW_GH" =~ ^[Yy]$ ]]; then
  echo ""
  echo -e "${YELLOW}GitHub Actions 自动部署步骤：${NC}"
  echo ""
  echo -e "  1. Fork 本仓库到你的 GitHub 账号"
  echo -e "  2. 进入仓库 → Settings → Secrets and variables → Actions"
  echo -e "  3. 添加以下 Secrets："
  echo -e "     ${CYAN}CLOUDFLARE_API_TOKEN${NC} = ${API_TOKEN}"
  echo -e "     ${CYAN}CLOUDFLARE_ACCOUNT_ID${NC} = ${ACCOUNT_ID}"
  echo -e "  4. 推送代码到 main 分支即可自动部署"
  echo ""
  echo -e "  ${BOLD}其他需要配置的 Secrets（通过 wrangler secret 或 GitHub Secrets）：${NC}"
  echo -e "     ADMIN_PASS, JWT_SECRET, TURNSTILE_SECRET"
  if [ "$R2_ENABLED" = "true" ]; then
    echo -e "     R2_ACCESS_KEY, R2_SECRET_KEY"
  fi
  if [ "$EXTRA_BACKEND_COUNT" -gt 0 ]; then
    echo -e "     S3_CREDENTIALS (JSON 格式，包含所有后端密钥)"
  fi
  echo ""
fi

# ── 完成 ──────────────────────────────────────
title "配置完成"

echo -e "${GREEN}${BOLD}"
cat << 'EOF'
  ╔══════════════════════════════════════════╗
  ║           ioDrive 配置完成！             ║
  ╚══════════════════════════════════════════╝
EOF
echo -e "${NC}"

echo -e "  ${BOLD}生成的文件：${NC}"
echo -e "    - wrangler.toml   (部署配置)"
echo -e "    - .dev.vars       (本地开发密钥)"
echo ""
echo -e "  ${BOLD}常用命令：${NC}"
echo -e "    ${CYAN}npm run dev${NC}      本地开发"
echo -e "    ${CYAN}npm run deploy${NC}   部署到生产环境"
echo ""
echo -e "  ${YELLOW}提示：.dev.vars 包含敏感信息，已被 .gitignore 忽略${NC}"
echo -e "  ${YELLOW}请勿将此文件提交到代码仓库！${NC}"
echo ""
