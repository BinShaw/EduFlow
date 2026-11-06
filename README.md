# EduFlow

EduFlow 是一个面向学生咨询至试听流程的管理工作台，是为 Austin Education 技术作业构建的全栈应用。

**在线演示：**[eduflow.shawlab.cn](https://eduflow.shawlab.cn)

## 项目范围

当前版本覆盖学生咨询建档、试听排期、试听结果记录和跟进完成等端到端流程，并提供 Admin 与 Teacher 两类使用体验、基于角色的访问控制、由数据库保障的排期规则，以及可选的 AI 跟进文案草稿。

首个版本不包含收款、正式入学写入、课时扣减、考勤登记、消息发送、通用排课或多校区管理。这些流程需要更多业务规则，不在当前实现范围内。

## 功能

- Admin 可以创建和搜索学生档案、查看自己负责或全部学生，并且只能编辑自己负责的记录。
- 试听排期会在服务端和 PostgreSQL 中检查课程容量，以及学生和教师的时间冲突。
- 试听结果、潜在学生阶段、跟进事项和审计记录以事务方式保存。
- Teacher 可以查看当天自己的课程和有限范围内的班级名单。
- 跟进文案草稿通过 LLM 结构化输出生成，并经过服务端校验；生成失败时可手动撰写。草稿不会自动发送。
- 界面支持 `en-AU` 和 `zh-CN`；业务日期和时间使用 `Australia/Melbourne` 时区。
- 主要业务流程均提供加载、空状态、错误和重试状态。

## 技术栈

- Web：React、TypeScript、Vite、Tailwind CSS
- API：Node.js、NestJS、REST、Prisma
- 数据库：PostgreSQL
- AI：通过 OpenAI 兼容 SDK 调用 DeepSeek，API 请求仅由服务端发起
- 部署示例：Docker Compose 与 Caddy

应用采用模块化单体架构，将业务流程和权限规则集中管理。PostgreSQL 提供事务、关系约束和用于排课的时间范围排斥约束。数据库、API 和 Web 代理分别运行在独立服务中；数据库没有映射到宿主机的端口。

## 本地运行

环境要求：Node.js 22.18 或更高版本、npm 11 和 PostgreSQL 17。创建本地 PostgreSQL 数据库后，将 `.env.example` 复制到仓库外的绝对路径，并填写所需配置。不要提交仓库外的环境变量文件或真实 API 密钥。

外部环境变量文件至少需要设置以下变量：


| 变量                | 用途                                             |
| ------------------- | ------------------------------------------------ |
| `DATABASE_URL`      | PostgreSQL 连接字符串                            |
| `JWT_SECRET`        | 至少 32 字节的随机密钥                           |
| `CORS_ORIGIN`       | 本地 Web 来源，通常为`http://localhost:5173`     |
| `PORT` / `NODE_ENV` | API 端口和运行模式，通常为`3000` / `development` |
| `DEEPSEEK_API_KEY`  | 可选；留空时仍可使用手动撰写流程                 |

安装依赖、生成 Prisma Client、应用经过审查的数据库迁移，然后启动 API 和 Web 开发服务器：

```sh
npm ci
npm run db:generate
node scripts/run.mjs "<absolute-path-to-external-env-file>" db:deploy
node scripts/run.mjs "<absolute-path-to-external-env-file>" dev
```

打开 `http://localhost:5173`。Web 开发服务器会将 `/api` 请求代理到 `3000` 端口上的 API。

演示数据为可选项。首次执行 seed 前，在外部环境变量文件中设置 `ALLOW_DEMO_SEED=true` 和至少 12 个字符的 `SEED_DEMO_PASSWORD`，然后运行：

```sh
node scripts/run.mjs "<absolute-path-to-external-env-file>" db:seed
```

初始化完成后，将 `ALLOW_DEMO_SEED` 设为 `false`。Seed 数据均为虚构内容，仅用于本地演示。

## 测试

```sh
npm run build
npm test
npm run format:check
```

集成测试需要单独且可随时销毁的 PostgreSQL 数据库。测试会创建和修改数据，请勿将生产或演示数据库用于测试。通过仓库外的环境变量文件配置数据库，并在运行前显式设置 `ALLOW_INTEGRATION_TESTS=true`。

## 部署

仓库提供基于 Docker Compose 的部署配置和 Dockerfile，由 Caddy 负责 HTTPS 终止和静态 Web 服务。将 DNS 域名指向服务器并开放所需的 HTTP/HTTPS 流量；域名、证书联系人、数据库凭据、迁移连接串和 API 运行时配置通过外部配置文件提供。

Compose 环境变量文件提供 `IMAGE_TAG`、`DOMAIN`、`ACME_EMAIL`、`POSTGRES_USER`、`POSTGRES_DB`、`POSTGRES_PASSWORD`、`POSTGRES_APP_PASSWORD`、`MIGRATION_DATABASE_URL` 和 `EDUFLOW_ENV_FILE`。应用环境变量文件提供 `DATABASE_URL`、`JWT_SECRET`、`NODE_ENV`、`PORT`、`CORS_ORIGIN`，以及可选的 `DEEPSEEK_API_KEY`、`DEEPSEEK_BASE_URL` 和 `DEEPSEEK_MODEL`。`EDUFLOW_ENV_FILE` 是应用环境变量文件的绝对路径。数据库迁移使用数据库所有者账户；运行中的 API 使用权限受限的应用账户。

验证 Compose 配置，依次构建镜像，启动 PostgreSQL 并执行迁移，最后启动 API 和 Web 服务：

```sh
docker compose --env-file <compose-env-file> -f infra/compose.yaml config --quiet
docker compose --env-file <compose-env-file> -f infra/compose.yaml build api
docker compose --env-file <compose-env-file> -f infra/compose.yaml build web
docker compose --env-file <compose-env-file> -f infra/compose.yaml up -d db
docker compose --env-file <compose-env-file> -f infra/compose.yaml --profile tools run --rm migrate
docker compose --env-file <compose-env-file> -f infra/compose.yaml up -d api web
docker compose --env-file <compose-env-file> -f infra/compose.yaml ps
```

请根据目标环境选择 CPU、内存、存储、备份和监控配置。数据库和 API 端口应保持私有；密钥应存放在仓库和容器镜像层之外；在依赖备份前，应先测试恢复流程。Compose 资源限制和部署拓扑可按所选服务器调整。

## AI 工具使用

本项目使用 Codex 辅助分析作业要求、比较设计方案、生成实现和测试、排查问题并整理文档。仓库维护者负责方案决策、审查生成的代码、运行检查等。

本项目没有使用可变余额替代可审计的课时流水，不会自动发送生成的消息，也不依赖客户端检查来保证排期规则。LLM 仅用于生成可编辑的文案草稿；调用失败时，用户仍可继续手动处理。
