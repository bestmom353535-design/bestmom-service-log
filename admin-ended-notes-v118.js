(() => {
  'use strict';
  if (window.__BESTMOM_ENDED_NOTES_REVIEW_V118__) return;
  window.__BESTMOM_ENDED_NOTES_REVIEW_V118__ = true;

  let openedModal = null;
  let escapeHandler = null;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
  }

  function dateLabel(value) {
    const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return '날짜 미입력';
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00+09:00`);
    const dayName = ['일', '월', '화', '수', '목', '금', '토'][d.getUTCDay() === undefined ? 0 : (d.getUTCDay() + 1) % 7];
    return `${Number(m[2])}/${Number(m[3])}(${dayName})`;
  }

  function isAdmin() {
    return typeof me !== 'undefined' && me && me.role === 'admin';
  }

  function closeNotes() {
    if (openedModal) openedModal.remove();
    openedModal = null;
    if (escapeHandler) document.removeEventListener('keydown', escapeHandler);
    escapeHandler = null;
  }

  function statusFor(card, text, error = false) {
    const status = card?.querySelector('[data-ended-notes-status]');
    if (!status) return;
    status.textContent = text;
    status.style.color = error ? '#b91c1c' : '#475569';
  }

  async function saveNotes(record, card, reload) {
    if (!isAdmin()) return;
    const input = card.querySelector('[data-ended-notes-editor]');
    const saveButton = card.querySelector('[data-ended-notes-save]');
    const cancelButton = card.querySelector('[data-ended-notes-cancel]');
    if (!input || !saveButton) return;

    const newValue = input.value.trim() || null;
    const oldValue = (record.notes || '').trim() || null;
    if (newValue === oldValue) {
      statusFor(card, '변경된 내용이 없습니다.');
      return;
    }
    if (!newValue && !window.confirm(`${record.service_day}일차 특이사항을 비우시겠습니까?`)) return;
    if (record.locked && !window.confirm('산모 서명이 완료된 기록입니다. 서명은 그대로 유지하고 특이사항만 수정하시겠습니까?')) return;

    input.disabled = true;
    saveButton.disabled = true;
    if (cancelButton) cancelButton.disabled = true;
    statusFor(card, '저장 중...');
    try {
      const current = await sb.from('daily_records')
        .select('id,notes,updated_at')
        .eq('id', record.id).single();
      if (current.error) throw current.error;
      if (current.data.updated_at !== record.updated_at || (current.data.notes ?? null) !== (record.notes ?? null)) {
        throw new Error('다른 화면에서 기록이 변경되었습니다. 창을 닫고 다시 확인해주세요.');
      }

      // 서명, 잠금상태, 날짜 등은 변경하지 않고 특이사항 필드만 갱신합니다.
      const updated = await sb.from('daily_records')
        .update({notes: newValue})
        .eq('id', record.id)
        .eq('updated_at', record.updated_at)
        .select('id,notes,updated_at')
        .maybeSingle();
      if (updated.error) throw updated.error;
      if (!updated.data) throw new Error('다른 화면에서 기록이 수정되었습니다. 창을 닫고 다시 확인해주세요.');

      const audit = await sb.from('record_audit').insert({
        record_id: record.id,
        case_id: record.case_id,
        actor_id: me.id,
        action: record.locked ? 'admin_signed_record_edited' : 'admin_notes_edited',
        details: {
          service_day: record.service_day,
          changed_fields: ['notes'],
          original_signature_preserved: true,
          original_locked_status_preserved: true,
          source: 'ended_service_notes_review',
          notes_cleared: !newValue
        }
      });
      if (audit.error) console.warn('특이사항 수정 이력 저장 실패', audit.error);

      record.notes = updated.data.notes;
      record.updated_at = updated.data.updated_at;
      await reload();
      const changed = openedModal?.querySelector(`[data-ended-notes-day="${record.service_day}"]`);
      statusFor(changed, audit.error ? '특이사항 저장 완료 · 수정 이력 저장 실패(확인 필요)' : '수정한 특이사항이 저장되었습니다.', !!audit.error);
    } catch (error) {
      statusFor(card, `수정하지 못했습니다: ${error.message || error}`, true);
      input.disabled = false;
      saveButton.disabled = false;
      if (cancelButton) cancelButton.disabled = false;
    }
  }

  function renderRows(records, summary, body, caseId, motherName) {
    if (!openedModal?.isConnected) return;
    const filled = records.filter(r => Boolean((r.notes || '').trim())).length;
    summary.textContent = `저장된 제공기록 ${records.length}일 · 특이사항 입력 ${filled}일`;
    if (!records.length) {
      body.innerHTML = '<p class="muted" style="padding:14px">이 산모님의 저장된 제공기록이 없습니다.</p>';
      return;
    }
    body.innerHTML = records.map(record => `
      <section data-ended-notes-day="${Number(record.service_day)}" style="background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:14px;margin-bottom:10px">
        <div class="row space" style="align-items:center;gap:10px">
          <b style="font-size:15px">${Number(record.service_day)}일차 · ${esc(dateLabel(record.service_date))}</b>
          ${record.locked ? '<span class="muted tiny">서명 완료</span>' : ''}
        </div>
        <div data-ended-notes-value style="white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.7;margin-top:10px">${record.notes ? esc(record.notes) : '<span class="muted">입력된 특이사항 없음</span>'}</div>
        <div data-ended-notes-editwrap hidden style="margin-top:10px">
          <textarea data-ended-notes-editor style="width:100%;box-sizing:border-box;min-height:95px;resize:vertical;line-height:1.65"></textarea>
          <div class="row mt" style="gap:8px;flex-wrap:wrap">
            <button type="button" class="primary" data-ended-notes-save>저장</button>
            <button type="button" class="secondary" data-ended-notes-cancel>취소</button>
          </div>
        </div>
        <div class="row mt" style="align-items:center;gap:10px;flex-wrap:wrap">
          <button type="button" class="secondary" data-ended-notes-edit>특이사항 수정</button>
          <span class="muted tiny" data-ended-notes-status role="status" style="flex:1"></span>
        </div>
      </section>`).join('');

    records.forEach(record => {
      const card = body.querySelector(`[data-ended-notes-day="${record.service_day}"]`);
      if (!card) return;
      const editButton = card.querySelector('[data-ended-notes-edit]');
      const editWrap = card.querySelector('[data-ended-notes-editwrap]');
      const display = card.querySelector('[data-ended-notes-value]');
      const textarea = card.querySelector('[data-ended-notes-editor]');
      editButton.onclick = () => {
        textarea.value = record.notes || '';
        editWrap.hidden = false;
        display.hidden = true;
        editButton.hidden = true;
        textarea.focus();
        statusFor(card, '');
      };
      card.querySelector('[data-ended-notes-cancel]').onclick = () => {
        editWrap.hidden = true;
        display.hidden = false;
        editButton.hidden = false;
        statusFor(card, '');
      };
      card.querySelector('[data-ended-notes-save]').onclick =
        () => saveNotes(record, card, () => loadNotes(caseId, motherName));
    });
  }

  async function loadNotes(caseId, motherName) {
    const modal = openedModal;
    if (!modal?.isConnected) return;
    const summary = modal.querySelector('[data-ended-notes-summary]');
    const body = modal.querySelector('[data-ended-notes-body]');
    body.innerHTML = '<p class="muted">특이사항을 불러오는 중...</p>';
    const response = await sb.from('daily_records')
      .select('id,case_id,service_day,service_date,notes,locked,updated_at')
      .eq('case_id', caseId)
      .order('service_day', {ascending:true});
    if (modal !== openedModal || !modal.isConnected) return;
    if (response.error) {
      summary.textContent = '조회 실패';
      body.innerHTML = `<p style="color:#b91c1c">특이사항을 불러오지 못했습니다: ${esc(response.error.message)}</p>`;
      return;
    }
    renderRows(response.data || [], summary, body, caseId, motherName);
  }

  window.openEndedNotesReview = async function openEndedNotesReview(caseId, motherName) {
    if (!isAdmin() || !caseId) return;
    closeNotes();
    const overlay = document.createElement('div');
    overlay.id = 'endedNotesReviewModal';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(17,24,39,.52);display:flex;align-items:flex-start;justify-content:center;padding:14px;overflow:auto;';
    overlay.innerHTML = `
      <div role="dialog" aria-modal="true" aria-labelledby="endedNotesTitle" style="width:min(96vw,780px);background:#f8fafc;border-radius:16px;padding:16px;margin:12px 0 28px;box-shadow:0 18px 50px rgba(0,0,0,.25)">
        <div class="row space" style="align-items:flex-start;gap:10px">
          <div>
            <h3 id="endedNotesTitle" style="margin-bottom:4px">${esc(motherName || '산모')} 산모님 · 특이사항 확인</h3>
            <div class="muted" data-ended-notes-summary>특이사항을 불러오는 중...</div>
          </div>
          <button type="button" class="secondary" data-ended-notes-close style="width:auto;flex-shrink:0">닫기</button>
        </div>
        <div class="muted tiny mt" style="padding:10px;border:1px solid #e2e8f0;border-radius:10px;background:#fff">
          해당 산모님의 기록만 일차별로 표시합니다. 수정 시 특이사항 내용만 저장되며, 기존 산모 서명과 다른 제공기록은 유지됩니다.
        </div>
        <div data-ended-notes-body style="margin-top:12px"></div>
      </div>`;
    document.body.appendChild(overlay);
    openedModal = overlay;
    overlay.querySelector('[data-ended-notes-close]').onclick = closeNotes;
    overlay.addEventListener('click', e => { if (e.target === overlay) closeNotes(); });
    escapeHandler = e => { if (e.key === 'Escape') closeNotes(); };
    document.addEventListener('keydown', escapeHandler);
    await loadNotes(caseId, motherName);
  };
})();
