# SightFlow 审查与二开指南

更新时间：2026-07-18

仓库：`G:\code\sightflow-desktop-agent`

## 1. 这项目本质上是什么

SightFlow 不是传统“前后端分离”的 Web 应用，而是一个 **Electron 桌面 Agent Runtime**。

它的核心链路是：

1. 读取桌面窗口
2. 截图并做视觉定位
3. 调用 Provider/模型判断是否回复
4. 用鼠标键盘模拟人类操作
5. 记录 work-trace
6. 从 trace 中沉淀经验卡片

这意味着它的“后端”主要在 Electron 主进程和 `src/core` 里，不是单独一台服务端。

## 2. 一眼看懂架构

```text
renderer UI (React)
  -> IPC
main process (Electron)
  -> RuntimeHost
  -> ChannelSession
  -> DesktopDevice
      -> RPADevice (微信 / 企微 VLM 路线)
      -> BoxSelectDevice (通用应用手动框选路线)
  -> ProviderAdapter
  -> AIClient / remote provider
  -> TraceRecorder
  -> ExperienceStore
```

关键入口：

- [src/main/index.ts](G:\code\sightflow-desktop-agent\src\main\index.ts)
- [src/core/runtime-host.ts](G:\code\sightflow-desktop-agent\src\core\runtime-host.ts)
- [src/core/generic-channel-session.ts](G:\code\sightflow-desktop-agent\src\core\generic-channel-session.ts)
- [src/core/rpa-device.ts](G:\code\sightflow-desktop-agent\src\core\rpa-device.ts)
- [src/core/box-select-device.ts](G:\code\sightflow-desktop-agent\src\core\box-select-device.ts)

## 3. 启动链路

### 3.1 UI 启动

主窗口在 [src/main/index.ts](G:\code\sightflow-desktop-agent\src\main\index.ts) 创建，renderer 从 `src/renderer/src/App.tsx` 进入。

### 3.2 点击开始

前端点击“开始”后：

1. 读取 `settings:getAll`
2. 检查 vision API Key
3. 检查 Provider 配置
4. 调用 `engine:start`

对应逻辑在：

- [src/renderer/src/App.tsx](G:\code\sightflow-desktop-agent\src\renderer\src\App.tsx)
- [src/main/index.ts](G:\code\sightflow-desktop-agent\src\main\index.ts)

### 3.3 主进程真正启动引擎

`startEngineCore()` 会：

1. 解析设置
2. 选择 appType
3. 决定 capture strategy
4. 创建 `DesktopDevice`
5. 创建 Provider
6. 创建 `TraceRecorder`
7. 创建 `RuntimeHost`
8. `runtime.startSession()`

这部分是二开最重要的入口。

## 4. 核心模块拆解

### 4.1 `RuntimeHost`

文件：[src/core/runtime-host.ts](G:\code\sightflow-desktop-agent\src\core\runtime-host.ts)

它负责：

- 事件队列
- 定时重试
- Provider 调用包装
- trace 注入
- 启停状态管理

你可以把它理解成“运行时调度器”。

### 4.2 `GenericChannelSession`

文件：[src/core/generic-channel-session.ts](G:\code\sightflow-desktop-agent\src\core\generic-channel-session.ts)

它负责把抽象事件变成动作流程：

- `bootstrap`
- `observe_chat`
- `provider.thinking`
- `provider.reply_text`
- `provider.skip`
- `provider.error`
- `check_unread`
- `wait_retry`

这是最像“业务流程脚本”的地方。

### 4.3 `DesktopDevice`

文件：[src/core/device.ts](G:\code\sightflow-desktop-agent\src\core\device.ts)

它定义了桌面自动化的能力接口：

- 识别布局
- 截图
- 判断未读
- 检查聊天区 diff
- 发送消息
- 激活未读会话

`RPADevice` 和 `BoxSelectDevice` 都实现这个接口。

## 5. 两条设备路线

### 5.1 RPADevice

文件：[src/core/rpa-device.ts](G:\code\sightflow-desktop-agent\src\core\rpa-device.ts)

这是微信 / 企业微信的视觉自动化路线：

- 用 VLM 找布局
- 用红点像素扫描找未读
- 用 chatMainArea diff 判断消息变化
- 用 RobotJS 做点击、粘贴、发送

它最适合：

- 微信
- 企业微信
- 需要自动识别布局的场景

风险点：

- 依赖窗口标题和布局稳定性
- 视觉识别受缩放、多屏、主题影响
- 大模型调用成本更高

### 5.2 BoxSelectDevice

