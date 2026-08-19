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
- 显示脱敏 Key、当前余额、近 30 天消费、请求次数和 Tokens
- 每 60 秒自动刷新，也支持手动刷新
- 完整 API Key 仅在 DSH 宿主端解析，不会返回浏览器
- 用量来自 `GET https://api.deepseek.com/v1/usage`；若 DeepSeek 对当前账号返回 404，卡片仍显示余额，并提示用量接口暂不可用

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
        usageDays: 30
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
