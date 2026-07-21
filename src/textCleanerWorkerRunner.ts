import type { TextCleaningOptions, TextCleaningResult } from "./textCleaner";

export const TEXT_CLEANING_TIMEOUT_MS = 2_000;

interface TextCleaningWorkerRequest {
  input: string;
  options: TextCleaningOptions;
}

export interface TextCleaningWorkerLike {
  addEventListener: (
    type: "message" | "error",
    listener: (event: MessageEvent<TextCleaningResult>) => void,
  ) => void;
  postMessage: (message: TextCleaningWorkerRequest) => void;
  terminate: () => void;
}

interface TextCleaningWorkerDependencies {
  createWorker: () => TextCleaningWorkerLike;
}

export interface TextCleaningWorkerTask {
  promise: Promise<TextCleaningResult>;
  cancel: () => void;
}

function createTextCleaningWorker(): TextCleaningWorkerLike {
  return new Worker(new URL("./textCleaner.worker.ts", import.meta.url), { type: "module" }) as unknown as TextCleaningWorkerLike;
}

export function startTextCleaningWorker(
  request: TextCleaningWorkerRequest,
  fallback: TextCleaningResult,
  dependencies: TextCleaningWorkerDependencies = { createWorker: createTextCleaningWorker },
): TextCleaningWorkerTask {
  const worker = dependencies.createWorker();
  let settled = false;
  let timer = 0;
  let finish: (result: TextCleaningResult) => void = () => undefined;

  const promise = new Promise<TextCleaningResult>((resolve) => {
    finish = (result) => {
      if (settled) {
        return;
      }
      settled = true;
      globalThis.clearTimeout(timer);
      worker.terminate();
      resolve(result);
    };

    worker.addEventListener("message", (event) => finish(event.data));
    worker.addEventListener("error", () => finish({
      ...fallback,
      error: "正则处理线程启动失败，请重试。",
    }));
    timer = globalThis.setTimeout(() => finish({
      ...fallback,
      error: "正则处理超过 2 秒，已停止。请缩小内容范围或简化表达式。",
    }), TEXT_CLEANING_TIMEOUT_MS);

    try {
      worker.postMessage(request);
    } catch {
      finish({ ...fallback, error: "无法向正则处理线程发送内容，请重试。" });
    }
  });

  return {
    promise,
    cancel: () => {
      if (settled) {
        return;
      }
      settled = true;
      globalThis.clearTimeout(timer);
      worker.terminate();
    },
  };
}