文件：[src/core/box-select-device.ts](G:\code\sightflow-desktop-agent\src\core\box-select-device.ts)

这是通用应用的手动框选路线：

- 用户框选 `contactList`
- 用户框选 `chatMain`
- 用户框选 `inputBox`

它更适合：

- 钉钉
- 飞书
- Slack
- Telegram
- 其他桌面应用

优点：

- 稳
- 不依赖 VLM 去猜布局

代价：

- 需要人工框选
- 不处理联系人切换
- 更像“当前会话助手”

## 6. Provider 系统

### 6.1 Provider 是什么

Provider 负责：

- 看截图
- 理解上下文
- 决定回复 / 跳过 / 报错

相关文档：

- [docs/provider.md](G:\code\sightflow-desktop-agent\docs\provider.md)
- [src/main/provider-bundle.ts](G:\code\sightflow-desktop-agent\src\main\provider-bundle.ts)
- [src/core/session-types.ts](G:\code\sightflow-desktop-agent\src\core\session-types.ts)

### 6.2 Provider 包格式

每个 Provider 至少需要：

- `manifest.json`
- `provider.bundle.js`

`manifest.json` 里定义：

- id
- name
- version
- entry
- moduleType
- capabilities
- configSchema

### 6.3 当前内置 Provider

仓库内置的是 `volcengine-ark` 示例：

- [resources/providers/volcengine-ark/manifest.json](G:\code\sightflow-desktop-agent\resources\providers\volcengine-ark\manifest.json)
- [resources/providers/volcengine-ark/provider.bundle.js](G:\code\sightflow-desktop-agent\resources\providers\volcengine-ark\provider.bundle.js)

它本质上是一个 OpenAI 兼容 `/chat/completions` 调用。

### 6.4 二开最适合改 Provider 的情况

如果你想：

- 接自己的模型
- 改 system prompt
- 改回复策略
- 改输出格式

优先改 Provider，不要先动引擎。

## 7. Trace 和 Memory

### 7.1 work-trace

文件：

- [src/core/trace/trace-recorder.ts](G:\code\sightflow-desktop-agent\src\core\trace\trace-recorder.ts)
- [src/core/trace/trace-types.ts](G:\code\sightflow-desktop-agent\src\core\trace\trace-types.ts)

它会把每轮会话写成：

- `session.json`
- `trace.jsonl`
- `screenshots/*.png`

这套数据是二开的宝库，因为它能复盘你每一步为什么这么做。

### 7.2 Experience Cards

文件：

- [src/core/memory/experience-store.ts](G:\code\sightflow-desktop-agent\src\core\memory\experience-store.ts)
- [src/core/memory/learn-from-session.ts](G:\code\sightflow-desktop-agent\src\core\memory\learn-from-session.ts)

它做的是：

- 从 trace 里归纳经验
- 人工纠正成卡片
- 运行时把卡片注入 Provider

这是 SightFlow 最有“工作记忆”味道的部分。

### 7.3 二开建议

如果你想让它更像一个真正的企业助手，最值得先增强的是：

- 经验卡片的检索和排序
- 按 appType / 场景分类
- 卡片失效和版本管理
- trace 的搜索和标签

## 8. 视觉、截图和输入

### 8.1 视觉定位

文件：

- [src/core/rpa/vision-utils.ts](G:\code\sightflow-desktop-agent\src\core\rpa\vision-utils.ts)
- [src/core/rpa/has-unread.ts](G:\code\sightflow-desktop-agent\src\core\rpa\has-unread.ts)
- [src/core/rpa/screenshot-utils.ts](G:\code\sightflow-desktop-agent\src\core\rpa\screenshot-utils.ts)

核心做法：

- 截图
- 调 VLM 定位区域
- 将 bbox 归一化为 0-1000
- 再换算回屏幕坐标

它对窗口标题、缩放比例、多屏配置很敏感。

### 8.2 输入模拟

文件：[src/core/rpa/input-utils.ts](G:\code\sightflow-desktop-agent\src\core\rpa\input-utils.ts)

做了这些事：

- 拟人化鼠标移动
- 点击
- 剪贴板粘贴
- 回车发送

对二开来说，这块最容易换成：

- `pyautogui`
- `pynput`
- `Win32 SendInput`
- `UIAutomation`

### 8.3 窗口识别

文件：[src/core/rpa/window-utils.ts](G:\code\sightflow-desktop-agent\src\core\rpa\window-utils.ts)

它用：

- `active-win`
- `node-window-manager`

来找微信 / 企微 / 目标窗口。

## 9. UI 结构

### 9.1 主界面

