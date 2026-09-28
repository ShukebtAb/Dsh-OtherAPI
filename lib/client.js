// Dsh-OtherAPI — Client half（浏览器 bundle）。基于 Dsh-OtherAPI@0.1.8 改造。
// 手写在 DSH module-loader 格式：`require` 回答平台外部依赖，其余内联。
// 注册「设置 → OtherAPI」面板：统一接入向导（模板/自定义一处走完），走修复版适配器。
window.__ModuleLoader__.load({
  id: "dsh-other-api",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    const React = require("react");
    // DSH 0.1.5 兼容修复：createSnapshotStore 已从废弃的 @deepseek-ai/dsh-client-runtime
    // 迁移到平台内置模块 @deepseek-ai/dsh-client-store（由 Web 壳作为 seed 提供）。
    // 继续 require 旧包会 miss 模块表；而强行挂载旧版 runtime 又会重复注册
    // sessions / workspaces 服务，导致官方 controller 加载失败。
    const { createSnapshotStore } = require("@deepseek-ai/dsh-client-store");
    // 不依赖 dsh-client-web-react（非独立 bundle），用 React 18 原生 useSyncExternalStore
    // 直接订阅 createSnapshotStore 返回的 { getSnapshot, subscribe }，与官方 bindSnapshotSelector 等价。
    const useSyncExternalStore = React.useSyncExternalStore;

    const NS = "other-api";

    // 注意：此表必须与 lib/index.mjs 里的 templates 保持一致（跨端无法直接 import）。
    /** 模板清单（含默认模型，「填 key 即用」的兜底）。 */
    const TEMPLATES = [
      // codebuddy 预置清单 = 2026-08 实时探测确认的全部可用模型（与 lib/index.mjs 保持一致）。
      { route: "codebuddy", displayName: "CodeBuddy", baseURL: "https://copilot.tencent.com/v2", thinkingFormat: "deepseek", userAgent: "dsh-other-api/1.0", models: {
        "deepseek-v4-pro": { name: "DeepSeek V4 Pro", thinking: true },
        "deepseek-v4-flash": { name: "DeepSeek V4 Flash", thinking: false },
        "deepseek-v3.2": { name: "DeepSeek V3.2", thinking: false },
        "deepseek-v3": { name: "DeepSeek V3", thinking: false },
        "deepseek-r1": { name: "DeepSeek R1", thinking: true },
        "glm-5.3-flash": { name: "GLM 5.3 Flash", thinking: true },
        "glm-5.2": { name: "GLM 5.2", thinking: false },
        "glm-5.1": { name: "GLM 5.1", thinking: false },
        "glm-5v-turbo": { name: "GLM 5V Turbo", thinking: false },
        "kimi-k2.7": { name: "Kimi K2.7", thinking: false },
        "kimi-k2.5": { name: "Kimi K2.5", thinking: false },
        "hy3": { name: "Hunyuan 3", thinking: true },
        "hy3-x": { name: "Hunyuan 3 X", thinking: true },
        "hy3-preview": { name: "Hunyuan 3 Preview", thinking: false },
        "hy3-preview-agent": { name: "Hunyuan 3 Preview Agent", thinking: false },
        "minimax-m3-pay": { name: "MiniMax M3 Pay", thinking: false },
        "minimax-m3": { name: "MiniMax M3", thinking: false },
      } },
      { route: "deepseek", displayName: "DeepSeek", baseURL: "https://api.deepseek.com", thinkingFormat: "deepseek", models: { "deepseek-v4-pro": { name: "DeepSeek V4 Pro", thinking: true }, "deepseek-v4-flash": { name: "DeepSeek V4 Flash", thinking: false } } },
      { route: "openrouter", displayName: "OpenRouter", baseURL: "https://openrouter.ai/api/v1", thinkingFormat: "openrouter", models: { "deepseek/deepseek-chat-v3-0324": { name: "DeepSeek Chat V3", thinking: false } } },
      { route: "siliconflow", displayName: "SiliconFlow", baseURL: "https://api.siliconflow.cn/v1", thinkingFormat: "deepseek", models: { "deepseek-ai/DeepSeek-V3": { name: "DeepSeek V3", thinking: false }, "deepseek-ai/DeepSeek-R1": { name: "DeepSeek R1", thinking: true } } },
      { route: "moonshot", displayName: "Moonshot", baseURL: "https://api.moonshot.cn/v1", thinkingFormat: "openai", models: { "kimi-k2-thinking": { name: "Kimi K2 Thinking", thinking: true }, "kimi-k2-turbo-preview": { name: "Kimi K2 Turbo", thinking: false } } },
      { route: "zhipu", displayName: "智谱 GLM", baseURL: "https://open.bigmodel.cn/api/paas/v4", thinkingFormat: "openai", models: { "glm-4.5": { name: "GLM-4.5", thinking: false }, "glm-4.5-air": { name: "GLM-4.5 Air", thinking: false } } },
      { route: "qwen", displayName: "通义千问", baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1", thinkingFormat: "qwen", models: { "qwen-max": { name: "Qwen Max", thinking: false }, "qwen3-max": { name: "Qwen3 Max", thinking: true } } },
      { route: "volcengine", displayName: "火山引擎", baseURL: "https://ark.cn-beijing.volces.com/api/v3", thinkingFormat: "deepseek", models: { "deepseek-v4-pro": { name: "DeepSeek V4 Pro", thinking: true } } },
      { route: "baichuan", displayName: "百川", baseURL: "https://api.baichuan-ai.com/v1", thinkingFormat: "openai", models: { "Baichuan4": { name: "Baichuan4", thinking: false } } },
      { route: "minimax", displayName: "MiniMax", baseURL: "https://api.minimax.chat/v1", thinkingFormat: "openai", models: { "MiniMax-M1": { name: "MiniMax M1", thinking: true } } },
      { route: "stepfun", displayName: "阶跃星辰", baseURL: "https://api.stepfun.com/v1", thinkingFormat: "openai", models: { "step-2-16k": { name: "Step 2 16K", thinking: false } } },
      { route: "hunyuan", displayName: "腾讯混元", baseURL: "https://api.hunyuan.cloud.tencent.com/v1", thinkingFormat: "openai", models: { "hunyuan-turbo": { name: "Hunyuan Turbo", thinking: false }, "hunyuan-t1-latest": { name: "Hunyuan T1", thinking: true } } },
    ];

    const THINKING_FORMATS = [
      "deepseek", "openai", "openrouter", "together", "zai", "qwen", "string-thinking",
    ];

    /** 从 provider route 派生凭证名（对齐官方 deriveKeyRef）。 */
    function deriveKeyRef(provider) {
      return `${provider.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_API_KEY`;
    }

    /**
     * 为「复制 provider」生成一个不冲突的新 route。
     * route 是配置主键，重复会被 host 端判为已存在，故副本必须换名。
     * @param {string} base 原 route
     * @param {string[]} taken 已占用的 route 列表
     */
    function uniqueCopyRoute(base, taken) {
      const used = new Set(taken || []);
      let candidate = `${base}-copy`;
      let n = 2;
      while (used.has(candidate)) candidate = `${base}-copy${n++}`;
      return candidate;
    }

    /**
     * 模型行的稳定标识。
     *
     * 不能用模型 id 当 React key：id 同时是那个输入框的受控值，一旦改动 key 就变，
     * React 会卸载重建整行 → 每敲一个字符就失焦。用挂载时分配的 uid 才稳定。
     */
    let rowUidSeq = 0;
    function nextRowUid() {
      return `row-${++rowUidSeq}`;
    }

    /** 安全判断 baseURL 是否指向腾讯 CodeBuddy 网关；非法 URL 返回 false 而不是抛错。 */
    function isTencentCopilot(baseURL) {
      try {
        return /^copilot\.tencent\.com$/.test(new URL(baseURL).host || "");
      } catch {
        return false;
      }
    }

    /** 按模型 id/名启发式推断是否思考模型（探测结果用；模板预置以模板元数据为准）。 */
    function guessThinking(id, name) {
      const s = `${id || ""} ${name || ""}`.toLowerCase();
      if (/(think|reasoning|\br1\b|-r1\b|\bo1\b|\bo3\b|-pro\b)/.test(s)) return true;
      if (/(flash|lite|mini|turbo|air|small|nano)/.test(s)) return false;
      return false;
    }

    /** 按 baseURL 精确匹配内置模板（尾斜杠归一）。 */
    function templateForBaseURL(baseURL) {
      const base = (baseURL || "").replace(/\/+$/, "");
      if (base.length === 0) return undefined;
      return TEMPLATES.find((tpl) => (tpl.baseURL || "").replace(/\/+$/, "") === base);
    }

    /** 极简 CSS（内联，避免引入构建链）。 */
    const CSS = `
      .other-api-root { max-width: 720px; display: flex; flex-direction: column; gap: 16px; }
      .other-api-card { border: 1px solid var(--dsw-alias-border-l2); border-radius: 12px; padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; }
      .other-api-title { margin: 0; font-size: 16px; font-weight: 500; color: var(--dsw-alias-label-primary); }
      .other-api-sub { margin: 0; font-size: 13px; color: var(--dsw-alias-label-tertiary); }
      .other-api-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .other-api-field { display: flex; flex-direction: column; gap: 4px; flex: 1; min-width: 200px; }
      .other-api-label { font-size: 12px; color: var(--dsw-alias-label-secondary); }
      .other-api-input, .other-api-select { height: 32px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 8px; background: var(--dsw-alias-bg-layer-1); color: var(--dsw-alias-label-primary); padding: 0 10px; font-size: 14px; font-family: inherit; }
      .other-api-btn { height: 32px; padding: 0 14px; border: none; border-radius: 16px; cursor: pointer; font-size: 13px; background: var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-label-primary-foreground); }
      .other-api-btn:disabled { opacity: 0.4; cursor: default; }
      .other-api-btn-ghost { background: transparent; border: 1px solid var(--dsw-alias-border-l2); color: var(--dsw-alias-label-primary); }
      .other-api-btn-danger { background: transparent; border: 1px solid var(--dsw-alias-state-error-primary); color: var(--dsw-alias-state-error-primary); }
      .other-api-err { font-size: 12px; color: var(--dsw-alias-state-error-primary); margin: 0; }
      .other-api-ok { font-size: 12px; color: var(--dsw-alias-state-success-primary); margin: 0; }
      .other-api-list { display: flex; flex-direction: column; gap: 8px; }
      .other-api-item { display: flex; align-items: center; gap: 10px; border: 1px solid var(--dsw-alias-border-l2); border-radius: 10px; padding: 10px 12px; }
      .other-api-item-name { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; }
      .other-api-item-route { font-size: 12px; color: var(--dsw-alias-label-tertiary); }
      .other-api-divider { border: none; border-top: 1px solid var(--dsw-alias-border-l2); margin: 4px 0; }
      .other-api-model-id { flex: 1; min-width: 140px; }
      .other-api-model-name { flex: 1.4; min-width: 140px; }
      .other-api-x { width: 28px; height: 28px; padding: 0; border-radius: 14px; display: inline-flex; align-items: center; justify-content: center; }
      /* 模型行的两个复选框各带一个短标签：「启用」决定是否写入配置，「思考」标记推理模型。
         早期版本只有一个无标签复选框（语义=思考），极易被误读成「选中」，导致用户以为
         取消勾选就能剔除模型，实则全部模型仍被保存。 */
      .other-api-chk { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; color: var(--dsw-alias-label-secondary); cursor: pointer; white-space: nowrap; user-select: none; }
      .other-api-chk input { margin: 0; cursor: pointer; }
      /* 未启用的行整体淡化，一眼可见它不会进入配置。 */
      .other-api-row-off { opacity: 0.45; }
      /* 全选切换按钮：未全选时蓝色（点击=全选），已全选时灰色（点击=取消）。 */
      .other-api-allbtn { height: 26px; padding: 0 12px; border-radius: 13px; font-size: 12px; font-family: inherit; cursor: pointer; background: transparent; border: 1px solid var(--dsw-alias-button-primary-fill); color: var(--dsw-alias-button-primary-fill); }
      .other-api-allbtn-on { border-color: var(--dsw-alias-border-l2); color: var(--dsw-alias-label-tertiary); }
      .other-api-allbtn:disabled { opacity: 0.4; cursor: default; }
      .other-api-selectall { justify-content: flex-start; }
    `;

    /** 面板数据 store（对齐 ModelsSettingsStore 的「最新写入胜出」策略）。 */
    class ThinkingApiStore {
      constructor(ctx) {
        // DSH 0.1.5 兼容修复：settings/credentials/llm 的取数契约从旧的
        // `connection.api.*` 迁移到 cordis 命名空间服务 `ctx.remote.*`。
        // 0.1.5 的 connection handle 已不再暴露 `.api`（只留 rpc/状态句柄），
        // 旧写法取 `connection.api.settings` 会报
        // "Cannot read properties of undefined (reading 'settings')"。
        this.ctx = ctx;
        this.generation = 0;
        this.store = createSnapshotStore({
          status: "idle",
          error: null,
          writable: false,
          providers: {},
          credentials: {},
          // 该 namespace 的乐观锁版本号，由 describe() 返回。remote 层的
          // settings/mutate 声明了三个参数（ns, ops, expectedRevision），
          // 少传一个会直接报「expected 3 argument(s), got 2」——即使值允许 undefined。
          revision: undefined,
        });
      }
      async load() {
        const generation = ++this.generation;
        // 只在**首次加载**时切到 loading 视图。否则每次后台刷新（保存成功后、
        // 远端 settings/document-updated 推送）都会把整棵 UI 换成 loading 占位，
        // 向导组件随之被卸载 —— 用户填到一半的表单会丢，并且保存后的「已保存」
        // 提示落在已卸载的实例上，永远看不到。
        if (this.store.getSnapshot().status === "idle") {
          this.store.update((s) => { s.status = "loading"; s.error = null; });
        }
        try {
          // 0.1.5：settings/describe() → { ok, value:{ writable, namespaces } }（无 result 包裹）。
          const settingsResponse = await this.ctx.remote.settings.describe();
          if (generation !== this.generation) return;
          if (!settingsResponse.ok) throw new Error(settingsResponse.error.message);
          const namespaces = settingsResponse.value.namespaces;
          const view = namespaces.find((n) => n.ns === NS);
          const providers = (view && view.value && view.value.providers) || {};
          const writable = settingsResponse.value.writable;
          const revision = view && typeof view.revision === "number" ? view.revision : undefined;

          // 根据本次拿到的 providers 派生凭证引用，再查凭证状态。
          let refs = Object.values(providers)
            .map((p) => p && p.apiKeyEnv)
            .filter((ref) => typeof ref === "string" && ref.length > 0);
          // 去重，避免重复 describe 同一 ref。
          refs = [...new Set(refs)];
          let credentials = {};
          if (refs.length > 0) {
            const credsResponse = await this.ctx.remote.credentials.describe(refs);
            // 第二个 await 之后必须**再查一次** generation：否则会出现「旧 load 通过
            // 首个检查 → 新 load 先完成并写入 → 旧 load 返回并覆盖」，导致 UI 回退到
            // 旧快照，且 revision 变陈旧（后续 mutate 的乐观锁比对会因此被拒）。
            if (generation !== this.generation) return;
            if (credsResponse.ok) credentials = credsResponse.value;
          }

          this.store.update((s) => {
            s.status = "ready";
            s.error = null;
            s.writable = writable;
            s.providers = providers;
            s.credentials = credentials;
            s.revision = revision;
          });
        } catch (error) {
          if (generation !== this.generation) return;
          // 后台刷新失败不要打断正在使用的界面：已就绪时保持 ready，只把错误挂出来
          // 由 Section 显示成一行提示；只有首次加载失败才整页切到错误视图。
          const wasReady = this.store.getSnapshot().status === "ready";
          this.store.update((s) => {
            s.error = error.message || String(error);
            if (!wasReady) s.status = "error";
          });
        }
      }
      /** 写入一个 provider（set path op），返回失败信息或 undefined。 */
      async saveProvider(route, profile, keyValue) {
        const keyRef = deriveKeyRef(route);
        const storesKey = keyValue && keyValue.trim().length > 0;
        // settings/mutate 的远端签名是 (ns, ops, expectedRevision) —— 三个参数都必须显式传。
        // 协议层按声明参数个数校验，少传一个会抛：
        //   client api: settings/mutate expected 3 argument(s), got 2
        // 第三个值本身允许 undefined（z.union([z.undefined(), z.number()])），
        // 传 undefined 表示「无条件写入」，不做乐观锁比对。
        const revision = this.store.getSnapshot().revision;
        const response = await this.ctx.remote.settings.mutate(NS, [{ op: "set", path: ["providers", route], value: profile }], revision);
        if (!response.ok) return response.error.message;
        if (storesKey) {
          try {
            const stored = await this.ctx.remote.credentials.set(keyRef, keyValue.trim());
            // settings 已落盘但密钥未写入：明确提示（重试保存即可，密钥 set 是幂等的）。
            if (!stored.ok) {
              await this.load();
              return `Provider saved, but the API key could not be stored (${stored.error.message}). Re-save to retry.`;
            }
          } catch (error) {
            // 远端调用抛异常时配置**已经**写进去了：必须刷新，否则列表里看不到刚创建的
            // provider，界面与实际状态不一致（比报错本身更难排查）。
            await this.load();
            return `Provider saved, but storing the API key failed: ${(error && error.message) || String(error)}. Re-save to retry.`;
          }
        }
        await this.load();
        return undefined;
      }
      /**
       * 删除一个 provider。
       *
       * **顺序：先删配置、成功后再清凭证。** 反过来会在配置删除失败时留下
       * 「配置还在、密钥没了」的坏状态，而用户只看到一条 settings 报错，根本猜不到
       * 密钥已经被清掉。
       *
       * 凭证回收还有个前提：**只有当没有别的 provider 仍引用同一个 ref 时才删**。
       * 列表里的「复制」会让副本沿用源的 apiKeyEnv，所以删源不能把副本共用的那把 key
       * 一并带走（否则副本立刻报「引用的密钥未配置」）。
       */
      async removeProvider(route) {
        const keyRef = deriveKeyRef(route);
        // 同 saveProvider：第三参 expectedRevision 必须显式传（可为 undefined）。
        const revision = this.store.getSnapshot().revision;
        const response = await this.ctx.remote.settings.mutate(NS, [{ op: "unset", path: ["providers", route] }], revision);
        if (!response.ok) return response.error.message;

        // 配置已删除。注意此时 store 里还是删除前的快照，正好用来判断还有谁引用这个 ref。
        const stillReferenced = Object.entries(this.store.getSnapshot().providers || {})
          .some(([otherRoute, other]) => otherRoute !== route && other && other.apiKeyEnv === keyRef);
        if (!stillReferenced) {
          // unset 失败不推翻「已删除」的结果，但**绝不静默**：残留的孤儿凭证会让日后
          // 同名 route 意外复用旧 key（本文件的既定原则就是绝不静默失败）。
          try {
            const cleared = await this.ctx.remote.credentials.unset(keyRef);
            if (!cleared.ok) {
              await this.load();
              return `Provider removed, but its API key reference could not be cleared (${cleared.error.message}).`;
            }
          } catch (error) {
            await this.load();
            return `Provider removed, but clearing its API key reference failed: ${(error && error.message) || String(error)}`;
          }
        }
        await this.load();
        return undefined;
      }
      /** 探测模型列表。providerRoute 用于让 host 解析已存储的凭证（编辑模式下 key 留空）。 */
      async discoverModels(baseURL, apiKey, settingsNs, providerRoute) {
        // 0.1.5：llm/discoverModels(settingsNs, request) → { ok, value: array }。
        const request = {
          ...(providerRoute && providerRoute.length > 0 ? { provider: providerRoute } : {}),
          ...(baseURL && baseURL.trim().length > 0 ? { baseURL: baseURL.trim() } : {}),
          ...(apiKey && apiKey.trim().length > 0 ? { apiKey: apiKey.trim() } : {}),
        };
        const response = await this.ctx.remote.llm.discoverModels(settingsNs || NS, request);
        if (!response.ok) throw new Error(response.error.message);
        return response.value;
      }
    }

    const e = React.createElement;

    /**
     * 统一接入向导：一个入口服务「模板」和「自定义」两种来源，也复用为「编辑」表单。
     * 流程：选来源 → 填 key → 模型（模板兜底 / 探测自动标思考 / 手填追加）→ 保存。
     */
    function Wizard({ api, store, t, existingRoutes, editTarget, onSaved, onEditCancel }) {
      const [source, setSource] = React.useState("custom"); // 模板 route id 或 "custom"
      const [route, setRoute] = React.useState("");
      const [displayName, setDisplayName] = React.useState("");
      const [baseURL, setBaseURL] = React.useState("");
      const [thinkingFormat, setThinkingFormat] = React.useState("deepseek");
      const [key, setKey] = React.useState("");
      const [rows, setRows] = React.useState([]); // [{id, name, thinking}]
      const [addText, setAddText] = React.useState("");
      const [busy, setBusy] = React.useState(false);
      const [fetching, setFetching] = React.useState(false);
      const [failure, setFailure] = React.useState(undefined);
      const [notice, setNotice] = React.useState(undefined);
      const [saved, setSaved] = React.useState(false);
      const [editingRoute, setEditingRoute] = React.useState(undefined);

      // 选择模板：带出 route / baseURL / displayName / thinkingFormat / 默认模型。
      const pickTemplate = (templateRoute) => {
        setSource(templateRoute);
        setSaved(false);
        setFailure(undefined);
        setNotice(undefined);
        if (templateRoute === "custom") {
          setRoute("");
          setDisplayName("");
          setBaseURL("");
          setThinkingFormat("deepseek");
          setRows([]);
          setKey("");
          return;
        }
        const tpl = TEMPLATES.find((x) => x.route === templateRoute);
        if (!tpl) return;
        setRoute(tpl.route);
        setDisplayName(tpl.displayName);
        setBaseURL(tpl.baseURL);
        setThinkingFormat(tpl.thinkingFormat);
        setRows(Object.entries(tpl.models || {}).map(([id, m]) => ({
          id, name: m && m.name || id, thinking: !!(m && m.thinking), raw: m || {}, uid: nextRowUid(),
        })));
        setKey("");
      };

      /**
       * 把向导彻底恢复到初始（新建）状态。
       *
       * 必须同时清空表单字段：只清 editingRoute 会让 route 输入框仍留着刚编辑过的值，
       * 于是 isEditing 变回 false 后 routeTaken 立即为真，界面会弹出
       * 「该 Route ID 已存在」这种令人困惑的提示（实测复现）。
       */
      const resetWizard = () => {
        setEditingRoute(undefined);
        setSource("custom");
        setRoute("");
        setDisplayName("");
        setBaseURL("");
        setThinkingFormat("deepseek");
        setKey("");
        setRows([]);
        setFailure(undefined);
        setNotice(undefined);
        setSaved(false);
        // 同时通知父组件清掉 editTarget —— 否则它仍是旧值，effect 会重新把
        // editingRoute 置回该 route，导致「取消」看起来没生效。
        onEditCancel && onEditCancel();
      };

      // 编辑已有 provider：回填表单，route 只读，key 留空表示「不改」。
      React.useEffect(() => {
        if (editTarget === undefined || editTarget === null) {
          // 退出编辑：连同表单一起复位，避免残留旧 route 触发「已存在」误报。
          // 这里**不**调用 resetWizard()（它会回调 onEditCancel），否则本 effect
          // 与父组件 setEditTarget 之间会形成回环 —— 父组件是 editTarget 的源头，
          // 由它自己负责清值；这里只做本地字段复位。
          setEditingRoute(undefined);
          setSource("custom");
          setRoute("");
          setDisplayName("");
          setBaseURL("");
          setThinkingFormat("deepseek");
          setKey("");
          setRows([]);
          setFailure(undefined);
          setNotice(undefined);
          setSaved(false);
          return;
        }
        const p = editTarget.provider || {};
        setEditingRoute(editTarget.route);
        setSource("custom");
        setRoute(editTarget.route);
        setDisplayName(p.displayName || editTarget.route);
        setBaseURL(p.baseURL || "");
        setThinkingFormat(p.thinkingFormat || "deepseek");
        setKey("");
        setRows(Object.entries(p.models || {}).map(([id, m]) => ({
          // raw 保留完整原始条目，保存时作为基底，避免 UI 上不呈现的字段被抹掉。
          id, name: (m && m.name) || id, thinking: !!(m && m.thinking), raw: m || {}, uid: nextRowUid(),
        })));
        setFailure(undefined);
        setNotice(undefined);
        setSaved(false);
      }, [editTarget]);

      const isEditing = editingRoute !== undefined;
      // 两个全选按钮的状态派生自行本身（而不是各自记一个 toggle）：
      // 这样用户手动改动某一行时，按钮的蓝/灰会自动跟着变，不会出现
      // 「按钮显示已全选、实际却有行没选」的矛盾。
      const allEnabled = rows.length > 0 && rows.every((r) => r.enabled !== false);
      const allThinking = rows.length > 0 && rows.every((r) => !!r.thinking);
      const routeInvalid = route.trim().length === 0 || !/^[a-zA-Z0-9_-]+$/.test(route.trim());
      const routeTaken = !isEditing && existingRoutes.includes(route.trim());
      // 就绪判据只看「已启用且 id 非空」的模型 —— 全被取消启用时保存同样应被拦下
      // （host 端要求 provider 至少有一个模型，否则整个 provider 会被拒）。
      const enabledModelCount = rows.filter((r) => r.enabled !== false && r.id.trim().length > 0).length;
      const modelsEmpty = enabledModelCount === 0;
      const baseURLEmpty = baseURL.trim().length === 0;
      const ready = !routeInvalid && !routeTaken && !baseURLEmpty && !modelsEmpty;

      // 保存按钮变灰时，逐条说明缺什么 —— 否则用户只看到灰按钮，无从下手。
      // 历史上「新建模式手填一个已存在的 route」是最常见的一例：按钮恒灰且不易理解。
      const blockedReason = ready || busy
        ? undefined
        : routeInvalid ? t("hintRouteInvalid")
          : routeTaken ? t("hintRouteTaken")
            : baseURLEmpty ? t("hintBaseURL")
              : modelsEmpty ? t("hintModels")
                : undefined;

      const fetchModels = async () => {
        setFetching(true);
        setFailure(undefined);
        setNotice(undefined);
        try {
          // 编辑模式（或 route 已存在）时传 provider，host 端可解析已存储的凭证用于探测。
          const knownRoute = isEditing ? editingRoute : route.trim();
          const providerRoute = key.trim().length > 0 ? undefined : knownRoute;
          const found = await store.discoverModels(baseURL.trim(), key, undefined, providerRoute);
          // 探测返回的元数据一并带入 raw，避免保存后才发现上下文窗口/图片能力没写上。
          // 注意字段名映射：远端给的是 inputModalities，配置 schema 里叫 input。
          const next = found.map((m) => {
            const raw = {};
            if (m.name !== undefined) raw.name = m.name;
            if (m.contextWindow !== undefined) raw.contextWindow = m.contextWindow;
            if (m.maxTokens !== undefined) raw.maxTokens = m.maxTokens;
            if (m.inputModalities !== undefined) raw.input = m.inputModalities;
            return { id: m.id, name: m.name || m.id, thinking: guessThinking(m.id, m.name), raw, uid: nextRowUid() };
          });
          // 合并而不是整体替换：保留用户已有的行（手工添加的、以及已调好的
          // 「启用 / 思考」勾选），只把探测到的新模型补进来。端点已不再提供的
          // 旧行同样保留（由用户手动删），避免静默丢掉别人手写的配置。
          setRows((prev) => {
            const byId = new Map(prev.map((r) => [r.id.trim(), r]));
            const merged = next.map((m) => {
              const old = byId.get(m.id.trim());
              if (old === undefined) return m;
              byId.delete(m.id.trim());
              return { ...m, enabled: old.enabled, thinking: old.thinking, raw: old.raw ?? m.raw, uid: old.uid };
            });
            return [...merged, ...byId.values()];
          });
          if (found.length > 0 && isTencentCopilot(baseURL.trim())) {
            setNotice(t("probeLive"));
          }
        } catch (err) {
          // 404 兜底（旧 host 版本无探测逻辑时）：填入模板预置模型，仍然可用而不是报错。
          const tpl = templateForBaseURL(baseURL.trim());
          const message = err.message || String(err);
          if (/\banswered 404\b/.test(message) && tpl && Object.keys(tpl.models || {}).length > 0) {
            setRows(Object.entries(tpl.models).map(([id, m]) => ({
              id, name: (m && m.name) || id, thinking: !!(m && m.thinking), raw: m || {}, uid: nextRowUid(),
            })));
            setNotice(t("listingFallback"));
          } else if (/\banswered (401|403)\b/.test(message)) {
            // 401/403 有两种成因，提示要能区分，否则用户只看到一个费解的 401：
            //   ① 端点要求鉴权，但本次请求没带 key（新建 provider 尚未保存，
            //      因此无法回落到已存凭据，host 端拿不到 apiKeyEnv）；
            //   ② key 确实无效。
            // 实测：本地网关（127.0.0.1:7863）的 /models 就要求鉴权，不带 key 必 401。
            setFailure(t("probeAuthFailed"));
          } else {
            setFailure(message);
          }
        } finally {
          setFetching(false);
        }
      };

      const addRows = () => {
        const ids = addText.split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean);
        if (ids.length === 0) return;
        const known = new Map(rows.map((r) => [r.id, r]));
        const next = rows.slice();
        for (const id of ids) {
          if (known.has(id)) continue;
          next.push({ id, name: id, thinking: guessThinking(id, ""), uid: nextRowUid() });
          known.set(id, true);
        }
        setRows(next);
        setAddText("");
      };

      const patchRow = (index, patch) => setRows(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
      const removeRow = (index) => setRows(rows.filter((_, i) => i !== index));

      const save = async () => {
        setBusy(true);
        setFailure(undefined);
        setNotice(undefined);
        // 整个保存链路必须包在 try/finally 里：
        //   remote 调用（settings.mutate / credentials.set）在失败时可能**抛异常**
        //   而不是返回 { ok:false }。原实现只处理了返回值，异常会一路冒泡出 async
        //   事件处理器（被 React 静默吞掉），于是 setBusy(false) 永不执行 ——
        //   表现为「点保存后按钮一直灰着、且没有任何错误提示」。
        try {
          const modelEntries = {};
          // modelEntries 以 id 为键，重复 id 会被后写**静默覆盖**（丢一个模型且无提示），
          // 故先检出再拒绝保存。
          const seenIds = new Set();
          const dupIds = new Set();
          for (const r of rows) {
            // 未勾选「启用」的模型不写入配置 —— 这正是用户用来筛选模型的开关。
            if (r.enabled === false) continue;
            const id = r.id.trim();
            if (!id) continue;
            if (seenIds.has(id)) { dupIds.add(id); continue; }
            seenIds.add(id);
            // 以原始条目为基底，再让 UI 上的可见字段覆盖它。
            // 否则 contextWindow / maxTokens / thinkingEfforts / input 这些**UI 上不呈现**
            // 的字段会在每次保存时被静默抹掉（编辑一次 = 丢一次配置）。
            const entry = { ...(r.raw || {}) };
            entry.name = (r.name && r.name.trim()) || id;
            // thinking 需要双向可控：勾选则置 true，取消勾选则**删除**该键
            // （不能只靠展开基底，否则取消勾选后基底里的 thinking:true 会残留）。
            if (r.thinking) entry.thinking = true;
            else delete entry.thinking;
            modelEntries[id] = entry;
          }
          if (dupIds.size > 0) {
            setFailure(`${t("duplicateModelId")}: ${[...dupIds].join(", ")}`);
            return;
          }
          // 编辑态以原 provider 为基底：保住 UI 上不呈现的字段（如 userAgent），
          // 否则它们会在每次保存时被静默抹掉 —— 与模型级字段是同一类问题。
          const base = isEditing && editTarget.provider ? { ...editTarget.provider } : {};
          const profile = {
            ...base,
            baseURL: baseURL.trim(),
            // ★ 防丢 key：编辑模式下 key 留空表示「不改」，必须沿用已有的 apiKeyEnv，
            //   否则保存会把原凭证引用抹掉（这正是上次更新后 codebuddy 报
            //   MISSING_CREDENTIAL / 认证失效的根因之一）。
            //   注：列表里的「复制」是直接落库、不经本向导，故此处无需复制态回落。
            ...(key.trim().length > 0
              ? { apiKeyEnv: deriveKeyRef(route.trim()) }
              : base.apiKeyEnv
                ? { apiKeyEnv: base.apiKeyEnv }
                : {}),
            thinkingFormat,
            models: modelEntries,
          };
          // displayName 在 UI 上可见可编辑，故以表单为准（含「清空即删除」语义）。
          if (displayName.trim().length > 0) profile.displayName = displayName.trim();
          else delete profile.displayName;

          // 模板自带的 userAgent（如 codebuddy 模板的 dsh-other-api/1.0）要一并写入，
          // 否则它在该路径上就是死数据 —— host 端只对 copilot.tencent.com 有兜底，
          // 自定义端点的 UA 覆盖会因此丢失（该 UA 用于绕过网关的 UA 黑名单）。
          if (profile.userAgent === undefined) {
            const tpl = templateForBaseURL(baseURL.trim());
            if (tpl && typeof tpl.userAgent === "string" && tpl.userAgent.length > 0) {
              profile.userAgent = tpl.userAgent;
            }
          }
          const failure = await store.saveProvider(route.trim(), profile, key);
          if (failure !== undefined) { setFailure(failure); return; }
          setSaved(true);
          setKey("");
          // 保存成功后重置向导（编辑模式退出）。
          // 注意：resetWizard 会清掉 saved，这里要保留「已保存」提示，故分两步。
          resetWizard();
          setSaved(true);
          onSaved && onSaved();
        } catch (err) {
          // 把异常转成可见的错误文案 —— 静默失败是这个面板历史上最难查的一类问题。
          setFailure(`${t("saveFailed")}: ${(err && err.message) || String(err)}`);
        } finally {
          setBusy(false);
        }
      };

      const templateOptions = [
        e("option", { value: "custom", key: "custom" }, t("customOption")),
      ].concat(TEMPLATES.map((tpl) => e("option", { value: tpl.route, key: tpl.route }, tpl.displayName)));

      return e("div", { className: "other-api-card" },
        // 来源
        e("div", { className: "other-api-row" },
          e("div", { className: "other-api-field", style: { maxWidth: 240 } },
            e("span", { className: "other-api-label" }, t("source")),
            e("select", {
              className: "other-api-select",
              value: isEditing ? "custom" : source,
              disabled: isEditing,
              onChange: (ev) => pickTemplate(ev.target.value),
            }, templateOptions),
          ),
          e("div", { className: "other-api-field" },
            e("span", { className: "other-api-label" }, t("routeId")),
            e("input", {
              className: "other-api-input",
              value: route,
              placeholder: "my-proxy",
              disabled: isEditing || source !== "custom",
              onChange: (ev) => setRoute(ev.target.value),
            }),
          ),
          e("div", { className: "other-api-field" },
            e("span", { className: "other-api-label" }, t("displayNameLabel")),
            e("input", { className: "other-api-input", value: displayName, placeholder: t("displayNamePlaceholder"), onChange: (ev) => setDisplayName(ev.target.value) }),
          ),
        ),
        // 地址 / key / 方言
        e("div", { className: "other-api-row" },
          e("div", { className: "other-api-field" },
            e("span", { className: "other-api-label" }, t("baseURL")),
            e("input", { className: "other-api-input", value: baseURL, placeholder: "https://...", onChange: (ev) => setBaseURL(ev.target.value) }),
          ),
          e("div", { className: "other-api-field" },
            e("span", { className: "other-api-label" }, t("apiKey") + (isEditing ? " (" + t("leaveBlank") + ")" : "")),
            e("input", { className: "other-api-input", type: "password", value: key, placeholder: t("apiKeyPlaceholder"), onChange: (ev) => setKey(ev.target.value) }),
          ),
          e("div", { className: "other-api-field", style: { maxWidth: 220 } },
            e("span", { className: "other-api-label" }, t("thinkingFormat")),
            e("select", { className: "other-api-select", value: thinkingFormat, onChange: (ev) => setThinkingFormat(ev.target.value) },
              THINKING_FORMATS.map((f) => e("option", { value: f, key: f }, f)),
            ),
          ),
        ),
        // 模型区
        e("div", { className: "other-api-row" },
          e("div", { className: "other-api-field" },
            e("span", { className: "other-api-label" }, t("models")),
            e("input", { className: "other-api-input", value: addText, placeholder: t("modelsPlaceholder"), onChange: (ev) => setAddText(ev.target.value), onKeyDown: (ev) => { if (ev.key === "Enter") addRows(); } }),
          ),
          e("button", { className: "other-api-btn other-api-btn-ghost", onClick: addRows }, t("add")),
          e("button", { className: "other-api-btn other-api-btn-ghost", disabled: fetching || baseURL.trim().length === 0, onClick: fetchModels }, fetching ? t("fetching") : t("fetchModels")),
          // 一次探测常带回十几个模型，逐条取消勾选很烦；给一对批量开关。
        ),
        // 全选按钮行：两个切换按钮分别对应下方「启用」与「思考」两列。
        // 未全选 → 蓝色（点击 = 全选）；已全选 → 灰色（点击 = 取消全选）。
        // 状态派生自行本身，所以手动改动某一行后按钮会自动跟着变。
        rows.length > 0
          ? e("div", { className: "other-api-row other-api-selectall" },
            e("button", {
              type: "button",
              className: `other-api-allbtn${allEnabled ? " other-api-allbtn-on" : ""}`,
              disabled: busy,
              onClick: () => setRows((prev) => prev.map((r) => ({ ...r, enabled: !allEnabled }))),
              title: t("selectAllEnabledHint"),
            }, `${t("enabled")}${allEnabled ? " ✓" : ""}`),
            e("button", {
              type: "button",
              className: `other-api-allbtn${allThinking ? " other-api-allbtn-on" : ""}`,
              disabled: busy,
              onClick: () => setRows((prev) => prev.map((r) => ({ ...r, thinking: !allThinking }))),
              title: t("selectAllThinkingHint"),
            }, `${t("thinking")}${allThinking ? " ✓" : ""}`),
          )
          : null,
        rows.length > 0
          ? e("div", { className: "other-api-list" },
            rows.map((r, i) => {
              // enabled 缺省视为启用（老配置与模板填充都不带该字段）。
              const off = r.enabled === false;
              const dim = off ? " other-api-row-off" : "";
              return e("div", { className: "other-api-item", key: r.uid || `row-${i}` },
                e("label", { className: "other-api-chk", title: t("enabledHint") },
                  e("input", { type: "checkbox", checked: !off, onChange: (ev) => patchRow(i, { enabled: ev.target.checked }) }),
                  e("span", {}, t("enabled")),
                ),
                e("label", { className: "other-api-chk", title: t("thinkingHint") },
                  e("input", { type: "checkbox", checked: !!r.thinking, onChange: (ev) => patchRow(i, { thinking: ev.target.checked }) }),
                  e("span", {}, t("thinking")),
                ),
                e("input", { className: "other-api-input other-api-model-id" + dim, value: r.id, onChange: (ev) => patchRow(i, { id: ev.target.value }) }),
                e("input", { className: "other-api-input other-api-model-name" + dim, value: r.name, onChange: (ev) => patchRow(i, { name: ev.target.value }) }),
                e("button", { className: "other-api-btn other-api-btn-danger other-api-x", onClick: () => removeRow(i), title: t("remove") }, "×"),
              );
            }),
            e("p", { className: "other-api-sub" }, t("modelsHint")),
          )
          // 空态说明：模型列表为空时保存按钮恒灰（host 端也要求至少一个模型），
          // 但原实现此处什么都不渲染，用户面对灰按钮无从下手 —— 补一条明确指引。
          : e("p", { className: "other-api-sub" }, t("modelsEmptyHint")),
        blockedReason !== undefined ? e("p", { className: "other-api-err" }, blockedReason) : null,
        failure !== undefined ? e("p", { className: "other-api-err" }, failure) : null,
        notice !== undefined && failure === undefined ? e("p", { className: "other-api-ok" }, notice) : null,
        saved && failure === undefined ? e("p", { className: "other-api-ok" }, t("saved")) : null,
        e("div", { className: "other-api-row", style: { justifyContent: "flex-end" } },
          // 编辑态多一个「取消」：复位向导并退出编辑。
          isEditing ? e("button", { className: "other-api-btn other-api-btn-ghost", onClick: resetWizard }, t("cancel")) : null,
          e("button", { className: "other-api-btn", disabled: busy || !ready, onClick: save }, t("save")),
        ),
      );
    }

    /** 已接入列表。 */
    function ProviderList({ providers, store, t, onRemoved, onEdit }) {
      const [failure, setFailure] = React.useState(undefined);
      // 用 Set 而不是单个 route：单个值会被后来的操作改写，导致先发起的那条
      // 按钮提前恢复可点，而它用的是同一份渲染闭包（routes 不变）→ 两次复制算出
      // 同一个目标 route，后写覆盖前写，用户以为复制了两份。
      const [busyRoutes, setBusyRoutes] = React.useState(() => new Set());
      const routes = Object.keys(providers);
      if (routes.length === 0) {
        return e("p", { className: "other-api-sub" }, t("empty"));
      }
      return e("div", { className: "other-api-list" },
        routes.map((route) => {
          const p = providers[route] || {};
          const remove = async () => {
            setFailure(undefined);
            // 同 save：remote 调用可能抛异常，必须兜底成可见文案，不能静默。
            try {
              const f = await store.removeProvider(route);
              if (f !== undefined) { setFailure(f); return; }
              onRemoved && onRemoved();
            } catch (err) {
              setFailure(`${t("saveFailed")}: ${(err && err.message) || String(err)}`);
            }
          };
          /**
           * 一键复制：直接落库，不再经向导二次确认。
           *
           * route 是配置主键，副本必须换名，故自动追加 -copy 后缀（冲突时递增编号）。
           * apiKeyEnv 沿用源配置的引用 —— 副本通常指向同端点、复用同一把 key，
           * 因此这里不需要用户重新填密钥；若副本要换 key，保存后再点「编辑」改即可。
           */
          const duplicate = async () => {
            setFailure(undefined);
            setBusyRoutes((prev) => new Set(prev).add(route));
            try {
              const nextRoute = uniqueCopyRoute(route, routes);
              const profile = {
                ...(p.displayName ? { displayName: `${p.displayName} (copy)` } : {}),
                baseURL: p.baseURL,
                ...(p.apiKeyEnv ? { apiKeyEnv: p.apiKeyEnv } : {}),
                ...(p.thinkingFormat ? { thinkingFormat: p.thinkingFormat } : {}),
                ...(p.userAgent ? { userAgent: p.userAgent } : {}),
                models: p.models || {},
              };
              // 第三个参数传空字符串：不写新凭证，沿用上面 apiKeyEnv 指向的那把。
              const f = await store.saveProvider(nextRoute, profile, "");
              if (f !== undefined) { setFailure(f); return; }
              onRemoved && onRemoved();
            } catch (err) {
              setFailure(`${t("saveFailed")}: ${(err && err.message) || String(err)}`);
            } finally {
              setBusyRoutes((prev) => { const next = new Set(prev); next.delete(route); return next; });
            }
          };
          return e("div", { className: "other-api-item", key: route },
            e("div", { style: { flex: 1, minWidth: 0 } },
              e("div", { className: "other-api-item-name" }, p.displayName || route),
              e("div", { className: "other-api-item-route" }, `${route} · ${p.baseURL || ""}`),
            ),
            e("button", { className: "other-api-btn other-api-btn-ghost", onClick: () => onEdit && onEdit(route, p) }, t("edit")),
            e("button", { className: "other-api-btn other-api-btn-ghost", disabled: busyRoutes.has(route), onClick: duplicate }, busyRoutes.has(route) ? t("duplicating") : t("duplicate")),
            e("button", { className: "other-api-btn other-api-btn-danger", onClick: remove }, t("remove")),
          );
        }),
        failure !== undefined ? e("p", { className: "other-api-err" }, failure) : null,
      );
    }

    /** 面板主体。 */
    function Section(props) {
      const { controller, api, t } = props;
      // 用 React 18 原生 useSyncExternalStore 订阅 store，等价于官方 bindSnapshotSelector。
      const state = useSyncExternalStore(
        (fn) => controller.store.subscribe(fn),
        () => controller.store.getSnapshot(),
      );
      const [editTarget, setEditTarget] = React.useState(undefined);
      React.useEffect(() => {
        if (state.status === "idle") controller.load();
      }, [controller, state.status]);

      if (state.status === "idle" || state.status === "loading") {
        return e("div", { className: "other-api-root" }, e("p", { className: "other-api-sub" }, t("loading")));
      }
      if (state.status === "error") {
        return e("div", { className: "other-api-root" },
          e("p", { className: "other-api-err" }, `${t("loadFailed")}: ${state.error}`),
          e("button", { className: "other-api-btn", onClick: () => controller.load() }, t("retry")),
        );
      }

      const providers = state.providers || {};
      const existingRoutes = Object.keys(providers);
      const reload = () => { controller.load(); };

      return e("div", { className: "other-api-root" },
        e("style", {}, CSS),
        e("h2", { className: "other-api-title" }, t("title")),
        e("p", { className: "other-api-sub" }, t("intro")),
        !state.writable ? e("p", { className: "other-api-err" }, t("readOnly")) : null,
        // 后台刷新失败时 status 仍保持 ready（以免打断正在编辑的表单），
        // 因此错误必须在这里单独呈现，否则会被静默吞掉。
        state.status === "ready" && state.error ? e("p", { className: "other-api-err" }, `${t("refreshFailed")}: ${state.error}`) : null,

        e("h3", { className: "other-api-title", style: { fontSize: 14 } }, t("wizard")),
        e(Wizard, {
          api, store: controller, t, existingRoutes, editTarget,
          onSaved: reload,
          onEditCancel: () => setEditTarget(undefined),
        }),

        e("hr", { className: "other-api-divider" }),
        e("h3", { className: "other-api-title", style: { fontSize: 14 } }, t("configured")),
        e(ProviderList, {
          providers, store: controller, t, onRemoved: reload,
          onEdit: (route, p) => setEditTarget({ route, provider: p }),
        }),
      );
    }

    // DSH 0.1.5 兼容：settings/credentials/llm 通过 cordis 命名空间服务注入，
    // 不再经由 connection （0.1.5 的 connection handle 已无 `.api`）。
    const inject = ["slots", "locale", "connection", "remote", "remote.settings", "remote.credentials", "remote.llm"];

    function apply(ctx) {
      const zh = {
        nav: "OtherAPI",
        title: "OtherAPI",
        intro: "一键接入带思考模式的第三方 API，规避 developer 角色被拒绝的问题。",
        loading: "正在加载…",
        loadFailed: "加载配置失败",
        retry: "重试",
        readOnly: "当前部署的设置文档为只读。",
        wizard: "接入向导",
        source: "来源",
        customOption: "自定义",
        routeId: "Route ID",
        displayNameLabel: "显示名",
        displayNamePlaceholder: "可选",
        baseURL: "API 地址",
        apiKey: "API 密钥",
        apiKeyPlaceholder: "粘贴 API Key",
        leaveBlank: "留空则不修改",
        thinkingFormat: "思考格式",
        models: "模型",
        modelsPlaceholder: "deepseek-v4, gpt-4o…（回车添加）",
        add: "添加",
        modelsHint: "「启用」决定模型是否写入配置（取消勾选 = 保存时跳过，不出现在模型选择器里）；「思考」标记推理模型。探测来的模型已按名称预判，可手动微调。",
        enabled: "启用",
        thinking: "思考",
        selectAllEnabledHint: "全选 / 取消全选：对应下方「启用」列（决定哪些模型写入配置）",
        selectAllThinkingHint: "全选 / 取消全选：对应下方「思考」列（标记推理模型）",
        enabledHint: "勾选 = 写入配置并出现在模型选择器里；取消勾选 = 保存时跳过该模型。",
        thinkingHint: "勾选 = 标记为思考模型（自动带推理档位）。",
        modelsEmptyHint: "还没有模型，保存按钮会保持灰置 —— 请先填写上面「模型」输入框（可填多个，用逗号分隔）并按「添加」；填好 Base URL 后也可点「获取模型列表」自动拉取。",
        saveFailed: "保存失败",
        duplicate: "复制",
        duplicating: "复制中…",
        probeAuthFailed: "端点拒绝了本次探测（401/403）。若这是新建的 provider 且尚未保存，请先在「API 密钥」里填入 key 再点「获取模型列表」；已保存过的 provider 请点列表里的「编辑」后重试。",
        fetchModels: "获取模型列表",
        fetching: "获取中…",
        save: "保存",
        cancel: "取消",
        routeTaken: "该 Route ID 已存在。",
        hintRouteInvalid: "请先填写 Route ID（只能含字母、数字、下划线和连字符）。",
        hintRouteTaken: "该 Route ID 已存在 —— 请点上方列表中它的「编辑」按钮修改，而不是在这里新建。",
        hintBaseURL: "请先填写 Base URL。",
        hintModels: "请先添加至少一个模型（可选择模板自动带入，或点「获取模型列表」）。",
        edit: "编辑",
        remove: "删除",
        saved: "已保存。",
        probeLive: "已实时探测该网关，以下为当前真实可用的模型；用左侧「启用」勾选要保留的，「思考」标记推理模型。",
        duplicateModelId: "模型 id 有重复，请先改掉重复项",
        refreshFailed: "刷新失败（当前显示的是上一次的数据）",
        listingFallback: "该端点不提供模型列表接口（/models 404），已填入模板预置模型；可手动增删。",
        configured: "已接入",
        empty: "还没有接入任何 API。",
      };
      const en = {
        nav: "OtherAPI",
        title: "OtherAPI",
        intro: "One-click setup for third-party APIs with thinking mode, avoiding developer-role rejection.",
        loading: "Loading…",
        loadFailed: "Failed to load settings",
        retry: "Retry",
        readOnly: "The settings document is read-only in this deployment.",
        wizard: "Setup wizard",
        source: "Source",
        customOption: "Custom",
        routeId: "Route ID",
        displayNameLabel: "Display name",
        displayNamePlaceholder: "Optional",
        baseURL: "Base URL",
        apiKey: "API Key",
        apiKeyPlaceholder: "Paste API key",
        leaveBlank: "leave blank to keep",
        thinkingFormat: "Thinking format",
        models: "Models",
        modelsPlaceholder: "deepseek-v4, gpt-4o… (Enter to add)",
        add: "Add",
        modelsHint: "On decides whether a model is saved (unchecked = skipped on save, absent from the model picker); Think marks it as a reasoning model. Discovered models are pre-flagged by name.",
        enabled: "On",
        thinking: "Think",
        selectAllEnabledHint: "Select / deselect all in the On column (which models get saved)",
        selectAllThinkingHint: "Select / deselect all in the Think column (mark reasoning models)",
        enabledHint: "Checked = saved and shown in the model picker; unchecked = skipped on save.",
        thinkingHint: "Checked = mark as a reasoning model (adds thinking levels).",
        modelsEmptyHint: "No models yet — the Save button stays disabled until you add one. Type model ids in the Models field above (comma-separated) and click Add, or click Fetch models once the Base URL is set.",
        saveFailed: "Save failed",
        duplicate: "Duplicate",
        duplicating: "Copying…",
        probeAuthFailed: "The endpoint refused this probe (401/403). For a new provider that is not saved yet, enter the API key first and retry Fetch models; for an existing one, click Edit in the list and retry.",
        fetchModels: "Fetch models",
        fetching: "Fetching…",
        save: "Save",
        cancel: "Cancel",
        routeTaken: "This route id already exists.",
        hintRouteInvalid: "Enter a Route ID first (letters, digits, underscore and hyphen only).",
        hintRouteTaken: "This route id already exists — click its Edit button in the list above instead of adding it here.",
        hintBaseURL: "Enter the Base URL first.",
        hintModels: "Add at least one model (pick a template to prefill, or click Fetch models).",
        edit: "Edit",
        remove: "Remove",
        saved: "Saved.",
        probeLive: "Probed the gateway live; these are the models actually available right now. Use the On column to keep the ones you want and Think to mark reasoning models.",
        duplicateModelId: "Duplicate model ids — fix the duplicates first",
        refreshFailed: "Refresh failed (showing the previous data)",
        listingFallback: "This endpoint has no /models listing (404); template default models were filled in — edit as needed.",
        configured: "Configured",
        empty: "No API configured yet.",
      };

      ctx.effect(() => ctx.locale.register(NS, { zh, en }), "other-api: copy dictionaries");
      // 0.1.5：store 直接吃 ctx（内部走 ctx.remote.*），不再依赖 connection.api。
      const controller = new ThinkingApiStore(ctx);
      const t = ctx.locale.bind(NS);

      const injected = () => ({ controller, t });

      // 订阅 settings 文档与凭证变化，让面板在外部改动后自动刷新生效
      // （对齐官方 dsh-client-ui-settings-models 的 pushed-invalidations）。
      ctx.effect(() => {
        const refresh = () => { controller.load(); };
        const hookRemote = (name, handler) => {
          // remote.$on 在 0.1.5 存在（官方 ui 插件直接用它订阅更新事件）。
          if (ctx.remote && typeof ctx.remote.$on === "function") return ctx.remote.$on(name, handler);
          return undefined;
        };
        const disposers = [
          ctx.on("connection/reset", refresh),
          hookRemote("settings/document-updated", refresh),
          hookRemote("credentials/reference-updated", refresh),
          hookRemote("llm/adapters-updated", refresh),
        ].filter(Boolean);
        return () => { for (const dispose of disposers) dispose(); };
      }, "other-api: pushed invalidations");

      ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section",
        id: "other-api",
        order: 20,
        label: () => t("nav"),
        inject: injected,
      }, Section));
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  },
});
