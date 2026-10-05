(() => {
  const previousOpenDay = window.openDay;
  if (typeof previousOpenDay !== 'function') return;

  function notesNoneChecked() {
    return Boolean(document.getElementById('notesNone')?.checked);
  }

  function syncNotesNoneState() {
    const notes = document.getElementById('notes');
    const checkbox = document.getElementById('notesNone');
    if (!notes || !checkbox) return;

    if (checkbox.checked) {
      notes.value = '없음';
      notes.readOnly = true;
      notes.style.background = '#f8fafc';
    } else {
      if (String(notes.value || '').trim() === '없음') notes.value = '';
      notes.readOnly = false;
      notes.style.background = '';
    }

    notes.dispatchEvent(new Event('input', { bubbles: true }));
    notes.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function ensureNoneCheckbox() {
    const notes = document.getElementById('notes');
    if (!notes || document.getElementById('notesNone')) return;

    const label = notes.previousElementSibling;
    if (!label || label.tagName !== 'LABEL') return;

    const wrap = document.createElement('label');
    wrap.style.cssText = 'display:inline-flex;align-items:center;gap:6px;margin-left:10px;font-weight:700;font-size:13px;cursor:pointer;vertical-align:middle;';
    wrap.innerHTML = '<input id="notesNone" type="checkbox" style="width:18px;height:18px;min-height:0;margin:0"> <span>없음</span>';
    label.appendChild(wrap);

    const checkbox = wrap.querySelector('#notesNone');
    checkbox.checked = String(notes.value || '').trim() === '없음';
    checkbox.disabled = Boolean(notes.disabled);
    checkbox.addEventListener('change', syncNotesNoneState);

    if (checkbox.checked) {
      notes.readOnly = true;
      notes.style.background = '#f8fafc';
    }
  }

  function requireNotes() {
    const notes = document.getElementById('notes');
    if (!notes || notes.disabled) return true;

    if (notesNoneChecked()) {
      if (String(notes.value || '').trim() !== '없음') notes.value = '없음';
      return true;
    }

    const value = String(notes.value || '').trim();
    const hasRealText = /[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9]/.test(value);
    if (hasRealText) return true;

    alert('특이사항을 입력하거나 없음에 체크해주세요.');
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

    ensureNoneCheckbox();

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
