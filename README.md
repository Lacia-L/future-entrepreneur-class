# 未来企业家班 · 学习站

杭州电子科技大学卓越学院「未来企业家班」（经管类特色实验班）课程学习站。本站把班级公开培养方案中的核心课程整理为**教材与公开课、知识点讲义、分章练习、模拟套卷**四部分，供班级同学课前预习、课后复习与考前自测使用。

> 本站课程清单依据杭电卓越学院经管类实验班**公开培养方案**整理，教材为公开渠道常用教材参考，习题为学习站自编练习。最新培养方案以教务系统与课堂要求为准。

## 课程清单（24 门 · 5 类）

| 分类 | 课程 | 入口 |
| --- | --- | --- |
| 数理编程 | 高等数学（甲） | `index.html#course/gaoshu` |
| 数理编程 | 线性代数 | `index.html#course/xianxingdaishu` |
| 数理编程 | 概率论与数理统计 | `index.html#course/gailvlun` |
| 数理编程 | 运筹学 | `index.html#course/yunchouxue` |
| 数理编程 | C 语言程序设计 | `index.html#course/c-yuyan` |
| 经管核心 | 微观经济学 | `index.html#course/weiguan` |
| 经管核心 | 宏观经济学 | `index.html#course/hongguan` |
| 经管核心 | 管理学 | `index.html#course/guanlixue` |
| 经管核心 | 会计学基础 | `index.html#course/kuaiji` |
| 经管核心 | 金融学（甲） | `index.html#course/jinrongxue` |
| 经管核心 | 统计学（乙） | `index.html#course/tongjixue` |
| 经管核心 | 经济法 | `index.html#course/jingjifa` |
| 思政通识 | 大学军事（军事理论） | `index.html#course/junshi` |
| 思政通识 | 思想道德与法治 | `index.html#course/sidao` |
| 思政通识 | 中国近现代史纲要 | `index.html#course/jinxiandaishi` |
| 思政通识 | 马克思主义基本原理 | `index.html#course/mayuan` |
| 思政通识 | 毛概 · 习概 | `index.html#course/maogai` |
| 思政通识 | 形势与政策 | `index.html#course/xingshi` |
| 成长通识 | 大学生心理健康教育 | `index.html#course/xinlijiankang` |
| 成长通识 | 大学生职业发展与就业指导 | `index.html#course/zhiyefazhan` |
| 成长通识 | 大学英语（精读 / 听说） | `index.html#course/daxueyingyu` |
| 成长通识 | 创新创业基础 | `index.html#course/chuangxin` |
| 创业特色 | 创业管理 | `index.html#course/chuangyeguanli` |
| 创业特色 | 专业学科导论 | `index.html#course/xuekedaolun` |

## 每门课的四个板块

1. **教材与公开课**：杭电官网公开渠道可查证到的教材信息；查不到时写明口径并给出常用教材参考 + 中国大学 MOOC / 学堂在线 / 国家高等教育智慧教育平台等真实公开课链接（个别暂无法核实的链接标注「链接待核实」并注明课程名与平台）。
2. **知识点讲义**：按章节/模块组织的讲义，每个专有名词配「通俗解释 + 具体例子」（如边际成本给出完整计算示例）；数学类课程另附公式速查卡片。
3. **分章练习**：按章节逐章出题，每章含选择题 / 填空题 / 大题（该章不适用的题型已说明），覆盖该章全部知识点，难度由易到难；每题含答案、详细解析与知识点标签。
4. **模拟套卷**：全书综合模拟卷（每门 2 套），题型参照真实考试，覆盖各章核心知识点；每套独立成卷，附完整答案与详细解析，每题标注对应知识点。

## 本地预览

方式一（推荐）：直接用浏览器打开根目录 `index.html`（数学公式由 KaTeX CDN 渲染，需联网）。

方式二（本地静态服务器，体验与线上一致）：

```bash
# 在站点根目录执行
python -m http.server 8000
# 浏览器访问 http://localhost:8000
```

## 部署到 GitHub Pages

1. 在 GitHub 新建仓库（或复用原站仓库），把**本目录**整体上传（`index.html`、`assets/`、`data/`、`README.md`）。
2. 仓库 Settings → Pages → Source 选择 `main` 分支根目录，保存后即可通过 `https://<用户名>.github.io/<仓库名>/` 访问。

注意：全站使用相对路径互相链接（课程数据存放在 `data/courses.js`），上传时请保持目录结构不变。

## 目录结构

```
future-entrepreneur-class/
├── index.html          ← 数据驱动单页站（首页 + 课程详情，hash 路由）
├── README.md
├── assets/
│   ├── css/style.css   ← 共享样式（奶酪奶油主题，含深浅双主题）
│   └── js/main.js      ← 首页渲染 / 搜索筛选 / 课程四板块渲染 / 页签切换 / KaTeX
└── data/
    ├── courses.js      ← 全部课程数据（window.COURSES，页面加载入口）
    ├── courses.json    ← 同一数据的可读 JSON（便于维护/复用）
    ├── <slug>.json     ← 每门课一份源数据（schema 见 data/schema.md）
    └── schema.md       ← 数据格式规范
```

## 技术说明

- 架构：数据驱动单页应用 —— 课程内容全部以 JSON 数据存放，`main.js` 按 hash 路由渲染首页与课程详情（教材与公开课 / 知识点讲义 / 公式速查 / 分章练习 / 模拟套卷 五个页签）。
- 主题：延续原站「奶酪奶油」视觉（`#F5B942` 主色），支持浅色 / 深色切换（localStorage 记忆）。
- 数学公式：KaTeX `0.16.11`（jsDelivr CDN），公式写在 `\(…\)` / `\[…\]` 中。
- 无构建工具、无外部框架，纯静态 HTML + CSS + 原生 JS + JSON 数据，GitHub Pages 可直接托管（`file://` 直接打开亦可正常使用）。
