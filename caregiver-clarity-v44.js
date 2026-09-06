(() => {
  if (window.__BESTMOM_CAREGIVER_CLARITY_V44__) return;
  window.__BESTMOM_CAREGIVER_CLARITY_V44__ = true;

  const previousOpenDay = window.openDay;
  if (typeof previousOpenDay !== 'function') return;

  let activeDay = null;

  function hasUnsavedSignature() {
    return typeof me !== 'undefined' && me?.role === 'caregiver' &&
      Boolean(document.getElementById('sig')) &&
      typeof signatureDirty !== 'undefined' && signatureDirty === true;
  }

  function confirmLeaveUnsigned() {
    if (!hasUnsavedSignature()) return true;
    return window.confirm(
      '산모 서명이 아직 저장되지 않았습니다.\n\n' +
      '서명 후에는 반드시 ‘서명 저장하고 완료’를 눌러야 최종 저장됩니다.\n\n' +
      '그래도 저장하지 않고 나가시겠습니까?'
    );
  }

  function enhanceSignatureArea() {
    if (typeof me === 'undefined' || me?.role !== 'caregiver') return;

    const canvas = document.getElementById('sig');
    if (!canvas) return;

    try {
      const ctx = canvas.getContext('2d');
      ctx.lineWidth = 3.2;
      ctx.strokeStyle = '#111827';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    } catch (_) {}

    const signButton = document.getElementById('sign');
    if (signButton) {
      signButton.textContent = '서명 저장하고 완료';
      signButton.style.flex = '2 1 190px';
      signButton.style.minHeight = '54px';
      signButton.style.fontSize = '17px';
      signButton.style.fontWeight = '800';
    }

    const clearButton = document.getElementById('clear');
    if (clearButton) clearButton.style.flex = '1 1 90px';

    if (!document.querySelector('[data-signature-finish-guide]')) {
      const guide = document.createElement('div');
      guide.dataset.signatureFinishGuide = '1';
      guide.style.cssText = 'margin:0 0 8px;padding:8px 10px;border-radius:8px;background:#f8fafc;border:1px solid #d1d5db;font-size:12px;font-weight:800;color:#374151;line-height:1.45;';
      guide.textContent = '산모님 서명 후 아래 ‘서명 저장하고 완료’ 버튼까지 눌러야 완료됩니다.';
      canvas.insertAdjacentElement('beforebegin', guide);
    }

    const back = document.getElementById('back');
    if (back && back.dataset.signatureGuard !== '1') {
      const originalBack = back.onclick;
      back.dataset.signatureGuard = '1';
      back.onclick = (event) => {
        if (!confirmLeaveUnsigned()) return;
        if (typeof signatureDirty !== 'undefined') signatureDirty = false;
        if (typeof originalBack === 'function') return originalBack.call(back, event);
      };
    }
  }

  window.openDay = async function openDayWithCaregiverClarity(day, adminMode) {
    const nextDay = Number(day);
    if (!adminMode && activeDay !== null && activeDay !== nextDay && hasUnsavedSignature()) {
      if (!confirmLeaveUnsigned()) return;
      signatureDirty = false;
    }

    await previousOpenDay(day, adminMode);
    activeDay = nextDay;

    if (!adminMode) enhanceSignatureArea();
  };

  window.addEventListener('beforeunload', (event) => {
    if (!hasUnsavedSignature()) return;
    event.preventDefault();
    event.returnValue = '';
  });
})();
