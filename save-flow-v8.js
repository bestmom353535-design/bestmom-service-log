(() => {
  const originalOpenDay = window.openDay;
  const originalSaveDay = window.saveDay || (typeof saveDay === 'function' ? saveDay : null);
  if (typeof originalOpenDay !== 'function' || typeof originalSaveDay !== 'function') return;

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

  window.openDay = async function improvedDayFlow(day, adminMode) {
    await originalOpenDay(day, adminMode);

    const saveButton = document.getElementById('save');
    if (saveButton) {
      saveButton.onclick = async () => {
        if (saveButton.disabled) return;
        saveButton.disabled = true;
        try {
          // 기록 저장만 할 때는 현재 일차를 유지한 뒤 바로 서명 영역으로 이동한다.
          await withoutListNavigation(() => originalSaveDay(day, adminMode, false));
          await window.openDay(day, adminMode);
          const sig = document.getElementById('sig');
          if (sig) {
            setTimeout(() => sig.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
          }
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
          // 최종 서명·잠금이 끝나면 원래 동작대로 일차 목록으로 복귀한다.
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

    // 일차를 선택해 들어오면 서비스 날짜 입력란이 바로 보이도록 이동한다.
    scrollToServiceDate();
  };
})();
