# LLM Chat Tester

一个用于测试 OpenAI 兼容接口的本地网页聊天面板，支持多模型、多端点、历史对话与本地持久化。

An open-source local web UI for testing OpenAI-compatible APIs, with multi-model support, endpoint presets, chat history, and local persistence.

## 功能
- 类 GPT 聊天界面：回车发送、Shift+Enter 换行
- 端点预设：北京/新加坡兼容模式、DashScope Coding
- 模型预设 + 自定义模型
- 本地对话历史（最近 30 天）
- 配置自动保存（无需重复点击保存）
- 测试连接 / 调试配置

## Features
- GPT-like chat UI: Enter to send, Shift+Enter for new line
- Endpoint presets + custom base URL
- Model presets + custom model
- Local chat history (last 30 days)
- Auto-save config
- Connection test / debug

## 运行方式

### 前置条件
- 需要安装 Node.js（自带 `npm`）

### 安装 Node.js（通用说明）
> 下列方式任选其一即可，安装完成后请运行 `node -v` 和 `npm -v` 验证。

**Windows**
- 使用 `winget`：
  ```bash
  winget install OpenJS.NodeJS.LTS
  ```
- 使用 `choco`：
  ```bash
  choco install nodejs-lts
  ```
- 或者使用官方安装包（图形界面）

**macOS**
- 使用 Homebrew：
  ```bash
  brew install node
  ```
- 或者使用官方安装包（图形界面）

**Linux**
- Ubuntu / Debian：
  ```bash
  sudo apt update
  sudo apt install -y nodejs npm
  ```
- Fedora / RHEL：
  ```bash
  sudo dnf install -y nodejs npm
  ```
- Arch：
  ```bash
  sudo pacman -S nodejs npm
  ```

### 首次安装
```bash
npm install
```

### 启动
```bash
npm start
```

浏览器访问：
```
http://localhost:3000
```

首次启动会自动生成 `data/` 目录及必要的 JSON 文件。

## Quick Start (English)

### Prerequisites
- Install Node.js (includes `npm`)

### Install
```bash
npm install
```

### Run
```bash
npm start
```

Open in browser:
```
http://localhost:3000
```

On first run, the `data/` directory and required JSON files will be created automatically.

## 目录结构
- `index.html`：前端页面
- `server.js`：本地服务与代理
- `data/config.json`：配置持久化
- `data/sessions.json`：会话列表（30 天内）
- `data/conversations.json`：会话消息

## Project Structure
- `index.html`: frontend
- `server.js`: local server + proxy
- `data/config.json`: config persistence
- `data/sessions.json`: session list (last 30 days)
- `data/conversations.json`: session messages

## 使用说明
1. 选择 Endpoint（或自定义 Base URL）
2. 选择模型（或自定义模型）
3. 填写 API Token
4. 发送消息或点击“测试连接”

> 注意：不同 Endpoint 支持的模型不同，请根据你的服务方说明选择。

## Usage (English)
1. Pick an endpoint (or set a custom base URL)
2. Choose a model (or set a custom model)
3. Enter your API token
4. Send a message or click “Test Connection”

> Note: Model availability depends on the endpoint/provider you use.

## 安全提示
- 请勿将真实 API Key 提交到 GitHub
- `data/config.json` 中包含 Token，请避免同步到公共仓库
- 建议在 `.gitignore` 中忽略 `data/` 目录

## Security Notes (English)
- Do NOT commit real API keys to GitHub
- `data/config.json` contains your token; avoid syncing it to public repos
- `data/` is ignored in `.gitignore`

示例 `.gitignore`：
```
data/
```

## 许可证
本项目为本地测试用途，未包含任何云端服务端代码。
