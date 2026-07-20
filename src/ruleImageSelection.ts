export interface SelectableCell {
  id: string;
  rowIndex: number;
  columnIndex: number;
  text: string;
  address: string;
}

export interface CandidateRuleRow {
  id: string;
  outputColumn: string;
  cell: string;
}

export interface FillCandidateResult {
  rows: CandidateRuleRow[];
  filled: number;
}

let candidateSequence = 0;

export function createCandidateRuleRow(): CandidateRuleRow {
  candidateSequence += 1;
  return { id: `candidate-${candidateSequence}`, outputColumn: "", cell: "" };
}

export function toggleCellSelection(selected: ReadonlySet<string>, cellId: string): Set<string> {
  const next = new Set(selected);
  if (next.has(cellId)) next.delete(cellId);
  else next.add(cellId);
  return next;
}

export function selectCellRange(
  cells: SelectableCell[],
  startId: string,
  endId: string,
): Set<string> {
  const start = cells.find(({ id }) => id === startId);
  const end = cells.find(({ id }) => id === endId);
  if (!start || !end) return new Set();
  const minRow = Math.min(start.rowIndex, end.rowIndex);
  const maxRow = Math.max(start.rowIndex, end.rowIndex);
  const minColumn = Math.min(start.columnIndex, end.columnIndex);
  const maxColumn = Math.max(start.columnIndex, end.columnIndex);
  return new Set(
    sortCells(cells.filter(({ rowIndex, columnIndex }) => (
      rowIndex >= minRow
      && rowIndex <= maxRow
      && columnIndex >= minColumn
      && columnIndex <= maxColumn
    ))).map(({ id }) => id),
  );
}

export function getSelectedCells(
  cells: SelectableCell[],
  selected: ReadonlySet<string>,
): SelectableCell[] {
  return sortCells(cells.filter(({ id }) => selected.has(id)));
}

export function fillCandidateValues(
  sourceRows: CandidateRuleRow[],
  activeId: string,
  values: string[],
  field: "outputColumn" | "cell",
  overwrite = false,
): FillCandidateResult {
  const rows = sourceRows.map((row) => ({ ...row }));
  let cursor = Math.max(0, rows.findIndex(({ id }) => id === activeId));
  let filled = 0;
  for (const value of values) {
    while (cursor < rows.length && !overwrite && rows[cursor][field].trim()) cursor += 1;
    if (cursor >= rows.length) rows.push(createCandidateRuleRow());
    rows[cursor][field] = value.trim();
    cursor += 1;
    filled += 1;
  }
  return { rows, filled };
}

export function fillCandidatePairs(
  sourceRows: CandidateRuleRow[],
  activeId: string,
  outputCells: SelectableCell[],
  dataCells: SelectableCell[],
  overwrite = false,
): FillCandidateResult {
  const rows = sourceRows.map((row) => ({ ...row }));
  const pairs = Math.min(outputCells.length, dataCells.length);
  let cursor = Math.max(0, rows.findIndex(({ id }) => id === activeId));
  let filled = 0;
  for (let index = 0; index < pairs; index += 1) {
    while (
      cursor < rows.length
      && !overwrite
      && (rows[cursor].outputColumn.trim() || rows[cursor].cell.trim())
    ) cursor += 1;
    if (cursor >= rows.length) rows.push(createCandidateRuleRow());
    rows[cursor].outputColumn = outputCells[index].text.trim();
    rows[cursor].cell = dataCells[index].address.toUpperCase();
    cursor += 1;
    filled += 1;
  }
  return { rows, filled };
}

function sortCells<T extends Pick<SelectableCell, "rowIndex" | "columnIndex">>(cells: T[]): T[] {
  return [...cells].sort(
    (left, right) => left.rowIndex - right.rowIndex || left.columnIndex - right.columnIndex,
  );
}
