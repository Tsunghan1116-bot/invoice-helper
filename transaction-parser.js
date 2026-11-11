(function (root) {
  function parseTransactionText(source, priceOverride = "pending") {
    const text = String(source).normalize("NFKC").replace(/(\d),(?=\d{3}(?:\D|$))/g, "$1");
    const hasNet = /未稅|不含稅|稅外加/.test(text);
    const hasGross = /含稅|稅內含/.test(text.replaceAll("不含稅", ""));
    const priceType = ["taxed", "untaxed"].includes(priceOverride) ? priceOverride : hasNet !== hasGross ? hasNet ? "untaxed" : "taxed" : "pending";
    const result = { fields: {}, rows: [], contexts: [], issues: [], priceType, blocking: false };
    const money = (value) => Number(value.replace(/NT\$|NTD|TWD|[$元圓\s]/gi, ""));
    const cleanName = (name) => name.replace(/^(?:另外|另加|以及|還有|加上|另)\s*/, "").replace(/[：:\s]+$/, "").trim();
    let explicitName = "";
    let quantity = null;
    let unitPrice = null;
    let declaredAmount = null;
    let grandTotal = null;
    const structuredRows = [];
    function finishStructuredRow() {
      if (explicitName && (unitPrice != null || declaredAmount != null)) {
        structuredRows.push({ name: explicitName, qty: quantity || 1, unitPrice, amount: declaredAmount });
        explicitName = "";
        quantity = unitPrice = declaredAmount = null;
      }
    }
    const numeric = "([0-9]+(?:\\.[0-9]+)?)";
    const unit = "(?:堂|次|式|件|個|小時|份|組|場|套|人|節|筆|月|支|本|盒|台|包|天)";
    const segments = text.replace(/[ \t]+(?=(?:抬頭|買受人|公司名稱|客戶名稱|學校名稱|統編|統一編號|品名|品項名稱|名稱|數量|單價|金額|總計|總額)\s*:)/g, "\n")
      .replace(new RegExp(`(${unit})\\s*,\\s*(?=每|單價)`, "g"), "$1 ")
      .split(/[\n;；,，。]/).map((line) => line.trim()).filter(Boolean);
    // Pair adjacent names and standalone equations before splitting off labeled fields.
    const paired = [];
    for (const [index, segment] of segments.entries()) {
      const previous = paired[paired.length - 1];
      if (/^[\d.]+\s*[×x*]\s*[\d.]+(?:\s*=\s*[\d.]+)?\s*元?$/i.test(segment) && previous &&
          (!segments.slice(index + 1).some((part) => /^(?:名稱|品名|品項名稱)\s*[:：]/.test(part)) || /^(?:名稱|品名|品項名稱)\s*[:：]/.test(previous)) &&
          !/^(?:發票抬頭|抬頭|買受人|公司名稱|客戶名稱|學校名稱|統編|統一編號|地址|備註|數量|單價|金額|總計|總額)\s*[:：]/.test(previous) &&
          !/[=*×]|\d\s*元/.test(previous)) {
        paired[paired.length - 1] = `${previous.replace(/^(?:品名|品項名稱|品項|名稱|開立項目)\s*[:：]\s*/, "")}：${segment}`;
      } else paired.push(segment);
    }
    const candidates = [];
    function addCandidate(value) {
      const net = /未稅|不含稅|稅外加/.test(value);
      const gross = /含稅|稅內含/.test(value.replaceAll("不含稅", ""));
      const stripped = value.replace(/(?:以上|皆為|均為|全部|價格)?\s*(?:未稅|不含稅|含稅|稅內含|稅外加)\s*$/g, "").trim();
      if (!stripped) return;
      candidates.push({ line: stripped, price: ["taxed", "untaxed"].includes(priceOverride) ? priceOverride : net !== gross ? net ? "untaxed" : "taxed" : priceType });
    }
    for (const segment of paired) {
      let match;
      if ((match = segment.match(/^(?:發票)?(?:抬頭|買受人名稱|買受人(?!地址|統一編號)|公司名稱|客戶名稱|學校名稱)\s*[:：]?\s*(.+)$/))) { result.fields.buyerName = match[1].trim(); continue; }
      if ((match = segment.match(/^(?:統編|統一編號)\s*[:：]?\s*(\d{8})(?!\d)\s*$/))) { result.fields.buyerTaxId = match[1]; continue; }
      if ((match = segment.match(/^(?:地址|買受人地址)\s*[:：]\s*(.+)$/))) { result.fields.buyerAddress = match[1].trim(); continue; }
      if ((match = segment.match(/^(?:備註)\s*[:：]\s*(.+)$/))) { result.fields.invoiceMemo = match[1].trim(); continue; }
      if ((match = segment.match(/^(?:品名|品項名稱|品項|名稱|開立項目)\s*[:：]\s*(.+)$/))) {
        // A label may contain a complete item, or just name a following calculation.
        const content = match[1].trim();
        if (/\d\s*(?:元|[x×*]|堂|次|式|件|份)/.test(content) && !/^\d{2,4}年/.test(content)) addCandidate(content);
        else {
          finishStructuredRow();
          if (explicitName) { result.issues.push("多個名稱尚未對應金額，請為每個品名補上金額。"); result.blocking = true; }
          explicitName = content;
        }
        continue;
      }
      if ((match = segment.match(new RegExp(`^數量\\s*[:：]?\\s*${numeric}\\s*${unit}?$`)))) { quantity = Number(match[1]); continue; }
      if ((match = segment.match(/^單價\s*[:：]?\s*(?:NT\$|\$)?\s*([\d.]+)\s*元?$/i))) { unitPrice = money(match[1]); continue; }
      if ((match = segment.match(/^(總計|合計|總額|總金額|金額|小計)\s*[:：]?\s*(?:NT\$|\$)?\s*([\d.]+)\s*元?$/i))) {
        if (/^總|合計/.test(match[1])) grandTotal = money(match[2]);
        else declaredAmount = money(match[2]);
        continue;
      }
      addCandidate(segment);
    }
    let rowPriceType = priceType;
    function add(name, qty, price, expected) {
      if (!Number.isFinite(qty) || !Number.isFinite(price) || qty <= 0 || price < 0 || qty * price > Number.MAX_SAFE_INTEGER) { result.issues.push("數量或單價無效，請確認。"); result.blocking = true; return false; }
      if (expected != null && Math.abs(qty * price - expected) > 0.005) {
        result.issues.push(`算式不一致：${price} × ${qty} 應為 ${qty * price}，原文為 ${expected}。`);
        result.blocking = true;
        return false;
      }
      result.rows.push({ name: cleanName(name), qty, unit: price, priceType: rowPriceType, taxType: "taxable", adjustable: true });
      return true;
    }
    for (const { line, price } of candidates) {
      rowPriceType = price;
      let match;
      if ((match = line.match(/^([\d.]+)\s*[×x*]\s*([\d.]+)(?:\s*=\s*([\d.]+))?\s*元?$/i))) {
        if (add("", Number(match[2]), money(match[1]), match[3] == null ? null : money(match[3]))) result.issues.push(`算式依「單價 × 數量」帶入：${match[1]} × ${match[2]}，請核對。`);
      } else if ((match = line.match(new RegExp(`^(.+?)\\s*${numeric}\\s*${unit}\\s*(?:每${unit}|單價)\\s*(?:NT\\$|\\$)?\\s*${numeric}\\s*元?$`, "i")))) {
        add(match[1], Number(match[2]), money(match[3]));
      } else if ((match = line.match(/^(.+?)[：:\s]*(\d+(?:\.\d+)?)\s*[×x*]\s*([\d.]+)\s*=\s*([\d.]+)\s*元?$/i))) {
        if (/[a-z]\d*$/i.test(match[1]) && !/[：:\s]/.test(line.slice(match[1].length, match[1].length + 1))) {
          result.issues.push(`「${line}」型號與單價可能相連，請在品名後加冒號。`);
          result.blocking = true;
          continue;
        }
        if (add(match[1], Number(match[3]), money(match[2]), money(match[4]))) result.issues.push(`「${cleanName(match[1])}」按單價 ${match[2]} × 數量 ${match[3]} 帶入，請核對。`);
      } else if ((match = line.match(/^(.+?)\s+(\d+(?:\.\d+)?)\s*[×x*]\s*([\d.]+)\s*元?$/i))) {
        add(match[1], Number(match[2]), money(match[3]));
        result.issues.push(`「${cleanName(match[1])}」按數量 ${match[2]} × 單價 ${match[3]} 帶入，請核對。`);
      } else if ((match = line.match(/^(.+?)[：:]*(\d+(?:\.\d+)?)\s*[×x*]\s*([\d.]+)\s*元?$/i)) && !/[a-z]\d*$/i.test(match[1])) {
        if (add(match[1], Number(match[3]), money(match[2]))) result.issues.push(`「${cleanName(match[1])}」按單價 ${match[2]} × 數量 ${match[3]} 帶入，未提供小計，請核對。`);
      } else if ((match = line.match(/^(.+?)[：:\s]*(?:NT\$|\$)?\s*(\d+(?:\.\d+)?)\s*元$/i))) {
        add(match[1], 1, money(match[2]));
        result.issues.push(`「${cleanName(match[1])}」未提供數量，暫列 1 筆，請核對。`);
      } else if (!result.fields.buyerName && /(?:公司|商行|國小|國中|高中|大學|學校|協會)$/.test(line)) {
        result.fields.buyerName = line;
      } else {
        result.contexts.push(line);
        if (/[一二三四五六七八九十\d]+(?:批|份|件|套|組|堂|次|小時)$/.test(line)) {
          result.issues.push(`「${line}」缺少金額，請補上單價或總額。`);
          result.blocking = true;
        }
        if (/[×x*＝=]/i.test(line)) {
          result.issues.push(`「${line}」未能配對品名與算式，請改用「品名：單價 × 數量 = 小計」。`);
          result.blocking = true;
        }
      }
    }
    if (structuredRows.length) {
      rowPriceType = priceType;
      finishStructuredRow();
      for (const item of structuredRows) add(item.name, item.qty, item.unitPrice != null ? item.unitPrice : item.amount / item.qty, item.unitPrice != null ? item.amount : null);
    } else if (!result.rows.length && (unitPrice != null || declaredAmount != null || grandTotal != null) && explicitName) {
      rowPriceType = priceType;
      const qty = quantity || 1;
      add(explicitName, qty, unitPrice != null ? unitPrice : (declaredAmount ?? grandTotal) / qty, unitPrice != null ? declaredAmount : null);
      if (quantity == null) result.issues.push("未提供數量，暫列 1 筆，請核對。");
    }
    const unnamed = result.rows.filter((row) => !row.name);
    if (unnamed.length === 1) unnamed[0].name = explicitName || (result.contexts.length === 1 ? result.contexts[0] : "");
    if (result.rows.some((row) => !row.name)) {
      result.issues.push("有算式缺少對應品名，請補上「名稱：…」。");
      result.blocking = true;
    }
    if (explicitName && !result.rows.some((row) => row.name === explicitName)) {
      result.issues.push(`「${explicitName}」缺少對應金額，請補上單價或總額。`);
      result.blocking = true;
    }
    const expectedTotal = grandTotal ?? (structuredRows.length ? null : declaredAmount);
    if (expectedTotal != null && result.rows.length) {
      const actual = result.rows.reduce((sum, row) => sum + row.qty * row.unit, 0);
      if (Math.abs(actual - expectedTotal) > 0.005) { result.issues.push(`明細合計 ${actual} 與原文金額 ${expectedTotal} 不同，請確認。`); result.blocking = true; }
    }
    if (!result.rows.length) result.issues.push("未辨識到完整品名與金額，原有明細未替換。請補上名稱、金額或算式。");
    const types = new Set(result.rows.map((row) => row.priceType));
    result.priceType = types.size === 1 ? [...types][0] : "pending";
    result.mixedPricing = types.size > 1 || hasNet && hasGross;
    return result;
  }
  if (typeof module !== "undefined" && module.exports) module.exports = { parseTransactionText };
  else root.parseTransactionText = parseTransactionText;
})(typeof window === "undefined" ? globalThis : window);
