export const CLIPBOARD_RETRY_INTERVAL_MS = 1_200;

export interface ClipboardPollingState {
  lastAttemptedAt: number;
  lastAttemptedSequence: number | null;
  lastSuccessfulSequence: number | null;
}

export function createClipboardPollingState(): ClipboardPollingState {
  return {
    lastAttemptedAt: Number.NEGATIVE_INFINITY,
    lastAttemptedSequence: null,
    lastSuccessfulSequence: null,
  };
}

export function shouldAttemptClipboardRead(
  state: ClipboardPollingState,
  sequence: number,
  now: number,
  initial: boolean,
): boolean {
  if (initial) {
    return true;
  }
  if (state.lastSuccessfulSequence === sequence) {
    return false;
  }
  if (state.lastAttemptedSequence !== sequence) {
    return true;
  }
  return now - state.lastAttemptedAt >= CLIPBOARD_RETRY_INTERVAL_MS;
}

export function markClipboardAttempt(
  state: ClipboardPollingState,
  sequence: number,
  now: number,
): void {
  state.lastAttemptedSequence = sequence;
  state.lastAttemptedAt = now;
}

export function markClipboardSuccess(state: ClipboardPollingState, sequence: number): void {
  state.lastSuccessfulSequence = sequence;
}
