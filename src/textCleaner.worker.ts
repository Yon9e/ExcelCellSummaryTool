import { cleanClipboardText, type TextCleaningOptions, type TextCleaningResult } from "./textCleaner";

interface TextCleaningWorkerRequest {
  input: string;
  options: TextCleaningOptions;
}

const workerScope = self as unknown as {
  addEventListener: (
    type: "message",
    listener: (event: MessageEvent<TextCleaningWorkerRequest>) => void,
  ) => void;
  postMessage: (message: TextCleaningResult) => void;
};

workerScope.addEventListener("message", (event) => {
  workerScope.postMessage(cleanClipboardText(event.data.input, event.data.options));
});
