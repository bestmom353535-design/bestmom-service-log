(() => {
  const previousOpenDay = window.openDay;
  if (typeof previousOpenDay !== 'function') return;

  let scanTimer = null;
  let scanning = false;

  function escapeAttr(value) {
    return String(value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  async function changeServiceDate(day, recordId, button) {
    const input = document.getElementById('adminServiceDateFix');
    const newDate = String(input?.value || '').trim();
    if (!newDate) return alertMsg('수정할 서비스 날짜를 선택해주세요.');

    const oldDate = String(currentRecord?.service_date || '');
    if (newDate === oldDate) return alertMsg('현재 날짜와 동일합니다.');

    const ok = window.confirm(
      `${day}일차 서비스 날짜를\n${oldDate || '미입력'} → ${newDate}\n로 수정하시겠습니까?\n\n기존 기록과 산모 서명은 그대로 유지됩니다.`
    );
    if (!ok) return;

    if (button) button.disabled = true;
    try {
      const { error } = await sb.rpc('admin_change_record_service_date', {
        p_record_id: recordId,
        p_service_date: newDate
      });
      if (error) throw error;

      alertMsg('서비스 날짜를 수정했습니다. 기존 기록과 서명은 그대로 유지됩니다.');
      if (currentCase?.id) {
        await window.openCase(currentCase.id, true);
        await window.openDay(day, true);
      }
    } catch (err) {
      console.error(err);
      alertMsg(`날짜를 수정하지 못했습니다. ${err?.message || ''}`);
      if (button) button.disabled = false;
    }
  }

  function addAdminDateCorrection(day) {
    if (typeof me === 'undefined' || me?.role !== 'admin') return;
    if (!currentRecord?.id) return;

    const dayCard = document.querySelector('#day > .card');
    if (!dayCard || dayCard.querySelector('[data-admin-date-fix]')) return;

    const box = document.createElement('div');
    box.dataset.adminDateFix = '1';
    box.className = 'notice';
    box.style.marginBottom = '14px';
    box.innerHTML = `
      <div style="font-weight:800;margin-bottom:7px">운영자 · 서비스 날짜 수정</div>
      <div class="muted" style="margin-bottom:8px">관리사가 날짜를 잘못 저장했을 때 날짜만 바로잡습니다. 기존 기록과 산모 서명은 유지됩니다.</div>
      <div class="row" style="align-items:end">
        <div style="flex:1 1 180px">
          <label>서비스 날짜</label>
          <input id="adminServiceDateFix" type="date" value="${escapeAttr(currentRecord.service_date || '')}">
        </div>
        <button id="adminServiceDateFixBtn" type="button" class="secondary">날짜 수정</button>
      </div>`;

    const titleRow = dayCard.querySelector('.row.space');
    if (titleRow) titleRow.insertAdjacentElement('afterend', box);
    else dayCard.prepend(box);

    const button = document.getElementById('adminServiceDateFixBtn');
    if (button) button.onclick = () => changeServiceDate(day, currentRecord.id, button);
  }

  function protectLockedAdminRecord() {
    if (typeof me === 'undefined' || me?.role !== 'admin') return;
    if (!currentRecord?.id || !currentRecord?.locked) return;

    const dayCard = document.querySelector('#day > .card');
    if (!dayCard) return;

    dayCard.querySelectorAll('input, select, textarea').forEach((el) => {
      if (el.id === 'adminServiceDateFix') return;
      el.disabled = true;
    });

    const saveButton = document.getElementById('save');
    if (saveButton) saveButton.style.display = 'none';

    if (!dayCard.querySelector('[data-admin-locked-guide]')) {
      const guide = document.createElement('div');
      guide.dataset.adminLockedGuide = '1';
      guide.className = 'muted tiny';
      guide.style.margin = '8px 0 12px';
      guide.textContent = '서명 완료 기록입니다. 날짜는 위에서 바로 수정할 수 있으며, 다른 내용을 바꾸려면 잠금해제 후 산모 서명을 다시 받아야 합니다.';
      const dateFix = dayCard.querySelector('[data-admin-date-fix]');
      dateFix?.insertAdjacentElement('afterend', guide);
    }
  }

  window.openDay = async function openDayWithAdminControls(day, adminMode) {
    await previousOpenDay(day, adminMode);
    if (!adminMode) return;
    addAdminDateCorrection(day);
    protectLockedAdminRecord();
  };

  async function stopService(caseId, motherName, button) {
    const ok = window.confirm(
      `${motherName || '해당 산모'} 서비스를 중도 종료하시겠습니까?\n\n관리사 교체 또는 실제 서비스 중단 시에만 사용해주세요.\n기존에 작성된 기록과 서명은 그대로 보존됩니다.`
    );
    if (!ok) return;

    if (button) button.disabled = true;
    try {
      const { error } = await sb.rpc('admin_stop_service_case', { p_case_id: caseId });
      if (error) throw error;

      alertMsg('서비스를 중도 종료 처리했습니다. 기존 기록과 서명은 그대로 보존됩니다.');
      if (typeof adminCases === 'function') await adminCases();
      else location.reload();
    } catch (err) {
      console.error(err);
      alertMsg(`중도 종료하지 못했습니다. ${err?.message || ''}`);
      if (button) button.disabled = false;
    }
  }

  function scheduleScan() {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scanServiceRows, 90);
  }

  async function scanServiceRows() {
    if (scanning || typeof me === 'undefined' || me?.role !== 'admin') return;
    const mainEl = document.getElementById('main');
    if (!mainEl) return;

    const card = [...mainEl.querySelectorAll('.card')].find(
      (x) => x.querySelector('h3')?.textContent?.trim() === '서비스 현황'
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
      const { data, error } = await sb.from('service_cases').select('id,status').in('id', ids);
      if (error) throw error;
      const statusMap = new Map((data || []).map((x) => [x.id, x.status]));

      targets.forEach(({ row, caseId, openButton }) => {
        const status = statusMap.get(caseId);
        const existing = row.querySelector(`[data-admin-stop-case="${caseId}"]`);

        if (status !== 'active') {
          existing?.remove();
          return;
        }
        if (existing) return;

        const motherName = row.querySelector('b')?.textContent?.trim() || '해당 산모';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'danger';
        button.dataset.adminStopCase = caseId;
        button.textContent = '서비스 중도 종료';
        button.onclick = () => stopService(caseId, motherName, button);

        const buttonRow = openButton.closest('.row') || row;
        buttonRow.appendChild(button);
      });
    } catch (err) {
      console.error('운영자 서비스 중도 종료 버튼 표시 오류', err);
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
