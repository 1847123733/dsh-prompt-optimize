# dsh-prompt-optimize

[![dsh-plugin](https://img.shields.io/badge/topic-dsh--plugin-blue)](https://github.com/topics/dsh-plugin)

DeepSeek Harness (DSH) Web 插件：提供 **提示词优化**、**用户提问锚点**，以及右下角的 **DeepSeek API 悬浮用量卡片**。

1. 读取当前草稿  
2. 点击后图标 loading（不弹全屏窗）  
3. 默认用 `deepseek-official` / `deepseek-v4-flash` 改写  
4. 完成后在按钮上方 **气泡预览**  
5. 点 **应用** 才写入输入框  

## 用户提问锚点

- 自动按对话顺序收集用户提问及已接纳的追加提问（不混入助手回答）
- 问答页右侧显示轻量锚点，顶部标注提问数量
- 鼠标悬浮或键盘聚焦时显示完整提问内容
- 点击后平滑滚动到对应的用户消息
- 窄屏下自动移到输入区上方并改为横向排列

## DeepSeek API 悬浮用量

- 复用 DSH 在“设置 → 模型”中保存的 `DEEPSEEK_API_KEY`，无需重复配置
- 页面右下角显示轻量悬浮胶囊，悬浮或点击后展开卡片
- 显示当前配置 Key 的名称、脱敏标识，以及今天、昨天、最近 7 天消费金额
- 账号余额单独展示，不再与单个 Key 的消费混淆
- 每 60 秒自动刷新，也支持手动刷新
- 完整 API Key 和平台 Token 仅在 DSH 宿主端解析，不会返回浏览器
- 余额来自公开接口 `GET https://api.deepseek.com/user/balance`
- 单 Key 消费来自平台内部接口 `GET https://platform.deepseek.com/api/v0/usage/by_api_key/cost`，按返回的 `sensitive_id` 匹配当前 Key 的 `tracking_id`

### 配置单 Key 用量

平台用量接口使用 DeepSeek 开放平台的登录态，不接受普通 `sk-...` API Key。插件源码内
包含一个默认平台 Token；如需替换，可通过 DSH 凭据提供器或环境变量覆盖：

```text
DEEPSEEK_PLATFORM_TOKEN=<Usage 页面请求中 Authorization 的 Bearer 值>
```

- `DEEPSEEK_PLATFORM_TOKEN` 可填写纯 Token，也可包含 `Bearer ` 前缀，无需配置 Cookie。
- 环境变量的值优先于源码默认值。
- 这是 DeepSeek 未公开承诺稳定性的站内接口；登录态过期、WAF 拦截或接口变更时，卡片会继续显示账号余额，并提示当前 Key 用量不可用。
- 金额按 GMT+8 自然日统计；平台数据可能延迟约 5 分钟。

## 安装

需要已安装 [DSH](https://github.com/deepseek-ai) / `npx @deepseek-ai/dsh`，且 `pnpm` 在 `PATH` 中。

### 从 GitHub（推荐发布后）

```sh
dsh plugin --profile web add "github:184712373/dsh-prompt-optimize"
```


### 从本地路径（开发 / 未推送时）

```sh
# 在仓库父目录执行，路径按实际修改
dsh plugin --profile web add "file:./dsh-prompt-optimize"
# 或
dsh plugin --profile web add "link:C:/Users/you/path/dsh-prompt-optimize"
```

### 从 npm（可选，`npm publish` 之后）

```sh
dsh plugin --profile web add dsh-prompt-optimize
```

安装或更新后 **重启** Web profile：

```sh
dsh --profile web
# 或
npx @deepseek-ai/dsh web
```

设置 → **插件** 中应能看到本包。任意会话输入框右侧出现 **星星图标**。

## 卸载

```sh
dsh plugin --profile web remove dsh-prompt-optimize
```

然后重启 DSH。

## 配置

`cordis.patch.yml` / profile patch 中可改：

```yaml
- insert:
    - id: prompt-optimize
      name: dsh-prompt-optimize
      config:
        provider: deepseek-official
        model: deepseek-v4-flash
        maxInputChars: 24000
        maxOutputTokens: 1024
        temperature: 0.3
```

若默认 provider 未配置，Host 会回退到当前第一个可用 provider，并在气泡 meta 中标注「已回退」。

## 依赖

- Host：`llm`、`webServer`（DSH Web profile 已有）  
- Client：`slots`（输入区 Slot）  
- 需在设置中配置可用的 LLM（建议 DeepSeek API Key）

## 发布到 GitHub `dsh-plugin` Topic

1. 新建 **Public** 仓库，推送本目录全部文件  
2. 把 `package.json` 里的 `YOUR_GITHUB_USERNAME` 换成真实用户名  
3. 仓库 About → Topics 添加 **`dsh-plugin`**（可选：`deepseek-harness`、`dsh`）  
4. README 安装命令改为真实 `github:user/dsh-prompt-optimize`  
5. （可选）`npm publish`  

无需官方审核；社区目录会从 [topics/dsh-plugin](https://github.com/topics/dsh-plugin) 聚合。

## 与动态插件源码的关系

工作区若仍保留 `prompt-optimize-plugin/`（`cordis_define` 用的 host.js/client.js），那是 **会话内动态插件** 原型，进程重启即失效。  
**本目录是正式 bundle**：`dsh plugin add` 进 profile，重启仍可用。

## License

MIT
