(() => {
  if (window.__BESTMOM_ADMIN_COMPLETE_V42__) return;
  window.__BESTMOM_ADMIN_COMPLETE_V42__ = true;

  let scanTimer = null;
  let scanning = false;

  async function completeService(caseId, motherName, button) {
    if (button) button.disabled = true;
    try {
      const { data: serviceCase, error: caseError } = await sb
        .from('service_cases')
        .select('id,status,service_days')
        .eq('id', caseId)
        .single();
      if (caseError) throw caseError;
      if (!serviceCase || serviceCase.status !== 'active') {
        alertMsg('현재 진행 중인 서비스가 아닙니다.');
        if (typeof adminCases === 'function') await adminCases();
        return;
      }

      const { data: records, error: recordError } = await sb
        .from('daily_records')
        .select('service_day,locked')
        .eq('case_id', caseId)
        .gte('service_day', 1)
        .lte('service_day', serviceCase.service_days);
      if (recordError) throw recordError;

      const recordDays = new Set((records || []).map((row) => Number(row.service_day))).size;
      const signedDays = new Set((records || []).filter((row) => row.locked).map((row) => Number(row.service_day))).size;
      const totalDays = Number(serviceCase.service_days || 0);
      const incomplete = recordDays < totalDays || signedDays < totalDays;

      const message = incomplete
        ? `${motherName || '해당 산모'} 서비스를 완료 처리하시겠습니까?\n\n` +
          `⚠️ 전체 ${totalDays}일 중 기록 저장 ${recordDays}일 / 서명 완료 ${signedDays}일입니다.\n` +
          `아직 작성 또는 서명이 끝나지 않은 일차가 있습니다.\n\n` +
          `그래도 사무실에서 서비스 완료 처리하시겠습니까?\n` +
          `기존 기록과 서명은 그대로 보존됩니다.`
        : `${motherName || '해당 산모'} 서비스를 완료 처리하시겠습니까?\n\n` +
          `전체 ${totalDays}일 기록과 서명이 확인되었습니다.\n` +
          `완료 처리 후 종료 서비스로 이동합니다.`;

      if (!window.confirm(message)) return;

      const { error } = await sb.rpc('admin_complete_service_case', { p_case_id: caseId });
      if (error) throw error;

      alertMsg('서비스 완료 처리했습니다. 종료 서비스에서 확인할 수 있습니다.');
      if (typeof adminCases === 'function') await adminCases();
      else location.reload();
    } catch (err) {
      console.error(err);
      alertMsg(`서비스 완료 처리하지 못했습니다. ${err?.message || ''}`);
    } finally {
      const current = document.querySelector(`[data-admin-complete-case="${caseId}"]`);
      if (current) current.disabled = false;
    }
  }

  function scheduleScan() {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scanRows, 100);
  }

  async function scanRows() {
    if (scanning || typeof me === 'undefined' || me?.role !== 'admin') return;
    const mainEl = document.getElementById('main');
    if (!mainEl) return;

    const card = [...mainEl.querySelectorAll('.card')].find(
      (el) => el.querySelector('h3')?.textContent?.trim() === '서비스 현황'
    );
    if (!card) return;

    const targets = [...card.querySelectorAll(':scope > .case')].map((row) => {
      const openButton = [...row.querySelectorAll('button')].find((b) => (b.getAttribute('onclick') || '').includes('openCase('));
      const match = openButton?.getAttribute('onclick')?.match(/openCase\('([^']+)'/);
      return match ? { row, caseId: match[1], openButton } : null;
    }).filter(Boolean);

    if (!targets.length) return;

    scanning = true;
    try {
      const ids = targets.map((x) => x.caseId);
      const { data, error } = await sb
        .from('service_cases')
        .select('id,status')
        .in('id', ids);
      if (error) throw error;
      const statusMap = new Map((data || []).map((x) => [x.id, x.status]));

      targets.forEach(({ row, caseId, openButton }) => {
        const existing = row.querySelector(`[data-admin-complete-case="${caseId}"]`);
        if (statusMap.get(caseId) !== 'active') {
          existing?.remove();
          return;
        }
        if (existing) return;

        const motherName = row.querySelector('b')?.textContent?.trim() || '해당 산모';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'ok';
        button.dataset.adminCompleteCase = caseId;
        button.textContent = '서비스 완료';
        button.onclick = () => completeService(caseId, motherName, button);

        const buttonRow = openButton.closest('.row') || row;
        const stopButton = buttonRow.querySelector(`[data-admin-stop-case="${caseId}"]`);
        if (stopButton) buttonRow.insertBefore(button, stopButton);
        else buttonRow.appendChild(button);
      });
    } catch (err) {
      console.error('운영자 서비스 완료 버튼 표시 오류', err);
    } finally {
      scanning = false;
    }
  }

  function start() {
    const mainEl = document.getElementById('main');
    if (!mainEl) return;
    new MutationObserver(scheduleScan).observe(mainEl, { childList: true, subtree: true });
    scheduleScan();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
