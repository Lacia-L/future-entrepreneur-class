/* =========================================================
   未来企业家班 · 学习站  main.js (数据驱动 SPA)
   首页：搜索 / 分类筛选 / 课程卡片；详情：教材·公开课 / 知识点讲义 /
   公式速查 / 分章练习 / 模拟套卷 五页签；hash 路由；KaTeX 渲染
   ========================================================= */
(function () {
  'use strict';
  var body = document.body;
  var COURSES = window.COURSES || [];

  /* ---------- 主题切换 ---------- */
  try {
    if (localStorage.getItem('fec-theme') === 'dark') body.classList.add('dark');
  } catch (e) {}
  var themeBtn = document.getElementById('themeBtn');
  if (themeBtn) {
    themeBtn.textContent = body.classList.contains('dark') ? '☀️' : '🌙';
    themeBtn.addEventListener('click', function () {
      body.classList.toggle('dark');
      var dark = body.classList.contains('dark');
      themeBtn.textContent = dark ? '☀️' : '🌙';
      try { localStorage.setItem('fec-theme', dark ? 'dark' : 'light'); } catch (e2) {}
    });
  }

  /* ---------- 视图容器 ---------- */
  var homeEl = document.getElementById('home');
  var courseEl = document.getElementById('viewCourse');
  var gridEl = document.getElementById('courseGrid');
  var pillsEl = document.getElementById('catPills');
  var emptyTip = document.getElementById('searchEmpty');
  var searchInput = document.getElementById('searchInput');

  var CATS = [['shuli', '数理编程'], ['jingguan', '经管核心'], ['sizheng', '思政通识'],
              ['chengzhang', '成长通识'], ['chuangye', '创业特色']];
  function catSlug(name) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i][1] === name) return CATS[i][0];
    return 'all';
  }

  /* ---------- 首页渲染 ---------- */
  function renderHome() {
    if (!pillsEl || !gridEl) return;
    pillsEl.innerHTML = '<button class="cat-pill active" type="button" data-filter="all">全部</button>' +
      CATS.map(function (pair) {
        return '<button class="cat-pill" type="button" data-filter="' + pair[0] + '">' + pair[1] + '</button>';
      }).join('');
    if (!COURSES.length) {
      gridEl.innerHTML = '<p class="empty-tip">课程数据加载失败，请确认 data/courses.js 已随站点部署。</p>';
      return;
    }
    gridEl.innerHTML = COURSES.map(function (c) {
      var metas = (c.meta || []).slice(0, 3).map(function (m) { return '<span>' + m + '</span>'; }).join('');
      return '<a class="course-card" href="#course/' + c.id + '" data-cat="' + catSlug(c.category) + '">' +
        '<span class="card-emoji" aria-hidden="true">' + c.emoji + '</span>' +
        '<h3 class="card-title">' + c.name + '</h3>' +
        '<p class="card-desc">' + c.desc + '</p>' +
        '<div class="card-meta">' + metas + '</div>' +
        '<span class="card-go">进入课程 →</span></a>';
    }).join('');
    bindFilters();
  }

  function bindFilters() {
    var cards = gridEl.querySelectorAll('.course-card');
    function applyFilters() {
      if (!cards.length) return;
      var q = (searchInput ? searchInput.value : '').trim().toLowerCase();
      var active = pillsEl.querySelector('.cat-pill.active');
      var f = active ? active.getAttribute('data-filter') : 'all';
      var shown = 0;
      cards.forEach(function (c) {
        var hitText = q === '' || (c.textContent || '').toLowerCase().indexOf(q) > -1;
        var hitCat = f === 'all' || c.getAttribute('data-cat') === f;
        var show = hitText && hitCat;
        c.style.display = show ? '' : 'none';
        if (show) shown++;
      });
      if (emptyTip) emptyTip.hidden = !(q !== '' && shown === 0);
    }
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    pillsEl.querySelectorAll('.cat-pill').forEach(function (p) {
      p.addEventListener('click', function () {
        pillsEl.querySelectorAll('.cat-pill').forEach(function (x) { x.classList.remove('active'); });
        p.classList.add('active');
        applyFilters();
      });
    });
    applyFilters();
  }

  /* ---------- 路由 ---------- */
  function route() {
    var m = (location.hash || '').match(/^#course\/([a-zA-Z0-9_-]+)/);
    if (m) showCourse(m[1]); else showHome();
  }
  window.addEventListener('hashchange', route);

  function showHome() {
    courseEl.hidden = true;
    homeEl.hidden = false;
    document.title = '未来企业家班 · 学习站';
    window.scrollTo(0, 0);
  }

  function showCourse(id) {
    var c = null;
    for (var i = 0; i < COURSES.length; i++) if (COURSES[i].id === id) { c = COURSES[i]; break; }
    if (!c) { showHome(); return; }
    homeEl.hidden = true;
    courseEl.hidden = false;
    document.title = c.name + ' · 未来企业家班学习站';
    renderCourse(c);
    window.scrollTo(0, 0);
  }

  /* ---------- 课程详情渲染 ---------- */
  var DIFF = { easy: '易', mid: '中', hard: '难' };
  var PENDING = '<div class="callout info"><b>📌 内容整理中：</b>该部分正在制作，敬请期待。</div>';

  function paras(html) {
    if (!html) return '';
    if (html.indexOf('<p') > -1) return html;
    return html.split('\n').filter(function (x) { return x.trim() !== ''; })
      .map(function (x) { return '<p>' + x + '</p>'; }).join('');
  }

  function qCard(q) {
    q = q || {};
    var tags = (q.tags || []).map(function (t) { return '<span class="tag">' + t + '</span>'; }).join('');
    var opts = (q.options || []).length
      ? '<ul class="ex-options">' + q.options.map(function (o) { return '<li>' + o + '</li>'; }).join('') + '</ul>'
      : '';
    var exp = q.explain || '';
    if (exp && exp.indexOf('<p') === -1) {
      exp = exp.split('\n').filter(function (x) { return x.trim() !== ''; })
        .map(function (x) { return '<p>' + x + '</p>'; }).join('');
    }
    if (exp && exp.indexOf('ans-label') === -1) {
      exp = '<span class="ans-label">详细解析</span>' + exp;
    }
    return '<article class="ex-card">' +
      '<div class="ex-top">' +
        '<span class="ex-type">' + (q.type || '') + '</span>' +
        '<span class="p-diff ' + (q.difficulty || 'easy') + '">' + (DIFF[q.difficulty] || '易') + '</span>' +
        '<span class="p-num">' + (q.number || '') + '</span>' +
        '<span class="ex-tags">' + tags + '</span>' +
      '</div>' +
      '<p class="ex-question">' + (q.stem || '') + '</p>' + opts +
      '<div class="ans-box">' +
        '<span class="ans-label">答案</span><p>' + (q.answer || '') + '</p>' +
        '<div class="exp-box">' + exp + '<p class="kp-line">' + (q.kp || '') + '</p></div>' +
      '</div></article>';
  }

  function panelTextbook(c) {
    var books = c.textbook || [];
    var moocs = c.moocs || [];
    var bookHtml = books.length
      ? '<div class="book-grid">' + books.map(function (b) {
          return '<div class="book-card' + (b.role === '参考教材' ? ' is-ref' : '') + '">' +
            '<span class="b-tag">' + (b.role || '教材') + '</span>' +
            '<h4>' + b.title + '</h4>' +
            '<p class="b-pub">' + b.pub + '</p>' +
            '<p class="b-note">' + b.note + '</p></div>';
        }).join('') + '</div>'
      : PENDING;
    var moocHtml = '';
    if (moocs.length) {
      moocHtml = '<div class="mooc-list">' + moocs.map(function (m) {
        var linkHtml = '';
        if (m.url && m.url !== '链接待核实') {
          linkHtml = '<a class="m-link" href="' + m.url + '" target="_blank" rel="noopener">' + m.url + '</a>';
        } else if (m.url === '链接待核实') {
          linkHtml = '<span class="m-link is-pending">🔗 公开课链接待核实</span>';
        }
        return '<div class="mooc-item">' +
          '<span class="mooc-badge">' + (m.platform || '公开课') + '</span>' +
          '<div><h4>' + m.name + '</h4>' +
          (m.desc ? '<p class="m-src">' + m.desc + '</p>' : '') +
          linkHtml + '</div></div>';
      }).join('') + '</div>';
    }
    return '<div class="sec"><h2 class="sec-title">教材与公开课 <span class="sec-en">TEXTBOOK & OPEN COURSES</span></h2>' +
      '<p class="sec-hint">以下教材与公开课为公开渠道普遍采用的资源，知识点体系已按教材章节归类整理。</p>' +
      '<div class="sec-body">' + bookHtml + moocHtml +
      (c.callout ? '<div class="callout info">' + c.callout + '</div>' : '') +
      '</div></div>';
  }

  function panelKnowledge(c) {
    var mods = c.modules || [];
    if (!mods.length) return '<div class="sec"><h2 class="sec-title">知识点讲义 <span class="sec-en">KNOWLEDGE NOTES</span></h2>' + PENDING + '</div>';
    var body = mods.map(function (mod) {
      var secs = (mod.sections || []).map(function (s) {
        var p = paras(s.body);
        return '<h4>' + s.h4 + '</h4>' + p;
      }).join('');
      var terms = (mod.terms || []).map(function (t) {
        return '<div class="term-card"><div class="t-name">' + t.name + '</div>' +
          '<p class="t-plain">' + t.plain + '</p>' +
          '<p class="t-example">' + t.example + '</p></div>';
      }).join('');
      return '<article class="module"><div class="module-head">' +
        '<span class="mh-index">' + (mod.index || '') + '</span><h3>' + mod.title + '</h3>' +
        (mod.sub ? '<p class="mh-sub">' + mod.sub + '</p>' : '') + '</div>' +
        '<div class="module-body">' + secs + terms + '</div></article>';
    }).join('');
    return '<div class="sec"><h2 class="sec-title">知识点讲义 <span class="sec-en">KNOWLEDGE NOTES</span></h2>' +
      '<div class="sec-body">' + body + '</div></div>';
  }

  function panelFormulas(c) {
    var fs = c.formulas || [];
    if (!fs.length) return '';
    var cards = fs.map(function (f) {
      return '<div class="formula-card"><div class="fc-head"><h4>' + f.title + '</h4></div>' +
        '<div class="fc-math">' + f.math + '</div>' +
        (f.note ? '<p class="fc-note">' + f.note + '</p>' : '') + '</div>';
    }).join('');
    return '<div class="sec"><h2 class="sec-title">公式速查 <span class="sec-en">FORMULA CHEAT SHEET</span></h2>' +
      '<div class="sec-body"><div class="formula-grid">' + cards + '</div></div></div>';
  }

  function chapterBlock(ch, isPaper) {
    var head = '<h4 class="chap-title' + (isPaper ? ' mock' : '') + '">' +
      '<span class="chap-no">' + (isPaper ? ch.paper : ch.chapter) + '</span> ' + ch.title + '</h4>';
    var hint = ch.hint ? '<p class="sec-hint">' + ch.hint + '</p>' : '';
    var qs = (ch.questions || []).map(qCard).join('');
    return head + hint + '<div class="ex-list">' + qs + '</div>';
  }

  function panelChapters(c) {
    var chs = c.chapters || [];
    if (!chs.length) return '<div class="sec"><h2 class="sec-title">分章练习 <span class="sec-en">BY-CHAPTER PRACTICE</span></h2>' + PENDING + '</div>';
    return '<div class="sec"><h2 class="sec-title">分章练习 <span class="sec-en">BY-CHAPTER PRACTICE</span></h2>' +
      '<p class="sec-hint">按章节逐章练习：每章包含选择题、填空题、大题（该章不适用的题型已说明），覆盖本章全部知识点，难度由易到难。</p>' +
      '<div class="sec-body"><div class="part-block">' + chs.map(function (ch) { return chapterBlock(ch, false); }).join('') + '</div></div></div>';
  }

  function panelPapers(c) {
    var ps = c.papers || [];
    if (!ps.length) return '<div class="sec"><h2 class="sec-title">模拟套卷 <span class="sec-en">MOCK EXAMS</span></h2>' + PENDING + '</div>';
    return '<div class="sec"><h2 class="sec-title">模拟套卷 <span class="sec-en">MOCK EXAMS</span></h2>' +
      '<p class="sec-hint">全书综合模拟卷，题型参照真实考试，覆盖各章核心知识点；每套独立成卷，附完整答案与详细解析。</p>' +
      '<div class="sec-body"><div class="part-block">' + ps.map(function (ch) { return chapterBlock(ch, true); }).join('') + '</div></div></div>';
  }

  function renderCourse(c) {
    if (courseEl.getAttribute('data-id') === c.id) return;
    courseEl.setAttribute('data-id', c.id);
    var tabs = [['tb', '教材与公开课'], ['kn', '知识点讲义']];
    if ((c.formulas || []).length) tabs.push(['fm', '公式速查']);
    tabs.push(['ex', '分章练习'], ['pp', '模拟套卷']);
    var panels = [panelTextbook(c), panelKnowledge(c)];
    if ((c.formulas || []).length) panels.push(panelFormulas(c));
    panels.push(panelChapters(c), panelPapers(c));

    courseEl.innerHTML =
      '<div class="course-head">' +
        '<a class="course-back" href="#home">← 返回课程列表</a>' +
        '<span class="card-emoji" aria-hidden="true">' + c.emoji + '</span>' +
        '<h1>' + c.name + '</h1>' +
        '<div class="ch-meta">' + (c.meta || []).map(function (m) { return '<span>' + m + '</span>'; }).join('') + '</div>' +
        '<p class="ch-desc">' + (c.desc || '') + '</p>' +
      '</div>' +
      '<nav class="tab-nav" aria-label="课程内容页签">' +
        tabs.map(function (t, i) {
          return '<button class="tab-btn' + (i === 0 ? ' active' : '') + '" type="button" data-tab="' + t[0] + '">' + t[1] + '</button>';
        }).join('') +
      '</nav>' +
      '<div class="tab-panels">' +
        panels.map(function (p, i) {
          return '<div class="tab-panel' + (i === 0 ? ' active' : '') + '" data-panel="' + tabs[i][0] + '">' + p + '</div>';
        }).join('') +
      '</div>';

    courseEl.querySelectorAll('.tab-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        courseEl.querySelectorAll('.tab-btn').forEach(function (b) { b.classList.remove('active'); });
        courseEl.querySelectorAll('.tab-panel').forEach(function (pn) { pn.classList.remove('active'); });
        btn.classList.add('active');
        var t = btn.getAttribute('data-tab');
        var pn = courseEl.querySelector('.tab-panel[data-panel="' + t + '"]');
        if (pn) pn.classList.add('active');
        window.scrollTo(0, 0);
      });
    });
    renderMath(courseEl);
  }

  /* ---------- KaTeX 渲染（仅识别 \( \) 与 \[ \] 分隔符） ---------- */
  function renderMath(el) {
    if (window.renderMathInElement && el) {
      try {
        renderMathInElement(el, {
          delimiters: [
            { left: '\\(', right: '\\)', display: false },
            { left: '\\[', right: '\\]', display: true }
          ],
          throwOnError: false
        });
      } catch (e) {}
    }
  }

  /* ---------- 回到顶部 ---------- */
  var backTop = document.getElementById('backTop');
  if (backTop) {
    window.addEventListener('scroll', function () {
      var y = window.scrollY || document.documentElement.scrollTop || 0;
      backTop.classList.toggle('show', y > 600);
    }, { passive: true });
    backTop.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  }

  /* ---------- 启动 ---------- */
  renderHome();
  route();
})();
