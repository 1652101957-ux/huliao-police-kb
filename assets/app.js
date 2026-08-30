/* 湖寮派出所新警知识库 · 网页版主逻辑（原生 JS，无依赖） */
(function () {
  'use strict';

  // ================= 数据加载 =================
  var FILES = [
    'kb-meta.json', 'kb-learning.json', 'kb-customs.json', 'kb-locations.json',
    'kb-beats.json', 'kb-alleys.json', 'kb-hotlines.json', 'kb-tips.json', 'osm-mapdata.json'
  ];
  var KB = {};   // 知识库数据
  var MAP = null; // 地图数据

  function loadAll() {
    return Promise.all(FILES.map(function (name) {
      return fetch(name).then(function (r) {
        if (!r.ok) throw new Error(name + ' HTTP ' + r.status);
        return r.json();
      }).then(function (j) { KB[name.replace('.json', '').replace('kb-', '')] = j; })
        .catch(function (e) { console.warn('加载失败:', name, e); });
    })).then(function () {
      MAP = KB['osm-mapdata'];
      delete KB['osm-mapdata'];
    });
  }

  // ================= 工具 =================
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }
  function fmtDate(d) {
    var y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
    return y + '-' + (m < 10 ? '0' + m : m) + '-' + (day < 10 ? '0' + day : day);
  }
  function todayStr() { return fmtDate(new Date()); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  }); }

  function allDays() {
    var out = [], weeks = (KB.learning && KB.learning.weeks) || [];
    for (var i = 0; i < weeks.length; i++) {
      var days = weeks[i].days || [];
      for (var j = 0; j < days.length; j++) out.push(days[j]);
    }
    return out;
  }
  function dayIndex(state) {
    var joined = state && state.joined ? new Date(state.joined + 'T00:00:00') : null;
    if (!joined || isNaN(joined.getTime())) return 1;
    var diff = Math.floor((Date.now() - joined.getTime()) / 86400000) + 1;
    return Math.min(30, Math.max(1, diff));
  }
  function videosHtml(vids) {
    if (!vids || !vids.length) return '';
    var h = '<div class="row"><h3 style="margin:0">🎬 推荐学习视频</h3></div>';
    for (var i = 0; i < vids.length; i++) {
      var v = vids[i];
      h += '<a class="video" href="' + esc(v.url) + '" target="_blank" rel="noreferrer">▶ ' + esc(v.title) +
        '<span class="pl">' + esc(v.platform || '') + '</span></a>';
    }
    return h;
  }

  // ================= 本地状态（打卡/笔记/报到日） =================
  var store = {
    load: function () {
      try {
        var j = JSON.parse(localStorage.getItem('kb-huliao-state') || '{}');
        return { joined: j.joined || null, done: j.done || {}, notes: j.notes || {} };
      } catch (e) { return { joined: null, done: {}, notes: {} }; }
    },
    save: function (s) {
      try { localStorage.setItem('kb-huliao-state', JSON.stringify(s)); } catch (e) {}
    }
  };
  var state = store.load();
  var openWeek = {};   // 计划页折叠状态
  var beatsOpen = 'b1'; // 片区展开项
  var customsOpen = 'police'; // 风俗展开项
  var placeQ = '';     // 地点搜索词

  // ================= 视图渲染 =================
  var views = {};

  // --- 今日学习 ---
  views.today = function (box) {
    // 新警提示卡
    var tips = (KB.tips && KB.tips.items) || [];
    if (tips.length) {
      var tipCard = el('div', 'card');
      tipCard.appendChild(el('h2', null, '💡 新警提示'));
      var ul0 = el('ul', 'list');
      tips.forEach(function (t) {
        var li = el('li', null, '');
        var b = el('b', null, t.t + '：');
        li.appendChild(b);
        li.appendChild(document.createTextNode(t.d));
        ul0.appendChild(li);
      });
      tipCard.appendChild(ul0);
      box.appendChild(tipCard);
    }

    var idx = dayIndex(state);
    var days = allDays();
    var cur = days[idx - 1];
    if (!cur) {
      box.appendChild(el('div', 'note-box', '学习计划数据未加载，请确认数据文件存在。'));
      return;
    }
    var doneCount = 0;
    for (var i = 1; i <= 30; i++) if (state.done[i]) doneCount++;

    var joinedCard = el('div', 'card');
    var row1 = el('div', 'row');
    row1.appendChild(el('span', null, '报到日：'));
    var dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.value = state.joined || todayStr();
    dateInput.addEventListener('change', function () {
      state.joined = dateInput.value;
      store.save(state);
      renderAll();
    });
    row1.appendChild(dateInput);
    row1.appendChild(el('span', null, '　今日为入职第 '));
    var b = el('b', null, String(idx));
    row1.appendChild(b);
    row1.appendChild(el('span', null, ' 天'));
    joinedCard.appendChild(row1);

    var card = el('div', 'card');
    var head = el('div', 'day-head');
    head.appendChild(el('div', 'dayno', String(idx)));
    var h = el('h2');
    h.style.margin = '0';
    h.textContent = '第 ' + idx + ' 天 · ' + cur.title + (state.done[idx] ? '  ✓' : '');
    head.appendChild(h);
    card.appendChild(head);

    card.appendChild(el('h3', null, '学习内容'));
    var ul = el('ul', 'list');
    (cur.items || []).forEach(function (t) { ul.appendChild(el('li', null, t)); });
    card.appendChild(ul);

    card.appendChild(el('h3', null, '自测'));
    var ul2 = el('ul', 'list');
    (cur.selfcheck || []).forEach(function (t) { ul2.appendChild(el('li', null, t)); });
    card.appendChild(ul2);

    card.appendChild(el('h3', null, '目标产出'));
    card.appendChild(el('p', null, cur.output));

    var vh = document.createElement('div');
    vh.innerHTML = videosHtml(cur.videos);
    card.appendChild(vh);

    var row2 = el('div', 'row');
    var btn = el('button', 'btn' + (state.done[idx] ? ' ghost' : ''), state.done[idx] ? '已打卡（点击取消）' : '完成打卡');
    btn.addEventListener('click', function () {
      state.done[idx] = !state.done[idx];
      store.save(state);
      renderAll();
    });
    row2.appendChild(btn);
    row2.appendChild(el('span', 'muted', '打卡进度 ' + doneCount + '/30'));
    var pbar = el('div', 'progress');
    pbar.style.flex = '1';
    var fill = el('div');
    fill.style.width = (doneCount / 30 * 100) + '%';
    pbar.appendChild(fill);
    row2.appendChild(pbar);
    card.appendChild(row2);

    card.appendChild(el('h3', null, '今日笔记'));
    var ta = document.createElement('textarea');
    ta.placeholder = '记录今天学到的、发现的、要核实的……';
    ta.value = state.notes[idx] || '';
    ta.addEventListener('blur', function () {
      state.notes[idx] = ta.value;
      store.save(state);
    });
    card.appendChild(ta);

    box.appendChild(joinedCard);
    box.appendChild(card);
  };

  // --- 30日计划 ---
  views.plan = function (box) {
    box.appendChild(el('div', 'note-box', (KB.learning && KB.learning.usage) || ''));
    var weeks = (KB.learning && KB.learning.weeks) || [];
    if (!weeks.length) {
      box.appendChild(el('div', 'note-box', '学习计划数据未加载。'));
      return;
    }
    weeks.forEach(function (w, wi) { if (openWeek[wi] === undefined) openWeek[wi] = wi === 0; });
    weeks.forEach(function (w, wi) {
      var card = el('div', 'card');
      var head = el('div', 'acc-head');
      head.addEventListener('click', function () {
        openWeek[wi] = !openWeek[wi];
        renderAll();
      });
      var left = el('div');
      var h2 = el('h2', null, '第' + (wi + 1) + '周 · ' + w.theme);
      h2.style.display = 'inline';
      h2.style.margin = '0';
      left.appendChild(h2);
      left.appendChild(el('p', 'muted', w.goal));
      head.appendChild(left);
      head.appendChild(el('span', null, openWeek[wi] ? '▲' : '▼'));
      card.appendChild(head);
      if (openWeek[wi]) {
        (w.days || []).forEach(function (d) {
          var day = el('div', 'day' + (state.done[d.d] ? ' done' : ''));
          day.appendChild(el('div', 'dayno', String(d.d)));
          var body = el('div', 'day-body');
          var rh = el('div', 'row');
          rh.style.justifyContent = 'space-between';
          rh.style.margin = '0';
          var b = el('b', null, d.title);
          b.style.fontSize = '13px';
          rh.appendChild(b);
          var btn = el('button', 'btn small' + (state.done[d.d] ? ' ghost' : ''), state.done[d.d] ? '✓ 已打卡' : '打卡');
          btn.addEventListener('click', function () {
            state.done[d.d] = !state.done[d.d];
            store.save(state);
            renderAll();
          });
          rh.appendChild(btn);
          body.appendChild(rh);
          var ul = el('ul', 'list');
          (d.items || []).forEach(function (t) { ul.appendChild(el('li', null, t)); });
          body.appendChild(ul);
          body.appendChild(el('p', 'muted', '自测：' + ((d.selfcheck || []).join(' / ') || '—')));
          body.appendChild(el('p', 'muted', '产出：' + (d.output || '—')));
          var vh = document.createElement('div');
          vh.innerHTML = videosHtml(d.videos);
          body.appendChild(vh);
          day.appendChild(body);
          card.appendChild(day);
        });
      }
      box.appendChild(card);
    });
  };

  // --- 片区档案 ---
  views.beats = function (box) {
    var beats = (KB.beats && KB.beats.beats) || [];
    var outer = (KB.beats && KB.beats.outerVillages) || [];
    box.appendChild(el('div', 'note-box', (KB.beats && KB.beats.note) || ''));
    beats.forEach(function (b) {
      var card = el('div', 'card');
      var head = el('div', 'acc-head');
      head.addEventListener('click', function () {
        beatsOpen = beatsOpen === b.id ? '' : b.id;
        renderAll();
      });
      var left = el('div');
      var h2 = el('h2', null, b.name);
      h2.style.display = 'inline';
      h2.style.margin = '0';
      h2.style.color = b.color;
      left.appendChild(h2);
      left.appendChild(el('p', 'muted', b.area));
      head.appendChild(left);
      head.appendChild(el('span', null, beatsOpen === b.id ? '▲' : '▼'));
      card.appendChild(head);
      if (beatsOpen === b.id) {
        var p1 = el('p', null);
        var bb = el('b', null, '主要道路：');
        p1.appendChild(bb);
        p1.appendChild(document.createTextNode((b.roads || []).join('、')));
        var p2 = el('p', null);
        p2.appendChild(el('b', null, '重点单位：'));
        p2.appendChild(document.createTextNode((b.units || []).join('、')));
        var p3 = el('p', null);
        p3.appendChild(el('b', null, '治安要点：'));
        p3.appendChild(document.createTextNode((b.risks || []).join('；')));
        card.appendChild(p1);
        card.appendChild(p2);
        card.appendChild(p3);
        card.appendChild(el('p', 'muted', '记忆要点：' + (b.key || '')));
      }
      box.appendChild(card);
    });
    var c2 = el('div', 'card');
    c2.appendChild(el('h2', null, '外围村组'));
    var ul = el('ul', 'list');
    outer.forEach(function (v) {
      ul.appendChild(el('li', null, v.n + '（' + v.pos + '）' + (v.note ? '——' + v.note : '')));
    });
    c2.appendChild(ul);
    box.appendChild(c2);
  };

  // --- 常用地点 ---
  views.places = function (box) {
    box.appendChild(el('div', 'note-box', (KB.locations && KB.locations.note) || ''));
    var groups = (KB.locations && KB.locations.groups) || [];
    var searchBox = el('div', 'row');
    var input = document.createElement('input');
    input.className = 'input';
    input.style.flex = '1';
    input.placeholder = '搜索地点…';
    input.value = placeQ;
    input.addEventListener('input', function () {
      placeQ = input.value.trim();
      renderAll();
    });
    searchBox.appendChild(input);
    box.appendChild(searchBox);
    groups.forEach(function (g) {
      var items = (g.items || []).filter(function (it) {
        return !placeQ || (it.n || '').indexOf(placeQ) !== -1 || (it.note || '').indexOf(placeQ) !== -1 || (it.addr || '').indexOf(placeQ) !== -1;
      });
      if (!items.length) return;
      box.appendChild(el('h2', null, g.g));
      var grid = el('div', 'grid');
      items.forEach(function (it) {
        var card = el('div', 'card item');
        var h4 = el('h4');
        h4.innerHTML = esc(it.n) + ' <span class="cat">' + esc(it.cat || '') + '</span>';
        card.appendChild(h4);
        if (it.addr) card.appendChild(el('p', null, it.addr));
        if (it.tel) card.appendChild(el('p', null, '☎ ' + it.tel));
        if (it.note) card.appendChild(el('p', null, it.note));
        if (it.lat && it.lon) {
          var go = el('p', null);
          var a = el('a', 'loc-link', '🗺 在地图上查看');
          a.href = 'javascript:void(0)';
          a.addEventListener('click', function () {
            window.__kbMapFocus = { n: it.n, cat: it.cat, lat: it.lat, lon: it.lon };
            currentView = 'map';
            if (!window.__kbMap && MAP) initMapOnce();
            renderAll();
          });
          go.appendChild(a);
          card.appendChild(go);
        }
        grid.appendChild(card);
      });
      box.appendChild(grid);
    });
  };

  // --- 风俗民情 ---
  views.customs = function (box) {
    box.appendChild(el('div', 'note-box', (KB.customs && KB.customs.intro) || ''));
    var sections = (KB.customs && KB.customs.sections) || [];
    sections.forEach(function (s) {
      var card = el('div', 'card');
      var head = el('div', 'acc-head');
      head.addEventListener('click', function () {
        customsOpen = customsOpen === s.id ? '' : s.id;
        renderAll();
      });
      var h2 = el('h2', null, s.title);
      h2.style.display = 'inline';
      h2.style.margin = '0';
      head.appendChild(h2);
      head.appendChild(el('span', null, customsOpen === s.id ? '▲' : '▼'));
      card.appendChild(head);
      if (customsOpen === s.id) {
        if (s.note) card.appendChild(el('p', 'muted', s.note));
        (s.items || []).forEach(function (it) {
          var div = el('div');
          div.style.margin = '8px 0';
          var title = it.name || it.phrase;
          var body = it.detail || (it.hakka + (it.use ? '（' + it.use + '）' : ''));
          div.appendChild(el('b', null, title));
          div.appendChild(el('p', null, body));
          card.appendChild(div);
        });
      }
      box.appendChild(card);
    });
  };

  // --- 应急电话 ---
  views.tel = function (box) {
    box.appendChild(el('div', 'note-box', (KB.hotlines && KB.hotlines.note) || ''));
    var groups = (KB.hotlines && KB.hotlines.groups) || [];
    groups.forEach(function (g) {
      box.appendChild(el('h2', null, g.g));
      var grid = el('div', 'grid');
      (g.items || []).forEach(function (it) {
        var card = el('div', 'card');
        card.appendChild(el('h4', null, it.n));
        card.appendChild(el('p', 'tel-num', it.tel));
        if (it.note) card.appendChild(el('p', null, it.note));
        grid.appendChild(card);
      });
      box.appendChild(grid);
    });
  };

  // ================= 渲染调度 =================
  var currentView = 'today';
  function renderAll() {
    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) tabs[i].className = 'tab' + (tabs[i].getAttribute('data-view') === currentView ? ' on' : '');
    var viewsEl = document.querySelectorAll('.view');
    for (var j = 0; j < viewsEl.length; j++) {
      viewsEl[j].classList.toggle('hidden', viewsEl[j].id !== 'view-' + currentView);
    }
    var box = document.getElementById('view-' + currentView);
    box.textContent = '';
    if (currentView === 'map') {
      if (window.__kbMap) window.__kbMap.render(box);
      else box.appendChild(el('div', 'note-box', '地图加载中……'));
      return;
    }
    if (views[currentView]) views[currentView](box);
    // 滚动到顶部
    window.scrollTo(0, 0);
  }

  function showError(msg) {
    var box = document.getElementById('view-today');
    box.textContent = '';
    var err = el('div', 'err-box');
    err.appendChild(el('h2', null, '⚠ 数据加载失败'));
    err.appendChild(el('p', null, msg));
    err.appendChild(el('p', 'muted', '请确认在 GitHub Pages / 本地服务器环境中访问本页面（直接双击打开 HTML 文件无法加载数据）。'));
    box.appendChild(err);
  }

  // ================= 初始化 =================
  function init() {
    var tabs = document.querySelectorAll('.tab');
    for (var i = 0; i < tabs.length; i++) {
      tabs[i].addEventListener('click', function () {
        currentView = this.getAttribute('data-view');
        if (currentView === 'map' && !window.__kbMap && MAP) {
          initMapOnce();
        }
        renderAll();
      });
    }
    if (KB.meta) {
      document.getElementById('kb-title').textContent = KB.meta.title || '湖寮派出所 · 新警个人知识库';
      var st = KB.meta.station;
      document.getElementById('kb-sub').textContent = (st ? st.address + ' · ' + (st.phone || '') : '大埔县湖寮镇（县城）');
      document.getElementById('kb-foot').textContent = (KB.meta.disclaimer || '') + ' · 数据更新：' + (KB.meta.generated || '');
    }
    renderAll();
  }

  function initMapOnce() {
    window.__kbMap = new KBMap(document.getElementById('view-map'), MAP, KB);
  }

  loadAll().then(function () {
    init();
  }).catch(function (e) {
    showError(String((e && e.message) || e));
  });
})();
