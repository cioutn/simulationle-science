const search = document.querySelector('#case-search');

if (search) {
  const filters = [...document.querySelectorAll('[data-filter]')];
  const cards = [...document.querySelectorAll('.case-card')];
  const count = document.querySelector('#case-count');
  const note = document.querySelector('#case-note');
  const emptyState = document.querySelector('#empty-state');
  const normalize = (value) => value.normalize('NFKC').toLowerCase();
  const searchable = cards.map((card) => normalize(`${card.innerText} ${card.dataset.keywords}`));
  let domain = 'all';

  function updateCases() {
    const terms = normalize(search.value).trim().split(/\s+/).filter(Boolean);
    let visible = 0;
    cards.forEach((card, index) => {
      const matchesDomain = domain === 'all' || card.dataset.domain === domain;
      card.hidden = !matchesDomain || !terms.every((term) => searchable[index].includes(term));
      if (!card.hidden) visible += 1;
    });
    count.textContent = `${visible} 个案例`;
    note.hidden = visible === 0;
    emptyState.hidden = visible > 0;
  }

  function selectDomain(value) {
    domain = value;
    filters.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.filter === domain)));
    updateCases();
  }

  filters.forEach((button) => button.addEventListener('click', () => selectDomain(button.dataset.filter)));
  search.addEventListener('input', updateCases);
  document.querySelector('#reset-search').addEventListener('click', () => {
    search.value = '';
    selectDomain('all');
    search.focus();
  });
  updateCases();
}

const theme = {
  pet: { background: '#1b1938', line: '#38335b', light: '#d7c9ef' },
  thermal: { background: '#2a1d35', line: '#52425e', light: '#f7d0cb' },
  metabolism: { background: '#142e39', line: '#315662', light: '#c5eff0' },
  gel: { background: '#241e41', line: '#493d68', light: '#e1d5f5' },
  orbit: { background: '#192440', line: '#344568', light: '#dce8ff' },
  reactor: { background: '#30213b', line: '#59415f', light: '#f9dbd3' },
  dendrite: { background: '#142c3c', line: '#365162', light: '#d4efee' },
};

const warm = [[47, 34, 95], [96, 52, 140], [168, 65, 146], [229, 106, 127], [255, 168, 118], [255, 239, 167]];
const cool = [[23, 51, 65], [27, 92, 110], [31, 142, 147], [84, 190, 173], [179, 226, 162], [246, 240, 183]];

function colorAt(palette, value) {
  const position = Math.max(0, Math.min(.9999, value)) * (palette.length - 1);
  const lower = Math.floor(position);
  const fraction = position - lower;
  return palette[lower].map((channel, index) => Math.round(channel + (palette[lower + 1][index] - channel) * fraction));
}

function gaussian(x, y, centerX, centerY, spreadX, spreadY) {
  return Math.exp(-(((x - centerX) / spreadX) ** 2 + ((y - centerY) / spreadY) ** 2));
}

function raster(context, left, top, width, height, palette, field) {
  const buffer = document.createElement('canvas');
  buffer.width = 176;
  buffer.height = Math.max(30, Math.round(176 * height / width));
  const pixels = buffer.getContext('2d');
  const image = pixels.createImageData(buffer.width, buffer.height);
  for (let row = 0; row < buffer.height; row += 1) {
    for (let column = 0; column < buffer.width; column += 1) {
      const value = field(column / (buffer.width - 1), row / (buffer.height - 1));
      if (value === null) continue;
      const offset = 4 * (column + row * buffer.width);
      image.data.set(colorAt(palette, value), offset);
      image.data[offset + 3] = 255;
    }
  }
  pixels.putImageData(image, 0, 0);
  context.drawImage(buffer, left, top, width, height);
}

function line(context, x1, y1, x2, y2, color) {
  context.strokeStyle = color;
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.stroke();
}

function label(context, value, x, y, color, align = 'left') {
  context.fillStyle = color;
  context.font = '13px ui-monospace, system-ui, sans-serif';
  context.textAlign = align;
  context.fillText(value, x, y);
}

