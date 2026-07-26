// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import AppSidebar from "./AppSidebar.vue";
import AppTopbar from "./AppTopbar.vue";
import WorkspaceTabs from "./WorkspaceTabs.vue";
import { summaryTabs } from "../navigation";

describe("FADT v3 application shell", () => {
  it("renders five keyboard buttons and emits sidebar navigation", async () => {
    const wrapper = mount(AppSidebar, {
      props: { activeWorkspace: "summary" },
    });

    expect(wrapper.get('[data-workspace="summary"]').attributes("aria-current")).toBe("page");
    expect(wrapper.findAll(".app-sidebar-nav button")).toHaveLength(5);

    await wrapper.get('[data-workspace="settings"]').trigger("click");
    expect(wrapper.emitted("navigate")?.[0]).toEqual(["settings"]);
  });

  it("renders the top breadcrumb and emits help", async () => {
    const wrapper = mount(AppTopbar, {
      props: { breadcrumb: "FADT / 汇总 / 数据源配置" },
    });

    expect(wrapper.text()).toContain("FADT / 汇总 / 数据源配置");
    await wrapper.get('[data-testid="open-help"]').trigger("click");
    expect(wrapper.emitted("help")).toHaveLength(1);
  });

  it("uses an accessible tablist and emits the selected key", async () => {
    const wrapper = mount(WorkspaceTabs, {
      props: {
        tabs: summaryTabs,
        activeKey: "source",
        label: "汇总功能标签",
      },
    });

    expect(wrapper.get('[role="tablist"]').attributes("aria-label")).toBe("汇总功能标签");
    expect(wrapper.get('[data-tab="source"]').attributes("aria-selected")).toBe("true");
    await wrapper.get('[data-tab="rules"]').trigger("click");
    expect(wrapper.emitted("select")?.[0]).toEqual(["rules"]);
  });
});
