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
          // 기록 저장 후에는 현재 보고 있던 위치를 그대로 유지한다.
          await withoutListNavigation(() => originalSaveDay(day, adminMode, false));
          suppressNextDateScroll = true;
          await window.openDay(day, adminMode);
          restoreScrollPosition(keepScrollY);
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
