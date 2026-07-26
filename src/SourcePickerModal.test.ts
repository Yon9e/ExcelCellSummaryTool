/** @vitest-environment happy-dom */

import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SourcePickerModal from "./SourcePickerModal.vue";

describe("SourcePickerModal", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("同一目录同时显示文件夹与 Excel 文件，双击文件夹进入内部", async () => {
    const onConfirm = vi.fn();
    const wrapper = mount(SourcePickerModal, {
      props: {
        initialPaths: [],
        onClose: vi.fn(),
        onConfirm,
      },
      attachTo: document.body,
    });
    await flushPromises();

    const rows = wrapper.findAll<HTMLTableRowElement>("tr[data-source-path]");
    expect(rows.some((row) => row.text().includes("报告披露-单独汇总科目"))).toBe(true);
    expect(rows.some((row) => row.text().includes("00A00_合并财务报表.xlsx"))).toBe(true);

    const folderRow = rows.find((row) => row.text().includes("报告披露-单独汇总科目"));
    expect(folderRow).toBeDefined();
    await folderRow!.trigger("dblclick");
    await flushPromises();

    const address = wrapper.get<HTMLInputElement>(".unified-picker-address input");
    expect(address.element.value).toContain("报告披露-单独汇总科目");
    expect(onConfirm).not.toHaveBeenCalled();
    wrapper.unmount();
  });
  it("普通点击不抢占指针，拖过其他行后才捕获指针", async () => {
    const wrapper = mount(SourcePickerModal, {
      props: {
        initialPaths: [],
        onClose: vi.fn(),
        onConfirm: vi.fn(),
      },
      attachTo: document.body,
    });
    await flushPromises();

    const tableWrap = wrapper.get<HTMLElement>(".unified-picker-table-wrap");
    const setPointerCapture = vi.fn();
    Object.defineProperty(tableWrap.element, "setPointerCapture", {
      configurable: true,
      value: setPointerCapture,
    });
    const rows = wrapper.findAll<HTMLTableRowElement>("tr[data-source-path]");

    await rows[0].trigger("pointerdown", {
      button: 0,
      pointerId: 7,
      clientX: 100,
      clientY: 100,
    });
    expect(setPointerCapture).not.toHaveBeenCalled();

    await rows[1].trigger("pointerenter", {
      pointerId: 7,
      buttons: 1,
      clientX: 100,
      clientY: 145,
    });
    expect(setPointerCapture).toHaveBeenCalledWith(7);
    wrapper.unmount();
  });
});
