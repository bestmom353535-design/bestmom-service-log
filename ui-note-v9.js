(() => {
  const previousOpenDay = window.openDay;
  if (typeof previousOpenDay !== 'function') return;

  function ensureFiveDayOption() {
    const select = document.getElementById('days');
    if (!select) return;
    const hasFive = [...select.options].some((option) => Number(option.value || option.textContent) === 5);
    if (hasFive) return;

    const option = document.createElement('option');
    option.value = '5';
    option.textContent = '5';
    select.insertBefore(option, select.firstChild);
  }

  const mainEl = document.getElementById('main');
  if (mainEl) {
    new MutationObserver(ensureFiveDayOption).observe(mainEl, { childList: true, subtree: true });
    ensureFiveDayOption();
  }

  window.openDay = async function caregiverNotesGuide(day, adminMode) {
    await previousOpenDay(day, adminMode);

    // 관리사 입력 화면에서만 안내 문구를 보여줍니다.
    if (adminMode) return;

    const notes = document.getElementById('notes');
    const label = notes?.previousElementSibling;
    if (!label || label.tagName !== 'LABEL') return;

    label.innerHTML = '특이사항 <span style="font-weight:400;color:#6b7280;font-size:12px;line-height:1.45">오늘 우리 아기의 하루는 어땠는지 간략히 작성해 주세요. <b style="color:#374151">특이사항 없는 날은 ‘이상없음’으로 작성해 주세요.</b></span>';
  };
})();
