(() => {
  const previousOpenCase = window.openCase;
  if (typeof previousOpenCase !== 'function') return;

  window.openCase = async function openCaseWithRecordStatus(id, adminMode) {
    await previousOpenCase(id, adminMode);

    const { data: records, error } = await sb
      .from('daily_records')
      .select('service_day,locked')
      .eq('case_id', id)
      .order('service_day');

    if (error) {
      console.error(error);
      return;
    }

    const byDay = new Map((records || []).map((row) => [Number(row.service_day), row]));
    const buttons = [...document.querySelectorAll('#main .record-button')];

    buttons.forEach((button, index) => {
      const day = index + 1;
      const record = byDay.get(day);
      if (!record) return;

      if (record.locked) {
        button.innerHTML = `${day}일차<br><small style="font-size:11px;font-weight:700">서명완료 ✓</small>`;
      } else {
        button.innerHTML = `${day}일차<br><small style="font-size:11px;font-weight:700">저장됨 · 서명전</small>`;
        button.style.background = '#fff7ed';
        button.style.borderColor = '#f59e0b';
        button.style.color = '#92400e';
      }
    });
  };
})();
