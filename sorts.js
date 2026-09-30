/* Shared sorting trace engine. This file runs in both the browser and Node. */
(function (root, factory) {
  const core = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
  if (root) root.SortCore = core;
})(typeof globalThis === 'undefined' ? this : globalThis, function () {
  const metadata = {
    bubble: { name: 'Bubble sort', family: 'COMPARISON', worst: 'O(n²)', space: 'O(1)', summary: 'Compare neighboring values and move the larger value one position to the right.', note: 'A pass carries the largest remaining value to the end of the unsorted range.', invariant: 'After pass <code>i</code>, the last <code>i</code> elements are in final position.', complexity: 'n²', advice: 'An already ordered array finishes after one pass.', metric: 'COMPARISONS', metricUnit: 'element pairs inspected', chart: 'COMPARISONS / PASS', passUnit: 'One left-to-right sweep over the unsorted prefix.', pseudo: ['<b>for</b> end = n − 1 <b>down to</b> 1', '<b>for</b> j = 0 <b>to</b> end − 1', '<b>compare</b> a[j], a[j + 1]', '<b>swap</b> if a[j] &gt; a[j + 1]', '<b>stop</b> if no swaps'] },
    selection: { name: 'Selection sort', family: 'COMPARISON', worst: 'O(n²)', space: 'O(1)', summary: 'Find the smallest value in the unsorted suffix and place it at the front.', note: 'One new minimum is selected on each pass; the sorted prefix only grows.', invariant: 'Before pass <code>i</code>, the first <code>i</code> values are in final position.', complexity: 'n²', advice: 'Selection sort performs at most <code>n − 1</code> swaps.', metric: 'COMPARISONS', metricUnit: 'element pairs inspected', chart: 'COMPARISONS / PASS', passUnit: 'One scan of the remaining unsorted suffix.', pseudo: ['<b>for</b> i = 0 <b>to</b> n − 2', 'min = i', '<b>for</b> j = i + 1 <b>to</b> n − 1', '<b>compare</b> a[j], a[min]', '<b>swap</b> a[i], a[min]'] },
    insertion: { name: 'Insertion sort', family: 'COMPARISON', worst: 'O(n²)', space: 'O(1)', summary: 'Grow a sorted prefix by shifting larger values and inserting the next key.', note: 'The key is held aside while larger values shift one position to the right.', invariant: 'Before iteration <code>i</code>, the prefix <code>a[0…i−1]</code> is ordered; its values are not all final.', complexity: 'n²', advice: 'Runs in <code>O(n)</code> time when the input is already ordered.', metric: 'COMPARISONS', metricUnit: 'element pairs inspected', chart: 'COMPARISONS / PASS', passUnit: 'One insertion of the next key into the ordered prefix.', pseudo: ['<b>for</b> i = 1 <b>to</b> n − 1', 'key = a[i]; j = i − 1', '<b>while</b> j ≥ 0 and a[j] &gt; key', 'a[j + 1] = a[j]; j--', 'a[j + 1] = key'] },
    merge: { name: 'Merge sort', family: 'COMPARISON', worst: 'O(n log n)', space: 'O(n)', summary: 'Merge sorted runs of increasing width until one ordered run covers the array.', note: 'Each merge writes the lower front value from its two already sorted runs.', invariant: 'At width <code>w</code>, every run of length at most <code>w</code> is sorted.', complexity: 'n log n', advice: 'Stable ordering; temporary storage grows linearly with input size.', metric: 'COMPARISONS', metricUnit: 'element pairs inspected', chart: 'COMPARISONS / PASS', passUnit: 'One full merge-width sweep across the array.', pseudo: ['<b>for</b> width = 1; width &lt; n; width ×= 2', '<b>for</b> each adjacent run pair', 'i = left; j = middle', '<b>compare</b> left[i], right[j]', '<b>write</b> smaller value to output'] },
    quick: { name: 'Quick sort', family: 'COMPARISON', worst: 'O(n²)', space: 'O(log n)', summary: 'Partition each range around a pivot, then sort the ranges on either side.', note: 'Values no greater than the pivot accumulate to its left during partition.', invariant: 'After partition, the pivot is in its final sorted position.', complexity: 'n log n', advice: 'The last-element pivot can degrade on already ordered input.', metric: 'COMPARISONS', metricUnit: 'element pairs inspected', chart: 'COMPARISONS / PARTITION', passUnit: 'One partition of a recursive subrange.', pseudo: ['<b>choose</b> pivot = a[high]', 'i = low − 1', '<b>for</b> j = low <b>to</b> high − 1', '<b>compare</b> a[j] with pivot', '<b>place</b> pivot at i + 1'] },
    heap: { name: 'Heap sort', family: 'COMPARISON', worst: 'O(n log n)', space: 'O(1)', summary: 'Build a max heap, then repeatedly move its root to the end.', note: 'Sifting restores the max-heap property after the root is removed.', invariant: 'The suffix after <code>end</code> is final; the prefix remains a max heap.', complexity: 'n log n', advice: 'In-place with a guaranteed <code>O(n log n)</code> comparison bound.', metric: 'COMPARISONS', metricUnit: 'element pairs inspected', chart: 'COMPARISONS / PASS', passUnit: 'Heap construction or one extract-and-sift operation.', pseudo: ['<b>build</b> max heap from bottom up', '<b>for</b> end = n − 1 <b>down to</b> 1', '<b>swap</b> root and a[end]', 'shrink heap to end', '<b>sift down</b> new root'] },
  };

  function createContext(input, key) {
    const values = [...input];
    const info = metadata[key];
    const events = [];
    let operations = 0, writes = 0, progress = 0, passOps = [], held = null, region = null;
    let touchedMask = 0n, sortedMask = 0n;
    const emit = (type, indices = [], line = 1, message = '', detail = {}) => {
      events.push({ type, indices, line, message, operations, writes, progress,
        passOps: [...passOps], touchedMask, sortedMask, held, region, ...detail });
    };
    const begin = () => { progress++; passOps.push(0); };
    const close = message => emit('pass', [], 2, message);
    const touch = indices => indices.forEach(i => { if (i >= 0 && i < values.length) touchedMask |= 1n << BigInt(i); });
    const compare = (i, j, line = 3, message) => {
      touch([i, j]); operations++; if (!passOps.length) begin(); passOps[passOps.length - 1]++;
      emit('compare', [i, j], line, message || `Compared a[${i}] with a[${j}].`);
      return values[i] - values[j];
    };
    const compareValue = (index, value, line = 3, message) => {
      touch([index]); operations++; if (!passOps.length) begin(); passOps[passOps.length - 1]++;
      emit('compare', [index], line, message || `Compared a[${index}] with ${value}.`);
      return values[index] - value;
    };
    const compareValues = (x, y, indexA, indexB, line = 4, message) => {
      touch([indexA, indexB]); operations++; if (!passOps.length) begin(); passOps[passOps.length - 1]++;
      emit('compare', [indexA, indexB], line, message || `Compared ${x} with ${y}.`);
      return x - y;
    };
    const hold = (index, value) => { held = { index, value }; touch([index]); emit('hold', [index], 2, `Held ${value} from a[${index}] while finding its position.`); };
    const release = () => { held = null; emit('release', [], 5, 'Placed the held key into its gap.'); };
    const setRegion = bounds => { region = bounds; emit('region', [], 2, 'Merge run boundaries updated.'); };
    const write = (index, value, line = 4) => {
      values[index] = value; writes++; touch([index]);
      emit('write', [index], line, `Wrote ${value} to a[${index}].`, { snapshot: [...values] });
    };
    const swap = (i, j, line = 4) => {
      if (i === j) return;
      [values[i], values[j]] = [values[j], values[i]]; writes += 2; touch([i, j]);
      emit('swap', [i, j], line, `Swapped a[${i}] and a[${j}].`, { snapshot: [...values] });
    };
    const mark = (indices, message) => {
      indices.forEach(i => { if (i >= 0 && i < values.length) sortedMask |= 1n << BigInt(i); });
      emit('mark', indices, 2, message);
    };
    const pivot = (index, value) => emit('pivot', [index], 1, `Pivot is a[${index}] = ${value}.`, { pivotValue: value });
    const finishPass = message => close(message);
    const complete = () => {
      sortedMask = (1n << BigInt(values.length)) - 1n;
      emit('done', [], 5, `${info.name} finished: ${operations} ${info.metric.toLowerCase()}, ${writes} writes.`);
    };
    emit('start', [], 1, `${info.name} initialized.`);
    return { values, events, begin, compare, compareValue, compareValues, write, swap, mark, pivot, hold, release, setRegion, finishPass, complete };
  }

  function bubbleSort(c) {
    const a = c.values;
    for (let end = a.length - 1; end > 0; end--) {
      c.begin(); let changed = false;
      for (let j = 0; j < end; j++) {
        if (c.compare(j, j + 1, 3, `Compared a[${j}] with a[${j + 1}]: ${a[j] > a[j + 1] ? 'swapping' : 'in order'}.`) > 0) { c.swap(j, j + 1, 4); changed = true; }
      }
      c.mark([end], `a[${end}] is in final position.`); c.finishPass(`Pass ${end}: position ${end} is fixed.`);
      if (!changed) break;
    }
  }
  function selectionSort(c) {
    const a = c.values;
    for (let i = 0; i < a.length - 1; i++) {
      c.begin(); let min = i;
      for (let j = i + 1; j < a.length; j++) if (c.compare(j, min, 4) < 0) min = j;
      c.swap(i, min, 5); c.mark([i], `Selected minimum ${a[i]} for position ${i}.`); c.finishPass(`Pass ${i + 1}: minimum placed at index ${i}.`);
    }
  }
  function insertionSort(c) {
    const a = c.values;
    for (let i = 1; i < a.length; i++) {
      c.begin(); const key = a[i]; c.hold(i, key); let j = i - 1;
      while (j >= 0 && c.compareValue(j, key, 3, `Compared a[${j}] with insertion key ${key}.`) > 0) { c.write(j + 1, a[j], 4); j--; }
      c.write(j + 1, key, 5); c.release(); c.finishPass(`Pass ${i}: inserted the key; prefix through ${i} is ordered.`);
    }
  }
  function mergeSort(c) {
    const a = c.values;
    for (let width = 1; width < a.length; width *= 2) {
      c.begin();
      for (let left = 0; left < a.length; left += 2 * width) {
        const mid = Math.min(left + width, a.length), right = Math.min(left + 2 * width, a.length);
        const l = a.slice(left, mid), r = a.slice(mid, right); let i = 0, j = 0, k = left; c.setRegion({ left, mid, right });
        while (i < l.length && j < r.length) {
          if (c.compareValues(l[i], r[j], left + i, mid + j, 4, `Compared left run ${l[i]} with right run ${r[j]}.`) <= 0) c.write(k++, l[i++], 5);
          else c.write(k++, r[j++], 5);
        }
        while (i < l.length) c.write(k++, l[i++], 5);
        while (j < r.length) c.write(k++, r[j++], 5);
      }
      c.finishPass(`Pass ${width}: merged runs of width ${width}.`);
    }
  }
  function quickSort(c) {
    const a = c.values;
    function partition(lo, hi) {
      c.begin(); const value = a[hi]; c.pivot(hi, value); let i = lo - 1;
      for (let j = lo; j < hi; j++) if (c.compareValue(j, value, 4, `Compared a[${j}] with pivot ${value}.`) <= 0) { i++; c.swap(i, j, 3); }
      c.swap(i + 1, hi, 5); c.mark([i + 1], `Pivot ${value} settled at index ${i + 1}.`); c.finishPass(`Partitioned indices ${lo}–${hi}.`); return i + 1;
    }
    function sort(lo, hi) { if (lo < hi) { const p = partition(lo, hi); sort(lo, p - 1); sort(p + 1, hi); } }
    sort(0, a.length - 1);
  }
  function heapSort(c) {
    const a = c.values;
    function sift(root, size) {
      while (true) {
        let largest = root, left = 2 * root + 1, right = left + 1;
        if (left < size && c.compare(left, largest, 5) > 0) largest = left;
        if (right < size && c.compare(right, largest, 5) > 0) largest = right;
        if (largest === root) break; c.swap(root, largest, 5); root = largest;
      }
    }
    c.begin(); for (let i = Math.floor(a.length / 2) - 1; i >= 0; i--) sift(i, a.length); c.finishPass('Max heap built.');
    for (let end = a.length - 1; end > 0; end--) { c.begin(); c.swap(0, end, 3); c.mark([end], `Maximum fixed at index ${end}.`); sift(0, end); c.finishPass(`Heap restored with ${end} values.`); }
  }
  const implementations = { bubble: bubbleSort, selection: selectionSort, insertion: insertionSort, merge: mergeSort, quick: quickSort, heap: heapSort };
  function finalValues(events, input) {
    for (let i = events.length - 1; i >= 0; i--) if (events[i].snapshot) return events[i].snapshot;
    return input;
  }
  function buildEvents(input, key) {
    const c = createContext(input, key);
    implementations[key](c); c.complete();
    const result = finalValues(c.events, input);
    const sorted = result.every((value, i) => i === 0 || result[i - 1] <= value);
    const remaining = new Map(); input.forEach(v => remaining.set(v, (remaining.get(v) || 0) + 1));
    result.forEach(v => remaining.set(v, (remaining.get(v) || 0) - 1));
    const permutation = [...remaining.values()].every(n => n === 0);
    if (!sorted || !permutation) console.error(`[Sort Lab] ${metadata[key].name} self-check failed`, { input, result, sorted, permutation });
    return c.events;
  }
  return { metadata, implementations, buildEvents, keys: Object.keys(metadata) };
});
