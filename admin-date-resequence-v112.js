(() => {
  if (window.__BESTMOM_DATE_RESEQUENCE_V112__) return;
  window.__BESTMOM_DATE_RESEQUENCE_V112__ = true;

  const previousOpenDay = window.openDay;
  if (typeof previousOpenDay !== 'function') return;

  // Official 2026/2027 public holidays and substitutes; individual leave is not included.
  const HOLIDAYS = new Set([
    '2026-01-01', '2026-02-16', '2026-02-17', '2026-02-18',
    '2026-03-01', '2026-03-02', '2026-05-01', '2026-05-05',
    '2026-05-24', '2026-05-25', '2026-06-03', '2026-06-06',
    '2026-07-17', '2026-08-15', '2026-08-17',
    '2026-09-24', '2026-09-25', '2026-09-26',
    '2026-10-03', '2026-10-05', '2026-10-09', '2026-12-25',
    '2027-01-01', '2027-02-06', '2027-02-07', '2027-02-08', '2027-02-09',
    '2027-03-01', '2027-05-01', '2027-05-03', '2027-05-05', '2027-05-13',
    '2027-06-06', '2027-07-17', '2027-07-19', '2027-08-15', '2027-08-16',
    '2027-09-14', '2027-09-15', '2027-09-16',
    '2027-10-03', '2027-10-04', '2027-10-09', '2027-10-11',
    '2027-12-25', '2027-12-27'
  ]);

  function parseDate(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) throw new Error('서비스 날짜를 확인해주세요.');
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
    if (date.toISOString().slice(0, 10) !== value) throw new Error('올바르지 않은 날짜입니다.');
    if (date.getUTCFullYear() < 2026 || date.getUTCFullYear() > 2027) {
      throw new Error('현재 자동 보정은 2026~2027년 공휴일 기준으로 제공됩니다. 그 외 연도는 날짜를 개별 확인해주세요.');
    }
    return date;
  }

  function nextWorkday(value) {
    const date = parseDate(value);
    for (let index = 0; index < 370; index += 1) {
      date.setUTCDate(date.getUTCDate() + 1);
      const label = date.toISOString().slice(0, 10);
      if (date.getUTCFullYear() > 2027) {
        throw new Error('자동 보정이 2027년 이후로 이어집니다. 연도별 공휴일을 확인한 뒤 수정해주세요.');
      }
      const weekday = date.getUTCDay();
      if (weekday !== 0 && weekday !== 6 && !HOLIDAYS.has(label)) return label;
    }
    throw new Error('서비스 날짜를 계산하지 못했습니다.');
  }

  function makePreview(records, firstDay, selectedDate) {
    parseDate(selectedDate);
    const sorted = [...records].sort((a, b) => Number(a.service_day) - Number(b.service_day));
    const byDay = new Map(sorted.map((row) => [Number(row.service_day), row]));
    const later = sorted.filter((row) => Number(row.service_day) >= firstDay);
    if (!later.length || !byDay.has(firstDay)) throw new Error('기준 일차 기록을 찾지 못했습니다.');

    // The sequence counts missing day numbers too, but only updates existing rows.
    const lastDay = Number(later[later.length - 1].service_day);
    const target = new Map([[firstDay, selectedDate]]);
    let previous = selectedDate;
    for (let day = firstDay + 1; day <= lastDay; day += 1) {
      previous = nextWorkday(previous);
      target.set(day, previous);
    }

    const updates = later.map((row) => ({
      id: row.id,
      service_day: Number(row.service_day),
      old_date: row.service_date,
      new_date: target.get(Number(row.service_day))
    }));
    const changed = updates.filter((row) => row.old_date !== row.new_date);
    const original = new Map(sorted.map((row) => [row.id, row]));
    const signedCount = changed.filter((row) =>
      original.get(row.id)?.locked || Boolean(original.get(row.id)?.signature_data)
    ).length;
    const earlierDates = new Set(sorted
      .filter((row) => Number(row.service_day) < firstDay)
      .map((row) => row.service_date));
    const duplicateWithEarlier = updates.find((row) => earlierDates.has(row.new_date));
    if (duplicateWithEarlier) {
      throw new Error('보정할 날짜가 앞선 일차와 겹칩니다. 수정할 기준 날짜를 다시 확인해주세요.');
    }
    return { updates, changed, signedCount, lastDay };
  }

  async function resequenceDates(day, button) {
    const caseId = typeof currentCase !== 'undefined' && currentCase?.id;
    const recordId = typeof currentRecord !== 'undefined' && currentRecord?.id;
    const selectedDate = document.getElementById('adminServiceDateFix')?.value;
    if (!caseId || !recordId) return alertMsg('서비스 기록을 먼저 열어주세요.');
    if (!selectedDate) return alertMsg('수정할 날짜를 선택해주세요.');

    const firstDay = Number(day);
    button.disabled = true;
    try {
      const { data, error } = await sb.from('daily_records')
        .select('id,service_day,service_date,locked,signature_data')
        .eq('case_id', caseId)
        .order('service_day', { ascending: true });
      if (error) throw error;

      const rows = data || [];
      const current = rows.find((row) => row.id === recordId);
      if (!current || Number(current.service_day) !== firstDay) {
        throw new Error('현재 기록이 변경되었습니다. 다시 열어주세요.');
      }

      const preview = makePreview(rows, firstDay, selectedDate);
      if (!preview.changed.length) {
        alertMsg('이미 선택한 날짜를 기준으로 이후 일차가 맞게 정리되어 있습니다.');
        return;
      }

      const lastTarget = preview.updates[preview.updates.length - 1]?.new_date || selectedDate;
      let confirmation = firstDay + '일차부터 마지막 작성 일차까지 날짜를 다시 계산합니다.\n\n' +
        firstDay + '일차: ' + (current.service_date || '미입력') + ' → ' + selectedDate + '\n' +
        preview.lastDay + '일차: ' + lastTarget + '\n' +
        '변경되는 날짜: ' + preview.changed.length + '건\n\n' +
        '주말과 2026~2027년 공휴일을 제외합니다. 개인 휴무·임시공휴일은 따로 확인해주세요.\n' +
        '기존 기록 내용과 서명은 변경하지 않습니다.';
      if (preview.signedCount) {
        confirmation += '\n\n⚠️ 서명된 일차 ' + preview.signedCount +
          '건도 날짜만 변경됩니다. 서명된 기록의 실제 서비스일과 일치하는지 꼭 확인해주세요.';
      }
      if (!window.confirm(confirmation + '\n\n이 날짜들로 수정하시겠습니까?')) return;

      const result = await sb.rpc('admin_resequence_service_dates', {
        p_case_id: caseId,
        p_start_day: firstDay,
        p_updates: preview.updates
      });
      if (result.error) throw result.error;
      const changed = Number(result.data);
      alertMsg(changed + '개 일차의 날짜를 변경했습니다. 기록 내용과 서명은 유지했습니다.');
      await window.openCase(caseId, true);
      await window.openDay(firstDay, true);
    } catch (error) {
      console.error('이후 일차 날짜 자동 보정 오류', error);
      alertMsg('날짜를 보정하지 못했습니다. ' + (error?.message || '다시 시도해주세요.'));
    } finally {
      if (button?.isConnected) button.disabled = false;
    }
  }

  function attach(day, adminMode) {
    if (!adminMode || typeof me === 'undefined' || me?.role !== 'admin') return;
    const input = document.getElementById('adminServiceDateFix');
    const button = document.getElementById('adminServiceDateFixBtn');
    const box = document.querySelector('[data-admin-date-fix]');
    if (!input || !button || !box || box.querySelector('[data-resequence-option]')) return;

    const option = document.createElement('label');
    option.dataset.resequenceOption = '1';
    option.className = 'muted';
    option.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:11px;margin-bottom:8px;cursor:pointer;font-size:14px';
    option.innerHTML = '<input type="checkbox" data-resequence-check checked style="flex:0 0 auto;width:18px;height:18px;min-height:0;margin:0">' +
      '<span>수정한 일차 이후 날짜도 평일 기준으로 자동 보정</span>';
    box.appendChild(option);

    const guide = document.createElement('div');
    guide.className = 'muted tiny';
    guide.style.margin = '3px 0 6px';
    guide.textContent = '선택하면 이후 일차 날짜까지 함께 조정됩니다. 체크 해제 시 기존처럼 해당 일차 날짜만 수정합니다.';
    box.appendChild(guide);

    const checkbox = option.querySelector('input');
    const originalClick = button.onclick;
    const updateLabel = () => {
      button.textContent = checkbox.checked ? '날짜 수정 · 이후 일차 보정' : '날짜 수정';
    };
    checkbox.addEventListener('change', updateLabel);
    updateLabel();
    button.onclick = (event) => {
      if (checkbox.checked) return resequenceDates(day, button);
      if (typeof originalClick === 'function') return originalClick.call(button, event);
    };
  }

  window.openDay = async function openDayWithResequencedDates(day, adminMode) {
    await previousOpenDay(day, adminMode);
    attach(Number(day), Boolean(adminMode));
  };

  // Exposed for deterministic read-only QA, not for invoking the database procedure.
  window.BestMomDatePreviewV112 = Object.freeze({ nextWorkday, makePreview });
})();