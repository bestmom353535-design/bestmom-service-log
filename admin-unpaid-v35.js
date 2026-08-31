(() => {
  let scanTimer = null;

  function esc(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function shortDate(value) {
    if (!value) return '';
    const parts = String(value).split('-');
    if (parts.length !== 3) return String(value);
    return `${Number(parts[1])}/${Number(parts[2])}`;
  }

  async function loadCaseAndReasons(caseId) {
    const [caseRes, reasonRes] = await Promise.all([
      sb.from('service_cases')
        .select('id,mother_name,baby_name,service_days,status')
        .eq('id', caseId)
        .single(),
      sb.from('unpaid_reasons')
        .select('id,case_id,unpaid_date,reason,created_at,updated_at')
        .eq('case_id', caseId)
        .order('unpaid_date', { ascending: true })
    ]);
    if (caseRes.error) throw caseRes.error;
    if (reasonRes.error) throw reasonRes.error;
    return { serviceCase: caseRes.data, reasons: reasonRes.data || [] };
  }

  async function addReason(caseId, button) {
    const date = document.getElementById('unpaidNewDate')?.value || '';
    const reason = document.getElementById('unpaidNewReason')?.value?.trim() || '';
    if (!date) return alertMsg('미결제 일자를 선택해주세요.');
    if (!reason) return alertMsg('미결제 사유를 입력해주세요.');

    if (button) button.disabled = true;
    try {
      const { error } = await sb.rpc('admin_add_unpaid_reason', {
        p_case_id: caseId,
        p_unpaid_date: date,
        p_reason: reason
      });
      if (error) throw error;
      alertMsg('미결제 사유를 등록했습니다. 최종 PDF에 자동 반영됩니다.');
      await window.openUnpaidReasonEditor(caseId);
    } catch (err) {
      console.error(err);
      alertMsg(`등록하지 못했습니다. ${err?.message || ''}`);
      if (button) button.disabled = false;
    }
  }

  async function updateReason(caseId, reasonId, button) {
    const row = document.querySelector(`[data-unpaid-row="${reasonId}"]`);
    const date = row?.querySelector('[data-unpaid-date]')?.value || '';
    const reason = row?.querySelector('[data-unpaid-text]')?.value?.trim() || '';
    if (!date) return alertMsg('미결제 일자를 선택해주세요.');
    if (!reason) return alertMsg('미결제 사유를 입력해주세요.');

    if (button) button.disabled = true;
    try {
      const { error } = await sb.rpc('admin_update_unpaid_reason', {
        p_reason_id: reasonId,
        p_unpaid_date: date,
        p_reason: reason
      });
      if (error) throw error;
      alertMsg('미결제 사유를 수정했습니다.');
      await window.openUnpaidReasonEditor(caseId);
    } catch (err) {
      console.error(err);
      alertMsg(`수정하지 못했습니다. ${err?.message || ''}`);
      if (button) button.disabled = false;
    }
  }

  async function deleteReason(caseId, reasonId, label, button) {
    const ok = window.confirm(`${label || '해당 미결제 사유'}를 삭제하시겠습니까?\n\n삭제하면 최종 PDF에서도 빠집니다.`);
    if (!ok) return;

    if (button) button.disabled = true;
    try {
      const { error } = await sb.rpc('admin_delete_unpaid_reason', { p_reason_id: reasonId });
      if (error) throw error;
      alertMsg('미결제 사유를 삭제했습니다.');
      await window.openUnpaidReasonEditor(caseId);
    } catch (err) {
      console.error(err);
      alertMsg(`삭제하지 못했습니다. ${err?.message || ''}`);
      if (button) button.disabled = false;
    }
  }

  window.openUnpaidReasonEditor = async function openUnpaidReasonEditor(caseId) {
    try {
      if (typeof me === 'undefined' || me?.role !== 'admin') return;
      const { serviceCase, reasons } = await loadCaseAndReasons(caseId);
      const capacity = Math.max(4, Math.ceil(Number(serviceCase.service_days || 0) / 5) * 4);
      const full = reasons.length >= capacity;

      const rowsHtml = reasons.length ? reasons.map((item) => `
        <div class="case" data-unpaid-row="${item.id}">
          <div class="grid">
            <div>
              <label>미결제 일자</label>
              <input type="date" data-unpaid-date value="${esc(item.unpaid_date || '')}">
            </div>
            <div>
              <label>미결제 사유</label>
              <input type="text" maxlength="80" data-unpaid-text value="${esc(item.reason || '')}">
            </div>
          </div>
          <div class="row mt">
            <button type="button" class="secondary" data-unpaid-update="${item.id}">수정 저장</button>
            <button type="button" class="danger" data-unpaid-delete="${item.id}">삭제</button>
          </div>
        </div>`).join('') : '<p class="muted">등록된 미결제 사유가 없습니다.</p>';

      main().innerHTML = `
        <div class="card">
          <div class="row space">
            <div>
              <h3>${esc(serviceCase.mother_name)} 산모 · 미결제 사유 입력</h3>
              <div class="muted">원본 제공기록지 하단의 <b>실시간 미결제 사유서</b>에 자동으로 들어갑니다.</div>
            </div>
            <button id="unpaidBack" type="button" class="secondary">← 종료 서비스</button>
          </div>
          <div class="notice mt">
            PDF에는 일자가 <b>9/16</b> 형식으로 표시됩니다. 기관장 (인) 칸은 비워둡니다.<br>
            현재 ${reasons.length}/${capacity}건 등록됨 · 원본 PDF 고정 칸 기준 최대 ${capacity}건
          </div>
        </div>
        <div class="card">
          <h3>새 미결제 사유</h3>
          <div class="grid">
            <div>
              <label>미결제 일자</label>
              <input id="unpaidNewDate" type="date" ${full ? 'disabled' : ''}>
            </div>
            <div>
              <label>미결제 사유</label>
              <input id="unpaidNewReason" type="text" maxlength="80" placeholder="예: 전자바우처 결제오류" ${full ? 'disabled' : ''}>
            </div>
          </div>
          <button id="unpaidAdd" type="button" class="primary mt" ${full ? 'disabled' : ''}>미결제 사유 등록</button>
          ${full ? '<div class="muted tiny mt">원본 PDF의 미결제 사유 칸을 모두 사용했습니다.</div>' : ''}
        </div>
        <div class="card">
          <h3>등록된 미결제 사유</h3>
          ${rowsHtml}
        </div>`;

      document.getElementById('unpaidBack').onclick = () => {
        if (typeof window.renderEndedServices === 'function') window.renderEndedServices();
        else if (typeof window.adminCases === 'function') window.adminCases();
      };
      const addButton = document.getElementById('unpaidAdd');
      if (addButton && !full) addButton.onclick = () => addReason(caseId, addButton);

      reasons.forEach((item) => {
        const row = document.querySelector(`[data-unpaid-row="${item.id}"]`);
        const updateButton = row?.querySelector(`[data-unpaid-update="${item.id}"]`);
        const deleteButton = row?.querySelector(`[data-unpaid-delete="${item.id}"]`);
        if (updateButton) updateButton.onclick = () => updateReason(caseId, item.id, updateButton);
        if (deleteButton) deleteButton.onclick = () => deleteReason(caseId, item.id, `${shortDate(item.unpaid_date)} · ${item.reason}`, deleteButton);
      });
    } catch (err) {
      console.error(err);
      main().innerHTML = `<div class="card"><p>미결제 사유를 불러오지 못했습니다.</p><div class="muted">${esc(err?.message || '')}</div></div>`;
    }
  };

  function addEndedButtons() {
    if (typeof me === 'undefined' || me?.role !== 'admin') return;
    document.querySelectorAll('[data-ended-case]').forEach((row) => {
      const caseId = row.getAttribute('data-ended-case');
      if (!caseId || row.querySelector(`[data-unpaid-open="${caseId}"]`)) return;
      const buttonRow = row.querySelector('.row.mt');
      if (!buttonRow) return;
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'secondary';
      button.dataset.unpaidOpen = caseId;
      button.textContent = '미결제 사유 입력';
      button.onclick = () => window.openUnpaidReasonEditor(caseId);
      const pdfButton = [...buttonRow.querySelectorAll('button')].find((b) => (b.textContent || '').includes('PDF'));
      if (pdfButton) pdfButton.insertAdjacentElement('afterend', button);
      else buttonRow.appendChild(button);
    });
  }

  function scheduleScan() {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(addEndedButtons, 80);
  }

  function start() {
    const mainEl = document.getElementById('main');
    if (!mainEl) return;
    new MutationObserver(scheduleScan).observe(mainEl, { childList: true, subtree: true });
    addEndedButtons();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();