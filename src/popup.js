const STORAGE_KEY_COLLAPSED = "booth_variation_default_collapsed";
const STORAGE_KEY_TAGS_HIDDEN = "booth_tags_default_hidden";
const STORAGE_KEY_COMPACT = "booth_compact_mode";
const STORAGE_KEY_TILE = "booth_tile_mode";
const STORAGE_KEY_SUMMARY_HIDDEN = "booth_summary_hidden";

const collapsedCheckbox = document.getElementById("defaultCollapsed");
const tagsHiddenCheckbox = document.getElementById("tagsHidden");
const compactCheckbox = document.getElementById("compactMode");
const tileCheckbox = document.getElementById("tileMode");
const summaryHiddenCheckbox = document.getElementById("summaryHidden");

// 保存された設定を読み込み
chrome.storage.sync.get(
  {
    [STORAGE_KEY_COLLAPSED]: true,
    [STORAGE_KEY_TAGS_HIDDEN]: true,
    [STORAGE_KEY_COMPACT]: true,
    [STORAGE_KEY_TILE]: true,
    [STORAGE_KEY_SUMMARY_HIDDEN]: false,
  },
  (result) => {
    collapsedCheckbox.checked = result[STORAGE_KEY_COLLAPSED];
    tagsHiddenCheckbox.checked = result[STORAGE_KEY_TAGS_HIDDEN];
    compactCheckbox.checked = result[STORAGE_KEY_COMPACT];
    tileCheckbox.checked = result[STORAGE_KEY_TILE];
    summaryHiddenCheckbox.checked = result[STORAGE_KEY_SUMMARY_HIDDEN];
  }
);

// トグル変更時に保存
collapsedCheckbox.addEventListener("change", () => {
  chrome.storage.sync.set({ [STORAGE_KEY_COLLAPSED]: collapsedCheckbox.checked });
});

tagsHiddenCheckbox.addEventListener("change", () => {
  chrome.storage.sync.set({ [STORAGE_KEY_TAGS_HIDDEN]: tagsHiddenCheckbox.checked });
});

compactCheckbox.addEventListener("change", () => {
  chrome.storage.sync.set({ [STORAGE_KEY_COMPACT]: compactCheckbox.checked });
});

tileCheckbox.addEventListener("change", () => {
  chrome.storage.sync.set({ [STORAGE_KEY_TILE]: tileCheckbox.checked });
});

summaryHiddenCheckbox.addEventListener("change", () => {
  chrome.storage.sync.set({ [STORAGE_KEY_SUMMARY_HIDDEN]: summaryHiddenCheckbox.checked });
});
