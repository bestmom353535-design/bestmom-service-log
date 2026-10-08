(() => {
  if (window.__BESTMOM_RECORD_STATUS_V75__) return;
  window.__BESTMOM_RECORD_STATUS_V75__ = true;

  const previousOpenCase = window.openCase;
  if (typeof previousOpenCase !== 'function') return;

  function formatServiceDate(value) {
    if (!value) return '날짜 미입력';
    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return String(value);

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
    return `${month}/${day} (${weekday})`;
  }

  async function refreshRecordStatus(id) {
    const caseId = id || (typeof currentCase !== 'undefined' ? currentCase?.id : null);
    if (!caseId) return;

    const { data: records, error } = await sb
      .from('daily_records')
      .select('service_day,service_date,locked')
      .eq('case_id', caseId)
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
      button.style.lineHeight = '1.25';

      if (!record) {
        button.innerHTML = `${day}일차<br><small style="font-size:11px;font-weight:800">미작성</small>`;
        button.style.background = '#f3f4f6';
        button.style.borderColor = '#d1d5db';
        button.style.color = '#4b5563';
        return;
      }

      const serviceDate = formatServiceDate(record.service_date);

      if (record.locked) {
        button.innerHTML = `${day}일차<br><small style="font-size:11px;font-weight:800">${serviceDate} · 서명완료 ✓</small>`;
        button.style.background = '#dcfce7';
        button.style.borderColor = '#86efac';
        button.style.color = '#166534';
      } else {
        button.innerHTML = `${day}일차<br><small style="font-size:11px;font-weight:800">${serviceDate} · 입력완료</small>`;
        button.style.background = '#dbeafe';
        button.style.borderColor = '#93c5fd';
        button.style.color = '#1d4ed8';
      }
    });

    const buttonRow = buttons[0]?.parentElement;
    if (!buttonRow) return;

    let summary = document.querySelector('[data-record-progress-summary]');
    if (!summary) {
      summary = document.createElement('div');
      summary.dataset.recordProgressSummary = '1';
      summary.style.cssText = 'margin:12px 0 10px;padding:11px 12px;border:1px solid #e5e7eb;border-radius:10px;background:#f8fafc;';
      buttonRow.insertAdjacentElement('beforebegin', summary);
    }

    summary.innerHTML = `
      <div style="font-size:14px;font-weight:800;margin-bottom:7px">기록 입력 완료 ${savedDays}/${totalDays}일 · 서명 완료 ${signedDays}/${totalDays}일</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;font-size:11px;font-weight:800">
        <span style="padding:4px 7px;border-radius:999px;background:#f3f4f6;color:#4b5563;border:1px solid #d1d5db">미작성</span>
        <span style="padding:4px 7px;border-radius:999px;background:#dbeafe;color:#1d4ed8;border:1px solid #93c5fd">날짜 · 입력완료</span>
        <span style="padding:4px 7px;border-radius:999px;background:#dcfce7;color:#166534;border:1px solid #86efac">날짜 · 서명완료 ✓</span>
      </div>`;
  }

  window.refreshRecordStatus = refreshRecordStatus;

  window.openCase = async function openCaseWithRecordStatus(id, adminMode) {
    await previousOpenCase(id, adminMode);
    await refreshRecordStatus(id);
  };
})();