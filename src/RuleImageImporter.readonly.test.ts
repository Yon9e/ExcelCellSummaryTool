/** @vitest-environment happy-dom */

import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import RuleImageImporter from "./RuleImageImporter.vue";

describe("RuleImageImporter 候选规则只读边界", () => {
  it("目标单元格坐标不可直接编辑", () => {
    const wrapper = mount(RuleImageImporter, {
      props: {
        onClose: vi.fn(),
        onAppend: vi.fn(),
      },
      attachTo: document.body,
    });

    const cellInputs = wrapper.findAll<HTMLInputElement>(".candidate-cell input");
    expect(cellInputs.length).toBeGreaterThan(0);
    expect(cellInputs.every((input) => input.element.readOnly)).toBe(true);

    wrapper.unmount();
  });
});
