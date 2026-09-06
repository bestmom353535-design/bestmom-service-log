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
    if (!buttons.length) return;

    const totalDays = buttons.length;
    const savedDays = [...byDay.values()].length;
    const signedDays = [...byDay.values()].filter((row) => row.locked).length;

    buttons.forEach((button, index) => {
      const day = index + 1;
      const record = byDay.get(day);

      button.classList.remove('ok', 'secondary');
      button.style.border = '1.5px solid';
      button.style.boxShadow = 'none';

      if (!record) {
        button.innerHTML = `${day}일차<br><small style="font-size:11px;font-weight:800">미작성</small>`;
        button.style.background = '#f3f4f6';
        button.style.borderColor = '#d1d5db';
        button.style.color = '#4b5563';
        return;
      }

      if (record.locked) {
        button.innerHTML = `${day}일차<br><small style="font-size:11px;font-weight:800">서명완료 ✓</small>`;
        button.style.background = '#dcfce7';
        button.style.borderColor = '#86efac';
        button.style.color = '#166534';
      } else {
        button.innerHTML = `${day}일차<br><small style="font-size:11px;font-weight:800">기록완료 · 미서명</small>`;
        button.style.background = '#fff7ed';
        button.style.borderColor = '#f59e0b';
        button.style.color = '#92400e';
      }
    });

    const buttonRow = buttons[0]?.parentElement;
    if (!buttonRow || document.querySelector('[data-record-progress-summary]')) return;

    const summary = document.createElement('div');
    summary.dataset.recordProgressSummary = '1';
    summary.style.cssText = 'margin:12px 0 10px;padding:11px 12px;border:1px solid #e5e7eb;border-radius:10px;background:#f8fafc;';
    summary.innerHTML = `
      <div style="font-size:14px;font-weight:800;margin-bottom:7px">기록 작성 ${savedDays}/${totalDays}일 · 서명 완료 ${signedDays}/${totalDays}일</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;font-size:11px;font-weight:800">
        <span style="padding:4px 7px;border-radius:999px;background:#f3f4f6;color:#4b5563;border:1px solid #d1d5db">미작성</span>
        <span style="padding:4px 7px;border-radius:999px;background:#fff7ed;color:#92400e;border:1px solid #f59e0b">기록완료 · 미서명</span>
        <span style="padding:4px 7px;border-radius:999px;background:#dcfce7;color:#166534;border:1px solid #86efac">서명완료 ✓</span>
      </div>`;

    buttonRow.insertAdjacentElement('beforebegin', summary);
  };
})();
