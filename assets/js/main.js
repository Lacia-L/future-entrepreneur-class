/* =========================================================
   未来企业家班 · 学习站  main.js
   - 课程列表 / 搜索 / 深浅主题
   - 课程内 4 Tab（讲义 / 习题 / 变式 / 公式）
   - 收藏 & 错题本（localStorage）
   - KaTeX + marked 渲染
   ========================================================= */
'use strict';

/* ---------- 常量 ---------- */
const COURSES_URL = './data/courses.json';
const THEME_KEY = 'fe-class-theme';
const DB_KEY = 'fe-class-db-v1';

/* ---------- 全局状态 ---------- */
let COURSES = [];
let currentCourse = null;
let currentTab = 'lecture';
let db = loadDB();

/* ---------- 工具：转义 ---------- */
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/* ---------- 工具：localStorage ---------- */
function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return { fav: {}, wrong: {} };
    const d = JSON.parse(raw);
    return { fav: d.fav || {}, wrong: d.wrong || {} };
  } catch (e) {
    return { fav: {}, wrong: {} };
  }
}
function saveDB() {
  try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch (e) { /* 存储满/被禁用时静默 */ }
}

function wrongKey(courseId, exId) { return courseId + '|' + exId; }

/* ---------- KaTeX + Markdown 渲染 ---------- */
function katexRender(tex, displayMode) {
  try {
    const html = katex.renderToString(tex, {
      throwOnError: false,
      displayMode: !!displayMode,
      strict: false,
      trust: false,
      output: 'html'
    });
    if (displayMode) {
      return '<div class="math-scroll" tabindex="0">' + html + '</div>';
    }
    return html;
  } catch (e) {
    return '<span class="math-fallback">' + escapeHtml(tex) + '</span>';
  }
}

/*
 * 渲染「Markdown + 数学公式」文本。
 * 先把 $$...$$ 与 $...$ 用占位符保护起来（避免 marked 误解析 _、\ 等），
 * 再用 marked 渲染 Markdown，最后把占位符替换回 KaTeX 生成的 HTML。
 */
function renderMathMarkdown(text) {
  if (!text) return '';
  const placeholders = [];
  let t = String(text)
    .replace(/\$\$([\s\S]+?)\$\$/g, function (m, inner) {
      const i = placeholders.length;
      placeholders.push(katexRender(inner.trim(), true));
      return '\u0001M' + i + '\u0001';
    })
    .replace(/\$([^$\n]+?)\$/g, function (m, inner) {
      const i = placeholders.length;
      placeholders.push(katexRender(inner.trim(), false));
      return '\u0001M' + i + '\u0001';
    });
  let html = marked.parse(t, { breaks: true, gfm: true });
  html = html.replace(/\u0001M(\d+)\u0001/g, function (m, i) {
    return placeholders[+i] || '';
  });
  return html;
}

function md(text) {
  if (Array.isArray(text)) text = text.join('\n');
  return renderMathMarkdown(text);
}

/* ---------- 首页：课程卡片 ---------- */
function courseCard(c) {
  return (
    '<button class="course-card" type="button" data-id="' + escapeHtml(c.id) + '">' +
      '<span class="card-emoji" aria-hidden="true">' + (c.emoji || '📘') + '</span>' +
      '<h2 class="card-title">' + escapeHtml(c.title) + '</h2>' +
      '<p class="card-desc">' + escapeHtml(c.description || '') + '</p>' +
      '<div class="card-meta">' +
        (c.term ? '<span>' + escapeHtml(c.term) + '</span>' : '') +
        (c.teacher ? '<span>👨‍🏫 ' + escapeHtml(c.teacher) + '</span>' : '') +
        ((c.tags && c.tags.length) ? '<span>' + c.tags.slice(0, 3).map(escapeHtml).join(' · ') + '</span>' : '') +
      '</div>' +
      '<span class="card-go">进入课程 →</span>' +
    '</button>'
  );
}

function renderHome(filter) {
  const grid = document.getElementById('courseGrid');
  const empty = document.getElementById('searchEmpty');
  const q = (filter || '').trim().toLowerCase();
  const list = COURSES.filter(function (c) {
    if (!q) return true;
    const hay = ((c.title || '') + ' ' + (c.description || '') + ' ' + ((c.tags || []).join(' '))).toLowerCase();
    return hay.indexOf(q) !== -1;
  });
  grid.innerHTML = list.map(courseCard).join('');
  empty.hidden = list.length > 0;
}