function background(context, width, height, colors) {
  context.fillStyle = colors.background;
  context.fillRect(0, 0, width, height);
  context.strokeStyle = colors.line;
  context.globalAlpha = .45;
  context.beginPath();
  for (let x = 15.5; x < width; x += 22) {
    context.moveTo(x, 0);
    context.lineTo(x, height);
  }
  for (let y = 15.5; y < height; y += 22) {
    context.moveTo(0, y);
    context.lineTo(width, y);
  }
  context.stroke();
  context.globalAlpha = 1;
}

function scale(context, width, height, palette, color) {
  const barWidth = Math.min(130, width * .36);
  const x = (width - barWidth) / 2;
  const y = height - 19;
  const gradient = context.createLinearGradient(x, 0, x + barWidth, 0);
  palette.forEach((channels, index) => gradient.addColorStop(index / (palette.length - 1), `rgb(${channels.join(',')})`));
  context.fillStyle = gradient;
  context.fillRect(x, y - 7, barWidth, 7);
  label(context, '低', x - 8, y, color, 'right');
  label(context, '高', x + barWidth + 8, y, color);
}

function phantom(x, y, followUp) {
  const radius = Math.hypot((x - .5) / .44, (y - .51) / .45);
  const angle = Math.atan2(y - .51, x - .5);
  const edge = 1 + .04 * Math.cos(angle * 6) + .025 * Math.sin(angle * 9);
  if (radius > edge) return null;
  const shift = followUp ? .06 : 0;
  const shell = .24 * Math.exp(-((radius - .76) ** 2) / .018);
  const target = (followUp ? .57 : .42) * gaussian(x, y, .30 + shift, .49, .14, .17);
  const neighbor = .47 * gaussian(x, y, .67, .61 - shift / 2, .22, .13);
  const reference = .30 * gaussian(x, y, .59, .28, .13, .15);
  const split = .12 * gaussian(x, y, .49, .53, .07, .20);
  const texture = .03 * Math.sin(43 * x + 15 * y) * Math.cos(31 * y);
  return .18 + shell + target + neighbor + reference - split + texture;
}

function petCover(context, width, height) {
  background(context, width, height, theme.pet);
  const size = Math.min(width - 14, height - 22);
  raster(context, (width - size) / 2, (height - size) / 2, size, size, warm, (x, y) => phantom(x, y, true));
}

function petPair(context, width, height) {
  const colors = theme.pet;
  background(context, width, height, colors);
  const size = Math.min((width - 54) / 2, height - 61, 310);
  const gap = Math.min(38, width * .07);
  const left = (width - size * 2 - gap) / 2;
  const top = (height - size - 23) / 2;
  for (const visit of [0, 1]) {
    const x = left + visit * (size + gap);
    context.strokeStyle = colors.line;
    context.strokeRect(x, top, size, size);
    raster(context, x, top, size, size, warm, (u, v) => phantom(u, v, visit === 1));
    line(context, x + size / 2, top + 5, x + size / 2, top + size - 5, '#f4c8fc65');
    line(context, x + 5, top + size / 2, x + size - 5, top + size / 2, '#f4c8fc65');
    label(context, `Visit ${visit}`, x + 8, top + 16, '#f1e6fe');
  }
  scale(context, width, height, warm, colors.light);
}

function petIntervals(context, width, height) {
  const colors = theme.pet;
  background(context, width, height, colors);
  const left = width < 450 ? 60 : 105;
  const right = width - (width < 450 ? 25 : 70);
  const center = (left + right) / 2;
  const upper = 36;
  const lower = height - 48;
  line(context, center, upper, center, lower, colors.light);
  line(context, left, lower, right, lower, colors.light);
  label(context, '零变化', center, 26, colors.light, 'center');
  const examples = [['区域 A', -.38, .19], ['区域 B', .12, .63], ['区域 C', -.78, -.23]];
  examples.forEach(([name, start, end], index) => {
    const y = upper + (index + 1) * (lower - upper) / 4;
    const x1 = center + start * (center - left);
    const x2 = center + end * (center - left);
    const ink = ['#e7b8ec', '#f9c08e', '#a7b4fa'][index];
    label(context, name, left - 9, y + 4, colors.light, 'right');
    context.lineWidth = 4;
    line(context, x1, y, x2, y, ink);
    context.lineWidth = 1.5;
    line(context, x1, y - 7, x1, y + 7, ink);
    line(context, x2, y - 7, x2, y + 7, ink);
  });
  label(context, '减少', left, lower + 24, colors.light);
  label(context, '增加', right, lower + 24, colors.light, 'right');
}

