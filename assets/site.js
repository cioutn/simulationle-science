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
