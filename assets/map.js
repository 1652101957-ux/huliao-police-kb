/* 湖寮派出所新警知识库 · 网页版辖区地图（原生 SVG，无依赖，支持触屏） */
(function () {
  'use strict';

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined) n.textContent = text;
    return n;
  }

  var CAT_COLOR = {
    '派出所': '#ef4444', '公安': '#ef4444', '政府': '#f59e0b', '消防': '#f97316', '法院': '#f97316',
    '医院': '#22c55e', '诊所': '#4ade80', '药店': '#86efac', '学校': '#a855f7', '幼儿园': '#c084fc',
    '车站': '#3b82f6', '广场': '#38bdf8', '公园': '#14b8a6', '景点': '#eab308', '古迹': '#d97706',
    '市场': '#ec4899', '商场': '#f43f5e', '银行': '#06b6d4', '村': '#64748b', '社区': '#94a3b8',
    '桥梁': '#7dd3fc', '水系': '#38bdf8', '文化': '#818cf8', '餐饮': '#fb923c', '茶饮': '#fdba74',
    '快餐': '#fda4af', '宾馆': '#a78bfa', '超市': '#34d399', 'KTV': '#e879f9', '影院': '#c084fc',
    '邮政驿站': '#94a3b8', '山': '#4ade80', '自然村': '#475569', '镇区': '#94a3b8', '县城': '#38bdf8'
  };
  var CAT_ICON = {
    '派出所': '⭐', '公安': '🛡', '政府': '🏛', '消防': '🚒', '法院': '⚖',
    '医院': '🏥', '诊所': '💉', '药店': '💊', '学校': '🎓', '幼儿园': '🧒',
    '车站': '🚌', '广场': '⛲', '公园': '🌳', '景点': '🏯', '古迹': '🏺',
    '市场': '🛒', '商场': '🛍', '银行': '🏦', '村': '🏘', '社区': '🏘',
    '桥梁': '🌉', '文化': '📚', '餐饮': '🍜', '茶饮': '🧋', '快餐': '🍔',
    '宾馆': '🏨', '超市': '🏪', 'KTV': '🎤', '影院': '🎬', '邮政驿站': '📮',
    '山': '⛰', '自然村': '🏡', '镇区': '🏘', '县城': '🏙', '检测站': '🔧',
    '租车': '🚗', '牙科': '🦷', '宠物医院': '🐾', 'ATM': '🏧', '球场': '⚽',
    '健身': '💪', '泳池': '🏊', '雕塑': '🗿', '青旅': '🛏', '停车场': '🅿',
    '驾校': '🚘', '酒吧': '🍸'
  };
  function catColor(c) { return CAT_COLOR[c] || '#8fa3bf'; }
  function catIcon(c) { return CAT_ICON[c] || '📍'; }

  function svgEl(tag, attrs, text) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (var k in attrs) if (attrs[k] !== null && attrs[k] !== undefined) n.setAttribute(k, attrs[k]);
    if (text !== undefined) n.textContent = text;
    return n;
  }

  var KEY_ALWAYS = ['派出所', '公安', '政府', '医院', '车站', '消防', '市场', '景点', '公园', '商场', '广场', '学校'];
  var CLS_CONF = [
    { key: 'r0', color: '#f59e0b', width: 26, glow: '#92400e', label: '主干道' },
    { key: 'r1', color: '#fcd34d', width: 18, glow: null, label: '次干道' },
    { key: 'r2', color: '#e2e8f0', width: 11, glow: null, label: '支路' },
    { key: 'r3', color: '#7c8aa5', width: 7, glow: null, label: '巷道' }
  ];

  function KBMap(container, map, kb) {
    this.map = map;
    this.kb = kb;
    this.zoom = 1;
    this.pan = { x: 0, y: 0 };
    this.layers = { r0: true, r1: true, r2: true, r3: true, water: true, beats: true, key: true, pois: false, names: true };
    this.sel = null;
    this.focus = window.__kbMapFocus || null;
    window.__kbMapFocus = null;
    this.buildExtent();
    this.render(container);
  }

  KBMap.prototype.buildExtent = function () {
    var m = this.map, minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    var lists = [m.roads, m.water];
    for (var li = 0; li < lists.length; li++) {
      var arr = lists[li] || [];
      for (var i = 0; i < arr.length; i++) {
        var pts = arr[i][2] || arr[i][1];
        for (var j = 0; j < pts.length; j++) {
          if (pts[j][0] < minX) minX = pts[j][0];
          if (pts[j][0] > maxX) maxX = pts[j][0];
          if (pts[j][1] < minY) minY = pts[j][1];
          if (pts[j][1] > maxY) maxY = pts[j][1];
        }
      }
    }
    this.ext = { minX: minX, maxX: maxX, minY: minY, maxY: maxY };
  };

  KBMap.prototype.projectLocations = function () {
    // kb-locations 里的 lat/lon -> 投影米
    var out = [];
    var groups = (this.kb.locations && this.kb.locations.groups) || [];
    for (var i = 0; i < groups.length; i++) {
      var items = groups[i].items || [];
      for (var j = 0; j < items.length; j++) {
        var it = items[j];
        if (!(it.lat && it.lon)) continue;
        out.push({
          n: it.n, cat: it.cat,
          x: Math.round((it.lon - 116.688) * 101390),
          y: Math.round((it.lat - 24.358) * 110900),
          addr: it.addr || '', tel: it.tel || '', note: it.note || ''
        });
      }
    }
    return out;
  };

  KBMap.prototype.render = function (container) {
    this.container = container;
    container.textContent = '';
    var map = this.map;

    var note = el('div', 'note-box', (this.kb.meta && this.kb.meta.mapNote) || '');
    container.appendChild(note);

    // 图层开关
    var chips = el('div', 'chip-bar');
    var self = this;
    [
      { key: 'r0', label: '主干道' }, { key: 'r1', label: '次干道' }, { key: 'r2', label: '支路' },
      { key: 'r3', label: '巷道' }, { key: 'water', label: '水系' }, { key: 'beats', label: '片区' },
      { key: 'key', label: '重点单位' }, { key: 'pois', label: '商户POI' }, { key: 'names', label: '路名' }
    ].forEach(function (t) {
      var c = el('span', 'chip' + (self.layers[t.key] ? ' on' : ''), t.label);
      c.addEventListener('click', function () {
        self.layers[t.key] = !self.layers[t.key];
        self.render(container);
      });
      chips.appendChild(c);
    });
    container.appendChild(chips);

    var wrap = el('div', 'map-wrap');
    container.appendChild(wrap);

    // 搜索
    var search = el('div', 'map-search');
    var si = document.createElement('input');
    si.placeholder = '搜索地点/道路/巷道…';
    search.appendChild(si);
    var results = el('div', 'map-results');
    results.style.display = 'none';
    search.appendChild(results);
    wrap.appendChild(search);

    si.addEventListener('input', function () {
      var v = si.value.trim();
      if (!v) { results.style.display = 'none'; results.textContent = ''; return; }
      var res = [];
      var projected = self.projectLocations();
      for (var i = 0; i < projected.length && res.length < 10; i++) {
        if (projected[i].n.indexOf(v) !== -1) res.push(projected[i]);
      }
      var pois = map.pois || [];
      for (var j = 0; j < pois.length && res.length < 14; j++) {
        if (pois[j][0].indexOf(v) !== -1) res.push({ n: pois[j][0], cat: pois[j][1], x: pois[j][2], y: pois[j][3], t: 'POI' });
      }
      var roads = map.roads || [], seen = {};
      for (var k = 0; k < roads.length && res.length < 18; k++) {
        var nm = roads[k][1];
        if (nm && nm.indexOf(v) !== -1 && !seen[nm]) {
          seen[nm] = 1;
          var pts = roads[k][2];
          var mid = pts[Math.floor(pts.length / 2)];
          res.push({ n: nm, cat: '道路', x: mid[0], y: mid[1] });
        }
      }
      results.textContent = '';
      if (res.length) {
        results.style.display = 'block';
        res.forEach(function (r) {
          var row = el('div', null, r.n + '　<span class="cat">' + (r.cat || '') + '</span>');
          row.addEventListener('click', function () {
            self.pan = { x: r.x, y: r.y };
            self.zoom = Math.max(self.zoom, 3.5);
            self.sel = r;
            si.value = '';
            results.style.display = 'none';
            self.render(container);
          });
          results.appendChild(row);
        });
      } else {
        results.style.display = 'none';
      }
    });

    // 指北针
    var compass = el('button', 'compass', '↑');
    compass.title = '回到镇中心';
    compass.addEventListener('click', function () { self.goHome(); });
    wrap.appendChild(compass);

    // SVG
    var half = 2600 / this.zoom;
    var vb = { x: this.pan.x - half, y: this.pan.y - half, w: 2 * half, h: 2 * half };
    var svg = svgEl('svg', {
      class: 'map-svg',
      viewBox: vb.x + ' ' + vb.y + ' ' + vb.w + ' ' + vb.h,
      preserveAspectRatio: 'xMidYMid meet'
    });
    wrap.appendChild(svg);
    this.svg = svg;
    this.wrap = wrap;

    // 背景
    var ext = this.ext;
    svg.appendChild(svgEl('rect', {
      x: ext.minX - 500, y: ext.minY - 500,
      width: ext.maxX - ext.minX + 1000, height: ext.maxY - ext.minY + 1000, fill: '#0b1322'
    }));

    var sw = function (w) { return w / Math.sqrt(self.zoom); };
    var fs = function (s) { return s / Math.sqrt(self.zoom); };

    // 水系
    var water = map.water || [];
    for (var wi = 0; wi < water.length; wi++) {
      var wnm = water[wi][0];
      var wdt = wnm && wnm.indexOf('河') !== -1 ? 90 : 45;
      svg.appendChild(svgEl('path', {
        d: pathD(water[wi][1]), fill: 'none', stroke: '#38bdf8', strokeWidth: sw(wdt),
        'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.75
      }));
      if (this.layers.names && wnm) {
        var wpts = water[wi][1];
        var wm = wpts[Math.floor(wpts.length / 2)];
        svg.appendChild(svgEl('text', { x: wm[0], y: wm[1], fill: '#7dd3fc', 'font-size': fs(120), 'text-anchor': 'middle', opacity: 0.9 }, wnm));
      }
    }

    // 道路
    var roads = map.roads || [];
    for (var ci = 0; ci < CLS_CONF.length; ci++) {
      var cc = CLS_CONF[ci];
      if (!this.layers[cc.key]) continue;
      for (var ri = 0; ri < roads.length; ri++) {
        if (roads[ri][0] !== ci) continue;
        if (cc.glow) {
          svg.appendChild(svgEl('path', {
            d: pathD(roads[ri][2]), fill: 'none', stroke: cc.glow, strokeWidth: sw(cc.width * 2.1),
            'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.45
          }));
        }
        svg.appendChild(svgEl('path', {
          d: pathD(roads[ri][2]), fill: 'none', stroke: cc.color, strokeWidth: sw(cc.width),
          'stroke-linecap': 'round', 'stroke-linejoin': 'round', opacity: 0.92
        }));
      }
    }

    // 片区
    if (this.layers.beats) {
      var beats = (this.kb.beats && this.kb.beats.beats) || [];
      for (var bi = 0; bi < beats.length; bi++) {
        var b = beats[bi];
        var poly = b.poly || [];
        var ptsStr = '', sx = 0, sy = 0;
        for (var pi = 0; pi < poly.length; pi++) {
          ptsStr += (pi ? ' ' : '') + poly[pi][0] + ',' + poly[pi][1];
          sx += poly[pi][0]; sy += poly[pi][1];
        }
        svg.appendChild(svgEl('polygon', {
          points: ptsStr, fill: b.color, 'fill-opacity': 0.12, stroke: b.color,
          'stroke-width': sw(6), 'stroke-dasharray': sw(20) + ' ' + sw(10)
        }));
        var cx = sx / poly.length, cy = sy / poly.length;
        svg.appendChild(svgEl('text', {
          x: cx, y: cy, fill: b.color, 'font-size': fs(200), 'font-weight': 700,
          'text-anchor': 'middle', opacity: 0.95, 'paint-order': 'stroke', stroke: '#0b1322', 'stroke-width': sw(16)
        }, b.name));
      }
    }

    // 重点单位图标标记
    if (this.layers.key) {
      var projected = this.projectLocations();
      for (var ki = 0; ki < projected.length; ki++) {
        var it = projected[ki];
        var always = KEY_ALWAYS.indexOf(it.cat) !== -1;
        var isSel = this.sel && this.sel.n === it.n;
        var showLabel = always || isSel || this.zoom >= 1.5;
        var r = sw(isSel ? 155 : 118);
        var g = svgEl('g', { style: 'cursor:pointer' });
        g.appendChild(svgEl('circle', { cx: it.x, cy: it.y, r: r * 1.18, fill: '#ffffff', opacity: 0.95 }));
        g.appendChild(svgEl('circle', {
          cx: it.x, cy: it.y, r: r, fill: catColor(it.cat), opacity: 0.95,
          stroke: isSel ? '#fbbf24' : '#ffffff', 'stroke-width': sw(isSel ? 16 : 7)
        }));
        g.appendChild(svgEl('text', {
          x: it.x, y: it.y, 'text-anchor': 'middle', dy: sw(27), 'font-size': fs(isSel ? 148 : 112)
        }, catIcon(it.cat)));
        if (showLabel) {
          g.appendChild(svgEl('text', {
            x: it.x, y: it.y - r * 1.35 - sw(20), fill: '#f1f5f9', 'font-size': fs(isSel ? 132 : 108),
            'text-anchor': 'middle', 'paint-order': 'stroke', stroke: '#0b1322', 'stroke-width': sw(18), 'stroke-linejoin': 'round'
          }, it.n));
        }
        (function (item) {
          g.addEventListener('click', function (ev) {
            ev.stopPropagation();
            self.sel = item;
            self.render(container);
          });
        })(it);
        svg.appendChild(g);
      }
    }

    // 商户 POI 小圆点
    if (this.layers.pois) {
      var pois = map.pois || [];
      for (var poi = 0; poi < pois.length; poi++) {
        var p = pois[poi];
        var isSelP = this.sel && this.sel.n === p[0];
        var showLabelP = isSelP || this.zoom >= 2.4;
        var g2 = svgEl('g', { style: 'cursor:pointer' });
        g2.appendChild(svgEl('circle', {
          cx: p[2], cy: p[3], r: sw(isSelP ? 54 : 33), fill: catColor(p[1]),
          stroke: '#0b1322', 'stroke-width': sw(5), opacity: 0.92
        }));
        if (showLabelP) {
          g2.appendChild(svgEl('text', {
            x: p[2], y: p[3] - sw(46), fill: '#e2e8f0', 'font-size': fs(84),
            'text-anchor': 'middle', 'paint-order': 'stroke', stroke: '#0b1322', 'stroke-width': sw(12)
          }, p[0]));
        }
        (function (po) {
          g2.addEventListener('click', function (ev) {
            ev.stopPropagation();
            self.sel = { n: po[0], cat: po[1], x: po[2], y: po[3], t: 'POI' };
            self.render(container);
          });
        })(p);
        svg.appendChild(g2);
      }
    }

    // 路名
    if (this.layers.names) {
      var seenN = {};
      for (var ni = 0; ni < roads.length; ni++) {
        var nm = roads[ni][1];
        if (!nm || seenN[nm]) continue;
        var cls = roads[ni][0];
        if (cls > 1 && this.zoom < 1.5) continue;
        seenN[nm] = 1;
        var rpts = roads[ni][2];
        var rm = rpts[Math.floor(rpts.length / 2)];
        svg.appendChild(svgEl('text', {
          x: rm[0], y: rm[1] - sw(10), fill: cls <= 1 ? '#fde68a' : '#a5b8d4',
          'font-size': fs(cls <= 1 ? 110 : 92), 'text-anchor': 'middle', opacity: 0.95,
          'paint-order': 'stroke', stroke: '#0b1322', 'stroke-width': sw(14), 'stroke-linejoin': 'round'
        }, nm));
      }
    }

    // 气泡
    if (this.sel) {
      var sp = this.toScreen(this.sel.x, this.sel.y);
      var pop = el('div', 'pop');
      pop.style.left = sp.x + 'px';
      pop.style.top = sp.y + 'px';
      pop.innerHTML =
        '<div class="pop-arrow"></div>' +
        '<div class="pop-head"><span>' + catIcon(this.sel.cat || '') + '</span>' +
        '<span class="pop-name"></span>' +
        '<button class="pop-close" title="关闭">✕</button></div>' +
        '<span class="pop-tag"></span>';
      pop.querySelector('.pop-name').textContent = this.sel.n;
      pop.querySelector('.pop-tag').textContent = this.sel.cat || (this.sel.t === 'POI' ? '商户/设施' : '地点');
      if (this.sel.addr) {
        var pa = el('div', 'pop-row', '📍 ' + this.sel.addr);
        pop.appendChild(pa);
      }
      if (this.sel.tel) {
        pop.appendChild(el('div', 'pop-row', '☎ ' + this.sel.tel));
      }
      if (this.sel.note) pop.appendChild(el('div', 'pop-row', this.sel.note));
      if (this.sel.t === 'POI') pop.appendChild(el('div', 'pop-row muted', 'OpenStreetMap 商户/设施标注'));
      pop.querySelector('.pop-close').addEventListener('click', function () {
        self.sel = null;
        self.render(container);
      });
      wrap.appendChild(pop);
    }

    // 比例尺
    var sb = this.scaleBarInfo();
    var scale = el('div', 'scale');
    scale.appendChild(el('div', 'scale-text', sb.meters >= 1000 ? (sb.meters / 1000) + ' km' : sb.meters + ' m'));
    var sl = el('div', 'scale-line');
    sl.style.width = sb.px + 'px';
    scale.appendChild(sl);
    wrap.appendChild(scale);

    // 图例
    var leg = el('div', 'legend2');
    leg.innerHTML =
      '<div><b>道路</b>：<span style="color:#f59e0b">─主干</span> <span style="color:#fcd34d">─次干</span> ' +
      '<span style="color:#e2e8f0">─支路</span> <span style="color:#7c8aa5">─巷道</span>  ' +
      '<span style="color:#38bdf8">~水系</span></div>' +
      '<div><b>重点</b>：⭐派出所 🏥医院 🎓学校 🚌车站 🏛政府 🏦银行 🛒市场 🌳公园</div>' +
      '<div><b>片区</b>：虚线色块为示意网格</div>' +
      '<div>点击标记查看详情，拖动平移，滚轮缩放</div>';
    wrap.appendChild(leg);

    // 视图信息
    var viewKm = (2 * half / 1000).toFixed(1);
    wrap.appendChild(el('div', 'viewinfo', '视野约 ' + viewKm + ' 公里 · 缩放 ' + this.zoom.toFixed(1) + ' 级'));

    // 缩放控件
    var tools = el('div', 'map-tools');
    var mkBtn = function (txt, title, fn) {
      var b = el('button', null, txt);
      b.title = title;
      b.addEventListener('click', fn);
      return b;
    };
    tools.appendChild(mkBtn('+', '放大', function () { self.zoomBy(1.35); }));
    tools.appendChild(mkBtn('−', '缩小', function () { self.zoomBy(1 / 1.35); }));
    tools.appendChild(mkBtn('⛶', '全景', function () { self.fitAll(); }));
    tools.appendChild(mkBtn('◎', '回镇中心', function () { self.goHome(); }));
    wrap.appendChild(tools);

    // 交互
    this.bindInteractions();

    // 外部聚焦（从地点页跳转）
    if (this.focus) {
      var f = this.focus;
      this.pan = { x: Math.round((f.lon - 116.688) * 101390), y: Math.round((f.lat - 24.358) * 110900) };
      this.zoom = 3.5;
      this.sel = { n: f.n, cat: f.cat, x: this.pan.x, y: this.pan.y };
      this.focus = null;
      // 重新渲染一次以应用聚焦
      var that = this;
      setTimeout(function () { that.render(container); }, 0);
    }
  };

  function pathD(pts) {
    var d = '';
    for (var i = 0; i < pts.length; i++) {
      d += (i === 0 ? 'M' : 'L') + pts[i][0] + ' ' + pts[i][1];
    }
    return d;
  }

  KBMap.prototype.toScreen = function (x, y) {
    var el = this.svg;
    var w = el && el.clientWidth ? el.clientWidth : 800;
    var h = el && el.clientHeight ? el.clientHeight : 560;
    var half = 2600 / this.zoom;
    return {
      x: (x - (this.pan.x - half)) / (2 * half) * w,
      y: (y - (this.pan.y - half)) / (2 * half) * h
    };
  };

  KBMap.prototype.scaleBarInfo = function () {
    var el = this.svg;
    var w = el && el.clientWidth ? el.clientWidth : 800;
    var half = 2600 / this.zoom;
    var mpp = (2 * half) / w;
    var cands = [50, 100, 200, 500, 1000, 2000, 5000, 10000];
    var best = cands[0], bestDiff = 1e18;
    for (var i = 0; i < cands.length; i++) {
      var diff = Math.abs(cands[i] / mpp - 110);
      if (diff < bestDiff) { bestDiff = diff; best = cands[i]; }
    }
    return { meters: best, px: Math.max(30, Math.round(best / mpp)) };
  };

  KBMap.prototype.zoomBy = function (f) {
    this.zoom = Math.min(16, Math.max(0.5, this.zoom * f));
    this.render(this.container);
  };
  KBMap.prototype.fitAll = function () {
    var ext = this.ext;
    this.pan = { x: (ext.minX + ext.maxX) / 2, y: (ext.minY + ext.maxY) / 2 };
    this.zoom = 1;
    this.render(this.container);
  };
  KBMap.prototype.goHome = function () {
    this.pan = { x: 0, y: 0 };
    this.zoom = 1.2;
    this.render(this.container);
  };

  KBMap.prototype.bindInteractions = function () {
    var self = this;
    var wrap = this.wrap;
    var dragging = false, sx = 0, sy = 0, px = 0, py = 0;
    var touches = {};

    wrap.addEventListener('mousedown', function (e) {
      dragging = true;
      sx = e.clientX; sy = e.clientY;
      px = self.pan.x; py = self.pan.y;
      e.preventDefault();
    });
    window.addEventListener('mousemove', function (e) {
      if (!dragging) return;
      var w = self.svg.clientWidth || 800;
      var half = 2600 / self.zoom;
      var mpp = (2 * half) / w;
      self.pan = { x: px - (e.clientX - sx) * mpp, y: py + (e.clientY - sy) * mpp };
      self.render(self.container);
    });
    window.addEventListener('mouseup', function () { dragging = false; });

    // 滚轮缩放
    wrap.addEventListener('wheel', function (e) {
      e.preventDefault();
      self.zoomBy(e.deltaY < 0 ? 1.22 : 1 / 1.22);
    }, { passive: false });

    // 触摸：单指平移，双指缩放
    wrap.addEventListener('touchstart', function (e) {
      touches = {};
      for (var i = 0; i < e.changedTouches.length; i++) {
        var t = e.changedTouches[i];
        touches[t.identifier] = { x: t.clientX, y: t.clientY };
      }
      if (e.touches.length === 1) {
        dragging = true;
        sx = e.touches[0].clientX; sy = e.touches[0].clientY;
        px = self.pan.x; py = self.pan.y;
      }
      e.preventDefault();
    }, { passive: false });
    wrap.addEventListener('touchmove', function (e) {
      e.preventDefault();
      if (e.touches.length === 1 && dragging) {
        var t = e.touches[0];
        var w = self.svg.clientWidth || 800;
        var half = 2600 / self.zoom;
        var mpp = (2 * half) / w;
        self.pan = { x: px - (t.clientX - sx) * mpp, y: py + (t.clientY - sy) * mpp };
        self.render(self.container);
      } else if (e.touches.length === 2) {
        var t0 = e.touches[0], t1 = e.touches[1];
        var d = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
        var p0 = touches[t0.identifier], p1 = touches[t1.identifier];
        if (p0 && p1) {
          var pd = Math.hypot(p1.x - p0.x, p1.y - p0.y);
          if (pd > 0) self.zoomBy(d / pd);
        }
        touches[t0.identifier] = { x: t0.clientX, y: t0.clientY };
        touches[t1.identifier] = { x: t1.clientX, y: t1.clientY };
      }
    }, { passive: false });
    wrap.addEventListener('touchend', function (e) {
      for (var i = 0; i < e.changedTouches.length; i++) delete touches[e.changedTouches[i].identifier];
      if (e.touches.length === 0) dragging = false;
    }, { passive: false });

    // 空白处点击关闭气泡
    wrap.addEventListener('click', function (e) {
      if (e.target === wrap || e.target === self.svg) {
        self.sel = null;
        self.render(self.container);
      }
    });
  };

  window.KBMap = KBMap;
})();
