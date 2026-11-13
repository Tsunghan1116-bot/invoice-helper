(() => {
  const el = (id) => document.getElementById(id);
  const panel = el("entryPanel");
  const transaction = panel.querySelector(".transaction-section");
  const allocation = document.querySelector(".strategy-panel");
  const tabs = [...document.querySelectorAll("[data-entry-mode]")];
  const shared = document.createElement("div");
  shared.id = "sharedEditor";
  const status = document.createElement("div");
  status.id = "entryStatus";
  status.className = "check-item warn";
  status.hidden = true;
  status.setAttribute("role", "status");
  const returnButton = document.createElement("button");
  returnButton.type = "button";
  returnButton.className = "text-action";
  returnButton.textContent = "返回整理描述";
  const message = document.createElement("span");
  message.textContent = "交易描述尚未完成整理，下載前需先核對。";
  status.append(message, returnButton);

  // Reuse the existing fields and handlers; mode switches never copy invoice data.
  panel.append(shared);
  for (const selector of [".buyer-title", "#buyerFields", ".settings-title", ".settings", ".items-title", ".table-wrap", ".editor-bottom", "#fieldIssue", "#validationBox", ".invoice-number-settings", ".editor-footer"]) {
    shared.append(panel.querySelector(selector));
  }
  shared.prepend(el("priceQuestion"));
  shared.querySelector(".items-title").before(document.querySelector(".price-options"));
  panel.insertBefore(allocation, shared);
  panel.prepend(status);
  document.querySelector(".workspace-actions").prepend(el("draftFiles"));
  allocation.classList.add("allocation-workspace");
  const allocationTitle = document.createElement("h2");
  allocationTitle.textContent = "金額編列";
  allocation.querySelector(".section-head > div").prepend(allocationTitle);
  const allocationContext = document.createElement("p");
  allocationContext.className = "allocation-context";
  allocation.querySelector(".section-head").after(allocationContext);
  const previewControls = document.createElement("div");
  previewControls.className = "preview-controls";
  el("printPreview").before(previewControls);
  previewControls.append(document.querySelector(".invoice-type-selector"), el("zoomInvoice"));

  let mode = "description";
  let detailsRevealed = false;
  const fieldsHaveContent = () => readRows().some((row) => row.tr.querySelector(".name").value.trim() || row.unit > 0) || ["buyerName", "buyerTaxId", "buyerAddress", "invoiceMemo"].some((id) => el(id).value.trim());

  function render() {
    const rows = readRows().filter((row) => row.unit > 0 && row.qty > 0);
    if (fieldsHaveContent()) detailsRevealed = true;
    transaction.hidden = mode !== "description";
    allocation.hidden = mode !== "allocation";
    shared.hidden = mode === "description" && !detailsRevealed;
    const unparsed = Boolean(el("transactionText").value.trim() && !window.hasParsedSource());
    status.hidden = mode === "description" || !(unparsed || state.sourceBlocked);
    el("entryPanel").setAttribute("aria-labelledby", tabs.find((tab) => tab.dataset.entryMode === mode).id);
    document.body.dataset.entryMode = mode;
    for (const tab of tabs) {
      const selected = tab.dataset.entryMode === mode;
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    }
    const offset = mode === "manual" ? 0 : 1;
    [".buyer-title", ".settings-title", ".items-title"].forEach((selector, index) => {
      shared.querySelector(`${selector} .section-number`).textContent = String(index + offset + 1).padStart(2, "0");
    });
    if (mode === "allocation") {
      el("versionTools").open = true;
      allocation.querySelector(".allocation-settings").open = true;
    }
    const sourceBased = window.hasParsedSource() && rows.length > 0;
    allocation.classList.toggle("source-versions", sourceBased);
    allocationContext.hidden = !sourceBased;
    allocationContext.textContent = `依目前交易明細編列，含稅總額 ${el("total").textContent}。`;
    el("printPreview").hidden = false;
    el("zoomInvoice").hidden = false;
    const pending = rows.some((row) => row.priceType === "pending");
    el("previewState").hidden = !(unparsed || state.sourceBlocked || pending);
    el("previewState").textContent = unparsed || state.sourceBlocked ? "交易描述待核對，尚不能下載本次草稿。" : "部分價格待確認，合計尚未完整計算。";
    fitInvoicePreview();
  }

  function setMode(next) {
    if (!tabs.some((tab) => tab.dataset.entryMode === next)) return;
    mode = next;
    el("showEditor").click();
    render();
  }
  window.setInvoiceEntryMode = setMode;
  window.prepareInvoiceField = (field) => {
    if (field.closest(".transaction-section")) {
      if (!fieldsHaveContent() && !el("transactionText").value.trim()) detailsRevealed = false;
      setMode("description");
    } else if (field.closest(".allocation-workspace")) {
      setMode("allocation");
    } else {
      setMode("manual");
    }
  };
  for (const tab of tabs) {
    tab.addEventListener("click", () => setMode(tab.dataset.entryMode));
    tab.addEventListener("keydown", (event) => {
      const current = tabs.indexOf(tab);
      const next = { ArrowRight: (current + 1) % tabs.length, ArrowLeft: (current + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      setMode(tabs[next].dataset.entryMode);
      tabs[next].focus();
    });
  }
  returnButton.addEventListener("click", () => setMode("description"));
  el("checkPreview").addEventListener("click", () => el("reviewPreview").click());
  el("backToEditor").addEventListener("click", () => el("showEditor").click());
  const previousRefresh = window.draftWorkflowChanged;
  window.draftWorkflowChanged = () => { previousRefresh(); render(); };
  document.addEventListener("input", render);
  document.addEventListener("change", render);
  document.addEventListener("invoice:new", () => {
    detailsRevealed = false;
    setMode("description");
  });
  document.addEventListener("pointerdown", (event) => {
    if (!el("draftFiles").contains(event.target)) el("draftFiles").open = false;
  });
  el("draftFiles").addEventListener("keydown", (event) => {
    if (event.key === "Escape") { el("draftFiles").open = false; el("draftFiles").querySelector("summary").focus(); }
  });
  render();
})();
