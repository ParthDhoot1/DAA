(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const { metadata, keys, buildEvents } = window.SortCore;
  const initialValues = [42, 18, 68, 31, 86, 55, 24, 75, 48, 93, 37, 62, 12, 81, 29, 57];
  const speeds = [0.5, 1, 2, 4, 8, 16];
  const bars = [];
  const indexLabels = [];
  let input = [...initialValues];
  let preset = 'random';
  let algorithm = 'bubble';
  let events = [];
  let cursor = 0;
  let timer = null;
  let speedIndex = 1;

  function randomValues(size) {
    return Array.from({ length: size }, () => 10 + Math.floor(Math.random() * 90));
  }

  function makePreset(size, type) {
    const values = randomValues(size);
    if (type === 'sorted') return values.sort((a, b) => a - b);
    if (type === 'reversed') return values.sort((a, b) => b - a);
    if (type === 'nearly') {
      values.sort((a, b) => a - b);
      for (let i = 0; i < Math.max(1, Math.floor(size / 8)); i++) {
        const a = Math.floor(Math.random() * size), b = Math.floor(Math.random() * size);
        [values[a], values[b]] = [values[b], values[a]];
      }
      return values;
    }
    if (type === 'few') {
      const choices = [15, 35, 55, 75, 95];
      return values.map(() => choices[Math.floor(Math.random() * choices.length)]);
    }
    return values;
  }

  function resizePreset(size) {
    const values = input.slice(0, size);
    while (values.length < size) {
      if (preset === 'few' && input.length) {
        const unique = [...new Set(input)];
        values.push(unique[Math.floor(Math.random() * unique.length)]);
      } else if (preset === 'sorted' && values.length) {
        values.push(Math.min(99, values.at(-1) + 1 + Math.floor(Math.random() * 4)));
      } else if (preset === 'reversed' && values.length) {
        values.push(Math.max(1, values.at(-1) - 1 - Math.floor(Math.random() * 4)));
      } else if (preset === 'nearly' && values.length) {
        values.push(Math.min(99, Math.max(...values) + 1 + Math.floor(Math.random() * 4)));
      } else {
        values.push(10 + Math.floor(Math.random() * 90));
      }
    }
    if (preset === 'sorted') values.sort((a, b) => a - b);
    if (preset === 'reversed') values.sort((a, b) => b - a);
    return values;
  }

  function currentState(index) {
    for (let i = index; i >= 0; i--) {
      if (events[i]?.snapshot) return events[i].snapshot;
    }
    return input;
  }

  function latestDetail(index, key) {
    return events[index]?.[key] ?? null;
  }

  function makeTrace() {
    stopPlayback();
    cursor = 0;
    events = buildEvents(input, algorithm);
    $('traceRange').max = String(events.length - 1);
    render();
  }

  function setInput(values) {
    input = values;
    makeTrace();
  }

  function ensureBars(size) {
    if (bars.length === size) return;
    $('bars').replaceChildren();
    $('barIndices').replaceChildren();
    bars.length = 0;
    indexLabels.length = 0;
    for (let i = 0; i < size; i++) {
      const bar = document.createElement('div');
      bar.className = 'bar';
      const value = document.createElement('span');
      value.className = 'bar-value';
      bar.append(value);
      $('bars').append(bar);
      bars.push(bar);

      const label = document.createElement('span');
      label.className = 'bar-index';
      label.textContent = String(i).padStart(2, '0');
      $('barIndices').append(label);
      indexLabels.push(label);
    }
  }

  function renderPseudo() {
    const info = metadata[algorithm];
    $('procedureNumber').textContent = String(keys.indexOf(algorithm) + 1).padStart(2, '0');
    $('algorithmFamily').textContent = info.family;
    $('algorithmTitle').innerHTML = `${info.name}<span class="title-period">.</span>`;
    $('algorithmSummary').textContent = info.summary;
    $('worstComplexity').textContent = info.worst;
    $('spaceComplexity').textContent = info.space;
    $('algorithmNote').textContent = info.note;
    $('algorithmInvariant').innerHTML = info.invariant;
    $('complexityValue').textContent = info.complexity;
    $('complexityNote').innerHTML = info.advice;
    $('comparisonLabel').textContent = info.metric;
    $('metricUnit').textContent = info.metricUnit;
    $('chartMetric').textContent = info.chart;
    $('progressLabel').textContent = info.progressLabel || 'PASSES';
    $('passDefinition').textContent = info.passUnit;
    $('codeBlock').innerHTML = info.pseudo.map((line, i) =>
      `<div class="code-line" data-line="${i + 1}"><span class="line-number">${String(i + 1).padStart(2, '0')}</span><code>${line}</code></div>`
    ).join('');
  }

  function renderBoundaries() {
    const host = $('runBoundaries');
    const region = latestDetail(cursor, 'region');
    host.replaceChildren();
    host.removeAttribute('data-label');
    if (algorithm !== 'merge' || !region) return;
    const left = 53, usable = host.parentElement.clientWidth - 72;
    [region.left, region.mid, region.right].forEach((boundary, i) => {
      const marker = document.createElement('span');
      marker.className = `run-boundary boundary-${i}`;
      marker.style.left = `${left + usable * boundary / input.length}px`;
      host.append(marker);
    });
    host.dataset.label = `RUNS ${region.left}–${region.mid} · ${region.mid}–${region.right}`;
  }

  function renderChart(event) {
    const values = event?.passOps || [];
    const peak = Math.max(1, ...values);
    const points = values.map((value, i) => `${28 + (values.length === 1 ? 0 : i * 216 / Math.max(1, values.length - 1))},${85 - value / peak * 70}`);
    $('chartLine').setAttribute('points', points.join(' '));
    $('miniChart').setAttribute('aria-label', `${metadata[algorithm].chart.toLowerCase()}: ${values.join(', ') || 'no measurements yet'}`);
    $('chartDots').innerHTML = points.map(point => {
      const [x, y] = point.split(',');
      return `<circle cx="${x}" cy="${y}" r="2.5"/>`;
    }).join('');
    $('chartEmpty').style.display = values.length ? 'none' : 'block';
    const labels = document.querySelectorAll('.chart-labels text');
    if (labels.length >= 3) {
      labels[0].textContent = peak;
      labels[1].textContent = Math.ceil(peak / 2);
      labels[2].textContent = '0';
    }
    $('chartFirstPass').textContent = values.length ? 'P01' : '';
    $('chartLastPass').textContent = values.length ? `P${String(values.length).padStart(2, '0')}` : '';
  }

  function render() {
    const event = events[cursor];
    const values = currentState(cursor);
    const info = metadata[algorithm];
    const size = values.length;
    const max = Math.max(...values);
    const showValues = size <= 20 && !matchMedia('(max-width: 560px)').matches;
    const touched = event?.touchedMask || 0n;
    const sorted = event?.sortedMask || 0n;
    const active = new Set(event?.indices || []);
    const held = latestDetail(cursor, 'held');
    ensureBars(size);

    bars.forEach((bar, i) => {
      const bit = 1n << BigInt(i);
      const isActive = active.has(i);
      bar.className = 'bar';
      if (sorted & bit) bar.classList.add('sorted');
      else if (!(touched & bit)) bar.classList.add('untouched');
      if (isActive) {
        if (event.type === 'compare') bar.classList.add('compare');
        if (event.type === 'swap' || event.type === 'write') bar.classList.add('swap');
        if (event.type === 'pivot' || event.type === 'inspect' || event.type === 'hold') bar.classList.add('inspect');
        if (event.type === 'mark') bar.classList.add('sorted');
      }
      if (held && held.index === i) bar.classList.add('held-source');
      bar.style.setProperty('--height', `${Math.max(8, values[i] / max * 78)}%`);
      bar.title = `a[${i}] = ${values[i]}`;
      bar.setAttribute('aria-hidden', 'true');
      const valueLabel = bar.firstElementChild;
      valueLabel.textContent = values[i];
      bar.classList.toggle('show-value', showValues);
    });

    $('bars').setAttribute('aria-label', `Array of ${size} values: ${values.join(', ')}`);
    $('bars').classList.toggle('dense', !showValues);
    $('arrayMeta').textContent = `${size} ELEMENTS`;
    $('sizeLabel').textContent = size;
    $('sizeRange').value = size;
    $('comparisonCount').textContent = String(event?.operations || 0).padStart(2, '0');
    $('swapCount').textContent = String(event?.writes || 0).padStart(2, '0');
    $('passCount').textContent = String(event?.progress || 0).padStart(2, '0');
    $('stepNumber').textContent = String(cursor).padStart(3, '0');
    $('scrubStep').textContent = String(cursor).padStart(3, '0');
    $('traceRange').value = cursor;
    $('totalSteps').textContent = String(events.length - 1).padStart(3, '0');
    $('statusText').textContent = event?.type === 'done' ? 'COMPLETE' : timer ? 'TRACING' : event?.type === 'start' ? 'READY' : 'PAUSED';
    $('statusDetail').textContent = event?.message || 'Waiting for a trace';
    $('lineStatus').textContent = `LINE ${event ? String(event.line).padStart(2, '0') : '—'}`;
    $('statusLed').classList.toggle('busy', Boolean(timer));
    $('arrayState').textContent = event?.type === 'done' ? 'SORTED' : cursor ? 'IN PROGRESS' : 'NOT STARTED';
    $('arrayState').className = `state-label ${event?.type === 'done' ? 'complete' : cursor ? 'running' : ''}`;
    document.querySelectorAll('.code-line').forEach(line => line.classList.toggle('active', Number(line.dataset.line) === event?.line));
    $('chartCallout').textContent = event?.message || 'Ready to trace';
    $('playLabel').textContent = timer ? 'Pause trace' : cursor === events.length - 1 ? 'Replay trace' : 'Run trace';
    $('playIcon').innerHTML = timer ? '<path d="M5 4h4v12H5zM11 4h4v12h-4z"/>' : '<path d="m6 4 10 6-10 6z"/>';
    renderChart(event);
    renderBoundaries();
    renderHeld(held, size);
  }

  function renderHeld(held, size) {
    const display = $('keyFloat');
    display.hidden = !held;
    if (held) {
      display.textContent = `KEY ${held.value}`;
      display.style.left = `${5 + 90 * (held.index + 0.5) / size}%`;
    }
  }

  function stopPlayback() {
    if (timer !== null) clearInterval(timer);
    timer = null;
  }

  function stepForward() {
    if (cursor < events.length - 1) cursor++;
    render();
  }

  function playPause() {
    if (timer !== null) {
      stopPlayback();
      render();
      return;
    }
    if (cursor >= events.length - 1) cursor = 0;
    timer = setInterval(() => {
      if (cursor >= events.length - 1) stopPlayback();
      else cursor++;
      render();
    }, 1000 / speeds[speedIndex]);
    render();
  }

  function skipToNextPass() {
    stopPlayback();
    const progress = events[cursor]?.progress || 0;
    let next = cursor + 1;
    while (next < events.length - 1 && (events[next].progress || 0) === progress) next++;
    cursor = Math.min(next, events.length - 1);
    render();
  }

  function setTheme(dark) {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    $('themeToggle').setAttribute('aria-pressed', String(dark));
    $('themeToggle').setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
    $('themeColorMeta').content = dark ? '#121412' : '#f4f1ea';
    try { localStorage.setItem('sortlab-theme', dark ? 'dark' : 'light'); } catch (_) { /* Storage can be disabled in private or embedded contexts. */ }
  }

  keys.forEach((key, index) => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = `${String(index + 1).padStart(2, '0')}  ${metadata[key].name}`;
    $('algorithmSelect').append(option);
  });
  $('algorithmSelect').addEventListener('change', event => {
    algorithm = event.target.value;
    renderPseudo();
    makeTrace();
  });
  $('presetSelect').addEventListener('change', event => {
    preset = event.target.value;
    setInput(makePreset(input.length, preset));
  });
  $('shuffleBtn').addEventListener('click', () => setInput(makePreset(input.length, preset)));
  $('sizeRange').addEventListener('input', event => setInput(resizePreset(Number(event.target.value))));
  $('playBtn').addEventListener('click', playPause);
  $('nextBtn').addEventListener('click', () => { stopPlayback(); stepForward(); });
  $('prevBtn').addEventListener('click', () => { stopPlayback(); cursor = Math.max(0, cursor - 1); render(); });
  $('nextPassBtn').addEventListener('click', skipToNextPass);
  $('endBtn').addEventListener('click', () => { stopPlayback(); cursor = events.length - 1; render(); });
  $('resetBtn').addEventListener('click', () => { stopPlayback(); cursor = 0; render(); });
  $('traceRange').addEventListener('input', event => { stopPlayback(); cursor = Number(event.target.value); render(); });
  $('speedBtn').addEventListener('click', () => {
    speedIndex = (speedIndex + 1) % speeds.length;
    $('speedBtn').firstChild.textContent = `${speeds[speedIndex]}× `;
    if (timer !== null) { stopPlayback(); playPause(); }
  });
  $('themeToggle').addEventListener('click', () => setTheme(document.documentElement.dataset.theme !== 'dark'));
  window.addEventListener('resize', render);
  document.addEventListener('keydown', event => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target.closest('input, select, textarea, button, [contenteditable="true"]')) return;
    if (event.code === 'Space') { event.preventDefault(); playPause(); }
    else if (event.key === 'ArrowRight') { stopPlayback(); stepForward(); }
    else if (event.key === 'ArrowLeft') { stopPlayback(); cursor = Math.max(0, cursor - 1); render(); }
    else if (event.key === 'Home' || (event.key.toLowerCase() === 'r' && event.shiftKey)) { stopPlayback(); cursor = 0; render(); }
    else if (event.key.toLowerCase() === 'r') setInput(makePreset(input.length, preset));
  });

  renderPseudo();
  makeTrace();
  const dark = document.documentElement.dataset.theme === 'dark';
  $('themeColorMeta').content = dark ? '#121412' : '#f4f1ea';
  $('themeToggle').setAttribute('aria-pressed', String(dark));
  $('themeToggle').setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
})();