/* ---------- 课程详情 ---------- */
function openCourse(id) {
  const course = COURSES.find(function (c) { return c.id === id; });
  if (!course) return;
  currentCourse = course;
  document.getElementById('homeView').hidden = true;
  document.getElementById('courseView').hidden = false;
  document.getElementById('courseHead').innerHTML =
    '<div class="course-head">' +
      '<span class="card-emoji" aria-hidden="true">' + (course.emoji || '📘') + '</span>' +
      '<div style="flex:1;min-width:0">' +
        '<h1>' + escapeHtml(course.title) + '</h1>' +
        '<div class="ch-meta">' +
          (course.semester ? '<span>🗓 ' + escapeHtml(course.semester) + '</span>' : '') +
          (course.credits ? '<span>🎓 ' + escapeHtml(course.credits) + '</span>' : '') +
          (course.term ? '<span>' + escapeHtml(course.term) + '</span>' : '') +
          (course.teacher ? '<span>👨‍🏫 ' + escapeHtml(course.teacher) + '</span>' : '') +
          ((course.tags || []).map(function (t) { return '<span>' + escapeHtml(t) + '</span>'; }).join('')) +
        '</div>' +
        (course.description ? '<p class="ch-desc">' + escapeHtml(course.description) + '</p>' : '') +
        (course.textbook ? '<p class="ch-textbook">📚 参考教材：<span>' + escapeHtml(course.textbook) + '</span></p>' : '') +
      '</div>' +
    '</div>';
  switchTab('lecture');
  window.scrollTo({ top: 0, behavior: 'auto' });
}

function switchTab(name) {
  currentTab = name;
  const tabs = document.querySelectorAll('#courseTabs .tab');
  tabs.forEach(function (t) { t.classList.toggle('active', t.dataset.tab === name); });
  renderTabBody();
}

function renderTabBody() {
  const body = document.getElementById('tabBody');
  if (!currentCourse) return;
  if (currentTab === 'lecture') body.innerHTML = '<div class="md lecture">' + md(currentCourse.lecture) + '</div>';
  else if (currentTab === 'exercises') renderExercises();
  else if (currentTab === 'variants') renderVariants();
  else if (currentTab === 'formulas') renderFormulas();
}

function renderExercises() {
  const body = document.getElementById('tabBody');
  const list = currentCourse.exercises || [];
  body.innerHTML =
    '<div class="section-hint">📚 共 ' + list.length + ' 题 · 点击「查看答案」查看解析</div>' +
    '<div class="ex-list">' + list.map(function (ex) { return exerciseCard(currentCourse, ex, false); }).join('') + '</div>';
}

function renderVariants() {
  const body = document.getElementById('tabBody');
  const list = currentCourse.variants || [];
  if (!list.length) {
    body.innerHTML = '<div class="empty-tip">本课程暂无变式题 🥲</div>';
    return;
  }
  body.innerHTML =
    '<div class="section-hint">🔄 针对易错点的变式训练 · 举一反三</div>' +
    '<div class="ex-list">' + list.map(function (ex) { return exerciseCard(currentCourse, ex, true); }).join('') + '</div>';
}

function renderFormulas() {
  const body = document.getElementById('tabBody');
  const list = currentCourse.formulas || [];
  body.innerHTML =
    '<div class="section-hint">🧀 公式卡片 · 长公式可左右滑动</div>' +
    '<div class="formula-grid">' + list.map(formulaCard).join('') + '</div>';
}

function exerciseCard(course, ex, isVariant) {
  const key = wrongKey(course.id, ex.id);
  const faved = !!db.fav[key];
  const wronged = !!db.wrong[key];
  const badge = isVariant ? '🔄 变式' : (ex.type || '题');
  return (
    '<article class="ex-card" data-course="' + escapeHtml(course.id) + '" data-id="' + escapeHtml(ex.id) + '">' +
      '<div class="ex-top">' +
        '<span class="ex-type">' + escapeHtml(badge) + '</span>' +
        (ex.tags && ex.tags.length ? '<span class="ex-tags">' + ex.tags.map(escapeHtml).join(' · ') + '</span>' : '') +
        '<span class="ex-ops">' +
          '<button class="op-btn ' + (faved ? 'on' : '') + '" data-act="fav" data-key="' + escapeHtml(key) + '" type="button" title="收藏" aria-label="收藏">⭐</button>' +
          '<button class="op-btn ' + (wronged ? 'on' : '') + '" data-act="wrong" data-key="' + escapeHtml(key) + '" type="button" title="错题本" aria-label="加入错题本">📝</button>' +
        '</span>' +
      '</div>' +
      '<div class="ex-question md">' + md(ex.question) + '</div>' +
      (ex.options && ex.options.length
        ? '<ol class="ex-options">' + ex.options.map(function (o) { return '<li class="md">' + md(o) + '</li>'; }).join('') + '</ol>'
        : '') +
      '<div class="ex-actions"><button class="btn-ans" data-act="ans" type="button">查看答案</button></div>' +
      '<div class="ex-answer" hidden>' +
        '<div class="ans-box"><span class="ans-label">答案</span><div class="md">' + md(ex.answer) + '</div></div>' +
        (ex.explanation ? '<div class="exp-box"><span class="ans-label">解析</span><div class="md">' + md(ex.explanation) + '</div></div>' : '') +
      '</div>' +
    '</article>'
  );
}

