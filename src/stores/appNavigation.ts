import { defineStore } from "pinia";
import { ref } from "vue";
import { getWorkspaceFromSearch } from "../supportWindows";
import type { OcrTabKey, SummaryTabKey, WorkspaceKey } from "../types";

export const useAppNavigationStore = defineStore("app-navigation", () => {
  const activeWorkspace = ref<WorkspaceKey>(getWorkspaceFromSearch(window.location.search));
  const activeSummaryTab = ref<SummaryTabKey>("source");
  const activeOcrTab = ref<OcrTabKey>("capture");

  function navigateTo(workspace: WorkspaceKey) {
    activeWorkspace.value = workspace;
  }

  return { activeWorkspace, activeSummaryTab, activeOcrTab, navigateTo };
});
