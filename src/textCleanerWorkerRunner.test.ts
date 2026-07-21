import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultTextCleaningOptions, type TextCleaningResult } from "./textCleaner";
import {
  startTextCleaningWorker,
  TEXT_CLEANING_TIMEOUT_MS,
  type TextCleaningWorkerLike,
} from "./textCleanerWorkerRunner";

class FakeWorker implements TextCleaningWorkerLike {
  listeners = new Map<string, (event: MessageEvent<TextCleaningResult>) => void>();
  terminated = 0;

  addEventListener(type: "message" | "error", listener: (event: MessageEvent<TextCleaningResult>) => void) {
    this.listeners.set(type, listener);
  }

  postMessage() {
    // 测试由 emitMessage 或计时器决定完成路径。
  }

  terminate() {
    this.terminated += 1;
  }

  emitMessage(result: TextCleaningResult) {
    this.listeners.get("message")?.({ data: result } as MessageEvent<TextCleaningResult>);
  }
}

afterEach(() => {
  vi.useRealTimers();
});

describe("文本清洗 Worker 调度", () => {
  it("收到结果后终止 Worker 并返回结果", async () => {
    const worker = new FakeWorker();
    const task = startTextCleaningWorker(
      { input: "文本", options: defaultTextCleaningOptions },
      { value: "文本" },
      { createWorker: () => worker },
    );

    worker.emitMessage({ value: "完成" });

    await expect(task.promise).resolves.toEqual({ value: "完成" });
    expect(worker.terminated).toBe(1);
  });

  it("超时后终止 Worker 并返回可理解的错误", async () => {
    vi.useFakeTimers();
    const worker = new FakeWorker();
    const task = startTextCleaningWorker(
      { input: "文本", options: defaultTextCleaningOptions },
      { value: "文本" },
      { createWorker: () => worker },
    );

    await vi.advanceTimersByTimeAsync(TEXT_CLEANING_TIMEOUT_MS);

    await expect(task.promise).resolves.toEqual({
      value: "文本",
      error: "正则处理超过 2 秒，已停止。请缩小内容范围或简化表达式。",
    });
    expect(worker.terminated).toBe(1);
  });
});
