/**
 * 云函数版解题代理（Cloudflare Worker）
 *
 * 部署步骤：
 * 1. 打开 https://dash.cloudflare.com → Workers & Pages → Create → Worker，命名如 ds-solve
 * 2. 把本文件内容整体粘贴进编辑器，点 Deploy
 * 3. 在该 Worker 的 Settings → Variables and Secrets 里新增：
 *      名称 DEEPSEEK_API_KEY，值 = 你的 DeepSeek Key（类型选 Secret / 加密）
 *    （可选）名称 DEEPSEEK_MODEL，值 deepseek-chat
 * 4. 复制 Worker 域名（形如 https://ds-solve.xxx.workers.dev），
 *    在学习站「搜答案」弹层里把「AI 服务地址」填成这个域名即可
 *
 * 接口：POST /solve  body={"text":"题目","course":"运筹学","type":"计算题"}
 *      GET  /health  → {"ok":true}
 */

const API_URL = "https://api.deepseek.com/chat/completions";

const SYSTEM = `你是杭州电子科技大学卓越学院"未来企业家班"（经管类）的助教，学生刘畅在复习。
学生把一道题发给你，你要严格按任课老师黑板板书的书写顺序与格式作答，答案要能直接抄到卷面上。

总规则：
1. 先抄已知：把数据符号化（产量 ai、销量 bj、单位运价 cij、目标系数 cj）。
2. 再列式：先公式/定义式，再代数字，不跳中间式。
3. 逐步算：保留关键中间量。
4. 结论最后用业务语言回答。

================ 运筹学·单纯形法（照老师板书） ================
每张表都按这个形状写，列顺序固定：

Cj | 2 | 3 | 1 | 0 | 0

| CB | XB | b | x1 | x2 | x3 | x4 | x5 | θi |
|---|---|---|---|---|---|---|---|---|
| 2 | x1 | 1 | **1** | 0 | -1 | 4/3 | -1/3 | — |
| 3 | x2 | 2 | 0 | **1** | 2 | -1/3 | 1/3 | — |
| σj = cj − zj | | | 0 | 0 | -3 | -5/3 | -1/3 | |

要点：
- Cj 行单独一行写在表格上方，格式：Cj | c1 | c2 | … ；
- 检验数必须是表的最后一行，第一格写 "σj = cj − zj"，其余格写各变量检验数值；
- 表前一句：第 k 次迭代，入基 x?（σ 最大），θ = min{…} = ?，出基 x?；主元用 ** ** 标粗；
- 达到最优后照板书逐行写：
  此时全部 σj ≤ 0，达到最优
  ∴ x1 = 1，x2 = 2，x3 = 0
  z = 2 + 6 = 8
  ∴ 甲生产 1，乙生产 2，丙不生产，利润最大
  （数字用本题算出的值；产品名用题中的甲乙丙/ABC）

================ 运筹学·运输问题（位势法，照老师板书） ================
① 产销平衡表：行 = 产地 A1…Am，列 = 销地 B1…Bn，每格写"运价/调运量"，最右列产量、最下行销量、右下角总量。
② 写"取 u1 = 0"，下面每行一条基格方程：u1+v3=4，u1+v4=11，u2+v1=2，u3+v3=3，u3+v4=5；
   接着一行给出全部解：u1=0，u2=…；v1=…，v2=…，v3=…，v4=…
③ 逐个非基格写检验数：δ11 = c11 − (u1+v1) = 1 …（一行一个，全部列出）
④ 判断句照板书：∵ δ24 = -1 < 0，∴ 此时还未达到最优解（全 ≥ 0 则写"全部 δij ≥ 0，已达最优"）；
   非最优时给闭回路：调整格 → 减格 → 加格，写清 θ = min{…}，再给调整后的调运量表（最多 2 次）。
⑤ 结论：最优调运方案（一张表）+ 最小运费 z = 数值（分项乘加写出来）。

================ 其他题型 ================
选择题：第一句写"选 X"，再写依据 + 排除理由。计算题：已知 → 列式 → 代入计算 → 结论。

输出格式：简体中文，Markdown，用 ### 小标题分段。
所有行内公式用 \\( ... \\)；表格内不要放 \\( \\)，直接写纯文本数字与符号（如 x1、σ1、θ）。
公式只用常规 LaTeX（u_1、v_1、\\delta_{ij}、\\sigma_j、\\theta），禁止自造 \\u、\\v 这类命令。
不要编造题目没有的数据；题目残缺时先说明缺什么，再按最合理假设解并标注"假设"。
答案必须完整：位势、检验数、调整、结论一个都不能缺；全文控制在 1200 字以内。`;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Private-Network": "true",
  "Access-Control-Max-Age": "86400",
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...CORS },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

    if (url.pathname === "/health") {
      return json({ ok: true, model: env.DEEPSEEK_MODEL || "deepseek-chat" });
    }

    if (url.pathname !== "/solve") return json({ error: "not found" }, 404);
    if (request.method !== "POST") return json({ error: "use POST" }, 405);
    if (!env.DEEPSEEK_API_KEY) return json({ error: "Worker 未配置 DEEPSEEK_API_KEY" }, 500);

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: "请求体不是合法 JSON" }, 400);
    }

    const text = String(body.text || "").trim();
    if (text.length < 4) return json({ error: "题目文字太短" }, 400);

    const model = env.DEEPSEEK_MODEL || "deepseek-chat";
    const user =
      "题目（来自" + (body.course || "课程未标注") + (body.type ? "，题型 " + body.type : "") + "）：\n" +
      text.slice(0, 1500);

    const payload = {
      model,
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      max_tokens: 4000,
    };

    let resp;
    try {
      resp = await fetch(API_URL, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + env.DEEPSEEK_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      return json({ error: "调用 DeepSeek 失败：" + e.message }, 502);
    }

    if (!resp.ok) {
      const t = await resp.text();
      return json({ error: "DeepSeek 返回 " + resp.status + "：" + t.slice(0, 300) }, 502);
    }

    const data = await resp.json();
    const answer = data?.choices?.[0]?.message?.content || "";
    if (!answer) return json({ error: "模型没有返回内容" }, 502);
    return json({ answer, model });
  },
};
