# Changelog

## 0.1.0 — 2026-09-28

首个发布版。基于 [dsh-plugin-thinking-api](https://github.com/qjf44/dsh-plugin-thinking-api)@0.1.8
（MIT，作者 qjf44）改造，适配 DSH `0.1.7-rc.2` 的 entry-config 设置模型。

### 适配 DSH 0.1.7

- 设置接入改为 0.1.7 的 **entry-config 模型**：导出 `Config` schema，由宿主自动投影成设置表单
  （旧版需要调用 settings 服务的 `installSection`/`setSource`/`onChange`，这套 API 在 0.1.7 已整体删除）
- 配置热更新改用 `loader/volatile-update` 事件，替代旧 `onChange` 回调
- 补齐 `settings/mutate` 的第三参 `expectedRevision` —— 0.1.7 的远端协议按声明个数校验，
  少传会报 `client api: settings/mutate expected 3 argument(s), got 2`
- 内联 `deepEqualJson`，去掉对 `dsh-util-values` 的运行时依赖
- `peerDependencies` 下界抬到 `>=0.1.7-rc.1`：`Config` 的 `.volatile()` 与 `settings.configure()`
  都是 0.1.7 才有的 API，装到 0.1.5/0.1.6 会分别抛
  `TypeError: ...volatile is not a function` / `child.settings.configure is not a function`
- 补上 `@deepseek-ai/dsh-settings` 的 peer 声明

### 修复

- **编辑保存会丢字段**：此前只写 `name` 与 `thinking`，会静默抹掉模型级的 `contextWindow` /
  `maxTokens` / `thinkingEfforts` / `input`，以及 provider 级的 `userAgent`。现在以原始条目为基底、
  由 UI 可见字段覆盖。丢失 `input: [text, image]` 会让 `read_image` 报
  `model "<id>" does not declare image input`
- **保存失败是静默的**：远端调用失败时可能**抛异常**而非返回 `{ ok: false }`，原实现令
  `setBusy(false)` 不可达 —— 表现为「点保存后按钮一直灰着、且没有任何错误提示」
- **删除顺序**：改为先删配置、成功后再清凭证，避免留下「配置还在、密钥没了」的坏状态
- **删除连带**：删除某 provider 前检查是否还有其他 provider 引用同一凭据引用名
  （列表里「复制」出的副本会沿用源的 `apiKeyEnv`），避免误删共用密钥
- **后台刷新打断界面**：只在首次加载时切 loading 视图，否则向导组件被卸载，用户填到一半的
  表单会丢，保存后的「已保存」提示也看不到
- **删光所有 provider 后设置页残留幽灵目录项**
- 模型 id 输入框每敲一键就失焦（React key 用了受控值）
- 探测时非法 baseURL 触发 `new URL()` 抛错，被当成「探测失败」显示假红字
- 并发点击「复制」会算出同一个目标 route，后写覆盖前写
- `apiKeyEnv` 非法形态不再抛裸 `TypeError`（那会让**全部**路由失效），改为带 provider 定位的报错
- 补齐 `credentials.set` / `credentials.unset` / `credentials.resolve` 的异常兜底，不再静默
- 模型 id 重复时拒绝保存并提示（此前静默丢掉一个）
- 补 `load()` 的竞态复查：旧请求返回后不再覆盖新结果（避免 UI 回退与 revision 变陈旧）

### 新增

- 模型行两个复选框：**启用**（决定该模型是否写入配置）与 **思考**（标记推理模型），
  并配套「全选 / 全不选」
- 「已接入」列表内一键复制 provider（route 自动追加 `-copy` 并递增避让，`apiKeyEnv` 沿用源）
- 保存按钮灰置时明确说明缺什么
- README 增加「API 密钥怎么存」一节，说明引用名派生规则与解析策略
