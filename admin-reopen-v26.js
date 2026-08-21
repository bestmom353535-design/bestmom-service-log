(() => {
  let scanTimer = null;
  let scanning = false;

  function scheduleScan() {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, 80);
  }

  async function reopenService(caseId, motherName, button) {
    const ok = window.confirm(
      `${motherName || '해당 산모'}의 중도 종료를 해제하시겠습니까?\n\n진행 중 서비스로 다시 변경되며, 관리사님이 남은 일차 기록을 이어서 입력할 수 있습니다.\n기존 기록과 서명은 그대로 유지됩니다.`
    );
    if (!ok) return;

    if (button) button.disabled = true;
    try {
      const { error } = await sb.rpc('reopen_stopped_service_case', { p_case_id: caseId });
      if (error) throw error;
      alertMsg('중도 종료를 해제했습니다. 다시 진행 중으로 변경되었습니다.');
      if (typeof adminCases === 'function') await adminCases();
      else location.reload();
    } catch (err) {
      console.error(err);
      alertMsg(`중도 종료를 해제하지 못했습니다. ${err?.message || ''}`);
      if (button) button.disabled = false;
    }
  }

  async function scan() {
    if (scanning) return;
    const mainEl = document.getElementById('main');
    if (!mainEl || typeof me === 'undefined' || me?.role !== 'admin') return;

    const cards = [...mainEl.querySelectorAll('.card')];
    const card = cards.find((x) => x.querySelector('h3')?.textContent?.trim() === '서비스 현황');
    if (!card) return;

    const rows = [...card.querySelectorAll(':scope > .case')];
    const targets = rows.map((row) => {
      const openButton = [...row.querySelectorAll('button')].find((b) => (b.getAttribute('onclick') || '').includes('openCase('));
      const match = openButton?.getAttribute('onclick')?.match(/openCase\('([^']+)'/);
      return match ? { row, caseId: match[1], openButton } : null;
    }).filter(Boolean);

    if (!targets.length) return;

    scanning = true;
    try {
      const ids = targets.map((x) => x.caseId);
      const { data, error } = await sb.from('service_cases').select('id,status').in('id', ids);
      if (error) throw error;
      const statusMap = new Map((data || []).map((x) => [x.id, x.status]));

      targets.forEach(({ row, caseId, openButton }) => {
        const status = statusMap.get(caseId);
        const existing = row.querySelector(`[data-reopen-case="${caseId}"]`);

        if (status !== 'stopped') {
          existing?.remove();
          row.querySelector(`[data-stopped-badge="${caseId}"]`)?.remove();
          return;
        }

        if (!row.querySelector(`[data-stopped-badge="${caseId}"]`)) {
          const badge = document.createElement('div');
          badge.dataset.stoppedBadge = caseId;
          badge.className = 'muted tiny';
          badge.style.marginTop = '5px';
          badge.style.fontWeight = '800';
          badge.style.color = '#92400e';
          badge.textContent = '중도 종료된 서비스';
          row.querySelector('b')?.parentElement?.appendChild(badge);
        }

        if (!existing) {
          const motherName = row.querySelector('b')?.textContent?.trim() || '해당 산모';
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'ok';
          button.dataset.reopenCase = caseId;
          button.textContent = '중도 종료 해제';
          button.onclick = () => reopenService(caseId, motherName, button);
          const buttonRow = openButton.closest('.row') || row;
          buttonRow.appendChild(button);
        }
      });
    } catch (err) {
      console.error('중도 종료 해제 버튼 표시 오류', err);
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