function thermalPlot(context, width, height, compact, backFace) {
  const colors = theme.thermal;
  background(context, width, height, colors);
  const plotWidth = Math.min(width - (compact ? 20 : 52), 660);
  const left = (width - plotWidth) / 2;
  const rowHeight = (height - (compact ? 57 : 83)) / 3;
  for (let frame = 0; frame < 3; frame += 1) {
    const y = 17 + frame * (rowHeight + 8);
    raster(context, left, y, plotWidth, rowHeight, warm, (x, across) => {
      const peak = gaussian(x, across, .27 + frame * .14, .49, .12 + frame * .055, .38 + frame * .1);
      const secondary = gaussian(x, across, .70, .65, .12, .46);
      return .13 + (backFace ? .46 : .77) * peak + .15 * secondary;
    });
    context.strokeStyle = colors.line;
    context.strokeRect(left, y, plotWidth, rowHeight);
    if (!compact) label(context, ['t₁', 't₂', 't₃'][frame], left + 8, y + 15, '#ffe7e1');
  }
  if (!compact) scale(context, width, height, warm, colors.light);
}

function metabolismPlot(context, width, height, compact, later) {
  const colors = theme.metabolism;
  background(context, width, height, colors);
  const plotWidth = Math.min(width - (compact ? 20 : 88), 650);
  const left = (width - plotWidth) / 2;
  const top = compact ? 16 : 24;
  const plotHeight = height - (compact ? 32 : 86);
  raster(context, left, top, plotWidth, plotHeight, cool, (x, y) => {
    const diffusion = .10 + y * (later ? .29 : .17);
    const source = .82 * gaussian(x, y, .19 + .51 * y, .2, diffusion, .75);
    const pool = .38 * gaussian(x, y, .72 - .32 * y, .72, .14 + .18 * y, .45);
    return .09 + source + pool + .05 * Math.cos(32 * x - 2 * y);
  });
  context.strokeStyle = colors.light;
  context.strokeRect(left, top, plotWidth, plotHeight);
  if (!compact) {
    label(context, '时间', left - 9, top + plotHeight / 2, colors.light, 'right');
    label(context, '空间位置', left + plotWidth / 2, top + plotHeight + 18, colors.light, 'center');
    scale(context, width, height, cool, colors.light);
  }
}

function gelPlot(context, width, height, compact, blocked) {
  const colors = theme.gel;
  background(context, width, height, colors);
  const length = Math.min(width * .79, width - 32, 660);
  const left = (width - length) / 2;
  const middle = height * .58;
  const bend = height * (blocked ? .06 : .30);
  const depth = height * .14;
  const x = (position, level) => left + length * position + level * 11;
  const y = (position, level) => middle - bend * position ** 2 + level * depth;
  const cells = 21;
  for (let index = 0; index < cells; index += 1) {
    const start = index / cells;
    const end = (index + 1) / cells;
    for (const [lower, upper, palette] of [[-1, 0, warm], [0, 1, cool]]) {
      context.fillStyle = `rgb(${colorAt(palette, .33 + .58 * start).join(',')})`;
      context.strokeStyle = '#f6e6ff72';
      context.beginPath();
      context.moveTo(x(start, lower), y(start, lower));
      context.lineTo(x(end, lower), y(end, lower));
      context.lineTo(x(end, upper), y(end, upper));
      context.lineTo(x(start, upper), y(start, upper));
      context.closePath();
      context.fill();
      context.stroke();
    }
  }
  line(context, left, middle - depth * 1.5, left, middle + depth * 1.5, colors.light);
  if (blocked) line(context, left + length + 11, y(1, -1) - 8, left + length + 11, y(1, 1) + 8, colors.light);
  if (!compact) {
    label(context, '固定端', left, middle + depth * 1.5 + 21, colors.light, 'center');
    label(context, blocked ? '受限端' : '自由端', left + length, y(1, 1) + 23, colors.light, 'center');
  }
}

function dot(context, x, y, radius, color) {
  context.fillStyle = color;
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.fill();
}

