# Tixx AI Product Image Generator - Indonesia TikTok Edition

一个可直接本地使用的前端系统（无需后端），用于：

1. 上传产品原图和主图框；
2. 填写产品信息与核心卖点；
3. 一键生成图像预处理 Prompt、主图方案、渲染 Prompt、局部重绘 Prompt；
4. 预览 800x800 主图排版并导出 PNG。

> 也支持一键发布成线上网页端（GitHub Pages / Vercel / Netlify），用户可直接访问 URL 使用，无需本地部署。

---

## 目录结构

将以下文件放在同一目录：

- `index.html`
- `style.css`
- `script.js`

---

## 直接运行（推荐两种）

### 方式 1：双击打开

直接双击 `index.html`，浏览器即可打开使用。

### 方式 2：本地静态服务（更稳定）

在项目目录运行：

```bash
python3 -m http.server 8080
```

然后打开：

`http://localhost:8080`

---

## 线上发布（无需用户本地部署）

### 方案 A：GitHub Pages（已内置自动部署工作流）

仓库已包含：`.github/workflows/deploy-pages.yml`。  
只需：

1. 将仓库推送到 GitHub；
2. 在 GitHub 仓库 `Settings -> Pages` 中启用 GitHub Pages；
3. 等待 Actions 执行完成；
4. 访问生成的线上地址（通常为 `https://<你的用户名>.github.io/<仓库名>/`）。

### 方案 B：Vercel

仓库已包含 `vercel.json`。  
只需将仓库导入 Vercel，框架选择 `Other` / `Static`，即可自动部署。

### 方案 C：Netlify

仓库已包含 `netlify.toml`。  
只需将仓库导入 Netlify，发布目录使用默认配置（根目录）即可。

---

## 快速使用流程

1. Step 1 上传产品原图，点击 **生成高清白底修复 Prompt**。
2. Step 2 填写产品名称、参数、卖点、语言、类目、场景、风格。
3. Step 3 上传 PNG 主图框。
4. 点击：
   - **生成印尼 TikTok 主图方案**
   - **生成 ChatGPT Image 2.0 渲染 Prompt**
   - **生成局部重绘 Prompt**
5. 使用：
   - **复制 Prompt**
   - **导出 Prompt TXT**
   - **导出预览 PNG**

---

## 已实现能力

- ✅ 本地图片上传与预览
- ✅ 800x800 预览画布
- ✅ 自动生成多类 Prompt
- ✅ Copy / TXT 导出 / PNG 导出
- ✅ localStorage 自动保存与恢复
- ✅ 清空全部数据

---

## 注意事项

- 当前版本是**纯本地前端工具**，不会调用真实 OpenAI API。
- 后续可基于 `index.html` 中的 TODO 接口位接入 Images Generate / Edit / Variation。
- 如果浏览器禁用剪贴板权限，复制按钮会退回到选中复制方式。
