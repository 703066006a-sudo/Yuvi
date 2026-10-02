# 逐刻 · K 线回放

真实 OKX 行情驱动的中文复盘工作台。支持 BTC / ETH / SOL 现货，以及 BTC / ETH USDT 永续；以已收盘 1 分钟数据聚合 1m、5m、15m、30m、1h、4h、1d。

## 使用

点击“随机行情”从 OKX 真实历史数据中抽取完整训练区间。播放、单步前进、后退和时间滑块共用一个回放时钟；切换周期时完整区间会自动铺满图表。空格播放/暂停，左右方向键单步，Esc 退出绘图。绘图支持水平线、水平射线、趋势线、三点平行通道、矩形、文字和测量，提供锚点拖动、吸附、颜色、线型、锁定、隐藏、撤销/重做。

点击保存复盘，保存当前品种最新进度、绘图、指标和时间关联笔记。切换品种会先保存更改。每个登录用户的数据独立存储。

连接 OKX 时必须使用仅“读取”权限的 API Key。系统通过账户配置接口验证权限，检测到 `trade` 或 `withdraw` 权限会拒绝连接；Secret Key 和 Passphrase 使用 AES-GCM 在服务端加密保存。连接后可同步当前图表区间内、最近 3 个月的逐笔成交明细，按真实成交价标记买入和卖出。成交标记遵循回放时钟，未来成交不会提前显示。

## 数据规则

- 数据源为 `https://www.okx.com/api/v5/market/history-candles`，不生成模拟数据。
- 只接受 `confirm=1` 的完整分钟，验证价格关系、时间对齐和交易量，去重并排序。
- 各品种按 UTC 日存入 D1，保存采集时间；完整日复用缓存，缺口日重新抓取。
- 周期聚合只使用 `minute.time + 60 <= replayTime` 的分钟，确保切换大周期不会泄露未来。
- 日线 UTC 开盘；界面时间显示北京时间 UTC+8。
- 缺口不会生成填充价格。缺口警告下的大周期 K 线及指标可能不完整。
- 分钟 OHLC 无法还原分钟内逐笔路径。本项目没有模拟交易、真实下单或虚构逐笔播放。
- 私有成交来自 OKX `GET /api/v5/trade/fills-history`；接口只提供最近 3 个月，最多同步当前 31 天图表区间。
- 2020 年之后的日期可请求加载，实际可用历史由交易所和品种决定；无数据会明确报错，不保证所有品种从该日期起都有数据。
- 随机训练固定加载完整 30 天分钟数据，不再提供 7 / 30 天拆分选择。大周期均线需要足够历史，未达到 20 / 50 根时不显示相应指标。

## 技术

React、TypeScript、Vinext / Vite、Lightweight Charts、SVG 绘图层、Cloudflare Workers / D1。后端使用平台认证身份隔离复盘记录；私有部署仅向站点拥有者开放。

`components/replay-workspace.tsx` 为工作台；`components/replay-chart.tsx` 为图表与绘图；`lib/replay.ts` 为时间截断、聚合及指标；`app/api/candles` 负责行情采集缓存；`app/api/session` 负责用户复盘持久化。

## 本地开发

需要 Node.js 22.13+。执行 `npm run install:ci`，`npm run build`，然后首次初始化本地数据库：

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_tough_leech.sql
npm run dev
```

本地开发通过 `/signin-with-chatgpt` 使用 starter 的本地测试身份；正式部署由平台认证，不能使用本地身份模拟。

```sh
npx tsc --noEmit
node --experimental-strip-types --test tests/replay.test.ts
npm run build
```

6 个核心测试覆盖：防未来泄漏、跨周期价格一致、分钟关闭边界、后退重算指标、缺口保留、行情验证。

人工集成校验：2026-09-14 BTC-USDT 1,440 根分钟数据与官方同一天 96 根 15m OHLCV 聚合一致；本地接口的认证、无效输入、跨源写入拒绝、缓存和保存恢复已验证。

图表组件归属 TradingView：https://www.tradingview.com/ 。

## 图表与绘图（浅色桌面版）

桌面工作台采用浅色紧凑布局。支持趋势线、水平线、平行通道、斐波那契回撤、多头仓位、空头仓位、矩形和文字，也保留水平射线与测量。选中绘图后可通过浮动工具条调整颜色、线宽、虚线和填充透明度；对象面板提供隐藏、锁定、删除和精确坐标编辑。拖动图形可整体平移，拖动圆形锚点可调整形状。

斐波那契回撤为双点工具，默认比例为 0、0.236、0.382、0.5、0.618、0.786、1，支持反向绘制。平行通道和多空仓位使用三个点。

绘图保存原始时间与价格。切换周期只映射显示位置，不修改保存的锚点；数据缺口按相邻实际 K 线时间插值，区间外按当前周期延伸。回退时隐藏未来创建的绘图；编辑不保存历史版本。新增线宽、透明度字段为可选字段，兼容旧复盘记录。

新增几何检查：`node --experimental-strip-types --test tests/drawings.test.ts`。

## GitHub 与运行部署

GitHub 仓库用于保存源码。本项目含服务端接口、ChatGPT 登录及 Cloudflare D1 数据库，不能直接作为 GitHub Pages 静态网站运行。不要提交 `.dev.vars`、`.env`、数据库文件、依赖目录或构建产物。现有网站通过 Sites 部署。
