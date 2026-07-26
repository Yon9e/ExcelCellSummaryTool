import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { MOTION_MODE_STORAGE_KEY } from "../motionPreferences";
import { useMotionStore } from "./motion";

function createStorage(initial: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(initial));
  return {
    get length() {
      return values.size;
    },
    clear: vi.fn(() => values.clear()),
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    key: vi.fn((index: number) => [...values.keys()][index] ?? null),
    removeItem: vi.fn((key: string) => values.delete(key)),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
  };
}

describe("motion store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("loads and persists the user's explicit motion mode", () => {
    const storage = createStorage({ [MOTION_MODE_STORAGE_KEY]: "reduced" });
    vi.stubGlobal("localStorage", storage);
    const store = useMotionStore();

    expect(store.mode).toBe("reduced");
    expect(store.effectiveLevel).toBe("reduced");

    store.setMode("full");
    expect(storage.setItem).toHaveBeenCalledWith(MOTION_MODE_STORAGE_KEY, "full");
    expect(store.effectiveLevel).toBe("full");

    vi.unstubAllGlobals();
  });

  it("keeps an automatic downgrade sticky for the current session", () => {
    vi.stubGlobal("localStorage", createStorage());
    const store = useMotionStore();

    store.applyPerformanceSample({
      frameIntervals: [16, 16, 45, 42, 16, 16, 16],
      longTaskCount: 0,
    });
    expect(store.sessionDegraded).toBe(true);
    expect(store.effectiveLevel).toBe("reduced");

    store.applyPerformanceSample({
      frameIntervals: [16, 16, 16, 16],
      longTaskCount: 0,
    });
    expect(store.sessionDegraded).toBe(true);
    expect(store.effectiveLevel).toBe("reduced");

    vi.unstubAllGlobals();
  });

  it("restores auto mode without clearing the sticky safety downgrade", () => {
    vi.stubGlobal("localStorage", createStorage());
    const store = useMotionStore();
    store.applyPerformanceSample({
      frameIntervals: [16, 16],
      longTaskCount: 1,
    });
    store.setMode("full");

    store.restoreDefaults();

    expect(store.mode).toBe("auto");
    expect(store.sessionDegraded).toBe(true);
    expect(store.effectiveLevel).toBe("reduced");
    expect(localStorage.setItem).toHaveBeenLastCalledWith(
      MOTION_MODE_STORAGE_KEY,
      "auto",
    );

    vi.unstubAllGlobals();
  });

  it("samples frame performance only while automatic mode is active", () => {
    vi.stubGlobal("localStorage", createStorage({
      [MOTION_MODE_STORAGE_KEY]: "full",
    }));
    const requestFrame = vi.fn(() => 1);
    vi.stubGlobal("requestAnimationFrame", requestFrame);
    vi.stubGlobal("matchMedia", vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })));
    const store = useMotionStore();

    store.initialize();

    expect(store.samplingStatus).toBe("idle");
    expect(requestFrame).not.toHaveBeenCalled();

    store.setMode("auto");
    expect(store.samplingStatus).toBe("sampling");
    expect(requestFrame).toHaveBeenCalledTimes(1);
    store.dispose();
    vi.unstubAllGlobals();
  });
});
