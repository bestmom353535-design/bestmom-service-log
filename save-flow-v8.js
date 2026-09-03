(() => {
  const originalOpenDay = window.openDay;
  const originalSaveDay = window.saveDay || (typeof saveDay === 'function' ? saveDay : null);
  if (typeof originalOpenDay !== 'function' || typeof originalSaveDay !== 'function') return;

  let suppressNextDateScroll = false;

  async function withoutListNavigation(task) {
    const realOpenCase = window.openCase;
    window.openCase = async () => {};
    try {
      await task();
    } finally {
      window.openCase = realOpenCase;
    }
  }

  function scrollToServiceDate() {
    const serviceDate = document.getElementById('serviceDate');
    if (!serviceDate) return;
    setTimeout(() => {
      serviceDate.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  }

  function scrollToSignature() {
    setTimeout(() => {
      const signatureCanvas = document.getElementById('sig');
      if (!signatureCanvas) return;
      const heading = [...document.querySelectorAll('h3')].find((el) => el.textContent?.includes('산모 확인서명'));
      (heading || signatureCanvas).scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 120);
  }

  function restoreScrollPosition(top) {
    const restore = () => window.scrollTo({ top, left: 0, behavior: 'auto' });
    restore();
    requestAnimationFrame(() => {
      restore();
      requestAnimationFrame(restore);
    });
    setTimeout(restore, 120);
  }

  window.openDay = async function improvedDayFlow(day, adminMode) {
    await originalOpenDay(day, adminMode);

    const saveButton = document.getElementById('save');
    if (saveButton) {
      saveButton.onclick = async () => {
        if (saveButton.disabled) return;
        saveButton.disabled = true;
        const keepScrollY = window.scrollY;
        try {
          // 기록 저장 후 같은 일차 화면을 갱신한다.
          await withoutListNavigation(() => originalSaveDay(day, adminMode, false));
          suppressNextDateScroll = true;
          await window.openDay(day, adminMode);

          // 관리사 화면에서는 저장이 끝나면 바로 산모 서명란으로 부드럽게 이동한다.
          // 운영자 화면에서는 기존처럼 보고 있던 위치를 유지한다.
          if (adminMode) restoreScrollPosition(keepScrollY);
          else scrollToSignature();
        } finally {
          const currentSave = document.getElementById('save');
          if (currentSave) currentSave.disabled = false;
        }
      };
    }

    const signButton = document.getElementById('sign');
    if (signButton) {
      signButton.onclick = async () => {
        if (signButton.disabled) return;
        signButton.disabled = true;
        try {
          // 최종 서명·잠금이 끝나면 일차 목록 위쪽으로 이동한다.
          await originalSaveDay(day, false, true);
          setTimeout(() => {
            const main = document.getElementById('main');
            if (main) main.scrollIntoView({ behavior: 'smooth', block: 'start' });
            else window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 80);
        } finally {
          const currentSign = document.getElementById('sign');
          if (currentSign) currentSign.disabled = false;
        }
      };
    }

    // 일차를 처음 선택해 들어올 때만 서비스 날짜 입력란이 바로 보이도록 이동한다.
    if (suppressNextDateScroll) suppressNextDateScroll = false;
    else scrollToServiceDate();
  };
})();