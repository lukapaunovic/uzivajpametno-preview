'use strict';

(() => {
  const dialog = document.querySelector('#prep-reader');
  const opener = document.querySelector('[data-reader-open]');
  if (!dialog || !opener || typeof dialog.showModal !== 'function') return;

  const find = (selector) => dialog.querySelector(selector);
  const stage = find('.reader-stage');
  const paper = find('.reader-paper');
  const canvas = find('canvas');
  const transcript = find('.reader-transcript');
  const status = find('.reader-status');
  const previous = find('[data-reader-previous]');
  const next = find('[data-reader-next]');
  const zoomIn = find('[data-reader-zoom-in]');
  const zoomOut = find('[data-reader-zoom-out]');
  let documentPromise;
  let pages = [];
  let current = 0;
  let zoom = 100;
  let busy = true;
  let revision = 0;
  let renderTask;
  let renderQueue = Promise.resolve();
  let touchStart;
  let resizeTimer;
  let observedWidth = 0;
  let resumeFocus;

  opener.setAttribute('aria-haspopup', 'dialog');
  opener.setAttribute('aria-controls', dialog.id);

  function updateControls() {
    previous.disabled = busy || current === 0;
    next.disabled = busy || current >= pages.length - 1;
    zoomOut.disabled = busy || zoom === 100;
    zoomIn.disabled = busy || zoom === 200;
    find('.reader-zoom-label').textContent = `${zoom}%`;
    find('[data-reader-current]').textContent = String(current + 1);
    find('[data-reader-total]').textContent = String(pages.length || 24);
    stage.setAttribute('aria-busy', String(busy));
  }

  async function loadDocument() {
    if (!documentPromise) {
      documentPromise = (async () => {
        const pdfjs = await import(dialog.dataset.library);
        pdfjs.GlobalWorkerOptions.workerSrc = dialog.dataset.worker;
        const pdf = await pdfjs.getDocument({ url: opener.href }).promise;
        const orderedPages = [];
        for (let number = 1; number <= pdf.numPages; number += 1) {
          const page = await pdf.getPage(number);
          const viewport = page.getViewport({ scale: 1 });
          // The original print PDF contains spreads. Show their halves in order.
          const count = viewport.width > viewport.height ? 2 : 1;
          const width = viewport.width / count;
          for (let half = 0; half < count; half += 1) {
            orderedPages.push({ page, width, height: viewport.height, x: half * width });
          }
        }
        pages = orderedPages;
        return pdf;
      })().catch((error) => {
        documentPromise = undefined;
        throw error;
      });
    }
    return documentPromise;
  }

  async function render(token) {
    await loadDocument();
    if (token !== revision || !dialog.open) return;
    const entry = pages[current];
    stage.classList.toggle('reader-zoom-150', zoom === 150);
    stage.classList.toggle('reader-zoom-200', zoom === 200);
    paper.hidden = false;
    {
      const content = await entry.page.getTextContent();
      if (token !== revision || !dialog.open) return;
      const paragraphs = [];
      let line = '';
      for (const item of content.items) {
        if (!('str' in item) || item.transform[4] < entry.x - 1 || item.transform[4] >= entry.x + entry.width - 1) continue;
        line += `${item.str.replace(/[\u0000-\u001f]/g, '')} `;
        if (item.hasEOL && line.trim()) {
          paragraphs.push(line.trim());
          line = '';
        }
      }
      if (line.trim()) paragraphs.push(line.trim());
      transcript.replaceChildren(...paragraphs.map((text) => {
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        return paragraph;
      }));
      transcript.setAttribute('aria-label', `Tekst strane ${current + 1}`);
    }
    {
      const width = paper.clientWidth;
      // Keep one canvas in memory and cap its backing bitmap for mobile devices.
      const density = Math.min(window.devicePixelRatio || 1, 2);
      const scale = Math.min(width * density / entry.width, Math.sqrt(4000000 / (entry.width * entry.height)));
      canvas.width = Math.round(entry.width * scale);
      canvas.height = Math.round(entry.height * scale);
      renderTask = entry.page.render({
        canvas,
        viewport: entry.page.getViewport({ scale }),
        transform: [1, 0, 0, 1, -entry.x * scale, 0],
      });
      await renderTask.promise;
      renderTask = undefined;
    }
    if (token !== revision || !dialog.open) return;
    busy = false;
    status.textContent = `Strana ${current + 1} od ${pages.length}`;
    updateControls();
    if (document.activeElement === document.body && resumeFocus) {
      (resumeFocus.disabled ? stage : resumeFocus).focus({ preventScroll: true });
    }
    resumeFocus = undefined;
  }

  function scheduleRender() {
    if (dialog.contains(document.activeElement) && document.activeElement.matches('button')) {
      resumeFocus = document.activeElement;
    }
    const token = ++revision;
    renderTask?.cancel();
    busy = true;
    status.textContent = 'Učitavanje stranice…';
    updateControls();
    renderQueue = renderQueue.catch(() => {}).then(() => render(token)).catch((error) => {
      if (token !== revision || !dialog.open || error.name === 'RenderingCancelledException') return;
      paper.hidden = true;
      transcript.replaceChildren();
      stage.setAttribute('aria-busy', 'false');
      status.textContent = 'Čitač trenutno nije dostupan. Preuzmi PDF dugmetom iznad ili osveži stranicu i pokušaj ponovo.';
    });
  }

  function turnPage(delta) {
    if (busy) return;
    const target = Math.max(0, Math.min(pages.length - 1, current + delta));
    if (target === current) return;
    current = target;
    stage.scrollTo(0, 0);
    scheduleRender();
  }

  function openReader(addHistory = true) {
    if (dialog.open) return;
    if (addHistory) {
      const url = new URL(location.href);
      url.hash = 'citaj-prep';
      history.pushState({ ...history.state, upReader: true }, '', url);
    }
    dialog.showModal();
    document.documentElement.classList.add('reader-open');
    find('#reader-title').focus({ preventScroll: true });
    scheduleRender();
  }

  function closeReader() {
    if (!dialog.open) return;
    dialog.close();
    if (history.state?.upReader) history.back();
    else if (location.hash === '#citaj-prep') history.replaceState(history.state, '', '#prep-brosura');
  }

  opener.addEventListener('click', (event) => {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    openReader();
  });
  find('[data-reader-close]').addEventListener('click', closeReader);
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeReader();
  });
  dialog.addEventListener('close', () => {
    ++revision;
    renderTask?.cancel();
    document.documentElement.classList.remove('reader-open');
    resumeFocus = undefined;
    opener.focus({ preventScroll: true });
  });
  window.addEventListener('popstate', () => {
    if (location.hash === '#citaj-prep') openReader(false);
    else if (dialog.open) dialog.close();
  });
  previous.addEventListener('click', () => turnPage(-1));
  next.addEventListener('click', () => turnPage(1));
  zoomIn.addEventListener('click', () => { zoom += 50; scheduleRender(); });
  zoomOut.addEventListener('click', () => { zoom -= 50; scheduleRender(); });
  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      const controls = [...dialog.querySelectorAll('a[href], button:not([disabled]), [tabindex="0"]')]
        .filter((element) => element.getClientRects().length > 0);
      const index = controls.indexOf(document.activeElement);
      const direction = event.shiftKey ? -1 : 1;
      const target = index < 0 ? (event.shiftKey ? controls.length - 1 : 0)
        : (index + direction + controls.length) % controls.length;
      event.preventDefault();
      controls[target]?.focus();
      return;
    }
    if (zoom !== 100 || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      turnPage(event.key === 'ArrowRight' ? 1 : -1);
    }
  });
  stage.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary) { touchStart = undefined; return; }
    touchStart = event.pointerType === 'touch' && zoom === 100
      ? { x: event.clientX, y: event.clientY, id: event.pointerId } : undefined;
  });
  stage.addEventListener('pointercancel', () => { touchStart = undefined; });
  stage.addEventListener('pointerup', (event) => {
    if (!touchStart || touchStart.id !== event.pointerId) return;
    const dx = event.clientX - touchStart.x;
    const dy = event.clientY - touchStart.y;
    touchStart = undefined;
    if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.5) turnPage(dx < 0 ? 1 : -1);
  });
  new ResizeObserver(([entry]) => {
    if (Math.abs(entry.contentRect.width - observedWidth) < 1) return;
    observedWidth = entry.contentRect.width;
    clearTimeout(resizeTimer);
    if (dialog.open) resizeTimer = setTimeout(scheduleRender, 120);
  }).observe(stage);
  if (location.hash === '#citaj-prep') openReader(false);
})();
