# 链接胶囊（Link Capsule）

一个带氛围感视觉的多用户链接收藏与共享社区。把链接装进「胶囊」，按标签 / 专题集整理，手动检测失效链接，并把精选胶囊公开到发现页供他人订阅。

## 功能

- **账号体系**：邮箱密码注册登录（better-auth），所有数据按用户隔离
- **胶囊管理**：新增 / 编辑 / 删除 / 置顶，支持标题、URL、描述、颜色；个人主页 `/me` 支持搜索与排序
- **标签**：用户私有的标签体系，多对多关联胶囊，侧边栏筛选
- **胶囊集（Collection）**：按主题归集胶囊，`/collections/:id` 支持拖拽排序
- **链接健康检测**：手动触发，HEAD 8s 超时 + GET 回退，1 小时缓存；批量检测 6 并发 + 进度条 + 可中断；状态角标（ok / dead / redirect / slow / unknown）
- **社区共享**：胶囊可见性 `private / unlisted / public`；发现页 `/discover` 浏览公开胶囊；用户主页 `/u/:userId` + 关注 / 取关；关注时间线 `/feed`；`unlisted` 通过 `/shared/:token` 分享
- **数据导入导出**：JSON 格式导出 / 导入

## 技术栈

| 层 | 技术 |
|----|------|
| 前端 | React 19 · Vite 7 · TypeScript 5.9 · Tailwind CSS 3 · Radix UI (shadcn) · react-router v7 · TanStack Query · Three.js / R3F / GSAP（氛围视觉） |
| 后端 | Hono · tRPC v11 · Drizzle ORM · MySQL · better-auth · Zod · superjson |
| 构建 / 部署 | esbuild（服务端 bundle）· Docker · Zeabur |
| 数据库迁移 | drizzle-kit generate + migrate（受控迁移，不再用 db:push） |

## 项目结构

```
.
├── app/                    # 所有项目代码
│   ├── api/                # Hono 服务端 + tRPC routers
│   │   ├── routers/        # capsule / tag / collection / user
│   │   ├── auth.ts         # better-auth 配置
│   │   ├── context.ts      # tRPC context（注入 session）
│   │   ├── middleware.ts   # publicQuery / protectedProcedure
│   │   └── boot.ts         # 服务入口
│   ├── src/                # React 前端
│   │   ├── pages/          # Home / Profile / Discover / Feed / ...
│   │   ├── components/     # CapsuleCard / BatchHealthCheck / ui/ ...
│   │   ├── providers/      # auth / trpc / health-check
│   │   └── hooks/
│   ├── db/                 # schema.ts + migrations + seed
│   ├── contracts/          # 前后端共享类型
│   ├── Dockerfile
│   ├── docker-entrypoint.sh
│   └── package.json
└── README.md
```

## 本地开发

前置条件：Node.js 20+、本地 MySQL 实例。

```bash
cd app
npm install

# 1. 准备 .env（参考 .env.example）
cp .env.example .env
# 填入 DATABASE_URL / BETTER_AUTH_SECRET / BETTER_AUTH_URL

# 2. 在 MySQL 中手动建库
mysql -u root -p -e "CREATE DATABASE link_capsule CHARACTER SET utf8mb4;"

# 3. 生成并执行迁移
npm run db:generate
npm run db:migrate

# 4. 启动开发服务器
npm run dev
```

访问 http://localhost:3000。

## 常用脚本

在 `app/` 目录下执行：

| 命令 | 作用 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run build` | 前端 `vite build` + 后端 `esbuild` bundle |
| `npm run start` | 生产模式启动（`node dist/boot.js`） |
| `npm run check` | TypeScript 类型检查 |
| `npm run lint` | ESLint |
| `npm run format` | Prettier 格式化 |
| `npm run test` | Vitest 单测 |
| `npm run db:generate` | 生成 Drizzle 迁移文件 |
| `npm run db:migrate` | 执行迁移 |
| `npm run db:seed` | 灌入种子数据 |

## 环境变量

| 变量 | 说明 |
|------|------|
| `DATABASE_URL` | MySQL 连接串，如 `mysql://user:pass@host:3306/link_capsule` |
| `BETTER_AUTH_SECRET` | 认证密钥，用 `openssl rand -base64 32` 生成 |
| `BETTER_AUTH_URL` | 应用根地址，本地为 `http://localhost:3000`，生产为 Zeabur 分配域名 |
| `APP_ID` | 应用 ID |
| `APP_SECRET` | 应用密钥（JWT 签名用） |

## 部署

项目通过 Docker 部署，推荐使用 Zeabur：

1. 将代码推送到 GitHub
2. 在 Zeabur 新建项目，添加 MySQL 服务
3. 导入 GitHub 仓库，**Root Directory 设置为 `app/`**（关键，所有代码在该目录下）
4. 配置环境变量（`DATABASE_URL` 从 Zeabur MySQL 服务变量映射，`BETTER_AUTH_URL` 设为 Zeabur 分配的域名，新生成 `BETTER_AUTH_SECRET`）
5. 部署后会自动执行 `docker-entrypoint.sh`：先 `drizzle-kit migrate` 再 `node dist/boot.js`
6. 绑定域名并验证

注意：Zeabur 的 Root Directory 必须设为 `app/`，否则 Dockerfile 找不到。`BETTER_AUTH_URL` 必须正确，否则 cookie 域不匹配会导致登录失败。
