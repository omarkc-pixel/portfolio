(function () {
  var T = 6;                     // loop length (s)
  var INK = '#0f1211', PAPER = '#f6f6f4';
  var FILL = ['#ddd8ff', '#d3defd', '#e6e0ff'], EDGE = '#5b54e8';
  var C30 = Math.cos(Math.PI / 6), S30 = 0.5;
  // one SaaS logo per arm; it lights up on the cube face of that arm's axis
  var LOGOS = ['snowflake', 'salesforce', 'hubspot', 'slack', 'dbt', 'datadog'].map(function (n) {
    var im = new Image(); im.src = '/images/logos/' + n + '.svg'; return im;
  });
  // in-face image axes (right, down) for the visible faces +x, +y, +z
  var FACE_R = [[0, -1, 0], [1, 0, 0], [1, 0, 0]], FACE_D = [[0, 0, -1], [0, 0, -1], [0, 1, 0]];
  function smooth(e0, e1, x) { var u = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return u * u * (3 - 2 * u); }
  function proj(p) { return [(p[0] - p[1]) * C30, (p[0] + p[1]) * S30 - p[2]]; }
  function rot(v, ax, a) { // rotate vector v around unit axis index ax
    var c = Math.cos(a), s = Math.sin(a), x = v[0], y = v[1], z = v[2];
    if (ax === 0) return [x, y * c - z * s, y * s + z * c];
    if (ax === 1) return [x * c + z * s, y, -x * s + z * c];
    return [x * c - y * s, x * s + y * c, z];
  }
  function ease(u) { u = Math.max(0, Math.min(1, u)); return u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; }
  // slice square: perpendicular to axis a, at offset d, half-size h
  function square(a, d, h, flipAx, ang, push) {
    var b = (a + 1) % 3, c = (a + 2) % 3, pts = [];
    var corners = [[-h, -h], [h, -h], [h, h], [-h, h]];
    for (var i = 0; i < 4; i++) {
      var v = [0, 0, 0]; v[b] = corners[i][0]; v[c] = corners[i][1];
      v = rot(v, flipAx, ang);
      v[a] += d + push;
      pts.push(v);
    }
    return pts;
  }
  var N = 5, H = 0.5, GAP = 0.19, START = 1.02;
  function scene(t) {
    var polys = [];
    var arms = [[2, 1], [0, 1], [1, 1], [2, -1], [0, -1], [1, -1]];
    // glow on the face sharing each animating arm's axis
    var glow = [{ a: 0, logo: 0 }, { a: 0, logo: 0 }, { a: 0, logo: 0 }];
    for (var g = 0; g < arms.length; g++) {
      var lt = (((t - g * 1.0) % T) + T) % T;
      if (lt > T - 0.3) lt -= T;
      var al = smooth(-0.25, 0.2, lt) * (1 - smooth(1.45, 1.95, lt));
      if (al > glow[arms[g][0]].a) glow[arms[g][0]] = { a: al, logo: g };
    }
    // central cube faces
    var h = H;
    for (var a = 0; a < 3; a++) for (var s = -1; s <= 1; s += 2) {
      polys.push({ pts: square(a, s * h, h, 0, 0, 0), cube: true, axis: a, side: s, glow: s > 0 ? glow[a] : null });
    }
    for (var i = 0; i < arms.length; i++) {
      var a = arms[i][0], s = arms[i][1];
      var flipAx = (a + 1 + (i % 2)) % 3;
      for (var k = 0; k < N; k++) {
        var t0 = i * 1.0 + k * 0.13;
        var u = ease((((t - t0) % T) + T) % T / 1.05);
        var ang = Math.PI * u, push = Math.sin(Math.PI * u) * 0.28;
        var hot = u > 0 && u < 1;
        polys.push({ pts: square(a, s * (START + k * GAP), H * 0.94, flipAx, ang, s * push), hot: hot, col: FILL[(i + k) % 3] });
      }
    }
    for (var j = 0; j < polys.length; j++) {
      var p = polys[j].pts, dsum = 0;
      for (var q = 0; q < 4; q++) dsum += p[q][0] + p[q][1] + p[q][2];
      polys[j].depth = dsum / 4;
    }
    polys.sort(function (x, y) { return x.depth - y.depth; });
    return polys;
  }
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var t0 = null;
  function draw(now) {
    var cv = document.querySelector('canvas[data-slices]');
    if (cv) {
      var r = cv.getBoundingClientRect(), dpr = Math.min(2, window.devicePixelRatio || 1);
      if (r.width > 10) {
        var W = Math.round(r.width * dpr), Hh = Math.round(r.height * dpr);
        if (cv.width !== W || cv.height !== Hh) { cv.width = W; cv.height = Hh; }
        var ctx = cv.getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, W, Hh);
        var sc = Math.min(W, Hh) / 5.6;
        ctx.translate(W / 2, Hh / 2); ctx.scale(sc, sc);
        if (t0 === null) t0 = now;
        var t = reduce ? 1.6 : ((now - t0) / 1000) % T;
        var polys = scene(t);
        ctx.lineJoin = 'round'; ctx.lineWidth = 1.15 * dpr / sc;
        for (var i = 0; i < polys.length; i++) {
          var P = polys[i], p0 = proj(P.pts[0]);
          ctx.beginPath(); ctx.moveTo(p0[0], p0[1]);
          for (var q = 1; q < 4; q++) { var pp = proj(P.pts[q]); ctx.lineTo(pp[0], pp[1]); }
          ctx.closePath();
          ctx.fillStyle = P.hot ? P.col : PAPER;
          ctx.globalAlpha = 1; ctx.fill();
          if (P.glow && P.glow.a > 0.01) {
            var G = P.glow, img = LOGOS[G.logo];
            ctx.globalAlpha = G.a; ctx.fillStyle = '#ece9ff'; ctx.fill();
            if (img.complete && img.naturalWidth) {
              var c3 = [0, 0, 0]; c3[P.axis] = H;
              var O = proj(c3), R = proj(FACE_R[P.axis]), D = proj(FACE_D[P.axis]);
              var L = 0.56, ar = img.naturalWidth / img.naturalHeight;
              var iw = ar >= 1 ? L : L * ar, ih = ar >= 1 ? L / ar : L;
              ctx.save();
              ctx.transform(R[0], R[1], D[0], D[1], O[0], O[1]);
              ctx.drawImage(img, -iw / 2, -ih / 2, iw, ih);
              ctx.restore();
            }
            ctx.globalAlpha = 1;
          }
          ctx.strokeStyle = P.hot ? EDGE : INK; ctx.stroke();
        }
      }
    }
    if (!reduce) requestAnimationFrame(draw); else setTimeout(function () { requestAnimationFrame(draw); }, 500);
  }
  requestAnimationFrame(draw);
})();
