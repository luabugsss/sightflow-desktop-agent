# SightFlow Desktop Agent

这是一个基于 Electron + React + TypeScript 的桌面 Agent Runtime。

它的核心不是“点按钮”，而是：
- 看懂桌面界面
- 生成回复或操作决策
- 通过鼠标、键盘、截图等方式完成真实操作
- 把每次执行沉淀成 work-trace 和经验卡片

## 项目主线

`renderer UI` -> `IPC` -> `main process` -> `RuntimeHost` -> `DesktopDevice` / `Provider` / `TraceRecorder` / `ExperienceStore`

## 二开优先级

1. 自定义 `Provider`
2. 调整 `system prompt` 和回复策略
3. 优化 trace / memory 结构
4. 替换视觉识别或输入执行模块

## 关键文件

- `src/main/index.ts`
- `src/core/runtime-host.ts`
- `src/core/generic-channel-session.ts`
- `src/core/device.ts`
- `src/core/rpa-device.ts`
- `src/core/box-select-device.ts`
- `src/main/provider-bundle.ts`
- `src/core/trace/trace-recorder.ts`
- `src/core/memory/experience-store.ts`
- `src/renderer/src/App.tsx`

## 开发方式

```bash
npm install
npm run dev
```

打包：

```bash
npm run build:win
```

## 备注

- `docs/provider.md` 讲 Provider 接入方式
- `docs/SightFlow_审查与二开指南.md` 讲项目结构和二开建议
- 默认内置 Provider 示例是 `resources/providers/volcengine-ark`
