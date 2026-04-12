(function () {
  "use strict";

  const STORAGE_KEY_COLLAPSED = "booth_variation_default_collapsed";
  const STORAGE_KEY_TAGS_HIDDEN = "booth_tags_default_hidden";
  const STORAGE_KEY_COMPACT = "booth_compact_mode";
  const STORAGE_KEY_TILE = "booth_tile_mode";
  const STORAGE_KEY_TILE_HEIGHT = "booth_tile_height";

  const DEFAULT_TILE_HEIGHT = 420;

  /**
   * 要素から直接のテキストノードのみ取得する（子要素のテキストを除外）
   */
  function getDirectText(el) {
    let text = "";
    for (const node of el.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        text += node.textContent;
      }
    }
    return text.trim();
  }

  /**
   * 数値セルから .data-heading を除いた値テキストを取得する
   */
  function getValueText(li, selector) {
    const el = li.querySelector(selector);
    if (!el) return "–";
    const countEl = el.querySelector(".count");
    if (countEl) return countEl.textContent.trim();
    return getDirectText(el) || "–";
  }

  /**
   * バリエーション行からデータを抽出する
   */
  function parseVariationRow(li) {
    const label = li.querySelector(".dashboard-items-variation-label");
    const icon = label ? label.querySelector("i[title]") : null;
    const type = icon ? icon.getAttribute("title") : "";
    const name = label ? getDirectText(label) : "";
    const price = getValueText(li, ".number.price");
    const stock = getValueText(li, ".number.stock");
    const qty = getValueText(li, ".number.sales_quantity");
    const sales = getValueText(li, ".number.sales_subtotal");
    return { name, type, price, stock, qty, sales };
  }

  function parseMoney(str) {
    const cleaned = str.replace(/[¥,\s–-]/g, "");
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? 0 : num;
  }

  function parseQty(str) {
    const cleaned = str.replace(/[,\s–-]/g, "");
    const num = parseInt(cleaned, 10);
    return isNaN(num) ? 0 : num;
  }

  /**
   * コンパクトテーブルを生成する
   */
  function buildCompactTable(variations) {
    const table = document.createElement("table");
    table.className = "booth-compact-table";

    const thead = document.createElement("thead");
    thead.innerHTML = `
      <tr>
        <th>バリエーション</th>
        <th class="num">価格</th>
        <th class="num">在庫</th>
        <th class="num">販売数</th>
        <th class="num">売上金額</th>
      </tr>`;
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    let totalQty = 0;
    let totalSales = 0;

    variations.forEach((v) => {
      const tr = document.createElement("tr");
      const q = parseQty(v.qty);
      const s = parseMoney(v.sales);
      totalQty += q;
      totalSales += s;
      tr.innerHTML = `
        <td class="variation-name" title="${v.name}">${v.name}</td>
        <td class="num">${v.price}</td>
        <td class="num">${v.stock}</td>
        <td class="num">${q.toLocaleString()}</td>
        <td class="num">¥${s.toLocaleString()}</td>`;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    return { table, totalQty, totalSales, count: variations.length };
  }

  /**
   * 各商品にUI要素を追加する
   */
  function applyToItems(settings) {
    const items = document.querySelectorAll("li.js-item-wrapper");

    items.forEach((item) => {
      if (item.querySelector(".booth-variation-toggle-btn")) return;

      const originalVariation = item.querySelector("ul.dashboard-items-variation");
      if (!originalVariation) return;

      // バリエーションデータを抽出
      const variationRows = originalVariation.querySelectorAll("li.row");
      const variations = Array.from(variationRows).map(parseVariationRow);

      // コンパクトテーブルを生成
      const { table: compactTable, totalQty, totalSales, count } = buildCompactTable(variations);

      // サマリー（合計）を独立要素として作成（折りたたんでも表示される）
      const summary = document.createElement("div");
      summary.className = "booth-compact-summary";
      summary.innerHTML = `
        <span class="summary-label">\u3000合計 (${count})</span>
        <span class="summary-value">販売数: ${totalQty.toLocaleString()}</span>
        <span class="summary-value">売上: ¥${totalSales.toLocaleString()}</span>`;

      const compactWrap = document.createElement("div");
      compactWrap.className = "booth-compact-table-wrap";
      compactWrap.appendChild(compactTable);

      // サマリー → テーブルの順で挿入
      originalVariation.after(summary);
      summary.after(compactWrap);

      // コンパクトモードの適用
      if (settings.compact) {
        originalVariation.style.display = "none";
        summary.style.display = "";
        compactWrap.style.display = "";
      } else {
        originalVariation.style.display = "";
        summary.style.display = "none";
        compactWrap.style.display = "none";
      }

      // 折りたたみボタン
      const btn = document.createElement("button");
      btn.className = "booth-variation-toggle-btn";
      btn.textContent = "\u25BC";
      btn.title = "バリエーションを折りたたむ/展開する";

      const collapseTarget = settings.compact ? compactWrap : originalVariation;
      if (settings.defaultCollapsed) {
        collapseTarget.classList.add("booth-collapsed");
        btn.classList.add("collapsed");
        // タイルモード時は折りたたみ済みなので高さを auto に
        item.dataset.boothCollapsed = "true";
      }

      btn.addEventListener("click", () => {
        const activeTarget = settings.compact ? compactWrap : originalVariation;
        const isCollapsed = activeTarget.classList.toggle("booth-collapsed");
        btn.classList.toggle("collapsed", isCollapsed);

        // タイルモード時: 折りたたみに合わせてタイル高さを切り替え
        const isTile = document.getElementById("items")?.classList.contains("booth-tile-mode");
        if (isTile) {
          item.style.height = isCollapsed ? "auto" : currentTileHeight + "px";
        }
      });

      item.appendChild(btn);

      // タグ非表示
      const tagsList = item.querySelector("ul.dashboard-items-tags");
      if (tagsList && settings.tagsHidden) {
        tagsList.classList.add("booth-tags-hidden");
      }
    });
  }

  /**
   * コンパクトモードの切り替え
   */
  function toggleCompactMode(compact) {
    document.querySelectorAll("li.js-item-wrapper").forEach((item) => {
      const original = item.querySelector("ul.dashboard-items-variation");
      const compactWrap = item.querySelector(".booth-compact-table-wrap");
      const summary = item.querySelector(".booth-compact-summary");
      if (!original || !compactWrap) return;

      if (compact) {
        const wasCollapsed = original.classList.contains("booth-collapsed");
        original.style.display = "none";
        compactWrap.style.display = "";
        if (summary) summary.style.display = "";
        compactWrap.classList.toggle("booth-collapsed", wasCollapsed);
        original.classList.remove("booth-collapsed");
      } else {
        const wasCollapsed = compactWrap.classList.contains("booth-collapsed");
        compactWrap.style.display = "none";
        if (summary) summary.style.display = "none";
        original.style.display = "";
        original.classList.toggle("booth-collapsed", wasCollapsed);
        compactWrap.classList.remove("booth-collapsed");
      }
    });
  }

  /**
   * タイルモード時にレイアウトを再構成する
   */
  function moveFootersForTile(enabled) {
    document.querySelectorAll("li.js-item-wrapper").forEach((item) => {
      const footer = item.querySelector(".dashboard-item-footer");
      const summary = item.querySelector(".booth-compact-summary");
      const itemLabel = item.querySelector(".cell.item-label");
      const wrapperRow = item.querySelector(".cell.item-name-with-stock > .wrapper.row");
      if (!itemLabel) return;

      if (enabled) {
        // 1. 商品名を取り出してタイル最上部に配置
        if (!item.querySelector(".booth-tile-title")) {
          const nameLink = itemLabel.querySelector("span > a.nav, a.nav");
          const nameEmpty = itemLabel.querySelector("i.name-empty");
          const titleText = nameLink
            ? nameLink.textContent.trim()
            : nameEmpty
              ? nameEmpty.textContent.trim()
              : "";

          const titleDiv = document.createElement("div");
          titleDiv.className = "booth-tile-title";
          titleDiv.textContent = titleText;
          titleDiv.title = titleText;

          // 商品ページへのリンク
          if (nameLink) {
            titleDiv.style.cursor = "pointer";
            titleDiv.addEventListener("click", () => {
              window.open(nameLink.href, "_blank");
            });
          }

          // タイルの先頭（.cell.item-name-with-stock の先頭）に挿入
          const stockCell = item.querySelector(".cell.item-name-with-stock");
          if (stockCell) {
            stockCell.prepend(titleDiv);
          }
        }

        // 2. バッジ（公開中/下書き）をフッター内に移動
        const badge = itemLabel.querySelector(".badge");
        if (badge && footer && !badge.classList.contains("booth-badge-moved")) {
          const statsDiv = footer.querySelector(".dashboard-item-footer-stats");
          if (statsDiv) {
            statsDiv.appendChild(badge);
          }
          badge.classList.add("booth-badge-moved");
        }

        // 3. フッターを item-label 内に移動
        if (footer) {
          itemLabel.appendChild(footer);
          footer.classList.add("booth-footer-moved");
        }

        // 4. サマリーを item-label 内の末尾に移動
        if (summary) {
          itemLabel.appendChild(summary);
          summary.classList.add("booth-summary-moved");
        }

        // 5. 元の商品名・URL・brを非表示
        itemLabel.querySelectorAll("span, a.full-url, br").forEach((el) => {
          if (!el.closest(".dashboard-item-footer") && !el.closest(".booth-compact-summary")) {
            el.classList.add("booth-tile-hidden");
          }
        });
      } else {
        // === 元に戻す ===
        const stockCell = item.querySelector(".cell.item-name-with-stock");
        const compactWrap = item.querySelector(".booth-compact-table-wrap");

        // タイトル削除
        const titleDiv = item.querySelector(".booth-tile-title");
        if (titleDiv) titleDiv.remove();

        // バッジを元の場所に戻す
        const badge = item.querySelector(".badge.booth-badge-moved");
        if (badge && itemLabel) {
          itemLabel.prepend(badge);
          badge.classList.remove("booth-badge-moved");
        }

        // フッターを元に戻す
        if (footer && stockCell) {
          stockCell.appendChild(footer);
          footer.classList.remove("booth-footer-moved");
        }

        // サマリーを元に戻す
        if (summary && compactWrap) {
          compactWrap.before(summary);
          summary.classList.remove("booth-summary-moved");
        }

        // 非表示を解除
        itemLabel.querySelectorAll(".booth-tile-hidden").forEach((el) => {
          el.classList.remove("booth-tile-hidden");
        });
      }
    });
  }

  /**
   * タイル表示モードの切り替え
   */
  function toggleTileMode(enabled) {
    const itemsList = document.getElementById("items");
    if (!itemsList) return;

    itemsList.classList.toggle("booth-tile-mode", enabled);

    // 親セクションにクラスを付与（CSS幅制限解除用）
    const parentSection = itemsList.closest(".section");
    if (parentSection) {
      parentSection.classList.toggle("booth-tile-section", enabled);
    }

    // フッターの移動
    moveFootersForTile(enabled);

    // 高さスライダーの表示切替
    const slider = document.querySelector(".booth-tile-height-control");
    if (slider) {
      slider.style.display = enabled ? "flex" : "none";
    }

    if (enabled) {
      applyTileHeight(currentTileHeight);
    } else {
      // リスト表示に戻す: 固定高さを解除
      document.querySelectorAll("li.js-item-wrapper").forEach((item) => {
        item.style.height = "";
      });
    }
  }

  /**
   * タイルの高さを適用する
   */
  let currentTileHeight = DEFAULT_TILE_HEIGHT;

  function applyTileHeight(height) {
    currentTileHeight = height;
    const itemsList = document.getElementById("items");
    if (!itemsList || !itemsList.classList.contains("booth-tile-mode")) return;

    document.querySelectorAll("ol#items.booth-tile-mode > li.js-item-wrapper").forEach((item) => {
      // 折りたたみ済みのタイルは auto のまま
      const isCollapsed = item.querySelector(".booth-collapsed");
      item.style.height = isCollapsed ? "auto" : height + "px";
    });
  }

  /**
   * タイル高さ調整スライダーを作成する
   */
  function createHeightSlider(initialHeight, visible) {
    const wrap = document.createElement("div");
    wrap.className = "booth-tile-height-control";
    wrap.style.display = visible ? "flex" : "none";

    const label = document.createElement("label");
    label.textContent = "タイル高さ";

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "250";
    slider.max = "800";
    slider.value = String(initialHeight);

    const valueLabel = document.createElement("span");
    valueLabel.className = "booth-height-value";
    valueLabel.textContent = initialHeight + "px";

    slider.addEventListener("input", () => {
      const val = parseInt(slider.value, 10);
      valueLabel.textContent = val + "px";
      applyTileHeight(val);
    });

    slider.addEventListener("change", () => {
      chrome.storage.sync.set({ [STORAGE_KEY_TILE_HEIGHT]: parseInt(slider.value, 10) });
    });

    wrap.appendChild(label);
    wrap.appendChild(slider);
    wrap.appendChild(valueLabel);
    document.body.appendChild(wrap);
  }

  // ===================================
  // 初期化
  // ===================================
  chrome.storage.sync.get(
    {
      [STORAGE_KEY_COLLAPSED]: true,
      [STORAGE_KEY_TAGS_HIDDEN]: true,
      [STORAGE_KEY_COMPACT]: true,
      [STORAGE_KEY_TILE]: true,
      [STORAGE_KEY_TILE_HEIGHT]: DEFAULT_TILE_HEIGHT,
    },
    (result) => {
      const settings = {
        defaultCollapsed: result[STORAGE_KEY_COLLAPSED],
        tagsHidden: result[STORAGE_KEY_TAGS_HIDDEN],
        compact: result[STORAGE_KEY_COMPACT],
        tile: result[STORAGE_KEY_TILE],
        tileHeight: result[STORAGE_KEY_TILE_HEIGHT],
      };

      currentTileHeight = settings.tileHeight;

      applyToItems(settings);

      // タイルモード適用
      if (settings.tile) {
        toggleTileMode(true);
      }

      // 高さスライダー作成
      createHeightSlider(settings.tileHeight, settings.tile);

      // 動的に商品が追加される場合に備えてMutationObserverで監視
      const itemsList = document.getElementById("items");
      if (itemsList) {
        const observer = new MutationObserver(() => {
          applyToItems(settings);
          if (settings.tile) {
            applyTileHeight(currentTileHeight);
          }
        });
        observer.observe(itemsList, { childList: true });
      }

      // ポップアップからリアルタイムで設定変更を反映
      chrome.storage.onChanged.addListener((changes) => {
        if (changes[STORAGE_KEY_TAGS_HIDDEN]) {
          const hidden = changes[STORAGE_KEY_TAGS_HIDDEN].newValue;
          document.querySelectorAll("ul.dashboard-items-tags").forEach((el) => {
            el.classList.toggle("booth-tags-hidden", hidden);
          });
          settings.tagsHidden = hidden;
        }
        if (changes[STORAGE_KEY_COMPACT]) {
          const compact = changes[STORAGE_KEY_COMPACT].newValue;
          toggleCompactMode(compact);
          settings.compact = compact;
        }
        if (changes[STORAGE_KEY_TILE]) {
          const tile = changes[STORAGE_KEY_TILE].newValue;
          toggleTileMode(tile);
          settings.tile = tile;
        }
        if (changes[STORAGE_KEY_TILE_HEIGHT]) {
          const height = changes[STORAGE_KEY_TILE_HEIGHT].newValue;
          applyTileHeight(height);
          // スライダーの値も同期
          const slider = document.querySelector(".booth-tile-height-control input[type='range']");
          const valueLabel = document.querySelector(".booth-height-value");
          if (slider) slider.value = String(height);
          if (valueLabel) valueLabel.textContent = height + "px";
        }
      });
    }
  );
})();
