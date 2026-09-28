# Dsh-OtherAPI

DeepSeek Harness 插件：一键配置任意 OpenAI 兼容 API 并自动带思考模式。

**来源**：基于 [dsh-plugin-thinking-api](https://github.com/qjf44/dsh-plugin-thinking-api)@0.1.8（MIT，作者 qjf44）改造，
适配 DSH `0.1.7-rc.2` 的 entry-config 设置模型。核心适配：

- 设置接入改为 0.1.7 的 entry-config 模型（导出 `Config` schema + `configure({auto:false})`）
- 移除已废弃的 `installSection`/`setSource`/`onChange` 兼容层
- 内联 `deepEqualJson`，摆脱对 `dsh-util-values` 的运行时依赖
- 用 `loader/volatile-update` 事件替代旧 `onChange` 回调
- 补齐 `settings/mutate` 的第三参 `expectedRevision`（0.1.7 的远端协议按声明个数校验，
  少传会抛 `client api: settings/mutate expected 3 argument(s), got 2`）
- 保存/删除/探测全部包 try/catch/finally：远端调用失败时会**抛异常**而非返回
  `{ok:false}`，原实现会让 `setBusy(false)` 不可达，表现为「点保存后按钮恒灰且无任何提示」
- 模型行改为两个复选框「启用 / 思考」：前者决定该模型是否写入配置
- 列表内一键复制 provider（route 自动追加 `-copy` 并递增避让、`apiKeyEnv` 沿用源）

## 安装

从 GitHub 仓库（推荐）：

```sh
dsh plugin --profile web add github:ShukebtAb/Dsh-OtherAPI
```

本地目录（开发调试）：

```sh
dsh plugin --profile web add file:/绝对路径/Dsh-OtherAPI
```

## 兼容性

| 插件版本 | DSH 版本 | 状态 |
| --- | --- | --- |
| 0.1.0 | `0.1.7-rc.2` | ✅ 运行时验证通过（启动、设置面板、模型选择器三层均已实测） |
| 0.1.0 | 0.1.5 – 0.1.6 | ❌ 不支持 |
| 0.1.0 | `0.1.8-rc.1` 及以后 | ⚠️ 未验证（`peerDependencies` 上界为 `<0.1.8`，需要时再放宽） |

**为什么 0.1.5/0.1.6 不支持**：本插件用的是 0.1.7 引入的 entry-config 设置模型 ——
`Config` 字段的 `.volatile()`（schemastery）与 `settings.configure()`（dsh-settings）
都是 0.1.7 才有的 API。装到旧版会分别抛
`TypeError: ...volatile is not a function` / `child.settings.configure is not a function`。

## API 密钥怎么存

**不要把明文 key 写进配置。** 配置里只保存**引用名**：

```yaml
providers:
  goodAPI:
    apiKeyEnv: GOODAPI_API_KEY    # 引用名，不是密钥本身
```

密钥值通过 **Web 界面 → OtherAPI 面板**填写，由 credentials 服务写入
`$DSH_HOME/.credentials.yaml` 的 `refs` 段。引用名由 route 自动派生
（`goodAPI` → `GOODAPI_API_KEY`），无需手填。

### ⚠️ 解析是「独占」而不是「依次降级」——这是有意的

`resolveApiKey` 只在**没有** credentials 服务时才读环境变量：

```js
const hit = credentials !== undefined
  ? await credentials.resolve(ref)            // 有该服务 → 只用它
  : launchEnvironmentOf(ctx).get(ref)?.value  // 没有 → 才看环境变量
```

这是三元判断：**在正常部署（有 credentials 服务）下，环境变量完全不会被采样**，
因此无法通过设置一个环境变量来注入或覆盖密钥。改写成「credentials 失败则回退
环境变量」会削弱这一点，**请勿顺手改**。

（若确实需要环境变量方式，得在 credentials 服务缺失的组合里使用，或显式改造此处。）

## 许可

MIT。原始实现版权归 qjf44 所有，本改造版同样以 MIT 发布。