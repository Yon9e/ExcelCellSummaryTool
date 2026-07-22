const BASE_SECONDS_PER_FILE = 0.18;
const SECONDS_PER_RULE = 0.035;

export function estimateSummarySeconds(totalFiles: number, ruleCount: number): number {
  if (totalFiles <= 0) return 0;
  const secondsPerFile = BASE_SECONDS_PER_FILE + Math.max(1, ruleCount) * SECONDS_PER_RULE;
  return Math.max(1, Math.ceil(totalFiles * secondsPerFile));
}

export function estimateRemainingSeconds(
  startedAt: number,
  processedFiles: number,
  totalFiles: number,
  now: number = Date.now(),
): number | null {
  if (processedFiles <= 0 || totalFiles <= 0) return null;
  const elapsedSeconds = Math.max(0, now - startedAt) / 1000;
  const remainingFiles = Math.max(0, totalFiles - processedFiles);
  return Math.max(0, Math.ceil((elapsedSeconds / processedFiles) * remainingFiles));
}

export function formatSummaryDuration(seconds: number): string {
  const roundedSeconds = Math.max(0, Math.ceil(seconds));
  if (roundedSeconds < 60) return `${Math.max(1, roundedSeconds)} 秒`;
  const minutes = Math.floor(roundedSeconds / 60);
  const remainder = roundedSeconds % 60;
  return remainder ? `${minutes} 分 ${remainder} 秒` : `${minutes} 分钟`;
}
