(() => {
  const el = (id) => document.getElementById(id);
  const panel = el("entryPanel");
  const tabs = document.querySelector(".entry-tabs");
  const heading = document.createElement("div");
  heading.className = "design-editor-heading";
  heading.innerHTML = '<div><span class="panel-symbol"><img src="assets/workspace-preview/panels-top-left.svg" alt=""></span><h2>交易資料</h2></div>';
  panel.prepend(heading, tabs);
  const workbar = el("designWorkbar");
  workbar.prepend(el("designMenu"));
  heading.append(document.querySelector(".workspace-actions"));
  document.querySelector(".app-hero").remove();
  const summary = document.querySelector(".summary");
  el("printPreview").after(summary);
  function applySellerStamp() {
    const holder = document.querySelector("#printPreview .invoice-stamp-reminder");
    if (!holder || !window.invoiceSellerStampDataUrl || holder.querySelector("img")) return;
    const image = document.createElement("img");
    image.src = window.invoiceSellerStampDataUrl;
    image.alt = "營業人統一發票專用章影像";
    image.className = "invoice-business-stamp";
    holder.replaceChildren(image);
  }
  const refreshWithOriginalWorkflow = window.draftWorkflowChanged;
  window.draftWorkflowChanged = () => {
    refreshWithOriginalWorkflow();
    applySellerStamp();
  };
  applySellerStamp();
  document.querySelector(".preview-panel").append(document.querySelector(".preview-actions"));
  const newIcon = document.createElement("img");
  newIcon.src = "assets/icons/plus.svg";
  newIcon.alt = "";
  newIcon.className = "button-icon";
  el("newDraft").prepend(newIcon);
  const undoIcon = document.createElement("img");
  undoIcon.src = "assets/workspace-preview/undo-2.svg";
  undoIcon.alt = "";
  undoIcon.className = "button-icon";
  el("undoPlan").prepend(undoIcon);

  const menu = el("designMenu");
  const scrim = document.querySelector(".sidebar-scrim");
  function closeMenu() {
    document.body.classList.remove("design-menu-open");
    menu.setAttribute("aria-expanded", "false");
    scrim.hidden = true;
  }
  menu.addEventListener("click", () => {
    const open = !document.body.classList.contains("design-menu-open");
    document.body.classList.toggle("design-menu-open", open);
    menu.setAttribute("aria-expanded", String(open));
    scrim.hidden = !open;
  });
  scrim.addEventListener("click", closeMenu);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
  let lastEditorSection = "buyer";
  function markSection(name) {
    if (name !== "preview") lastEditorSection = name;
    document.querySelectorAll("[data-design-section]").forEach((button) => {
      if (button.dataset.designSection === name) button.setAttribute("aria-current", "step");
      else button.removeAttribute("aria-current");
    });
  }
  el("designHome").addEventListener("click", () => {
    el("showEditor").click();
    window.scrollTo({ top: 0, behavior: "smooth" });
    closeMenu();
  });
  const help = el("designHelp");
  const helpFrame = el("designHelpFrame");
  let helpScroll = { x: 0, y: 0 };
  el("designGuide").addEventListener("click", () => {
    helpScroll = { x: window.scrollX, y: window.scrollY };
    closeMenu();
    if (!helpFrame.getAttribute("src")) helpFrame.src = helpFrame.dataset.src;
    document.body.classList.add("design-help-open");
    help.showModal();
  });
  el("closeDesignHelp").addEventListener("click", () => help.close());
  help.addEventListener("click", (event) => {
    const bounds = help.getBoundingClientRect();
    if (event.target === help && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) help.close();
  });
  help.addEventListener("close", () => {
    document.body.classList.remove("design-help-open");
    (window.matchMedia("(max-width: 760px)").matches ? menu : el("designGuide")).focus({ preventScroll: true });
    window.scrollTo(helpScroll.x, helpScroll.y);
  });
  window.addEventListener("message", (event) => {
    if (event.source === helpFrame.contentWindow && event.data?.type === "invoice-guide:close" && help.open) help.close();
  });
  const paperView = el("paperView");
  let paperScroll = { x: 0, y: 0 };
  let paperScaleMode = "fit";
  function fitPaperView() {
    if (!paperView.open) return;
    const content = el("paperViewContent");
    const stage = content.querySelector(".paper-view-stage");
    const paper = stage?.querySelector(".invoice-paper");
    if (!paper) return;
    const compact = window.matchMedia("(max-width: 760px)").matches && paperScaleMode === "fit";
    if (!compact) paperView.style.height = "";
    const style = getComputedStyle(content);
    const paddingY = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const headingHeight = paperView.querySelector(".design-help-heading").offsetHeight;
    const width = content.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
    const height = compact ? window.innerHeight - 24 - headingHeight - paddingY - 2 : content.clientHeight - paddingY;
    const scale = paperScaleMode === "original" ? 1 : Math.min(1, width / INVOICE_PAPER_WIDTH, height / paper.offsetHeight);
    stage.style.width = `${Math.floor(INVOICE_PAPER_WIDTH * scale)}px`;
    stage.style.height = `${Math.ceil(paper.offsetHeight * scale)}px`;
    paper.style.transform = `scale(${scale})`;
    if (compact) paperView.style.height = `${Math.ceil(paper.offsetHeight * scale) + headingHeight + paddingY + 2}px`;
  }
  el("zoomInvoice").addEventListener("click", (event) => {
    event.stopImmediatePropagation();
    applySellerStamp();
    const paper = document.querySelector("#printPreview .invoice-paper");
    if (!paper) return;
    const clone = paper.cloneNode(true);
    clone.style.width = `${INVOICE_PAPER_WIDTH}px`;
    clone.style.minWidth = `${INVOICE_PAPER_WIDTH}px`;
    const stage = document.createElement("div");
    stage.className = "paper-view-stage";
    stage.append(clone);
    el("paperViewContent").replaceChildren(stage);
    paperScaleMode = "fit";
    document.querySelectorAll("[data-paper-scale]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.paperScale === "fit")));
    paperScroll = { x: window.scrollX, y: window.scrollY };
    document.body.classList.add("design-paper-open");
    el("zoomInvoice").setAttribute("aria-expanded", "true");
    paperView.showModal();
    fitPaperView();
    el("paperViewContent").scrollTo(0, 0);
  }, true);
  function syncZoomControl() {
    const button = el("zoomInvoice");
    button.setAttribute("aria-controls", "paperView");
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-expanded", String(paperView.open));
    button.removeAttribute("aria-pressed");
    button.textContent = "放大檢視";
  }
  window.matchMedia("(max-width: 760px)").addEventListener("change", syncZoomControl);
  syncZoomControl();
  new ResizeObserver(fitPaperView).observe(el("paperViewContent"));
  document.querySelectorAll("[data-paper-scale]").forEach((button) => button.addEventListener("click", () => {
    paperScaleMode = button.dataset.paperScale;
    document.querySelectorAll("[data-paper-scale]").forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
    fitPaperView();
    el("paperViewContent").scrollTo(0, 0);
  }));
  el("closePaperView").addEventListener("click", () => paperView.close());
  paperView.addEventListener("click", (event) => {
    const bounds = paperView.getBoundingClientRect();
    if (event.target === paperView && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) paperView.close();
  });
  paperView.addEventListener("close", () => {
    document.body.classList.remove("design-paper-open");
    el("zoomInvoice").setAttribute("aria-expanded", "false");
    el("zoomInvoice").focus({ preventScroll: true });
    el("paperViewContent").replaceChildren();
    paperView.style.height = "";
    window.scrollTo(paperScroll.x, paperScroll.y);
  });
  el("designDrafts").addEventListener("click", () => {
    closeMenu();
    el("showEditor").click();
    el("draftFiles").open = true;
    window.scrollTo({ top: 0 });
    el("draftFiles").querySelector("summary").focus();
  });
  el("saveDraft").addEventListener("click", () => {
    el("draftFiles").open = false;
    el("draftFiles").querySelector("summary").focus({ preventScroll: true });
  });
  document.addEventListener("focusin", (event) => {
    if (event.target.closest(".preview-panel")) markSection("preview");
    else if (event.target.closest(".table-wrap,.items-title,#priceQuestion")) markSection("items");
    else if (event.target.closest("#entryPanel")) markSection("buyer");
  });
  document.addEventListener("invoice:new", () => markSection("buyer"));
  el("showPreview").addEventListener("click", () => markSection("preview"));
  el("showEditor").addEventListener("click", () => markSection(lastEditorSection));
  fitInvoicePreview();
})();
