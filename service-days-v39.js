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

  function loadCaregiverPicker() {
    if (window.__BESTMOM_CAREGIVER_PICKER_LOADING__) return;
    window.__BESTMOM_CAREGIVER_PICKER_LOADING__ = true;
    const script = document.createElement('script');
    script.src = 'caregiver-picker-v43.js?v=20260903-app43';
    script.async = true;
    document.head.appendChild(script);
  }

  ensureFiveDayOption();
  loadCaregiverPicker();

  const main = document.getElementById('main');
  if (main) {
    new MutationObserver(ensureFiveDayOption).observe(main, { childList: true, subtree: true });
  }
})();
