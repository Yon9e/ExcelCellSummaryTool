/** @vitest-environment happy-dom */

import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import SourcePickerModal from "./SourcePickerModal.vue";

describe("SourcePickerModal 双击导航真实事件链", () => {
  it("两次完整单击后双击文件夹仍进入内部", async () => {
    const wrapper = mount(SourcePickerModal, {
      props: {
        initialPaths: [],
        onClose: vi.fn(),
        onConfirm: vi.fn(),
      },
      attachTo: document.body,
    });
    await flushPromises();

    const folderRow = wrapper
      .findAll<HTMLTableRowElement>("tr[data-source-path]")
      .find((row) => row.text().includes("报告披露-单独汇总科目"));
    expect(folderRow).toBeDefined();

    for (let clickIndex = 0; clickIndex < 2; clickIndex += 1) {
      await folderRow!.trigger("pointerdown", {
        button: 0,
        buttons: 1,
        pointerId: 11,
        clientX: 160,
        clientY: 120,
      });
      await folderRow!.trigger("pointerup", {
        button: 0,
        buttons: 0,
        pointerId: 11,
        clientX: 160,
        clientY: 120,
      });
    }
    await folderRow!.trigger("dblclick");
    await flushPromises();

    expect(wrapper.get<HTMLInputElement>(".unified-picker-address input").element.value)
      .toContain("报告披露-单独汇总科目");

    wrapper.unmount();
  });
});