function formulaCard(f) {
  return (
    '<article class="formula-card">' +
      '<div class="fc-head">' +
        '<h4>' + escapeHtml(f.title) + '</h4>' +
        '<button class="copy-btn" data-act="copy" data-latex="' + escapeHtml(f.latex) + '" type="button">复制</button>' +
      '</div>' +
      '<div class="fc-math">' + katexRender(f.latex, true) + '</div>' +
      (f.note ? '<p class="fc-note md">' + md(f.note) + '</p>' : '') +
    '</article>'
  );
}

/* ---------- 习题交互（事件委托） ---------- */
function toggleAnswer(card) {
  const ans = card.querySelector('.ex-answer');
  const btn = card.querySelector('.btn-ans');
  const show = ans.hidden;
  ans.hidden = !show;
  btn.textContent = show ? '收起答案' : '查看答案';
}

function toggleFav(el) {
  const key = el.dataset.key;
  if (db.fav[key]) delete db.fav[key];
  else db.fav[key] = true;
  saveDB();
  el.classList.toggle('on', !!db.fav[key]);
  toast(db.fav[key] ? '已收藏 ⭐' : '已取消收藏');
}

function toggleWrong(el) {
  const card = el.closest('.ex-card');
  const courseId = card.dataset.course;
  const exId = card.dataset.id;
  const key = wrongKey(courseId, exId);
  if (db.wrong[key]) {
    delete db.wrong[key];
    el.classList.remove('on');
    toast('已移出错题本');
  } else {
    const course = COURSES.find(function (c) { return c.id === courseId; });
    const found = course ? locateEx(course, exId) : null;
    const ex = found ? found.ex : {};
    db.wrong[key] = {
      courseId: courseId,
      exId: exId,
      courseTitle: course ? course.title : '',
      tab: found ? found.tab : 'exercises',
      question: Array.isArray(ex.question) ? ex.question.join('\n') : (ex.question || ''),
      type: ex.type || '',
      addedAt: Date.now()
    };
    el.classList.add('on');
    toast('已加入错题本 📝');
  }
  saveDB();
  updateWrongBadge();
}

function locateEx(course, exId) {
  const tabs = ['exercises', 'variants'];
  for (let i = 0; i < tabs.length; i++) {
    const arr = course[tabs[i]] || [];
    for (let j = 0; j < arr.length; j++) {
      if (arr[j].id === exId) return { tab: tabs[i], ex: arr[j] };
    }
  }
  return null;
}

function copyLatex(el) {
  const latex = el.dataset.latex || '';
  function done() { toast('已复制到剪贴板'); }
  function fail() { toast('复制失败，请手动复制'); }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(latex).then(done, fail);
  } else {
    try {
      const ta = document.createElement('textarea');
      ta.value = latex;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      done();
    } catch (e) { fail(); }
  }
}

/* ---------- 错题本弹窗 ---------- */
function updateWrongBadge() {
  const n = Object.keys(db.wrong).length;
  const badge = document.getElementById('wrongCount');
  badge.textContent = n;
  badge.hidden = n === 0;
}

function openWrong() {
  const list = document.getElementById('wrongList');
  const entries = Object.keys(db.wrong).map(function (k) { return db.wrong[k]; })
    .sort(function (a, b) { return b.addedAt - a.addedAt; });
  if (!entries.length) {
    list.innerHTML = '<div class="empty-tip">错题本是空的，先去刷题吧 🧀</div>';
  } else {
    list.innerHTML = entries.map(function (w) {
      const q = w.question || '';
      const preview = q.length > 80 ? q.slice(0, 80) + '…' : q;
      return (
        '<div class="wrong-item" data-course="' + escapeHtml(w.courseId) + '" data-id="' + escapeHtml(w.exId) + '">' +
          '<div class="wi-head">' +
            '<span class="wi-course">' + escapeHtml(w.courseTitle || '') + (w.type ? ' · ' + escapeHtml(w.type) : '') + '</span>' +
            '<span class="wi-time">' + new Date(w.addedAt).toLocaleString('zh-CN', { hour12: false }) + '</span>' +
          '</div>' +
          '<p class="wi-q">' + escapeHtml(preview) + '</p>' +
          '<div class="wi-ops">' +
            '<button class="wi-go" data-act="go" type="button">去练习</button>' +
            '<button class="wi-del" data-act="del" data-key="' + escapeHtml(wrongKey(w.courseId, w.exId)) + '" type="button">删除</button>' +
          '</div>' +
        '</div>'
      );
    }).join('');
  }
  document.getElementById('wrongModal').hidden = false;
  document.body.classList.add('modal-open');
}

