(function () {
  // A silhouette resolving from a coarse grid to a smooth shape, step by step.
  var LEVELS = [[6, 4], [12, 8], [24, 16], [48, 32], [96, 64], null]; // null = smooth silhouette
  var LABELS = ['6×4', '12×8', '24×16', '48×32', '96×64', 'vector'];
  var HOLD = 1.5, SWEEP = 0.9, END_HOLD = 2.6, RESET = 0.9;
  var INK = '#0f1211', MUTED = '#8a8f8c';
  var STEP = HOLD + SWEEP, T = LEVELS.length * STEP - SWEEP + END_HOLD + RESET;

  // color: a smooth lavender-to-periwinkle gradient, with per-cell variation that calms down as resolution rises
  var C1 = [195, 184, 255], C2 = [169, 188, 255], JIT = [0.34, 0.26, 0.18, 0.1, 0.05];
  function hash(a, b) { var h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return h - Math.floor(h); }
  function cellColor(c, r, cols, rows, li) {
    var u = (c + 0.5) / cols * 0.7 + (r + 0.5) / rows * 0.3, j = (hash(c + cols, r + rows) - 0.5) * 2 * JIT[li];
    var rgb = [0, 1, 2].map(function (k) {
      var v = C1[k] + (C2[k] - C1[k]) * u;
      v = j > 0 ? v + (255 - v) * j : v + v * j * 0.35;
      return Math.round(v);
    });
    return 'rgb(' + rgb.join(',') + ')';
  }
  var img = new Image(), grids = null, tinted = null;
  img.onload = function () {
    var S = 192, off = document.createElement('canvas');
    off.width = S * 1.5; off.height = S;
    var o = off.getContext('2d');
    o.drawImage(img, 0, 0, off.width, off.height);
    var data = o.getImageData(0, 0, off.width, off.height).data;
    grids = LEVELS.map(function (L, li) {
      if (!L) return null;
      var cols = L[0], rows = L[1], cells = [];
      for (var r = 0; r < rows; r++) for (var c = 0; c < cols; c++) {
        var x0 = Math.floor(c * off.width / cols), x1 = Math.floor((c + 1) * off.width / cols);
        var y0 = Math.floor(r * off.height / rows), y1 = Math.floor((r + 1) * off.height / rows);
        var sum = 0, n = 0;
        for (var y = y0; y < y1; y++) for (var x = x0; x < x1; x++) { sum += data[(y * off.width + x) * 4 + 3]; n++; }
        if (sum / n / 255 > 0.5) cells.push([c, r, cellColor(c, r, cols, rows, li)]);
      }
      return { cols: cols, rows: rows, cells: cells };
    });
    // smooth silhouette tinted with the mosaic palette
    tinted = document.createElement('canvas');
    tinted.width = img.naturalWidth; tinted.height = img.naturalHeight;
    var tc = tinted.getContext('2d');
    var g = tc.createLinearGradient(0, 0, tinted.width, tinted.height);
    g.addColorStop(0, '#c3b8ff'); g.addColorStop(1, '#a9bcff');
    tc.drawImage(img, 0, 0);
    tc.globalCompositeOperation = 'source-in';
    tc.fillStyle = g; tc.fillRect(0, 0, tinted.width, tinted.height);
  };
  img.src = '/images/elephant.png';

  function clamp(u) { return Math.max(0, Math.min(1, u)); }

  function drawLevel(ctx, i, x, y, w, h, reveal) {
    var G = grids[i];
    if (!G) {
      ctx.save();
      ctx.beginPath(); ctx.rect(x, y, w * reveal, h); ctx.clip();
      ctx.drawImage(tinted, x, y, w, h);
      ctx.restore();
      return;
    }
    var cw = w / G.cols, ch = h / G.rows, gap = cw > 6 ? 1 : 0;
    for (var k = 0; k < G.cells.length; k++) {
      var c = G.cells[k];
      if ((c[0] + 0.5) / G.cols > reveal) continue;
      ctx.fillStyle = c[2];
      ctx.fillRect(x + c[0] * cw + gap / 2, y + c[1] * ch + gap / 2, cw - gap, ch - gap);
    }
  }

  function drawGrid(ctx, i, x, y, w, h, alpha) {
    var G = grids[i];
    if (!G || alpha <= 0) return;
    var cw = w / G.cols;
    ctx.save();
    ctx.globalAlpha = alpha * (cw > 9 ? 0.16 : cw > 5 ? 0.09 : 0.05);
    ctx.strokeStyle = INK; ctx.lineWidth = 1;
    ctx.beginPath();
    for (var c = 0; c <= G.cols; c++) { var px = Math.round(x + c * w / G.cols) + 0.5; ctx.moveTo(px, y); ctx.lineTo(px, y + h); }
    for (var r = 0; r <= G.rows; r++) { var py = Math.round(y + r * h / G.rows) + 0.5; ctx.moveTo(x, py); ctx.lineTo(x + w, py); }
    ctx.stroke();
    ctx.restore();
  }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var start = null;
  function frame(now) {
    var cv = document.querySelector('canvas[data-pixelate]');
    if (cv && grids) {
      var rect = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      if (rect.width > 10) {
        var W = Math.round(rect.width * dpr), H = Math.round(rect.height * dpr);
        if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
        var ctx = cv.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, H);
        if (start === null) start = now;
        var t = reduce ? LEVELS.length * STEP : ((now - start) / 1000) % T;

        var labelH = Math.round(40 * dpr);
        var pw = W, ph = Math.min(H - labelH, Math.round(W / 1.5));
        var px = 0, py = 0;

        // which level is showing, and how far the next one has swept in
        var idx = Math.min(LEVELS.length - 1, Math.floor(t / STEP));
        var into = t - idx * STEP, sweep = idx < LEVELS.length - 1 ? clamp((into - HOLD) / SWEEP) : 0;
        var endT = (LEVELS.length - 1) * STEP + END_HOLD, fade = clamp((t - endT) / RESET);

        ctx.globalAlpha = 1 - fade;
        drawLevel(ctx, idx, px, py, pw, ph, 1);
        drawGrid(ctx, idx, px, py, pw, ph, 1 - sweep);
        if (sweep > 0) {
          // next level wipes in from the left, its grid leading the edge
          ctx.save();
          ctx.beginPath(); ctx.rect(px, py, pw * sweep, ph); ctx.clip();
          ctx.clearRect(px, py, pw * sweep, ph);
          drawLevel(ctx, idx + 1, px, py, pw, ph, 1);
          drawGrid(ctx, idx + 1, px, py, pw, ph, 1);
          ctx.restore();
          ctx.globalAlpha = 0.55;
          ctx.fillStyle = '#6f66ff';
          ctx.fillRect(px + pw * sweep - dpr, py, 2 * dpr, ph);
        }
        if (fade > 0) {
          ctx.globalAlpha = fade;
          drawLevel(ctx, 0, px, py, pw, ph, 1);
          drawGrid(ctx, 0, px, py, pw, ph, 1);
        }
        ctx.globalAlpha = 1;

        // progress: one segment per step, labels underneath
        var segY = ph + Math.round(14 * dpr), segH = Math.max(2, Math.round(2 * dpr));
        var n = LEVELS.length, gapS = Math.round(8 * dpr), segW = (pw - gapS * (n - 1)) / n;
        var active = fade > 0.5 ? 0 : idx, prog = fade > 0 ? 0 : (idx === n - 1 ? 1 : clamp(into / STEP));
        ctx.font = (10 * dpr) + "px 'Space Mono', monospace";
        ctx.textBaseline = 'top';
        for (var s = 0; s < n; s++) {
          var sx = px + s * (segW + gapS);
          ctx.fillStyle = 'rgba(15,18,17,0.12)'; ctx.fillRect(sx, segY, segW, segH);
          var f = s < active ? 1 : s === active ? (s === n - 1 ? 1 : prog) : 0;
          if (f > 0) { ctx.fillStyle = s === active ? '#6f66ff' : INK; ctx.fillRect(sx, segY, segW * f, segH); }
          ctx.fillStyle = s === active ? INK : MUTED;
          ctx.fillText(LABELS[s], sx, segY + segH + Math.round(8 * dpr));
        }
      }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
