(() => {
  const previousOpenDay = window.openDay;
  if (typeof previousOpenDay !== 'function') return;

  function hasChecked(name) {
    return Boolean(document.querySelector(`input[name="${name}"]:checked`));
  }

  function isBlank(id) {
    const el = document.getElementById(id);
    return !el || String(el.value ?? '').trim() === '';
  }

  function missingItems() {
    const missing = [];

    if (isBlank('serviceDate')) missing.push('서비스 날짜');
    if (!hasChecked('inc')) missing.push('① 회음절개부위(또는 수술부위)');
    if (!hasChecked('breast')) missing.push('② 유방상태');
    if (!hasChecked('urine')) missing.push('③ 배뇨/배변');
    if (!hasChecked('sitz')) missing.push('④ 좌욕');
    if (isBlank('meal')) missing.push('⑤ 식사 횟수');
    if (isBlank('snack')) missing.push('⑤ 간식 횟수');
    if (isBlank('temp')) missing.push('⑥ 체온');
    if (!hasChecked('sleep')) missing.push('⑦ 수면 양상');
    if (isBlank('bf')) missing.push('⑧ 모유수유 횟수');
    if (isBlank('fc')) {
      missing.push('⑨ 분유수유 횟수');
    } else {
      const formulaCount = Number(document.getElementById('fc')?.value || 0);
      if (formulaCount > 0 && isBlank('fml')) missing.push('⑨ 회당 ml');
    }
    if (!hasChecked('stool')) missing.push('⑩ 배변양상');
    if (!hasChecked('bath')) missing.push('⑪ 목욕·제대관리');
    if (isBlank('notes')) missing.push('특이사항');

    return missing;
  }

  window.openDay = async function openDayWithInputWarning(day, adminMode) {
    await previousOpenDay(day, adminMode);

    // 관리사 기록 저장 시에만 누락 항목을 확인합니다.
    if (adminMode) return;

    const saveButton = document.getElementById('save');
    if (!saveButton || typeof saveButton.onclick !== 'function') return;

    const originalClick = saveButton.onclick;
    saveButton.onclick = async (event) => {
      const missing = missingItems();
      if (missing.length) {
        const preview = missing.slice(0, 6).map((item) => `· ${item}`).join('\n');
        const more = missing.length > 6 ? `\n외 ${missing.length - 6}개 항목` : '';
        const proceed = window.confirm(
          `입력되지 않은 항목이 있습니다.\n\n${preview}${more}\n\n그래도 저장하시겠습니까?`
        );
        if (!proceed) return;
      }
      return originalClick.call(saveButton, event);
    };
  };
})();