文件：[src/renderer/src/App.tsx](G:\code\sightflow-desktop-agent\src\renderer\src\App.tsx)

主界面包含：

- 目标应用选择
- 框选按钮
- 启动 / 停止
- 设置
- 工作用记忆
- 日志

### 9.2 设置页

同一个 `App.tsx` 里包含：

- 基础设置
- Provider 设置

这里是前端最关键的配置入口。

### 9.3 Memory 窗口

文件：[src/renderer/src/MemoryWindow.tsx](G:\code\sightflow-desktop-agent\src\renderer\src\MemoryWindow.tsx)

它负责：

- 查看 trace
- 回放步骤
- 查看截图
- 从 trace 中“沉淀经验”
- 手工新增 / 删除经验卡片

## 10. 额外能力

### 10.1 Skill HTTP Server

文件：[src/main/skill-server.ts](G:\code\sightflow-desktop-agent\src\main\skill-server.ts)

它对本地开放：

- `POST /skill/start`
- `POST /skill/pause`
- `GET /skill/status`

这是给外部 Agent 控制 SightFlow 的接口，不是面向公网的服务。

### 10.2 盒选向导

文件：[src/main/overlay-window.ts](G:\code\sightflow-desktop-agent\src\main\overlay-window.ts)

它负责弹一个透明覆盖层，让用户框选区域。

### 10.3 权限

文件：[src/main/permission.ts](G:\code\sightflow-desktop-agent\src\main\permission.ts)

macOS 下需要：

- Accessibility
- Screen Recording

## 11. 二开优先级建议

如果你准备改造，我建议按这个顺序来：

### 11.1 第一优先级

- 接你自己的 Provider
- 调整 system prompt
- 改回复策略

这是收益最大、风险最小的改动。

### 11.2 第二优先级

- 增强 trace 搜索
- 调整经验卡片逻辑
- 改 UI 字段和配置流

### 11.3 第三优先级

- 替换底层输入模块
- 替换截图 / 视觉定位
- 把某些核心能力迁到 Python 或 C#

## 12. 如果你要迁到 Python 或 C#

可以迁，但别整包硬搬。

更稳的方式是：

1. 保留 Electron UI
2. 把 Provider 独立出去
3. 再把视觉识别和动作执行迁出去

### Python 适合

- OpenCV
- OCR
- 模型调用
- 快速实验

### C# 适合

- Windows 桌面自动化
- UIAutomation
- WPF / WinUI
- 稳定分发

## 13. 当前仓库的主要风险

### 13.1 视觉不稳定

布局识别依赖：

- 窗口标题
- DPI
- 多屏
- 缩放
- UI 主题

### 13.2 模型成本和隐私

截图会发给 Provider，所以要注意：

- 是否包含敏感数据
- 是否满足合规要求
- 是否需要自建模型

### 13.3 原生模块依赖

仓库里有 `robotjs`、`active-win`、`node-window-manager` 之类原生依赖，Windows 上需要 C++ Build Tools。

### 13.4 版本耦合

它目前对：

- Electron
- Electron Vite
- Provider 格式

都比较耦合，升级时要小心。

## 14. 你现在最该先读的文件

按这个顺序读最省力：

1. [src/main/index.ts](G:\code\sightflow-desktop-agent\src\main\index.ts)
2. [src/core/runtime-host.ts](G:\code\sightflow-desktop-agent\src\core\runtime-host.ts)
3. [src/core/generic-channel-session.ts](G:\code\sightflow-desktop-agent\src\core\generic-channel-session.ts)
4. [src/core/device.ts](G:\code\sightflow-desktop-agent\src\core\device.ts)
5. [src/core/rpa-device.ts](G:\code\sightflow-desktop-agent\src\core\rpa-device.ts)
6. [src/core/box-select-device.ts](G:\code\sightflow-desktop-agent\src\core\box-select-device.ts)
7. [docs/provider.md](G:\code\sightflow-desktop-agent\docs\provider.md)
8. [src/renderer/src/App.tsx](G:\code\sightflow-desktop-agent\src\renderer\src\App.tsx)
9. [src/renderer/src/MemoryWindow.tsx](G:\code\sightflow-desktop-agent\src\renderer\src\MemoryWindow.tsx)

## 15. 一句话结论

SightFlow 的核心价值不在“自动点按钮”，而在于它把：

- 视觉理解
- 操作执行
- 过程记录
- 经验沉淀

这四件事连成了闭环。

如果你要二开，最值得保留的是这套闭环；最值得先改的是 Provider 和经验卡片；最不该一上来就重写的是主进程调度和 trace 结构。
