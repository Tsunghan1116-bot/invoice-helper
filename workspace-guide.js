(() => {
  const embedded = new URLSearchParams(window.location.search).get("embedded") === "1";
  if (embedded) document.body.classList.add("embedded-guide");
  const viewer = document.createElement("dialog");
  viewer.className = "guide-image-viewer";
  viewer.setAttribute("aria-labelledby", "guideImageTitle");
  viewer.innerHTML = '<div class="guide-image-heading"><h2 id="guideImageTitle">操作圖</h2><button type="button" id="guideImageSize" aria-pressed="false">原始尺寸</button><button type="button" id="closeGuideImage" autofocus>返回說明</button></div><div class="guide-image-scroll" tabindex="0" aria-label="操作圖，可捲動檢視"><img alt=""></div>';
  document.body.append(viewer);
  const image = viewer.querySelector("img");
  const size = viewer.querySelector("#guideImageSize");
  const scroller = viewer.querySelector(".guide-image-scroll");
  let sourceLink;
  document.querySelectorAll("figure a").forEach((link) => {
    link.removeAttribute("target");
    link.setAttribute("aria-haspopup", "dialog");
    link.addEventListener("click", (event) => {
      const thumbnail = link.querySelector("img");
      if (!thumbnail) return;
      event.preventDefault();
      sourceLink = link;
      image.src = thumbnail.currentSrc || thumbnail.src;
      image.alt = thumbnail.alt;
      viewer.classList.remove("original-size");
      size.setAttribute("aria-pressed", "false");
      size.textContent = "原始尺寸";
      document.body.classList.add("guide-image-open");
      viewer.showModal();
      scroller.scrollTo(0, 0);
    });
  });
  size.addEventListener("click", () => {
    const original = viewer.classList.toggle("original-size");
    size.setAttribute("aria-pressed", String(original));
    size.textContent = original ? "符合視窗" : "原始尺寸";
    scroller.scrollTo(0, 0);
  });
  viewer.querySelector("#closeGuideImage").addEventListener("click", () => viewer.close());
  viewer.addEventListener("close", () => {
    document.body.classList.remove("guide-image-open");
    sourceLink?.focus({ preventScroll: true });
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (viewer.open) {
      event.preventDefault();
      event.stopImmediatePropagation();
      viewer.close();
    } else if (embedded) window.parent.postMessage({ type: "invoice-guide:close" }, "*");
  }, true);
})();
