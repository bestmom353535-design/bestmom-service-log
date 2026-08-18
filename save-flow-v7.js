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

  window.openDay = async function stayOnDayAfterSave(day, adminMode) {
    await originalOpenDay(day, adminMode);

    const saveButton = document.getElementById('save');
    if (saveButton) {
      saveButton.onclick = async () => {
        if (saveButton.disabled) return;
        saveButton.disabled = true;
        try {
          await withoutListNavigation(() => originalSaveDay(day, adminMode, false));
          await window.openDay(day, adminMode);
          const sig = document.getElementById('sig');
          if (sig) sig.scrollIntoView({ behavior: 'smooth', block: 'center' });
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
          await withoutListNavigation(() => originalSaveDay(day, false, true));
          await window.openDay(day, false);
          document.getElementById('day')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } finally {
          const currentSign = document.getElementById('sign');
          if (currentSign) currentSign.disabled = false;
        }
      };
    }
  };
})();
