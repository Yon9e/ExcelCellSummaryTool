import { describe, expect, it } from "vitest";
import {
  createClipboardPollingState,
  markClipboardAttempt,
  markClipboardSuccess,
  shouldAttemptClipboardRead,
} from "./clipboardPolling";

describe("clipboard polling", () => {
  it("在同一剪贴板版本首次未读到图片时会重试", () => {
    const state = createClipboardPollingState();

    expect(shouldAttemptClipboardRead(state, 42, 0, true)).toBe(true);
    markClipboardAttempt(state, 42, 0);
    expect(shouldAttemptClipboardRead(state, 42, 600, false)).toBe(false);
    expect(shouldAttemptClipboardRead(state, 42, 1_300, false)).toBe(true);
  });

  it("成功读取图片后不会重复分析同一剪贴板版本", () => {
    const state = createClipboardPollingState();

    markClipboardAttempt(state, 42, 0);
    markClipboardSuccess(state, 42);

    expect(shouldAttemptClipboardRead(state, 42, 5_000, false)).toBe(false);
    expect(shouldAttemptClipboardRead(state, 43, 5_000, false)).toBe(true);
  });
});
