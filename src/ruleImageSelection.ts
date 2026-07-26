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

export interface CandidatePairValue {
  outputColumn: string;
  cell: string;
}

export interface RowSelectionPairResult {
  pairs: CandidatePairValue[];
  missingOutputRowIndexes: number[];
  duplicateOutputRowIndexes: number[];
  suffixColumnIndexes: number[];
  missingSuffixColumnIndexes: number[];
  duplicateSuffixes: string[];
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

export function toggleSingleCellPerRow(
  selected: ReadonlySet<string>,
  cellId: string,
  cells: SelectableCell[],
): Set<string> {
  const target = cells.find(({ id }) => id === cellId);
  if (!target) return new Set(selected);
  const next = new Set(selected);
  if (next.has(cellId)) {
    next.delete(cellId);
    return next;
  }
  for (const cell of cells) {
    if (cell.rowIndex === target.rowIndex) next.delete(cell.id);
  }
  next.add(cellId);
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

export function toggleCellRange(
  cells: SelectableCell[],
  selected: ReadonlySet<string>,
  startId: string,
  endId: string,
): Set<string> {
  const range = selectCellRange(cells, startId, endId);
  const shouldInvert = [...range].some((cellId) => selected.has(cellId));
  const next = new Set(selected);
  for (const cellId of range) {
    if (shouldInvert && next.has(cellId)) next.delete(cellId);
    else next.add(cellId);
  }
  return next;
}

export function selectSingleColumnRange(
  cells: SelectableCell[],
  startId: string,
  endId: string,
): Set<string> {
  const start = cells.find(({ id }) => id === startId);
  const end = cells.find(({ id }) => id === endId);
  if (!start || !end) return new Set();
  const minRow = Math.min(start.rowIndex, end.rowIndex);
  const maxRow = Math.max(start.rowIndex, end.rowIndex);
  return new Set(
    sortCells(cells.filter(({ rowIndex, columnIndex }) => (
      rowIndex >= minRow
      && rowIndex <= maxRow
      && columnIndex === start.columnIndex
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
  const pairCount = Math.min(outputCells.length, dataCells.length);
  return fillCandidatePairValues(
    sourceRows,
    activeId,
    Array.from({ length: pairCount }, (_, index) => ({
      outputColumn: outputCells[index].text,
      cell: dataCells[index].address,
    })),
    overwrite,
  );
}

export function fillCandidatePairValues(
  sourceRows: CandidateRuleRow[],
  activeId: string,
  pairs: CandidatePairValue[],
  overwrite = false,
): FillCandidateResult {
  const rows = sourceRows.map((row) => ({ ...row }));
  let cursor = Math.max(0, rows.findIndex(({ id }) => id === activeId));
  let filled = 0;
  for (const pair of pairs) {
    while (
      cursor < rows.length
      && !overwrite
      && (rows[cursor].outputColumn.trim() || rows[cursor].cell.trim())
    ) cursor += 1;
    if (cursor >= rows.length) rows.push(createCandidateRuleRow());
    rows[cursor].outputColumn = pair.outputColumn.trim();
    rows[cursor].cell = pair.cell.toUpperCase();
    cursor += 1;
    filled += 1;
  }
  return { rows, filled };
}

export function buildRowSelectionPairs(
  outputCells: SelectableCell[],
  dataCells: SelectableCell[],
  columnSuffixes: Readonly<Record<number, string>>,
): RowSelectionPairResult {
  const sortedOutputs = sortCells(outputCells);
  const sortedData = sortCells(dataCells);
  const outputByRow = new Map<number, SelectableCell[]>();
  for (const cell of sortedOutputs) {
    const row = outputByRow.get(cell.rowIndex) ?? [];
    row.push(cell);
    outputByRow.set(cell.rowIndex, row);
  }
  const dataByRow = new Map<number, SelectableCell[]>();
  for (const cell of sortedData) {
    const row = dataByRow.get(cell.rowIndex) ?? [];
    row.push(cell);
    dataByRow.set(cell.rowIndex, row);
  }

  const missingOutputRowIndexes = [...dataByRow.keys()]
    .filter((rowIndex) => (outputByRow.get(rowIndex)?.length ?? 0) === 0)
    .sort((left, right) => left - right);
  const duplicateOutputRowIndexes = [...dataByRow.keys()]
    .filter((rowIndex) => (outputByRow.get(rowIndex)?.length ?? 0) > 1)
    .sort((left, right) => left - right);
  const suffixColumnIndexes = [...new Set(
    [...dataByRow.values()]
      .filter((row) => row.length > 1)
      .flatMap((row) => row.map(({ columnIndex }) => columnIndex)),
  )].sort((left, right) => left - right);
  const missingSuffixColumnIndexes = suffixColumnIndexes.filter(
    (columnIndex) => !columnSuffixes[columnIndex]?.trim(),
  );
  const suffixCounts = new Map<string, number>();
  for (const columnIndex of suffixColumnIndexes) {
    const suffix = columnSuffixes[columnIndex]?.trim();
    if (suffix) suffixCounts.set(suffix, (suffixCounts.get(suffix) ?? 0) + 1);
  }
  const duplicateSuffixes = [...suffixCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([suffix]) => suffix);

  const pairs = sortedData.flatMap((dataCell) => {
    const outputCellsForRow = outputByRow.get(dataCell.rowIndex) ?? [];
    if (outputCellsForRow.length !== 1) return [];
    const rowHasMultipleTargets = (dataByRow.get(dataCell.rowIndex)?.length ?? 0) > 1;
    const suffix = rowHasMultipleTargets ? columnSuffixes[dataCell.columnIndex]?.trim() ?? "" : "";
    return [{
      outputColumn: `${outputCellsForRow[0].text.trim()}${suffix}`,
      cell: dataCell.address.toUpperCase(),
    }];
  });

  return {
    pairs,
    missingOutputRowIndexes,
    duplicateOutputRowIndexes,
    suffixColumnIndexes,
    missingSuffixColumnIndexes,
    duplicateSuffixes,
  };
}

function sortCells<T extends Pick<SelectableCell, "rowIndex" | "columnIndex">>(cells: T[]): T[] {
  return [...cells].sort(
    (left, right) => left.rowIndex - right.rowIndex || left.columnIndex - right.columnIndex,
  );
}
