// Deterministic "brick wall" packing for the Engineering Stack.
//
// A pure function of the normalized technologies data: it knows no skill names, category names or counts. Each skill is
// given a width demand from the length of its name, skills are packed in their given order into rows that fill the grid
// exactly, the spare columns are shared in proportion to demand, and neighbouring rows are nudged so their seams do not
// line up. The same data always produces the same layout. Spans are produced for the three grids the stylesheet switches
// between (12, 7 and 2 columns), so no layout work happens in the browser at resize time.

export type StackGroup = {
  readonly label: string;
  readonly items: readonly { readonly name: string; readonly usedIn: string }[];
};
export type StackSpans = { readonly lg: number; readonly md: number; readonly sm: number };
export type StackTile = {
  readonly index: number;
  readonly name: string;
  readonly category: string;
  readonly usedIn: string;
  /** Position within its row for the large grid; used only to stagger the entrance. */
  readonly column: number;
  readonly spans: StackSpans;
};

type Grid = { readonly columns: number; readonly min: number; readonly demand: (name: string) => number };

export const stackGrids: Record<keyof StackSpans, Grid> = {
  lg: { columns: 12, min: 2, demand: (name) => (name.length <= 7 ? 2 : name.length <= 12 ? 3 : name.length <= 18 ? 4 : 5) },
  // 7 columns: three 2-column tiles leave one spare column, which is what lets neighbouring rows offset their seams.
  md: { columns: 7, min: 2, demand: (name) => (name.length <= 9 ? 2 : name.length <= 15 ? 3 : 4) },
  sm: { columns: 2, min: 1, demand: (name) => (name.length <= 11 ? 1 : 2) },
};

const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0);

/** Splits names into rows whose demands fit the grid, avoiding a lonely short final row. */
function pack(demands: readonly number[], columns: number): number[][] {
  const rows: number[][] = [];
  let row: number[] = [];
  demands.forEach((demand, index) => {
    if (row.length && sum(row.map((member) => demands[member])) + demand > columns) {
      rows.push(row);
      row = [];
    }
    row.push(index);
  });
  if (row.length) rows.push(row);
  const last = rows[rows.length - 1];
  const previous = rows[rows.length - 2];
  if (last && previous && previous.length >= 3 && sum(last.map((member) => demands[member])) * 3 <= columns) {
    last.unshift(previous.pop() as number);
  }
  return rows;
}

/** Shares the columns of a row among its tiles in proportion to demand (largest remainder, ties by position). */
function share(demands: readonly number[], columns: number): number[] {
  const total = sum(demands);
  const exact = demands.map((demand) => (demand * columns) / total);
  const spans = exact.map(Math.floor);
  let spare = columns - sum(spans);
  [...exact.keys()]
    .sort((a, b) => (exact[b] - Math.floor(exact[b])) - (exact[a] - Math.floor(exact[a])) || a - b)
    .forEach((index) => { if (spare > 0) { spans[index] += 1; spare -= 1; } });
  return spans;
}

const seams = (spans: readonly number[]) => spans.slice(0, -1).map((_, index) => sum(spans.slice(0, index + 1)));

/**
 * Moves a seam that lines up with the row above by one column so the seams of neighbouring rows are offset, as in
 * brickwork. A tile may give up at most one column of its preferred width (never below the grid minimum), which every
 * demand tier leaves room for.
 */
function stagger(spans: number[], floors: readonly number[], above: readonly number[] | null): void {
  if (!above) return;
  const clashes = (candidate: readonly number[]) => seams(candidate).filter((position) => above.includes(position)).length;
  for (let pass = 0, improved = true; improved && pass < spans.length; pass += 1) {
    improved = false;
    for (let seam = 0; seam < spans.length - 1; seam += 1) {
      for (const shift of [1, -1]) {
        if (spans[seam] + shift < floors[seam] || spans[seam + 1] - shift < floors[seam + 1]) continue;
        const candidate = [...spans];
        candidate[seam] += shift;
        candidate[seam + 1] -= shift;
        if (clashes(candidate) >= clashes(spans)) continue;
        spans[seam] = candidate[seam];
        spans[seam + 1] = candidate[seam + 1];
        improved = true;
        break;
      }
    }
  }
}

function spansFor(names: readonly string[], grid: Grid): { spans: number[]; column: number[] } {
  const demands = names.map(grid.demand);
  const spans = new Array<number>(names.length).fill(1);
  const column = new Array<number>(names.length).fill(0);
  let above: number[] | null = null;
  pack(demands, grid.columns).forEach((row) => {
    const rowDemands = row.map((member) => demands[member]);
    const rowSpans = share(rowDemands, grid.columns);
    stagger(rowSpans, rowDemands.map((demand) => Math.max(grid.min, demand - 1)), above);
    row.forEach((member, position) => { spans[member] = rowSpans[position]; column[member] = position; });
    above = seams(rowSpans);
  });
  return { spans, column };
}

export function layoutStackTiles(groups: readonly StackGroup[]): StackTile[] {
  const flat = groups.flatMap((group) => group.items.map((item) => ({ name: item.name, category: group.label, usedIn: item.usedIn })));
  const names = flat.map((item) => item.name);
  const lg = spansFor(names, stackGrids.lg);
  const md = spansFor(names, stackGrids.md);
  const sm = spansFor(names, stackGrids.sm);
  return flat.map((item, index) => ({
    index, ...item, column: lg.column[index],
    spans: { lg: lg.spans[index], md: md.spans[index], sm: sm.spans[index] },
  }));
}
