(() => {
  const previousOpenDay = window.openDay;
  if (typeof previousOpenDay !== 'function') return;

  function requireNotes() {
    const notes = document.getElementById('notes');
    if (!notes || notes.disabled) return true;

    const value = String(notes.value || '').trim();
    const hasRealText = /[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9]/.test(value);
    if (hasRealText) return true;

    alert('특이사항을 입력해주세요.');
    notes.focus();
    notes.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return false;
  }

  window.openDay = async function openDayWithRequiredNotes(day, adminMode) {
    await previousOpenDay(day, adminMode);

    const notes = document.getElementById('notes');
    const label = notes?.previousElementSibling;
    if (label && label.tagName === 'LABEL' && !label.dataset.requiredNote) {
      label.insertAdjacentHTML('beforeend', ' <span style="color:#dc2626;font-weight:700">· 필수</span>');
      label.dataset.requiredNote = '1';
    }

    const saveButton = document.getElementById('save');
    if (saveButton && typeof saveButton.onclick === 'function') {
      const originalSaveClick = saveButton.onclick;
      saveButton.onclick = async (event) => {
        if (!requireNotes()) return;
        return originalSaveClick.call(saveButton, event);
      };
    }

    const signButton = document.getElementById('sign');
    if (signButton && typeof signButton.onclick === 'function') {
      const originalSignClick = signButton.onclick;
      signButton.onclick = async (event) => {
        if (!requireNotes()) return;
        return originalSignClick.call(signButton, event);
      };
    }
  };
})();
