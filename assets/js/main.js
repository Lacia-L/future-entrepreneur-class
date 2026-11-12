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

  var CATS = [['jingguan', '经管核心'], ['shuli', '数理编程'], ['chuangye', '创业特色'],
              ['sizheng', '思政通识'], ['chengzhang', '成长通识'], ['tongyong', '通用参考']];
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

  /* ---------- 答题反馈（鼓励 / 安慰弹卡） ---------- */
  var FX_WIN = ['🎉 太棒了，答对了！', '✨ 满分手感，继续保持！', '🌟 漂亮，知识点拿捏了！', '🥳 完全正确，就是这样！', '😎 轻松拿捏，再来一题！'];
  var FX_LOSE = ['🌱 没关系，看看解析就懂了', '🫂 差一点点，别灰心', '💡 答错了不丢人，记住就好', '🤝 下次一定对，加油！', '📖 翻回知识点再看一眼，稳赚不亏'];
  var FX_STREAK = ['🔥 连对 {n} 题，状态拉满！', '⚡ {n} 连对，势不可挡！', '🏆 已经 {n} 连对了，太强了！', '🚀 {n} 连对，冲就完事了！'];
  var fxStreak = 0;

  function showFx(ok) {
    var ov = document.getElementById('fxOverlay');
    if (!ov) {
      ov = document.createElement('div');
      ov.id = 'fxOverlay';
      ov.innerHTML = '<div class="fx-card"><div class="fx-emoji"></div><div class="fx-text"></div></div>';
      document.body.appendChild(ov);
    }
    var card = ov.querySelector('.fx-card');
    var emoji = card.querySelector('.fx-emoji');
    var txt = card.querySelector('.fx-text');
    var text, e;
    if (ok) {
      fxStreak++;
      if (fxStreak >= 2) {
        text = FX_STREAK[(fxStreak - 2) % FX_STREAK.length].replace('{n}', fxStreak);
        e = fxStreak >= 3 ? '🏆' : '⚡';
      } else {
        text = FX_WIN[Math.floor(Math.random() * FX_WIN.length)];
        e = '🎉';
      }
      card.className = 'fx-card fx-ok';
    } else {
      fxStreak = 0;
      text = FX_LOSE[Math.floor(Math.random() * FX_LOSE.length)];
      e = '💡';
      card.className = 'fx-card fx-no';
    }
    emoji.textContent = e;
    txt.textContent = text;
    ov.classList.add('show');
    clearTimeout(ov._t);
    ov._t = setTimeout(function () { ov.classList.remove('show'); }, 1800);
  }

  function escAttr(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function paras(html) {
    if (!html) return '';
    if (html.indexOf('<p') > -1) return html;
    return html.split('\n').filter(function (x) { return x.trim() !== ''; })
      .map(function (x) { return '<p>' + x + '</p>'; }).join('');
  }

  /* 从选择题 answer 提取正确选项字母（如 <b>AC</b> → "AC"） */
  function extractChoice(q) {
    var raw = q.answer || '';
    var m = raw.match(/<b>([A-H]+)<\/b>/i);
    if (m) return m[1].toUpperCase().split('').sort().join('');
    var letters = (raw.replace(/<[^>]*>/g, '').match(/[A-H]/g) || []).join('');
    return letters.toUpperCase().split('').sort().join('');
  }

  function qCard(q) {
    q = q || {};
    var tags = (q.tags || []).map(function (t) { return '<span class="tag">' + t + '</span>'; }).join('');
    var isChoice = q.type === '选择题';
    var isFill = q.type === '填空题';
    var correct = isChoice ? extractChoice(q) : '';
    var opts = (q.options || []).length
      ? '<ul class="ex-options">' + q.options.map(function (o, i) {
          return '<li class="ex-opt" data-idx="' + i + '">' + o + '</li>';
        }).join('') + '</ul>'
      : '';
    /* 填空题：答案存进 data-ans，渲染为可输入框，提交后判定 */
    var stem = (q.stem || '').replace(/<span class="blank">([\s\S]*?)<\/span>/g, function (m0, inner) {
      var ans = (inner.replace(/<[^>]*>/g, '') || '').trim();
      return '<input class="fill-input" type="text" autocomplete="off" spellcheck="false" ' +
        'placeholder="填写答案" data-ans="' + escAttr(ans) + '">';
    });
    var exp = q.explain || '';
    if (exp && exp.indexOf('<p') === -1) {
      exp = exp.split('\n').filter(function (x) { return x.trim() !== ''; })
        .map(function (x) { return '<p>' + x + '</p>'; }).join('');
    }
    if (exp && exp.indexOf('ans-label') === -1) {
      exp = '<span class="ans-label">详细解析</span>' + exp;
    }
    var actions = (isChoice || isFill)
      ? '<div class="ex-actions">' +
          '<button class="btn-check" type="button">提交答案</button>' +
          '<button class="btn-peek" type="button">直接看答案</button>' +
        '</div>'
      : '';
    return '<article class="ex-card' + (isChoice ? ' is-choice' : '') + (isFill ? ' is-fill' : '') + '"' +
      (isChoice ? ' data-correct="' + correct + '"' : '') + '>' +
      '<div class="ex-top">' +
        '<span class="ex-type">' + (q.type || '') + '</span>' +
        '<span class="p-diff ' + (q.difficulty || 'easy') + '">' + (DIFF[q.difficulty] || '易') + '</span>' +
        '<span class="p-num">' + (q.number || '') + '</span>' +
        '<span class="ex-tags">' + tags + '</span>' +
      '</div>' +
      '<p class="ex-question">' + stem + '</p>' + opts + actions +
      '<details class="ans-details"><summary>查看答案与解析</summary><div class="ans-box">' +
        '<span class="ans-label">答案</span><p>' + (q.answer || '') + '</p>' +
        '<div class="exp-box">' + exp + '<p class="kp-line">' + (q.kp || '') + '</p></div>' +
      '</div></details></article>';
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
    /* 教材定制请求框（输入教材名 → 在豆包对话中告知后联网检索并按该教材更新本课内容） */
    var savedReq = '';
    try {
      var reqList = JSON.parse(localStorage.getItem('cbReqs') || '{}');
      if (reqList[c.id]) savedReq = '<div class="bc-status ok">📌 已定制教材：「' + reqList[c.id] + '」——在豆包对话中把教材名发给我，即可联网检索并按它更新本课知识点与题目。</div>';
    } catch (e) {}
    var customBox = '<div class="book-custom" data-cid="' + c.id + '">' +
      '<h4>📚 指定你的教材，定制本课内容</h4>' +
      '<p class="m-src">输入你课堂实际使用的教材（例：刘永泽《中级财务会计》第8版），点击提交后把教材名发到<strong>豆包对话</strong>，我会联网检索该教材，并按它的章节与考点调整本课知识点和题目。</p>' +
      '<div class="bc-row"><input class="bc-input" type="text" placeholder="输入教材名称，例如：CPA《税法》2025年版" /><button class="bc-btn" type="button">提交定制请求</button></div>' +
      savedReq +
      '<div class="bc-status"></div>' +
      '</div>';
    return '<div class="sec"><h2 class="sec-title">教材与公开课 <span class="sec-en">TEXTBOOK & OPEN COURSES</span></h2>' +
      '<p class="sec-hint">以下教材与公开课为公开渠道普遍采用的资源，知识点体系已按教材章节归类整理。</p>' +
      '<div class="sec-body">' + bookHtml + moocHtml + customBox +
      (c.callout ? '<div class="callout info">' + c.callout + '</div>' : '') +
      '</div></div>';
  }

  /* 学习通真实章节大纲 */
  function sylBlock(c) {
    var s = c.syllabus;
    if (!s || !s.outline || !s.outline.length) {
      if (c.generic) {
        return '<div class="callout info"><b>🔖 通用参考课程：</b>本课不在你的学习通课表内，按网上公开教材与大纲体系整理，供扩展学习。章节结构以所选教材为准。</div>';
      }
      return '<div class="callout info"><b>📚 学习通章节：</b>该课程在平台上暂无建课章节（任课教师未上传章节目录），下列知识点按公开教材体系整理。</div>';
    }
    var nCh = s.outline.length, nPoint = 0;
    var chs = s.outline.map(function (ch) {
      nPoint += (ch.children || []).length;
      var secs = (ch.children || []).map(function (sec) {
        nPoint += (sec.items || []).length;
        var items = (sec.items || []).length
          ? '<div class="syl-items">' + sec.items.map(function (it) { return '<span class="syl-item">' + it + '</span>'; }).join('') + '</div>'
          : '';
        return '<div class="syl-sec"><span class="syl-sec-no">' + sec.no + '</span>' +
          '<span class="syl-sec-title">' + sec.title + '</span>' + items + '</div>';
      }).join('');
      return '<div class="syl-ch"><h4><span class="syl-no">' + (ch.no || '') + '</span>' + ch.title + '</h4>' + secs + '</div>';
    }).join('');
    return '<div class="syl"><div class="syl-head">📚 学习通真实章节大纲' +
      '<span class="syl-meta">' + nCh + ' 章 · ' + nPoint + ' 节/任务点</span></div>' + chs + '</div>';
  }

  /* 章节学习：每章知识点后紧跟本章练习（模块与章节按顺序一一对应） */
  function panelKnowledge(c) {
    var mods = c.modules || [];
    var chs = c.chapters || [];
    var syl = sylBlock(c);
    if (!mods.length) return '<div class="sec"><h2 class="sec-title">章节学习 <span class="sec-en">KNOWLEDGE & PRACTICE</span></h2>' +
      '<div class="sec-body">' + syl + PENDING + '</div></div>';
    var body = mods.map(function (mod, i) {
      var secs = (mod.sections || []).map(function (s) {
        var p = paras(s.body);
        return '<h4>' + s.h4 + '</h4>' + p;
      }).join('');
      var terms = (mod.terms || []).map(function (t) {
        return '<div class="term-card"><div class="t-name">' + t.name + '</div>' +
          (t.official ? '<p class="t-official"><span class="t-tag">📖 官方定义</span>' + t.official + '</p>' : '') +
          '<p class="t-plain"><span class="t-tag">🍼 通俗理解</span>' + t.plain + '</p>' +
          '<p class="t-example"><span class="t-tag">🌰 举个栗子</span>' + t.example + '</p></div>';
      }).join('');
      var moduleHtml = '<article class="module"><div class="module-head">' +
        '<span class="mh-index">' + (mod.index || '') + '</span><h3>' + mod.title + '</h3>' +
        (mod.sub ? '<p class="mh-sub">' + mod.sub + '</p>' : '') + '</div>' +
        '<div class="module-body">' + secs + terms + '</div></article>';
      /* 该章练习紧跟知识点之后 */
      var ch = chs[i];
      var chHtml = '';
      if (ch && (ch.questions || []).length) {
        chHtml = '<div class="chap-practice">' +
          '<h4 class="chap-title inline"><span class="chap-no">' + (ch.chapter || '') + '</span> ' + ch.title + ' · 本章练习</h4>' +
          (ch.hint ? '<p class="sec-hint">' + ch.hint + '</p>' : '') +
          '<div class="ex-list">' + (ch.questions || []).map(qCard).join('') + '</div>' +
          '</div>';
      }
      return moduleHtml + chHtml;
    }).join('');
    return '<div class="sec"><h2 class="sec-title">章节学习 <span class="sec-en">KNOWLEDGE & PRACTICE</span></h2>' +
      '<p class="sec-hint">先看学习通真实章节大纲了解课程骨架；再读知识点（官方定义 + 通俗理解 + 例子），做完紧跟其后的本章练习。</p>' +
      '<div class="sec-body">' + syl + body + '</div></div>';
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

  /* 极速复习：半天学完一门课 —— 底层逻辑地图 + 每章核心速测 */
  function panelExpress(c) {
    var mods = c.modules || [];
    var chs = c.chapters || [];
    var mapHtml = mods.length
      ? mods.map(function (m, i) {
          var terms = (m.terms || []).slice(0, 4).map(function (t) {
            return '<span class="map-term">' + t.name + '</span>';
          }).join('');
          return '<div class="map-node">' +
            '<span class="map-no">' + (m.index || ('第' + (i + 1) + '章')) + '</span>' +
            '<h4>' + m.title + '</h4>' +
            (m.sub ? '<p class="map-sub">' + m.sub + '</p>' : '') +
            terms + '</div>';
        }).join('')
      : PENDING;
    var quiz = [];
    chs.forEach(function (ch) {
      var sel = null, fill = null;
      (ch.questions || []).forEach(function (q) {
        if (!sel && q.type === '选择题' && q.difficulty === 'easy') sel = q;
        if (!fill && q.type === '填空题') fill = q;
      });
      if (sel) quiz.push(sel);
      if (fill) quiz.push(fill);
    });
    var quizHtml = quiz.length
      ? '<div class="ex-list">' + quiz.map(qCard).join('') + '</div>'
      : PENDING;
    return '<div class="sec"><h2 class="sec-title">极速复习 <span class="sec-en">EXPRESS REVIEW</span></h2>' +
      '<p class="sec-hint">半天学完一门课：先通读<strong>底层逻辑地图</strong>，用知识骨架建立全局观；再做<strong>核心速测</strong>（每章抽 1 道选择 + 1 道填空，每题约 1 分钟）验证掌握度。想从零系统学习，切到「章节学习」页签逐章精读。</p>' +
      '<div class="sec-body">' +
        '<h4 class="chap-title">🧭 课程底层逻辑地图</h4>' +
        '<div class="expr-map">' + mapHtml + '</div>' +
        '<h4 class="chap-title" style="margin-top:22px">⚡ 核心速测（' + quiz.length + ' 题 · 建议 10 分钟）</h4>' +
        quizHtml +
      '</div></div>';
  }

  function chapterBlock(ch, isPaper) {
    var head = '<h4 class="chap-title' + (isPaper ? ' mock' : '') + '">' +
      '<span class="chap-no">' + (isPaper ? ch.paper : ch.chapter) + '</span> ' + ch.title + '</h4>';
    var hint = ch.hint ? '<p class="sec-hint">' + ch.hint + '</p>' : '';
    var qs = (ch.questions || []).map(qCard).join('');
    return head + hint + '<div class="ex-list">' + qs + '</div>';
  }

  function ansToolbar() {
    return '<div class="ans-toolbar">' +
      '<button class="toolbar-btn" type="button" data-act="show-all">全部展开答案</button>' +
      '<button class="toolbar-btn" type="button" data-act="hide-all">全部收起答案</button>' +
      '<span class="tb-note">建议先独立作答，再展开答案对照批改</span>' +
    '</div>';
  }

  function panelChapters(c) {
    var chs = c.chapters || [];
    if (!chs.length) return '<div class="sec"><h2 class="sec-title">分章练习 <span class="sec-en">BY-CHAPTER PRACTICE</span></h2>' + PENDING + '</div>';
    return '<div class="sec"><h2 class="sec-title">分章练习 <span class="sec-en">BY-CHAPTER PRACTICE</span></h2>' +
      '<p class="sec-hint">按章节逐章练习：每章包含选择题、填空题、大题（该章不适用的题型已说明），覆盖本章全部知识点，难度由易到难。选择题可点选选项后提交判分，填空与大题建议先在草稿作答，再展开答案对照。</p>' +
      '<div class="sec-body">' + ansToolbar() + '<div class="part-block">' + chs.map(function (ch) { return chapterBlock(ch, false); }).join('') + '</div></div></div>';
  }

  function panelPapers(c) {
    var ps = c.papers || [];
    if (!ps.length) return '<div class="sec"><h2 class="sec-title">模拟套卷 <span class="sec-en">MOCK EXAMS</span></h2>' + PENDING + '</div>';
    return '<div class="sec"><h2 class="sec-title">模拟套卷 <span class="sec-en">MOCK EXAMS</span></h2>' +
      '<p class="sec-hint">全书综合模拟卷，题型参照真实考试，覆盖各章核心知识点；每套独立成卷。选择题可点选选项后提交判分，主观题建议先闭卷作答，再展开答案与解析。</p>' +
      '<div class="sec-body">' + ansToolbar() + '<div class="part-block">' + ps.map(function (ch) { return chapterBlock(ch, true); }).join('') + '</div></div></div>';
  }

  function renderCourse(c) {
    if (courseEl.getAttribute('data-id') === c.id) return;
    courseEl.setAttribute('data-id', c.id);
    var tabs = [['expr', '极速复习'], ['kn', '章节学习'], ['tb', '教材与公开课']];
    if ((c.formulas || []).length) tabs.push(['fm', '公式速查']);
    tabs.push(['ex', '分章练习'], ['pp', '模拟套卷']);
    var panels = [panelExpress(c), panelKnowledge(c), panelTextbook(c)];
    if ((c.formulas || []).length) panels.push(panelFormulas(c));
    panels.push(panelChapters(c), panelPapers(c));

    courseEl.innerHTML =
      '<div class="course-head">' +
        '<a class="course-back" href="#home">← 返回课程列表</a>' +
        '<span class="card-emoji" aria-hidden="true">' + c.emoji + '</span>' +
        '<h1>' + c.name + '</h1>' +
        '<div class="ch-meta">' + (c.generic ? '<span class="ch-badge">通用参考 · 非本人课表</span>' : '<span class="ch-badge inuse">学习通在修</span>') +
        (c.meta || []).map(function (m) { return '<span>' + m + '</span>'; }).join('') + '</div>' +
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

    /* ---------- 作答交互：先作答、后看答案 ---------- */
    function fillBlanks(scopeEl) {
      /* 填空答案显示：把 input 值替换为正确答案 */
      (scopeEl.querySelectorAll('.fill-input[data-ans]') || []).forEach(function (b) {
        b.value = b.getAttribute('data-ans') || '';
        b.classList.add('revealed');
      });
    }
    function onCourseClick(e) {
      var opt = e.target.closest('.ex-opt');
      if (opt) { opt.classList.toggle('is-selected'); return; }
      var dEl = e.target.closest('details.ans-details');
      if (dEl) {
        /* summary 的默认动作（切换 open）在 click 事件派发之后执行，
           因此延迟一帧再读取 open */
        setTimeout(function () {
          if (dEl.open) fillBlanks(dEl.closest('.ex-card') || dEl);
        }, 0);
        if (e.target.tagName === 'SUMMARY') return;
      }
      var bcBtn = e.target.closest('.bc-btn');
      if (bcBtn) {
        var box = bcBtn.closest('.book-custom');
        var inp = box ? box.querySelector('.bc-input') : null;
        var st = box ? box.querySelector('.bc-status') : null;
        var book = inp ? (inp.value || '').trim() : '';
        if (!book) {
          if (st) { st.textContent = '⚠️ 请先输入教材名称'; st.className = 'bc-status warn'; }
          return;
        }
        try {
          var key = 'cbReq_' + (box.getAttribute('data-cid') || '');
          var list = JSON.parse(localStorage.getItem('cbReqs') || '{}');
          list[key] = book;
          localStorage.setItem('cbReqs', JSON.stringify(list));
        } catch (err) {}
        if (st) {
          st.textContent = '✅ 已提交定制请求：「' + book + '」——把教材名发到豆包对话，我会联网检索并按它更新本课知识点与题目';
          st.className = 'bc-status ok';
        }
        if (inp) inp.value = '';
        return;
      }
      var btn = e.target.closest('.btn-check, .btn-peek, .toolbar-btn');
      if (!btn) return;
      if (btn.classList.contains('toolbar-btn')) {
        var body = btn.closest('.sec-body');
        var dls = body ? body.querySelectorAll('details.ans-details') : [];
        var act = btn.getAttribute('data-act');
        dls.forEach(function (d) {
          d.open = (act === 'show-all');
          if (d.open) fillBlanks(d.closest('.ex-card') || d);
        });
        return;
      }
      var card = btn.closest('.ex-card');
      if (!card) return;
      var details = card.querySelector('details.ans-details');
      if (btn.classList.contains('btn-peek')) {
        /* 直接看答案 */
        if (card.classList.contains('is-choice')) {
          var cOpts = card.querySelectorAll('.ex-opt');
          var cCorrect = card.getAttribute('data-correct') || '';
          for (var ci = 0; ci < cOpts.length; ci++) {
            if (cCorrect.indexOf('ABCDEFGH'[ci]) > -1) cOpts[ci].classList.add('correct');
          }
        } else if (card.classList.contains('is-fill')) {
          fillBlanks(card);
        }
        if (details) details.open = true;
        return;
      }
      /* 提交判分 */
      var ok = false;
      if (card.classList.contains('is-choice')) {
        var picked = Array.prototype.map.call(card.querySelectorAll('.ex-opt.is-selected'),
          function (o) { return o.getAttribute('data-idx'); });
        if (!picked.length) {
          card.classList.add('shake');
          setTimeout(function () { card.classList.remove('shake'); }, 400);
          return;
        }
        var correct = card.getAttribute('data-correct') || '';
        var pickedStr = picked.map(function (i) { return 'ABCDEFGH'[+i] || ''; }).join('');
        pickedStr = pickedStr.split('').sort().join('');
        var optsEls = card.querySelectorAll('.ex-opt');
        if (pickedStr === correct) {
          for (var i = 0; i < optsEls.length; i++) {
            if (picked.indexOf(String(i)) > -1) optsEls[i].classList.add('correct');
          }
          card.classList.add('is-right');
          ok = true;
        } else {
          for (var j = 0; j < optsEls.length; j++) {
            var l = 'ABCDEFGH'[j];
            if (correct.indexOf(l) > -1) optsEls[j].classList.add('correct');
            else if (picked.indexOf(String(j)) > -1) optsEls[j].classList.add('wrong');
          }
          card.classList.add('is-wrong');
        }
      } else if (card.classList.contains('is-fill')) {
        var inputs = card.querySelectorAll('.fill-input');
        var allOk = true;
        for (var fi = 0; fi < inputs.length; fi++) {
          var ua = (inputs[fi].value || '').trim().toLowerCase();
          var ans = (inputs[fi].getAttribute('data-ans') || '').trim().toLowerCase();
          if (ua === ans) {
            inputs[fi].classList.add('correct');
          } else {
            inputs[fi].classList.add('wrong');
            inputs[fi].value = inputs[fi].getAttribute('data-ans') || '';
            allOk = false;
          }
        }
        if (allOk) { card.classList.add('is-right'); ok = true; }
        else card.classList.add('is-wrong');
      }
      if (details) details.open = true;
      if (ok || card.classList.contains('is-fill') || card.classList.contains('is-choice')) {
        showFx(ok);
      }
    }
    function onCourseToggle(e) {
      if (e.target.tagName !== 'DETAILS' || !e.target.open) return;
      fillBlanks(e.target.closest('.ex-card') || e.target);
    }
    courseEl.removeEventListener('click', onCourseClick);
    courseEl.removeEventListener('toggle', onCourseToggle, true);
    courseEl.addEventListener('click', onCourseClick);
    courseEl.addEventListener('toggle', onCourseToggle, true);
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

  /* =========================================================
     拍照搜答案：本地 OCR → 站内题库匹配 → 答案 + 书写步骤
     ========================================================= */
  var askIndex = null;

  function normText(s) {
    s = String(s || '').replace(/<[^>]+>/g, ' ');
    s = s.replace(/\\\(|\\\)|\\\[|\\\]/g, ' ').replace(/[\\{}$^_]/g, ' ');
    s = s.replace(/[\uFF01-\uFF5E]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
    });
    s = s.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, ' ');
    return s.replace(/\s+/g, '').toLowerCase();
  }

  function bigrams(s) {
    var set = {};
    for (var i = 0; i < s.length - 1; i++) set[s.substr(i, 2)] = 1;
    return set;
  }

  function buildAskIndex() {
    if (askIndex) return askIndex;
    askIndex = [];
    COURSES.forEach(function (c) {
      var pool = [];
      (c.chapters || []).forEach(function (ch) { (ch.questions || []).forEach(function (q) { pool.push(q); }); });
      (c.papers || []).forEach(function (p) { (p.questions || []).forEach(function (q) { pool.push(q); }); });
      pool.forEach(function (q) {
        var n = normText(q.stem || '');
        if (n.length < 6) return;
        var uniq = [];
        var seen = {};
        for (var i = 0; i < n.length; i++) {
          if (!seen[n[i]]) { seen[n[i]] = 1; uniq.push(n[i]); }
        }
        askIndex.push({ c: c, q: q, n: n, bg: bigrams(n), chars: uniq });
      });
    });
    return askIndex;
  }

  function searchQuestions(raw) {
    var idx = buildAskIndex();
    var t = normText(raw);
    if (t.length < 4) return [];
    var tb = bigrams(t);
    var out = [];
    for (var i = 0; i < idx.length; i++) {
      var it = idx[i];
      var keys = Object.keys(it.bg);
      var hit = 0;
      for (var k = 0; k < keys.length; k++) if (tb[keys[k]]) hit++;
      var bgScore = hit / (keys.length || 1);
      var cHit = 0;
      for (var u = 0; u < it.chars.length; u++) if (t.indexOf(it.chars[u]) > -1) cHit++;
      var cScore = cHit / (it.chars.length || 1);
      var s = bgScore * 0.72 + cScore * 0.28;
      var cname = normText(it.c.name);
      if (cname.length > 3 && t.indexOf(cname) > -1) s += 0.12;
      if (s >= 0.22) out.push({ it: it, s: s });
    }
    out.sort(function (a, b) { return b.s - a.s; });
    var seenKey = {}, res = [];
    for (var j = 0; j < out.length && res.length < 5; j++) {
      var key = out[j].it.n.substr(0, 26);
      if (seenKey[key]) continue;
      seenKey[key] = 1;
      res.push(out[j]);
    }
    return res;
  }

  function writeSteps(q) {
    var type = q.type || '';
    if (type.indexOf('选择') > -1) {
      return [['审题', '圈出“最”“不正确”“首先”这类限定词，把题干压缩成一句判断，避免看漏反向要求。'],
              ['比对', '逐项对照教材定义与公式，能定性排除的先划掉，剩下两项再算或再推。'],
              ['写法', '先给结论再给理由：写“选 X。依据是……；A 与定义不符，因为……”，X 换成正确选项，不要只写一个字母。'],
              ['回读', '落答案前再回读题干一遍，确认选项编号没抄错。']];
    }
    if (type.indexOf('填空') > -1) {
      return [['定考点', '先判断空格考的是定义、公式还是具体数值，决定要不要写推导。'],
              ['写原式', '公式类先写符号式（如 δij = cij − (ui + vj)），再代数字，不直接跳结果。'],
              ['代数据', '代入已知量并统一单位；符号、下标要和题干一致。'],
              ['落答案', '空格只填关键词或数值，不加解释；题干要求“说明”时另起一句。']];
    }
    if (type.indexOf('判断') > -1 || type.indexOf('论述') > -1 || type.indexOf('简答') > -1) {
      return [['下判断', '第一句直接表态：正确/错误，或先给核心观点，不要铺垫。'],
              ['给依据', '引教材定义、公式或条件，一条依据对应一层论证。'],
              ['举反例', '判错时补一个反例；判对时补适用条件，防止以偏概全。'],
              ['收结论', '最后一句回到题干表述，形成闭环。']];
    }
    return [['抄已知', '把题目数据符号化（如产量 ai、运价 cij、位势 ui 与 vj），需要时画出产销平衡表或单纯形表。'],
            ['列式', '先写公式或定义式，再代数：如 Σaixij = bj、σj = Cj − Zj，不直接写中间结果。'],
            ['逐步算', '每一步保留中间值，位势、检验数、θ 值要编号对齐，负检验数标出来。'],
            ['下结论', '写出最优解与目标值，再用一句业务语言回答（如“甲生产 1，乙生产 2，丙不生产，利润最大”）。']];
  }

  function askCard(m) {
    var it = m.it, q = it.q, c = it.c;
    var scorePct = Math.round(Math.min(0.99, m.s) * 100);
    var steps = writeSteps(q).map(function (s) {
      return '<li><b>' + s[0] + '</b>：' + s[1] + '</li>';
    }).join('');
    var ans = (q.answer || '').trim();
    var explain = (q.explain || '').replace(/<span class="ans-label">[^<]*<\/span>/g, '').trim();
    return '<div class="match-card">' +
      '<div class="match-top">' +
        '<span class="match-course">' + c.name + '</span>' +
        '<span>' + (q.type || '题目') + ' · ' + (DIFF[q.difficulty] || '易') + '</span>' +
        '<span class="match-score">题干匹配 ' + scorePct + '%</span>' +
      '</div>' +
      '<p class="match-stem">' + (q.stem || '') + '</p>' +
      (ans ? '<div class="match-ans"><b>标准答案：</b>' + ans + '</div>' : '') +
      (explain ? '<div class="write-guide"><h5>解析</h5>' + paras(explain) + '</div>' : '') +
      '<div class="write-guide"><h5>按老师板书要求的书写步骤</h5><ol>' + steps + '</ol></div>' +
      '<a class="match-open" href="#course/' + c.id + '">进入「' + c.name + '」复习 →</a>' +
    '</div>';
  }

  function setupAsk() {
    var fab = document.getElementById('askFab');
    var modal = document.getElementById('askModal');
    if (!fab || !modal) return;
    var drop = document.getElementById('askDrop');
    var fileInput = document.getElementById('askFile');
    var preview = document.getElementById('askPreview');
    var imgEl = document.getElementById('askImg');
    var progress = document.getElementById('askProgress');
    var barEl = document.getElementById('askBar');
    var statusEl = document.getElementById('askStatus');
    var resultEl = document.getElementById('askResult');
    var retake = document.getElementById('askRetake');
    var manualBtn = document.getElementById('askSearchText');
    var textarea = document.getElementById('askText');
    var closeBtn = document.getElementById('askClose');
    var worker = null;

    function open() {
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
    }
    function close() {
      modal.hidden = true;
      document.body.style.overflow = '';
    }
    function setStatus(pct, text) {
      progress.hidden = false;
      barEl.style.width = Math.round(pct * 100) + '%';
      if (text) statusEl.textContent = text;
    }

    fab.addEventListener('click', open);
    closeBtn.addEventListener('click', close);
    modal.addEventListener('click', function (e) { if (e.target === modal) close(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !modal.hidden) close(); });

    drop.addEventListener('click', function () { fileInput.click(); });
    ['dragover', 'dragenter'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('is-over'); });
    });
    ['dragleave', 'drop'].forEach(function (ev) {
      drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('is-over'); });
    });
    drop.addEventListener('drop', function (e) {
      var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (f) handleFile(f);
    });
    fileInput.addEventListener('change', function () {
      var f = fileInput.files && fileInput.files[0];
      if (f) handleFile(f);
      fileInput.value = '';
    });
    retake.addEventListener('click', function () { fileInput.click(); });
    manualBtn.addEventListener('click', function () {
      var v = (textarea.value || '').trim();
      if (v.length < 4) { statusEl.textContent = '题目文字太短，至少输入几个关键词'; progress.hidden = false; return; }
      showResults(v, '手动输入');
    });

    function fileToDataURL(file) {
      return new Promise(function (resolve, reject) {
        var fr = new FileReader();
        fr.onerror = function () { reject(new Error('读取图片失败')); };
        fr.onload = function () {
          var img = new Image();
          img.onerror = function () { reject(new Error('图片无法解析')); };
          img.onload = function () {
            var max = 1600, w = img.width, h = img.height;
            if (Math.max(w, h) > max) {
              var k = max / Math.max(w, h);
              w = Math.round(w * k); h = Math.round(h * k);
            }
            var cv = document.createElement('canvas');
            cv.width = w; cv.height = h;
            var ctx = cv.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            resolve(cv.toDataURL('image/jpeg', 0.85));
          };
          img.src = fr.result;
        };
        fr.readAsDataURL(file);
      });
    }

    function loadTesseract() {
      return new Promise(function (resolve, reject) {
        if (window.Tesseract) return resolve(window.Tesseract);
        var s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.0/dist/tesseract.min.js';
        s.onload = function () { window.Tesseract ? resolve(window.Tesseract) : reject(new Error('引擎未就绪')); };
        s.onerror = function () { reject(new Error('识别引擎下载失败')); };
        document.head.appendChild(s);
      });
    }

    function handleFile(file) {
      resultEl.innerHTML = '';
      progress.hidden = false;
      setStatus(0, '正在读取图片…');
      fileToDataURL(file).then(function (url) {
        preview.hidden = false;
        imgEl.src = url;
        drop.hidden = true;
        setStatus(0.15, '正在加载识别引擎（首次约需几十秒，会缓存）…');
        return loadTesseract().then(function (T) {
          if (!worker) {
            return T.createWorker('chi_sim+eng', 1, {
              logger: function (m) {
                if (m.status === 'recognizing text') setStatus(0.2 + (m.progress || 0) * 0.75, '正在识别文字… ' + Math.round((m.progress || 0) * 100) + '%');
                else setStatus(0.2, '识别引擎准备中…');
              }
            }).then(function (w) {
              worker = w;
              return w;
            });
          }
          return worker;
        });
      }).then(function (w) {
        setStatus(0.95, '正在识别文字…');
        return w.recognize(imgEl.src).then(function (r) {
          var text = (r && r.data && r.data.text) || '';
          setStatus(1, '识别完成，正在匹配题库…');
          if (normText(text).length < 4) {
            resultEl.innerHTML = '<div class="ask-note">这张图没识别出有效文字，可能是手写或光线太暗。换个角度重拍，或把题目文字粘贴到下面的手动输入框。</div>';
            progress.hidden = true;
            return;
          }
          showResults(text, '图片识别');
        });
      }).catch(function (err) {
        progress.hidden = true;
        resultEl.innerHTML = '<div class="ask-note">识别失败：' + (err && err.message ? err.message : '未知错误') +
          '。<br>当前网络可能取不到识别引擎，改用下面的手动输入同样能搜。</div>';
      });
    }

    function showResults(raw, from) {
      var list = searchQuestions(raw);
      progress.hidden = true;
      if (!list.length) {
        resultEl.innerHTML = '<div class="ask-note">没找到对得上的题（来源：' + from + '）。识别到的文字：<b>' +
          escAttr(raw).replace(/\n/g, ' ').substr(0, 180) + '</b><br>可以只截题目主干再试，或换用关键词搜。</div>';
        return;
      }
      resultEl.innerHTML = '<div class="ask-note">来源：' + from + ' · 命中 ' + list.length + ' 道相近题目，按匹配度排序。</div>' +
        list.map(askCard).join('');
      renderMath(resultEl);
    }
  }

  /* ---------- 启动 ---------- */
  setupAsk();
  renderHome();
  route();
})();
