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
  el("zoomInvoice").addEventListener("click", (event) => {
    if (window.matchMedia("(max-width: 760px)").matches) return;
    event.stopImmediatePropagation();
    const paper = document.querySelector("#printPreview .invoice-paper");
    if (!paper) return;
    const clone = paper.cloneNode(true);
    clone.style.width = `${INVOICE_PAPER_WIDTH}px`;
    clone.style.minWidth = `${INVOICE_PAPER_WIDTH}px`;
    el("paperViewContent").replaceChildren(clone);
    paperScroll = { x: window.scrollX, y: window.scrollY };
    document.body.classList.add("design-paper-open");
    el("zoomInvoice").setAttribute("aria-expanded", "true");
    paperView.showModal();
    el("paperViewContent").scrollTo(0, 0);
  }, true);
  function syncZoomControl() {
    const mobile = window.matchMedia("(max-width: 760px)").matches;
    const button = el("zoomInvoice");
    button.setAttribute("aria-controls", mobile ? "printPreview" : "paperView");
    if (mobile) {
      button.removeAttribute("aria-haspopup");
      button.removeAttribute("aria-expanded");
      button.textContent = document.body.classList.contains("preview-zoomed") ? "完整票面" : "放大檢視";
    } else {
      button.setAttribute("aria-haspopup", "dialog");
      button.setAttribute("aria-expanded", String(paperView.open));
      button.textContent = "放大檢視";
    }
  }
  window.matchMedia("(max-width: 760px)").addEventListener("change", syncZoomControl);
  syncZoomControl();
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
