// 一次性迁移脚本：将 R2 JSON 元数据迁到 D1
//
// 用法：
//   1. wrangler dev 启动本地开发
//   2. 在另一个终端：node scripts/migrate-to-d1.ts
//
// 前提：
//   - wrangler.toml 已配置 [[d1_databases]] binding = "META_DB"
//   - 本地 dev 服务已启动并初始化 D1 schema
//   - 通过访问 wrangler dev 的 API 来触发迁移（脚本本身调 worker 内部端点）

const DEV_URL = process.env.DEV_URL || 'http://localhost:8787';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

async function main() {
  console.log('=== R2 -> D1 元数据迁移 ===\n');

  // 1. 登录获取 JWT
  console.log('[1/3] 登录中...');
  const loginRes = await fetch(`${DEV_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: process.env.ADMIN_USER || 'admin',
      password: process.env.ADMIN_PASS || 'admin',
      turnstile: 'XXXX.DUMMY.TOKEN.XXXX', // 开发环境 Turnstile 通常为 mock
    }),
  }).catch((e) => {
    console.error('登录失败（请确认 wrangler dev 在运行，且 Turnstile 配置了 mock token）:', e);
    process.exit(1);
  });

  if (!loginRes.ok) {
    console.error('登录失败:', loginRes.status, await loginRes.text());
    console.error('提示：开发环境下 Turnstile secret 应为 "1x0000000000000000000000000000000AA"，widget 用 "1x00000000000000000000AA"');
    process.exit(1);
  }

  const { token } = await loginRes.json();
  console.log('  ✓ 登录成功\n');

  // 2. 调用迁移端点
  console.log('[2/3] 触发迁移...');
  const migrateRes = await fetch(`${DEV_URL}/api/migration/r2-to-d1`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!migrateRes.ok) {
    console.error('迁移失败:', migrateRes.status, await migrateRes.text());
    process.exit(1);
  }

  const result = await migrateRes.json();
  console.log('  ✓ 迁移完成');
  console.log('  统计:', result);
}

main().catch(console.error);
