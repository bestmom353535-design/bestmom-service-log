(() => {
  if (window.__BESTMOM_ADMIN_ENDED_SIGNATURE_V53__) return;
  window.__BESTMOM_ADMIN_ENDED_SIGNATURE_V53__ = true;

  const previousOpenDay = window.openDay;
  if (typeof previousOpenDay !== 'function') return;

  function isEndedCase() {
    return typeof currentCase !== 'undefined' &&
      currentCase &&
      (currentCase.status === 'completed' || currentCase.status === 'stopped');
  }

  function decorateSignature(adminMode) {
    if (!adminMode || !isEndedCase()) return;

    const dayCard = document.querySelector('#day > .card');
    if (!dayCard) return;

    const headings = [...dayCard.querySelectorAll('h3')];
    const signatureHeading = headings.find((h) => h.textContent?.includes('산모 확인서명'));

    if (signatureHeading) {
      if (!signatureHeading.querySelector('[data-ended-sign-status]')) {
        const badge = document.createElement('span');
        badge.dataset.endedSignStatus = '1';
        badge.textContent = '서명 완료';
        badge.style.cssText = 'display:inline-block;margin-left:8px;padding:3px 7px;border-radius:999px;background:#dcfce7;color:#166534;font-size:11px;font-weight:800;vertical-align:middle;';
        signatureHeading.appendChild(badge);
      }
      return;
    }

    const wrap = document.createElement('div');
    wrap.dataset.endedSignatureEmpty = '1';
    wrap.innerHTML = `
      <div class="hr"></div>
      <div class="row space" style="align-items:center">
        <h3 style="margin:0">산모 확인서명</h3>
        <span style="display:inline-block;padding:3px 7px;border-radius:999px;background:#f3f4f6;color:#6b7280;font-size:11px;font-weight:800">서명 없음</span>
      </div>
      <div style="margin-top:10px;width:100%;height:140px;border:2px solid #9ca3af;border-radius:12px;background:#fff;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:13px;font-weight:700">
        저장된 산모 서명이 없습니다.
      </div>
    `;
    dayCard.appendChild(wrap);
  }

  window.openDay = async function openDayWithEndedSignature(day, adminMode) {
    await previousOpenDay(day, adminMode);
    decorateSignature(Boolean(adminMode));
  };
})();