import { describe, expect, it } from "vitest";
import capability from "../src-tauri/capabilities/default.json";

describe("tauri capability", () => {
  it("allows support windows to be created and focused", () => {
    expect(capability.windows).toEqual(expect.arrayContaining(["main", "help-manual", "about"]));
    expect(capability.permissions).toEqual(
      expect.arrayContaining([
        "core:webview:allow-create-webview-window",
        "core:window:allow-create",
        "core:window:allow-set-focus",
        "core:window:allow-unminimize",
      ]),
    );
  });
});
