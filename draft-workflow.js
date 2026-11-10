(() => {
  const workspace = document.querySelector(".workspace-panel");
  const settingsHeading = workspace.querySelector(".settings-title");
  workspace.insertBefore(workspace.querySelector(".buyer-title"), settingsHeading);
  workspace.insertBefore(document.getElementById("buyerFields"), settingsHeading);
  const editorFooter = workspace.querySelector(".editor-footer");
  workspace.insertBefore(workspace.querySelector(".summary"), editorFooter);
  workspace.insertBefore(document.getElementById("validationBox"), editorFooter);
  workspace.insertBefore(document.getElementById("draftFiles"), editorFooter);
  workspace.insertBefore(document.getElementById("invoiceMemo").closest("label"), workspace.querySelector(".summary"));
  document.getElementById("invoiceMemo").closest("label").classList.add("memo-field");
  const editorBottom = document.createElement("div");
  editorBottom.className = "editor-bottom";
  workspace.insertBefore(editorBottom, workspace.querySelector(".memo-field"));
  editorBottom.append(workspace.querySelector(".memo-field"), workspace.querySelector(".summary"));
  document.querySelector(".side-body").appendChild(document.querySelector(".notice"));
  const sourceOptions = document.createElement("div");
  sourceOptions.className = "source-options";
  const transaction = document.querySelector(".transaction-section");
  transaction.insertBefore(sourceOptions, transaction.querySelector(".price-options"));
  sourceOptions.append(transaction.querySelector(".price-options"), transaction.querySelector(".source-comparison"), document.getElementById("sourceStatus"));
  const numberDetails = document.createElement("details");
  numberDetails.className = "invoice-number-settings";
  const numberSummary = document.createElement("summary");
  numberSummary.textContent = "發票字軌號碼";
  numberDetails.append(numberSummary, document.getElementById("invoiceNo").closest("label"));
  workspace.insertBefore(numberDetails, document.getElementById("draftFiles"));
  document.querySelectorAll('.app-hero a[href^="#"]').forEach((link) => link.addEventListener("click", () => document.getElementById("showEditor").click()));
  document.querySelectorAll('[name="invoiceKind"]').forEach((radio) => radio.addEventListener("change", () => {
    document.getElementById("invoiceType").value = radio.value;
    updateTotals();
  }));
  document.getElementById("invoicePeriod").addEventListener("change", (event) => {
    const [year, startMonth] = event.target.value.split("-").map(Number);
    const current = getRocDateParts(document.getElementById("invoiceDate").value);
    const month = current.month === startMonth + 1 ? current.month : startMonth;
    const day = Math.min(current.day, new Date(year, month, 0).getDate());
    document.getElementById("invoiceDate").value = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    updateTotals();
  });
  document.querySelector('a[href="#draftFiles"]').addEventListener("click", () => {
    document.getElementById("draftFiles").open = true;
    document.body.classList.remove("preview-mode");
  });
  document.getElementById("itemDetails").addEventListener("click", (event) => {
    const expanded = document.body.classList.toggle("show-item-details");
    event.currentTarget.setAttribute("aria-pressed", String(expanded));
  });
  const ids = ["invoiceType", "invoiceDate", "invoiceNo", "invoiceMemo", "buyerName", "buyerTaxId", "buyerAddress", "taxRate", "targetAmount", "targetType", "serviceType", "splitCount", "allocationStyle", "transactionText", "sourcePriceType"];
  const el = (id) => document.getElementById(id);
  let undoRows = null;
  let sourceFacts = [];
  let lastParsedSource = "";
  let baseline;
  let lastExport = "";
  let draftUrl = null;
  let draftContent = "";
  let buyerIdentity = el("buyerName").value.trim();

  function rowsSnapshot() {
    return readRows().map(({ tr, ...row }) => ({ ...row, name: tr.querySelector(".name").value }));
  }
  function snapshot() {
    return { version: 1, fields: Object.fromEntries(ids.map((id) => [id, el(id).value])), rows: rowsSnapshot(), sourceFacts, sourceState: { parsedText: lastParsedSource, blocked: state.sourceBlocked } };
  }
  function dirty() { return JSON.stringify(snapshot()) !== baseline; }
  function refresh() {
    if (draftUrl && JSON.stringify(snapshot()) !== draftContent) {
      URL.revokeObjectURL(draftUrl);
      draftUrl = null;
      el("draftDownloadLink").hidden = true;
      el("draftDownloadLink").removeAttribute("href");
    }
    el("saveStatus").textContent = dirty() ? "尚未匯出目前修改" : lastExport || "尚未儲存";
    const active = rowsSnapshot().filter((row) => row.unit > 0 && row.qty > 0);
    el("mobileTotal").textContent = el("total").textContent;
    el("descriptionCount").textContent = `${el("transactionText").value.length} 字`;
    document.querySelector(".transaction-section").classList.toggle("confirmed", active.length > 0 && active.every((row) => row.priceType !== "pending"));
    renderReview();
    el("sourcePriceSummary").textContent = { pending: "待確認", untaxed: "未稅", taxed: "含稅" }[el("sourcePriceType").value];
    const parts = getRocDateParts(el("invoiceDate").value);
    const year = parts.periodYear + 1911;
    if (el("invoicePeriod").dataset.year !== String(year)) {
      el("invoicePeriod").replaceChildren(...[1, 3, 5, 7, 9, 11].map((month) => new Option(`${parts.periodYear} 年 ${month}–${month + 1} 月`, `${year}-${month}`)));
      el("invoicePeriod").dataset.year = String(year);
    }
    el("invoicePeriod").value = `${year}-${parts.periodStart}`;
    document.querySelectorAll('[name="invoiceKind"]').forEach((radio) => { radio.checked = radio.value === el("invoiceType").value; });
  }
  function replaceRows(rows) {
    body.replaceChildren();
    rows.forEach((row) => makeRow(row));
    updateTotals();
  }
  function renderReview() {
    const box = el("sourceReview");
    box.replaceChildren();
    if (!sourceFacts.length) return;
    const list = document.createElement("dl");
    const rows = rowsSnapshot();
    for (const fact of sourceFacts) {
      const term = document.createElement("dt");
      term.textContent = fact.label;
      const detail = document.createElement("dd");
      const current = fact.field ? el(fact.field).value : ["交易背景", "解析提醒"].includes(fact.label) ? fact.value : rows.map((row) => `${row.name} ${row.qty} × ${row.unit}`).join("；");
      detail.textContent = `原文擷取：${fact.value}｜目前：${current || "待填寫"}`;
      list.append(term, detail);
    }
    box.append(list);
  }
  function parseDescription(options = {}) {
    state.validationStarted = true;
    const raw = el("transactionText").value.trim();
    if (!raw) { el("sourceStatus").textContent = "請先輸入交易描述。"; return false; }
    const explicitPrice = /未稅|不含稅|含稅|稅內含|稅外加/.test(raw);
    const result = parseTransactionText(raw, options.priceOverride || (explicitPrice ? "pending" : el("sourcePriceType").value));
    window.capturePlanUndo();
    const sameBuyer = result.fields.buyerName ? result.fields.buyerName === el("buyerName").value.trim() : result.fields.buyerTaxId && result.fields.buyerTaxId === el("buyerTaxId").value.trim();
    if (raw !== lastParsedSource && !sameBuyer) {
      const hadBuyer = ["buyerName", "buyerTaxId", "buyerAddress"].some((id) => el(id).value);
      for (const id of ["buyerName", "buyerTaxId", "buyerAddress"]) el(id).value = "";
      el("buyerChangeStatus").textContent = hadBuyer ? "已清除上一筆買受人資料；本次未提供的欄位請補填。可復原上次帶入。" : "";
      if (!result.fields.invoiceMemo) el("invoiceMemo").value = "";
    }
    state.companyRequestId += 1;
    clearTimeout(state.companyLookupTimer);
    hideCompanyResults();
    for (const [field, value] of Object.entries(result.fields)) el(field).value = value;
    buyerIdentity = el("buyerName").value.trim();
    if (result.blocking || !result.rows.length) {
      state.sourceBlocked = true;
      invalidateSuggestions();
      el("reviewItems").hidden = true;
      updateTotals();
      el("sourceStatus").textContent = `買受人欄位已依原文更新；品項未替換。${result.issues.join(" ")}`;
      el("sourceStatus").classList.add("needs-review");
      refresh();
      return false;
    }
    state.sourceBlocked = false;
    if (raw !== lastParsedSource && state.appliedSourceMemo !== null && el("invoiceMemo").value === state.appliedSourceMemo) el("invoiceMemo").value = "";
    state.appliedSourceMemo = null;
    sourceFacts = [];
    for (const [field, value] of Object.entries(result.fields)) {
      el(field).value = value;
      sourceFacts.push({ field, label: { buyerName: "買受人", buyerTaxId: "統一編號", buyerAddress: "地址", invoiceMemo: "備註" }[field], value });
    }
    sourceFacts.push({ label: "品項明細", value: result.rows.map((row) => `${row.name} ${row.qty} × ${row.unit}`).join("；") });
    if (result.contexts.length) sourceFacts.push({ label: "交易背景", value: result.contexts.join("；") });
    if (result.issues.length) sourceFacts.push({ label: "解析提醒", value: result.issues.join(" ") });
    el("sourcePriceType").value = result.priceType;
    document.querySelector(".price-options").open = result.priceType === "pending";
    lastParsedSource = raw;
    replaceRows(result.rows);
    invalidateSuggestions();
    updateTotals();
    el("sourceStatus").textContent = `已帶入 ${result.rows.length} 筆${result.priceType === "pending" ? "，請確認含稅／未稅" : "，金額已更新"}${result.issues.length ? `；${result.issues.length} 項待核對` : ""}。`;
    if (options.priceOverride && explicitPrice && parseTransactionText(raw).priceType !== result.priceType) el("sourceStatus").textContent += "已依你的選擇覆寫原文價格類型，請核對。";
    el("sourceStatus").classList.toggle("needs-review", result.priceType === "pending" || result.issues.length > 0);
    el("reviewItems").hidden = false;
    if (result.priceType !== "pending") generateSuggestions();
    refresh();
    return true;
  }
  window.hasParsedSource = () => lastParsedSource !== "" && lastParsedSource === el("transactionText").value.trim();
  window.getSourceContext = () => sourceFacts.filter((fact) => fact.label === "交易背景").map((fact) => fact.value).join("；");
  window.capturePlanUndo = () => {
    undoRows = { ...snapshot(), lastParsedSource, sourceBlocked: state.sourceBlocked };
    if (lastParsedSource && !window.hasParsedSource()) {
      undoRows.fields.transactionText = lastParsedSource;
      undoRows.sourceBlocked = false;
    }
    const types = new Set(undoRows.rows.filter((row) => row.unit > 0).map((row) => row.priceType));
    if (types.size === 1) undoRows.fields.sourcePriceType = [...types][0];
    el("undoPlan").disabled = false;
  };
  el("undoPlan").addEventListener("click", () => {
    if (!undoRows) return;
    const previous = undoRows;
    undoRows = null;
    for (const id of ids) el(id).value = previous.fields[id];
    sourceFacts = previous.sourceFacts;
    lastParsedSource = previous.lastParsedSource;
    state.sourceBlocked = previous.sourceBlocked;
    buyerIdentity = el("buyerName").value.trim();
    el("buyerChangeStatus").textContent = "";
    replaceRows(previous.rows);
    el("undoPlan").disabled = true;
    invalidateSuggestions();
    el("planStatus").textContent = "已復原套用前的品項明細。";
    if (window.hasParsedSource()) generateSuggestions();
    el("sourceStatus").textContent = "已復原上次帶入／套用前的資料，請核對。";
    refresh();
  });
  el("parseTransaction").addEventListener("click", parseDescription);
  el("refreshVersions").addEventListener("click", generateSuggestions);
  el("clearRows").addEventListener("click", () => {
    window.capturePlanUndo();
    replaceRows([{}]);
    lastParsedSource = "";
    invalidateSuggestions();
    el("sourceStatus").textContent = "已清除品項，交易描述仍保留；可復原或重新整理。";
  });
  el("confirmSourcePrice").addEventListener("click", () => {
    const type = el("sourcePriceType").value;
    if (type === "pending") { el("sourceStatus").textContent = "請先選擇含稅或未稅。"; return; }
    if (el("transactionText").value.trim() && !window.hasParsedSource()) {
      parseDescription({ priceOverride: type });
      return;
    }
    if (!rowsSnapshot().some((row) => row.name && row.unit > 0)) {
      el("sourceStatus").textContent = "目前沒有可計算的品項，請先輸入交易描述或品項與單價。";
      return;
    }
    window.capturePlanUndo();
    body.querySelectorAll(".priceType").forEach((input) => { input.value = type; });
    updateTotals();
    const detected = parseTransactionText(el("transactionText").value).priceType;
    const overridden = detected !== "pending" && detected !== type;
    el("sourceStatus").textContent = `目前全部品項已確認為${type === "taxed" ? "含稅" : "未稅"}單價。${overridden ? "此選擇已覆寫原文的價格類型，請核對。" : ""}`;
    el("sourceStatus").classList.remove("needs-review");
    if (window.hasParsedSource()) generateSuggestions();
  });
  el("transactionText").addEventListener("input", () => {
    clearInvoiceDownload();
    if (lastParsedSource && !window.hasParsedSource()) {
      state.sourceBlocked = Boolean(el("transactionText").value.trim());
      invalidateSuggestions();
      el("sourceStatus").textContent = "交易描述已變更，請重新整理開票內容。";
      el("sourceStatus").classList.add("needs-review");
      updateTotals();
    }
    el("descriptionCount").textContent = `${el("transactionText").value.length} 字`;
  });
  el("saveDraft").addEventListener("click", async () => {
    const data = snapshot();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const button = el("saveDraft");
    button.disabled = true;
    try {
      if (draftUrl) URL.revokeObjectURL(draftUrl);
      draftUrl = URL.createObjectURL(blob);
      draftContent = JSON.stringify(data);
      const link = el("draftDownloadLink");
      link.href = draftUrl;
      link.download = `invoice-draft-${el("invoiceDate").value || todayValue()}.json`;
      link.hidden = false;
      link.click();
      el("saveStatus").textContent = "已送出草稿下載，請確認檔案；未下載可按另存草稿 JSON。";
    } catch (error) {
      el("saveStatus").textContent = error.name === "AbortError" ? "已取消儲存，目前修改尚未儲存。" : "儲存失敗，請重新匯出草稿。";
    } finally {
      button.disabled = false;
    }
  });
  function validateDraft(data) {
    if (!data || data.version !== 1 || !data.fields || !Array.isArray(data.rows) || !data.rows.length || data.rows.length > 100) throw new Error("草稿格式不符");
    const fields = {};
    for (const id of ids) {
      const value = data.fields[id];
      if (typeof value !== "string" || value.length > (id === "transactionText" ? 20000 : 2000)) throw new Error("欄位格式不符");
      if (el(id).tagName === "SELECT" && ![...el(id).options].some((option) => option.value === value)) throw new Error("欄位選項不符");
      fields[id] = value;
    }
    const date = new Date(`${fields.invoiceDate}T12:00:00`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fields.invoiceDate) || !Number.isFinite(date.getTime()) || `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` !== fields.invoiceDate || !Number.isFinite(Number(fields.taxRate)) || Number(fields.taxRate) < 0 || Number(fields.taxRate) > 100) throw new Error("日期或稅率不符");
    const rows = data.rows.map((row) => {
      if (!row || typeof row.name !== "string" || row.name.length > 2000 || !["pending", "taxed", "untaxed"].includes(row.priceType) || !["taxable", "zero", "exempt"].includes(row.taxType) || !Number.isFinite(row.qty) || !Number.isFinite(row.unit) || row.qty < 0 || row.unit < 0 || row.qty * row.unit > Number.MAX_SAFE_INTEGER) throw new Error("品項格式不符");
      return { name: row.name, qty: row.qty, unit: row.unit, priceType: row.priceType, taxType: row.taxType, adjustable: row.adjustable !== false };
    });
    const facts = Array.isArray(data.sourceFacts) ? data.sourceFacts.filter((fact) => fact && typeof fact.label === "string" && typeof fact.value === "string" && (!fact.field || ["buyerName", "buyerTaxId", "buyerAddress", "invoiceMemo"].includes(fact.field))).map((fact) => ({ label: fact.label.slice(0, 100), value: fact.value.slice(0, 20000), ...(fact.field ? { field: fact.field } : {}) })) : [];
    let parsedText = fields.transactionText.trim();
    let blocked = false;
    if (data.sourceState != null) {
      if (typeof data.sourceState.parsedText !== "string" || data.sourceState.parsedText.length > 20000 || typeof data.sourceState.blocked !== "boolean") throw new Error("原文核對狀態不符");
      parsedText = data.sourceState.parsedText;
      blocked = data.sourceState.blocked || Boolean(fields.transactionText.trim() && parsedText !== fields.transactionText.trim());
    }
    return { fields, rows, facts, parsedText, blocked };
  }
  el("loadDraft").addEventListener("click", () => el("draftFile").click());
  el("draftFile").addEventListener("change", async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > 1000000) throw new Error("檔案過大");
      const data = validateDraft(JSON.parse(await file.text()));
      if (dirty() && !window.confirm("目前有未儲存修改，確定載入另一份草稿？")) return;
      state.companyRequestId += 1;
      clearTimeout(state.companyLookupTimer);
      for (const id of ids) el(id).value = data.fields[id];
      sourceFacts = data.facts;
      buyerIdentity = el("buyerName").value.trim();
      state.sourceBlocked = data.blocked;
      state.validationStarted = true;
      lastParsedSource = data.parsedText;
      replaceRows(data.rows);
      undoRows = null;
      el("undoPlan").disabled = true;
      invalidateSuggestions();
      el("sourceStatus").textContent = "已載入草稿，請核對原文與明細。";
      el("reviewItems").hidden = data.blocked;
      document.querySelector(".price-options").open = data.rows.some((row) => row.priceType === "pending");
      baseline = JSON.stringify(snapshot());
      lastExport = "已載入草稿檔";
      refresh();
    } catch (error) { el("saveStatus").textContent = `載入失敗：${error.message}，原有內容未替換。`; }
    finally { event.target.value = ""; }
  });
  el("newDraft").addEventListener("click", () => {
    if (dirty() && !window.confirm("目前有未儲存修改，確定建立新草稿？")) return;
    state.companyRequestId += 1;
    clearTimeout(state.companyLookupTimer);
    for (const id of ["invoiceNo", "invoiceMemo", "buyerName", "buyerTaxId", "buyerAddress", "targetAmount", "transactionText"]) el(id).value = "";
    el("invoiceDate").value = todayValue();
    el("sourcePriceType").value = "pending";
    state.validationStarted = false;
    state.sourceBlocked = false;
    buyerIdentity = "";
    el("buyerChangeStatus").textContent = "";
    el("reviewItems").hidden = true;
    sourceFacts = [];
    lastParsedSource = "";
    replaceRows([{}]);
    undoRows = null;
    el("undoPlan").disabled = true;
    invalidateSuggestions();
    el("sourceStatus").textContent = "";
    el("exportStatus").textContent = "";
    hideCompanyResults();
    baseline = JSON.stringify(snapshot());
    lastExport = "";
    refresh();
  });
  baseline = JSON.stringify(snapshot());
  el("buyerName").addEventListener("change", () => {
    const next = el("buyerName").value.trim();
    if (buyerIdentity && next !== buyerIdentity) {
      el("buyerTaxId").value = "";
      el("buyerAddress").value = "";
      state.companyRequestId += 1;
      clearTimeout(state.companyLookupTimer);
      hideCompanyResults();
      el("buyerChangeStatus").textContent = "買受人已變更，已清除原統編與地址，請重新確認。";
      updateTotals();
      scheduleCompanyLookup("name");
    }
    buyerIdentity = next;
  });
  el("reviewItems").addEventListener("click", () => document.querySelector(".items-title").scrollIntoView({ behavior: "smooth", block: "start" }));
  el("zoomInvoice").addEventListener("click", (event) => {
    const zoomed = document.body.classList.toggle("preview-zoomed");
    event.currentTarget.textContent = zoomed ? "完整票面" : "放大檢視";
    event.currentTarget.setAttribute("aria-pressed", String(zoomed));
    fitInvoicePreview();
  });
  new ResizeObserver(fitInvoicePreview).observe(el("printPreview"));
  window.addEventListener("resize", fitInvoicePreview);
  for (const [id, preview] of [["showEditor", false], ["showPreview", true]]) {
    el(id).addEventListener("click", () => {
      document.body.classList.toggle("preview-mode", preview);
      el("showEditor").setAttribute("aria-pressed", String(!preview));
      el("showPreview").setAttribute("aria-pressed", String(preview));
    });
  }
  window.draftWorkflowChanged = refresh;
  refresh();
  document.addEventListener("input", (event) => {
    if (event.target.id !== "invoicePeriod" && event.target.name !== "invoiceKind") refresh();
  });
  document.addEventListener("input", (event) => {
    if (event.target.closest("#itemsBody") || event.target.id === "invoiceMemo") {
      invalidateSuggestions();
      el("planStatus").textContent = "明細已調整，可按「更新版本」重新編列。";
    }
  });
  document.addEventListener("change", refresh);
  window.addEventListener("beforeunload", (event) => {
    if (dirty()) { event.preventDefault(); event.returnValue = ""; }
  });
})();