function path(context, points, color, weight = 1) {
  context.strokeStyle = color;
  context.lineWidth = weight;
  context.beginPath();
  points.forEach(([x, y], index) => {
    if (index === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
  context.lineWidth = 1;
}

function phaseBands(context, width, height, phases, colors) {
  const span = Math.min(width - 30, 650);
  const left = (width - span) / 2;
  const step = span / phases.length;
  const top = height * .40;
  phases.forEach(([title, color], index) => {
    const x = left + index * step;
    context.fillStyle = color;
    context.globalAlpha = .22;
    context.fillRect(x + 2, top, step - 4, height * .22);
    context.globalAlpha = 1;
    line(context, x + 2, top, x + step - 2, top, color);
    label(context, title, x + step / 2, top + height * .12, colors.light, 'center');
  });
  line(context, left, height * .72, left + span, height * .72, colors.line);
  label(context, '时间顺序', left + span, height * .72 + 20, colors.light, 'right');
}

function orbitPlot(context, width, height, compact, axes) {
  const colors = theme.orbit;
  background(context, width, height, colors);
  if (compact) {
    const radius = Math.min(width * .39, height * .37);
    const x = width / 2;
    const y = height / 2;
    const rotation = -.48;
    for (const scale of [.53, 1]) {
      context.strokeStyle = '#8eb6ff';
      context.beginPath();
      context.ellipse(x, y, radius * scale, radius * scale * .57, rotation, 0, Math.PI * 2);
      context.stroke();
      dot(context, x + radius * scale * Math.cos(rotation), y + radius * scale * Math.sin(rotation), 2.7, '#a8cdfa');
    }
    dot(context, x, y, 5, '#ffd58f');
    return;
  }
  if (!axes) {
    phaseBands(context, width, height, [['历史观测', '#9fb0ef'], ['追加观测', '#78dfcf'], ['留出预测', '#f4bd83']], colors);
    return;
  }
  const x = width * .46;
  const y = height * .57;
  const size = Math.min(width * .23, height * .33);
  path(context, [[x - size, y], [x + size, y]], '#83daba', 2);
  path(context, [[x, y + size * .55], [x, y - size]], '#a6c6ff', 2);
  path(context, [[x, y], [x + size * .67, y + size * .65]], '#f9c78c', 2);
  dot(context, x, y, 6, '#fff0c3');
  label(context, '天球平面 X', x + size + 6, y + 4, colors.light);
  label(context, '天球平面 Y', x, y - size - 10, colors.light, 'center');
  label(context, '视线方向', x + size * .67, y + size * .65 + 21, colors.light, 'center');
}

function reactorPlot(context, width, height, compact, checks) {
  const colors = theme.reactor;
  background(context, width, height, colors);
  if (compact) {
    const w = width * .57;
    const h = Math.min(height * .47, w * 1.15);
    const x = (width - w) / 2;
    const y = (height - h) / 2;
    context.fillStyle = '#60405f';
    context.strokeStyle = '#f3aeaa';
    context.beginPath();
    context.roundRect(x, y, w, h, 7);
    context.fill();
    context.stroke();
    path(context, [[width / 2, y - 9], [width / 2, y + h * .71]], '#ffe0b8', 2);
    path(context, [[x + w * .24, y + h * .63], [x + w * .76, y + h * .73]], '#ffe0b8', 2);
    path(context, [[x - 6, y + h * .3], [x, y + h * .3]], '#d299db', 2);
    path(context, [[x + w, y + h * .72], [x + w + 6, y + h * .72]], '#d299db', 2);
    return;
  }
  if (!checks) {
    phaseBands(context, width, height, [['历史数据', '#d6a9eb'], ['虚拟中试', '#f0b2b5'], ['方案比较', '#f6c988']], colors);
    return;
  }
  phaseBands(context, width, height, [['短暂干预', '#caa0e5'], ['恢复工况', '#edb4a8'], ['检查出口', '#f6cb8c']], colors);
}

const branches = [
  [[.5,.63],[.50,.43],[.54,.31],[.52,.17],[.57,.07]],
  [[.50,.43],[.34,.34],[.26,.19],[.13,.12]],
  [[.34,.34],[.19,.32],[.08,.41]],
  [[.26,.19],[.30,.09],[.25,.04]],
  [[.54,.31],[.69,.23],[.78,.09]],
  [[.69,.23],[.82,.23],[.89,.16]],
  [[.50,.52],[.67,.46],[.75,.36],[.88,.33]],
  [[.67,.46],[.78,.53],[.92,.49]],
  [[.5,.63],[.39,.70],[.32,.83],[.23,.88]],
  [[.39,.70],[.23,.68],[.10,.73]],
  [[.5,.63],[.60,.75],[.56,.92]],
  [[.60,.75],[.74,.84],[.86,.83]],
];

function dendritePlot(context, width, height, compact, signals) {
  const colors = theme.dendrite;
  background(context, width, height, colors);
  if (signals) {
    const span = Math.min(width - 42, 600);
    const left = (width - span) / 2;
    const tracks = [
      ['电压', '#f5c78f', [[0,0],[.22,0],[.3,.12],[.36,1],[.41,-.14],[.50,.04],[.63,0],[1,0]]],
      ['钙信号', '#94dfd1', [[0,0],[.29,0],[.35,.18],[.46,.84],[.56,.72],[.7,.37],[.85,.13],[1,.04]]],
    ];
    tracks.forEach(([title, color, curve], index) => {
      const base = height * (.39 + .38 * index);
      line(context, left, base, left + span, base, colors.line);
      path(context, curve.map(([t, v]) => [left + span * t, base - height * .22 * v]), color, 2.2);
      label(context, title, left, base - 15, colors.light);
    });
    label(context, '时间', left + span, height * .88, colors.light, 'right');
    return;
  }
  const span = compact ? width * .93 : Math.min(width * .80, 550);
  const depth = height * .81;
  const x = (u) => (width - span) / 2 + u * span;
  const y = (v) => (height - depth) / 2 + v * depth;
  for (const branch of branches) {
    path(context, branch.map(([u, v]) => [x(u), y(v)]), '#92d8ca', compact ? 1.1 : 2);
  }
  dot(context, x(.5), y(.63), compact ? 4 : 8, '#cef3de');
  dot(context, x(.78), y(.09), compact ? 2 : 5, '#ffd29a');
  dot(context, x(.34), y(.34), compact ? 2 : 5, '#96c2ff');
  if (!compact) {
    label(context, '刺激位置', x(.78) + 9, y(.09) + 4, '#ffd29a');
    label(context, '记录位置', x(.34) - 9, y(.34) + 6, '#b0d0ff', 'right');
  }
}

function paint(canvas) {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;
  if (!width || !height) return;
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  const context = canvas.getContext('2d');
  context.scale(ratio, ratio);
  const [name, size] = canvas.dataset.plot.split('-');
  const compact = size === 'card';
  const alternative = canvas.dataset.mode === 'alternative';
  if (name === 'pet') {
    if (compact) petCover(context, width, height);
    else if (alternative) petIntervals(context, width, height);
    else petPair(context, width, height);
  }
  if (name === 'thermal') thermalPlot(context, width, height, compact, alternative);
  if (name === 'metabolism') metabolismPlot(context, width, height, compact, alternative);
  if (name === 'gel') gelPlot(context, width, height, compact, alternative);
  if (name === 'orbit') orbitPlot(context, width, height, compact, alternative);
  if (name === 'reactor') reactorPlot(context, width, height, compact, alternative);
  if (name === 'dendrite') dendritePlot(context, width, height, compact, alternative);
}

const observer = new ResizeObserver((entries) => {
  entries.forEach(({ target }) => paint(target));
});
document.querySelectorAll('canvas[data-plot]').forEach((canvas) => observer.observe(canvas));

document.querySelectorAll('.detail-figure').forEach((figure) => {
  const canvas = figure.querySelector('canvas');
  const caption = figure.querySelector('figcaption');
  const controls = [...figure.querySelectorAll('[data-mode]')];
  controls.forEach((button) => button.addEventListener('click', () => {
    controls.forEach((control) => control.setAttribute('aria-pressed', String(control === button)));
    canvas.dataset.mode = button.dataset.mode;
    canvas.setAttribute('aria-label', button.dataset.note);
    caption.textContent = button.dataset.note;
    paint(canvas);
  }));
});
