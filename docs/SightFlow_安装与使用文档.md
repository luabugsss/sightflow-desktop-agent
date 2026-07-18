# SightFlow 安装与使用文档

更新时间：2026-07-17

适用仓库：<https://github.com/sightflow-dev/sightflow-desktop-agent>

## 1. SightFlow 是什么

SightFlow Desktop Agent 是一个基于 Electron、React、TypeScript 的桌面 Agent 客户端。它通过视觉语言模型（VLM）理解桌面软件界面，再用鼠标、键盘、剪贴板等方式模拟真人操作。

它适合这类场景：

- 让 AI 在没有开放 API 的桌面软件里处理消息或任务。
- 针对微信、企业微信、钉钉、飞书、Slack、Telegram 等聊天软件做视觉驱动自动化。
- 记录每次执行过程，沉淀成可复盘、可评测、可继承的 `work-trace` 工作记忆。

它不是微信机器人协议接入，也不是逆向私有接口。它的工作方式更接近“AI 看屏幕，然后像人一样点击、输入、发送”。

## 2. 环境准备

官方要求：

- Node.js LTS
- npm

建议环境：

- Windows 10/11、macOS 或 Linux
- Git
- VS Code
- 一个可用的火山方舟 API Key，默认用于视觉定位和内置豆包 Provider

如果你在 Windows 上安装依赖时遇到 `robotjs`、`node-gyp`、`electron-builder install-app-deps` 相关编译错误，通常需要额外安装：

- Python 3
- Visual Studio Build Tools
- Windows SDK

如果你在 macOS 上运行，需要给应用或终端授予：

- Screen Recording / 屏幕录制权限
- Accessibility / 辅助功能权限

否则它可能无法截图或控制鼠标键盘。

## 3. 下载源码

打开终端，执行：

```bash
git clone https://github.com/sightflow-dev/sightflow-desktop-agent.git
cd sightflow-desktop-agent
```

## 4. 安装依赖

在项目根目录执行：

```bash
npm install
```

安装过程会执行 `postinstall`，包括：

- `patch-package`
- `electron-builder install-app-deps`

如果这里失败，优先检查 Node.js 是否为 LTS 版本，以及本机是否具备原生模块编译环境。

## 5. 本地开发运行

执行：

```bash
npm run dev
```

启动后会打开 SightFlow 桌面端。第一次使用建议按这个顺序操作：

1. 选择目标应用，例如微信、企业微信、钉钉、飞书、Slack、Telegram 或 Generic。
2. 如果是微信/企业微信，默认会尝试用 VLM 自动识别窗口区域。
3. 如果是钉钉、飞书、Slack、Telegram 或其他应用，通常需要手动框选。
4. 打开右下角设置窗口。
5. 填写基础配置里的火山方舟 API Key。
6. 确认当前启用的 Provider。
7. 回到主界面，启动运行。

## 6. 配置火山方舟 API Key

SightFlow 默认使用火山方舟接口，官方 README 里给出的默认 Base URL 是：

```text
https://ark.cn-beijing.volces.com/api/v3
```

配置步骤：

1. 打开火山引擎控制台的方舟服务。
2. 开通相关模型服务。
3. 创建或复制 API Key。
4. 回到 SightFlow 设置页。
5. 在基础配置中填写 API Key。
6. Base URL 一般保持默认。
7. 在智能体 / Provider 中选择内置豆包 Seed 或你安装的其他 Provider。

内置默认模型：

```text
doubao-seed-2-0-lite-260215
```

这个 Key 主要有两个用途：

- 视觉定位：识别屏幕上的未读红点、聊天区域、输入框、按钮坐标等。
- 智能回复：分析聊天截图，判断是否回复，并生成回复内容。

## 7. 目标应用与框选方式

SightFlow 有两种布局识别模式。

### 7.1 微信 / 企业微信

微信和企业微信默认使用 VLM 自动识别区域。

它会尝试识别：

- 未读入口
- 联系人列表
- 当前联系人
- 聊天内容区域
- 输入框

使用建议：

- 保持目标窗口可见，不要被其他窗口遮挡。
- 尽量使用常规缩放比例。
- 如果自动识别不稳定，可以改用手动框选模式。

### 7.2 钉钉 / 飞书 / Slack / Telegram / 其他应用

这些应用默认走手动框选。

点击“开始框选”后，按顺序框选三个区域：

1. 会话列表
2. 聊天内容区
3. 输入框

框选结果会按目标应用保存在本地，下次启动会复用。界面变化明显时，可以重新框选。

## 8. Provider 是什么

Provider 是 SightFlow 里负责“分析截图并生成回复”的模块。

桌面端负责：

- 截图
- 判断区域
- 调用 Provider
- 接收 Provider 返回事件
- 把回复内容发送到聊天窗口

Provider 负责：

- 看截图
- 理解上下文
- 判断是否需要回复
- 生成回复文本

Provider 可以返回这些事件：

```ts
type ProviderEvent =
  | { type: 'thinking'; content: string }
  | { type: 'reply_text'; content: string }
  | { type: 'skip' }
  | { type: 'error'; error: string }
```

常见含义：

- `thinking`：显示当前分析状态。
- `reply_text`：返回要发送的回复。
- `skip`：本轮不回复。
- `error`：本轮失败。

