// @vitest-environment happy-dom

import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { mount } from "@vue/test-utils";
import SettingsPage from "./SettingsPage.vue";
import { useMotionStore } from "./stores/motion";

describe("SettingsPage", () => {
  beforeEach(() => {
    localStorage.clear();
    setActivePinia(createPinia());
  });

  it("shows the three motion modes and live automatic decision", () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const wrapper = mount(SettingsPage, { global: { plugins: [pinia] } });

    expect(wrapper.text()).toContain("界面动效");
    expect(wrapper.text()).toContain("自动");
    expect(wrapper.text()).toContain("完整");
    expect(wrapper.text()).toContain("精简");
    expect(wrapper.text()).toContain("当前生效");
    expect(wrapper.get('[role="radiogroup"]').attributes("aria-label")).toBe("界面动效模式");
    expect(wrapper.find('[data-motion-mode="auto"]').attributes("aria-checked")).toBe("true");
    expect(wrapper.find('[data-motion-mode="auto"]').attributes("tabindex")).toBe("0");
    expect(wrapper.find('[data-motion-mode="full"]').attributes("tabindex")).toBe("-1");
  });

  it("persists an explicit mode and can restore defaults", async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const wrapper = mount(SettingsPage, { global: { plugins: [pinia] } });
    const store = useMotionStore();

    await wrapper.get('[data-motion-mode="full"]').trigger("click");
    expect(store.mode).toBe("full");
    expect(localStorage.getItem("fadt.motion-mode")).toBe("full");

    await wrapper.get('[data-testid="restore-motion-defaults"]').trigger("click");
    expect(store.mode).toBe("auto");
    expect(wrapper.find('[data-motion-mode="auto"]').attributes("aria-checked")).toBe("true");
  });

  it("supports arrow-key selection across the motion radio group", async () => {
    const wrapper = mount(SettingsPage);

    await wrapper.get('[data-motion-mode="auto"]').trigger("keydown", { key: "ArrowRight" });

    expect(wrapper.get('[data-motion-mode="full"]').attributes("aria-checked")).toBe("true");
  });
});
