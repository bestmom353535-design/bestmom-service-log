(() => {
  if (window.__BESTMOM_SERVICE_DAYS_V39__) return;
  window.__BESTMOM_SERVICE_DAYS_V39__ = true;

  function ensureFiveDayOption() {
    const select = document.getElementById('days');
    if (!select) return;

    const values = [...select.options].map((option) => Number(option.value || option.textContent));
    if (!values.includes(5)) {
      const option = document.createElement('option');
      option.value = '5';
      option.textContent = '5';
      select.insertBefore(option, select.firstChild);
    }
  }

  ensureFiveDayOption();
  const main = document.getElementById('main');
  if (main) {
    new MutationObserver(ensureFiveDayOption).observe(main, { childList: true, subtree: true });
  }
})();