## 9. 安装外部 Provider

Provider 至少包含两个文件：

```text
provider-root/
  manifest.json
  provider.bundle.js
```

在 SightFlow 设置页中，可以填写 Provider 的 `manifest.json` 地址进行安装。

支持两种地址：

```text
https://example.com/provider/manifest.json
file:///absolute/path/to/provider/manifest.json
```

注意：填写的是 `manifest.json` 地址，不是 `provider.bundle.js` 地址。

仓库内置火山方舟示例路径：

```text
resources/providers/volcengine-ark/manifest.json
resources/providers/volcengine-ark/provider.bundle.js
```

本地开发时，可以在设置页填写类似：

```text
file:///你的仓库绝对路径/resources/providers/volcengine-ark/manifest.json
```

Windows 示例：

```text
file:///C:/Users/你的用户名/Projects/sightflow-desktop-agent/resources/providers/volcengine-ark/manifest.json
```

## 10. 日常使用流程

推荐工作流：

1. 打开目标聊天软件，并登录账号。
2. 保持目标窗口在屏幕上可见。
3. 启动 SightFlow。
4. 选择目标应用。
5. 确认区域识别或完成手动框选。
6. 打开设置，确认 API Key 和 Provider。
7. 启动 Agent。
8. 观察日志，确认它是否检测到新消息。
9. 第一轮建议人工盯着，确认它不会误发。
10. 稳定后再让它持续运行。

## 11. 打包构建

Windows：

```bash
npm run build:win
```

macOS：

```bash
npm run build:mac
```

Linux：

```bash
npm run build:linux
```

通用构建：

```bash
npm run build
```

构建脚本会先做 TypeScript 类型检查，再通过 electron-vite 和 electron-builder 产出桌面应用。

## 12. 常见问题

### npm install 失败

优先检查：

- Node.js 是否为 LTS。
- npm 是否可正常访问 registry。
- Windows 是否安装 Visual Studio Build Tools。
- 是否有杀毒软件拦截原生模块编译。

可以尝试：

```bash
npm cache verify
npm install
```

### 启动后无法控制鼠标键盘

macOS 检查辅助功能权限。

Windows 检查目标软件是否以管理员权限运行。如果目标软件是管理员权限，而 SightFlow 不是，自动化操作可能失败。可以尝试用同等权限启动。

### 无法截图或识别区域

检查：

- 目标窗口是否被遮挡。
- 目标窗口是否最小化。
- 屏幕缩放是否过高。
- macOS 是否开启屏幕录制权限。
- API Key 是否可用。
- Base URL 是否正确。

### 自动回复不触发

检查：

- 目标应用是否选对。
- 微信/企业微信是否真的有未读红点。
- 手动框选区域是否准确。
- Provider 是否启用。
- Provider 配置里的 API Key 和模型名是否正确。
- 日志里是否出现 `skip`、`error` 或模型调用失败。

### 误回复或重复回复

建议：

- 先在测试群或小号里验证。
- 调整 Provider 的 system prompt。
- 要求 Provider 在不确定时返回 `skip`。
- 避免让它接管高风险业务账号。
- 第一阶段保持人工监督。

## 13. 安全与隐私注意事项

SightFlow 的 work-trace 默认保存在本机，但模型调用仍可能把聊天窗口截图发送给你配置的 Provider。

使用前要确认：

- 截图里是否包含客户隐私、商业机密或敏感数据。
- 所选模型服务是否满足你的数据合规要求。
- 是否需要使用企业内网模型或自建 Provider。
- 是否需要关闭或清理历史 trace。

正式用于业务前，建议先做最小范围试点。

## 14. 推荐学习路线

如果只是想跑起来：

1. 看 README。
2. 安装依赖。
3. 填 API Key。
4. 用微信或一个测试聊天窗口跑一轮。

如果想改它：

1. 先看 `src/main/index.ts`，理解 Electron 主进程如何启动 Runtime。
2. 再看 `src/core/rpa-device.ts`，理解微信/企业微信视觉自动化。
3. 再看 `src/core/box-select-device.ts`，理解通用应用手动框选流程。
4. 再看 `src/core/generic-channel-session.ts`，理解消息会话循环。
5. 最后看 `docs/provider.md`，自己写一个 Provider。

如果想接自己的模型：

1. 复制内置 `resources/providers/volcengine-ark`。
2. 修改 `manifest.json`。
3. 修改 `provider.bundle.js` 里的接口调用。
4. 在设置页用 `file:///.../manifest.json` 安装。
5. 测试 `thinking`、`skip`、`reply_text` 三类返回。

## 15. 最短命令清单

```bash
git clone https://github.com/sightflow-dev/sightflow-desktop-agent.git
cd sightflow-desktop-agent
npm install
npm run dev
```

构建：

```bash
npm run build:win
npm run build:mac
npm run build:linux
```

## 16. 官方资料

- GitHub 仓库：<https://github.com/sightflow-dev/sightflow-desktop-agent>
- 官网：<https://sightflow.dev/>
- Provider 文档：<https://github.com/sightflow-dev/sightflow-desktop-agent/blob/main/docs/provider.md>
- 火山方舟控制台：<https://console.volcengine.com/ark>