function closeWrong() {
  document.getElementById('wrongModal').hidden = true;
  document.body.classList.remove('modal-open');
}

function deleteWrong(key) {
  if (db.wrong[key]) {
    delete db.wrong[key];
    saveDB();
    updateWrongBadge();
    openWrong(); // 刷新列表
    toast('已删除错题记录');
  }
}

function goPractice(courseId, exId) {
  closeWrong();
  openCourse(courseId);
  const found = locateEx(currentCourse, exId);
  if (found) {
    switchTab(found.tab);
    setTimeout(function () {
      const card = document.querySelector('.ex-card[data-id="' + exId + '"]');
      if (card) {
        card.classList.add('flash');
        setTimeout(function () { card.classList.remove('flash'); }, 1700);
      }
    }, 60);
  }
}

/* ---------- Toast ---------- */
let toastTimer = null;
function toast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () { t.hidden = true; }, 1500);
}

/* ---------- 主题 ---------- */
function applyTheme(dark) {
  document.body.classList.toggle('dark', dark);
  document.getElementById('themeBtn').textContent = dark ? '☀️' : '🌙';
  try { localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); } catch (e) { /* 忽略 */ }
}

function initTheme() {
  let dark = false;
  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) dark = saved === 'dark';
    else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) dark = true;
  } catch (e) { dark = false; }
  applyTheme(dark);
}

/* ---------- 事件绑定 ---------- */
function bindStatic() {
  // 搜索
  document.getElementById('searchInput').addEventListener('input', function (e) {
    renderHome(e.target.value);
  });
  // 主题
  document.getElementById('themeBtn').addEventListener('click', function () {
    applyTheme(!document.body.classList.contains('dark'));
  });
  // 错题本打开
  document.getElementById('wrongBtn').addEventListener('click', openWrong);
  // 返回
  document.getElementById('backBtn').addEventListener('click', function () {
    document.getElementById('courseView').hidden = true;
    document.getElementById('homeView').hidden = false;
    renderHome(document.getElementById('searchInput').value);
    window.scrollTo({ top: 0, behavior: 'auto' });
  });
  // Tab 切换
  document.getElementById('courseTabs').addEventListener('click', function (e) {
    const btn = e.target.closest('.tab');
    if (btn) switchTab(btn.dataset.tab);
  });
  // 首页卡片（事件委托）
  document.getElementById('courseGrid').addEventListener('click', function (e) {
    const card = e.target.closest('.course-card');
    if (card) openCourse(card.dataset.id);
  });
  // 课程主体内交互（答案/收藏/错题/复制）
  document.getElementById('tabBody').addEventListener('click', function (e) {
    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    if (act === 'ans') toggleAnswer(el.closest('.ex-card'));
    else if (act === 'fav') toggleFav(el);
    else if (act === 'wrong') toggleWrong(el);
    else if (act === 'copy') copyLatex(el);
  });
  // 错题本弹窗
  document.getElementById('wrongClose').addEventListener('click', closeWrong);
  document.getElementById('wrongModal').addEventListener('click', function (e) {
    if (e.target === this) closeWrong(); // 点击遮罩关闭
    const del = e.target.closest('[data-act="del"]');
    if (del) deleteWrong(del.dataset.key);
    const go = e.target.closest('[data-act="go"]');
    if (go) goPractice(go.closest('.wrong-item').dataset.course, go.closest('.wrong-item').dataset.id);
  });
  // Esc 关闭弹窗
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !document.getElementById('wrongModal').hidden) closeWrong();
  });
}

/* ---------- 初始化 ---------- */
async function init() {
  initTheme();
  updateWrongBadge();
  bindStatic();
  try {
    const res = await fetch(COURSES_URL, { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    COURSES = (data && data.courses) || [];
    renderHome('');
  } catch (err) {
    document.getElementById('courseGrid').innerHTML =
      '<div class="empty-tip">数据加载失败。<br>' +
      '若你是直接双击打开页面，请改用本地服务器预览（见使用说明）。<br>' +
      '<small>' + escapeHtml(err.message) + '</small></div>';
  }
}

document.addEventListener('DOMContentLoaded', init);
