(() => {
  if (window.__BESTMOM_ADMIN_DAY_DELETE_V61__) return;
  window.__BESTMOM_ADMIN_DAY_DELETE_V61__ = true;

  const previousOpenDay = window.openDay;
  if (typeof previousOpenDay !== 'function') return;

  function isAdmin() {
    return typeof me !== 'undefined' && me?.role === 'admin';
  }

  function clearPreparedDraft(caseId, day) {
    try {
      const key = 'bestmom_bulk_record_drafts_v56_' + caseId;
      const drafts = JSON.parse(localStorage.getItem(key) || '{}') || {};
      if (Object.prototype.hasOwnProperty.call(drafts, day)) {
        delete drafts[day];
        localStorage.setItem(key, JSON.stringify(drafts));
      }
    } catch (error) {
      console.warn('삭제 일차 초안 정리 오류', error);
    }
  }

  async function deleteDayRecord(day, recordId, button) {
    if (!isAdmin()) return;

    const caseId = currentCase?.id;
    const saved = Boolean(recordId);
    const hadSignature = Boolean(currentRecord?.signature_data);
    const serviceDate = currentRecord?.service_date || '미입력';

    const ok = window.confirm(
      saved
        ? `${day}일차 기록을 통째로 삭제하시겠습니까?\n\n` +
          `서비스 날짜: ${serviceDate}\n` +
          `입력된 제공기록${hadSignature ? '과 산모 서명' : ''}이 모두 삭제되고 ${day}일차가 미작성 상태로 돌아갑니다.\n\n` +
          '삭제 후 되돌릴 수 없습니다.'
        : `${day}일차에 화면에 채워진 내용을 모두 비우시겠습니까?\n\n` +
          '아직 저장되지 않은 초안과 입력값을 지우고 미작성 상태로 되돌립니다.'
    );
    if (!ok) return;

    if (button) button.disabled = true;
    try {
      if (saved) {
        const { error } = await sb.rpc('admin_delete_daily_record', {
          p_record_id: recordId
        });
        if (error) throw error;
      } else if (caseId && typeof me !== 'undefined' && me?.id) {
        try {
          await sb.from('record_audit').insert({
            record_id: null,
            case_id: caseId,
            actor_id: me.id,
            action: 'admin_unsaved_day_cleared',
            details: { service_day: Number(day) }
          });
        } catch (auditError) {
          console.warn('미저장 일차 초기화 이력 오류', auditError);
        }
      }

      if (caseId) clearPreparedDraft(caseId, String(day));

      alertMsg(
        saved
          ? `${day}일차 기록을 삭제했습니다. 해당 일차가 미작성 상태로 변경되었습니다.`
          : `${day}일차 입력내용을 비웠습니다.`
      );

      if (caseId) {
        await window.openCase(caseId, true);
        await window.openDay(day, true);
        const dateInput = document.getElementById('serviceDate');
        if (dateInput && !currentRecord?.id) dateInput.value = '';
      }
    } catch (error) {
      console.error(error);
      alertMsg(`일차 기록을 삭제하지 못했습니다. ${error?.message || ''}`);
      if (button) button.disabled = false;
    }
  }

  function decorate(day, adminMode) {
    if (!adminMode || !isAdmin()) return;

    const dayCard = document.querySelector('#day > .card');
    if (!dayCard || dayCard.querySelector('[data-admin-delete-day]')) return;

    const box = document.createElement('div');
    box.dataset.adminDeleteDay = '1';
    box.className = 'notice mt';
    box.style.cssText += ';border-color:#fecaca;background:#fff7f7;';
    box.innerHTML = `
      <div style="font-weight:800;color:#991b1b;margin-bottom:6px">운영자 · 일차 기록 삭제</div>
      <div class="muted tiny" style="margin-bottom:8px">${currentRecord?.id ? '이 일차의 저장된 입력내용과 산모 서명을 통째로 삭제하고 미작성 상태로 되돌립니다.' : '아직 저장 전이어도 화면에 채워진 초안과 입력값을 모두 비울 수 있습니다.'}</div>
      <button type="button" id="adminDeleteDayRecordBtn" class="danger" style="width:auto">${currentRecord?.id ? '이 일차 기록 삭제' : '이 일차 내용 비우기'}</button>
    `;

    dayCard.appendChild(box);
    const button = document.getElementById('adminDeleteDayRecordBtn');
    if (button) button.onclick = () => deleteDayRecord(Number(day), currentRecord?.id || null, button);
  }

  window.openDay = async function openDayWithAdminDelete(day, adminMode) {
    await previousOpenDay(day, adminMode);
    decorate(Number(day), Boolean(adminMode));
  };
})();