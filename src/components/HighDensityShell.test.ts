// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import { mount } from "@vue/test-utils";
import HighDensityShell from "./HighDensityShell.vue";

describe("HighDensityShell", () => {
  it("renders a C-type workspace and emits back", async () => {
    const wrapper = mount(HighDensityShell, {
      props: {
        eyebrow: "数据源",
        title: "选择文件和文件夹",
        description: "同一页面混合多选。",
        returnLabel: "返回数据源配置",
      },
      slots: { default: "<div data-testid='workspace-content'>内容</div>" },
    });

    expect(wrapper.find(".high-density-rail").exists()).toBe(true);
    expect(wrapper.find(".high-density-context").exists()).toBe(true);
    expect(wrapper.get('[data-testid="workspace-content"]').text()).toBe("内容");
    expect(wrapper.get('[data-testid="high-density-back"]').text()).toContain("返回数据源配置");

    await wrapper.get('[data-testid="high-density-back"]').trigger("click");
    expect(wrapper.emitted("back")).toHaveLength(1);
  });
});
