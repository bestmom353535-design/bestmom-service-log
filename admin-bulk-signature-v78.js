(() => {
  if (window.__BESTMOM_ADMIN_BULK_SIGNATURE_V82__) return;
  window.__BESTMOM_ADMIN_BULK_SIGNATURE_V82__ = true;

  const previousOpenCase = window.openCase;
  if (typeof previousOpenCase !== 'function') return;

  function isAdmin() {
    return typeof me !== 'undefined' && me?.role === 'admin';
  }

  async function applyDay1SignatureToAll(caseId, button) {
    if (!isAdmin()) return;

    if (button) button.disabled = true;
    try {
      const { data: rows, error } = await sb
        .from('daily_records')
        .select('service_day,signature_data')
        .eq('case_id', caseId)
        .order('service_day');
      if (error) throw error;

      const savedRows = rows || [];
      const source = savedRows.find((row) => Number(row.service_day) === 1);
      if (!source) {
        alertMsg('1일차 기록이 없습니다. 먼저 1일차 기록을 저장해주세요.');
        return;
      }
      if (!String(source.signature_data || '').trim()) {
        alertMsg('1일차 산모 서명이 없습니다. 먼저 1일차에 서명을 저장해주세요.');
        return;
      }

      const expectedDays = Number(
        typeof currentCase !== 'undefined' && currentCase?.id === caseId
          ? currentCase.service_days
          : 0
      );
      const isActiveCase =
        typeof currentCase !== 'undefined' &&
        currentCase?.id === caseId &&
        currentCase?.status === 'active';

      if (isActiveCase && expectedDays > 0 && savedRows.length < expectedDays) {
        alertMsg(
          `현재 ${expectedDays}일 중 ${savedRows.length}일차만 저장되어 있어 전체 서명을 적용할 수 없습니다.\n\n먼저 ‘1일차 기준 전체 자동 입력’을 눌러 나머지 일차 기록을 저장해주세요.`
        );
        return;
      }

      const unsigned = savedRows.filter(
        (row) => Number(row.service_day) !== 1 && !String(row.signature_data || '').trim()
      );
      if (!unsigned.length) {
        alertMsg('현재 서명이 비어 있는 저장 일차가 없습니다.');
        return;
      }

      const days = unsigned.map((row) => Number(row.service_day)).join(', ');
      const ok = window.confirm(
        `1일차에 저장된 산모 서명을 서명이 없는 ${unsigned.length}개 일차에 일괄 적용하시겠습니까?\n\n` +
        `적용 일차: ${days}\n\n` +
        '이미 서명된 일차는 덮어쓰지 않습니다. 산모님께서 같은 서명을 사용하는 것에 동의한 경우에만 진행해주세요.'
      );
      if (!ok) return;

      const { data, error: rpcError } = await sb.rpc('admin_bulk_copy_day1_signature', {
        p_case_id: caseId,
        p_user_agent: navigator.userAgent
      });
      if (rpcError) throw rpcError;

      const copied = Number(data?.copied_count || 0);

      const { data: verifiedRows, error: verifyError } = await sb
        .from('daily_records')
        .select('service_day,signature_data,locked')
        .eq('case_id', caseId)
        .order('service_day');
      if (verifyError) throw verifyError;

      const verified = verifiedRows || [];
      const signedCount = verified.filter((row) => String(row.signature_data || '').trim()).length;
      const unsignedAfter = verified.filter((row) => !String(row.signature_data || '').trim());

      if (unsignedAfter.length) {
        alertMsg(
          `서명 적용을 다시 확인해주세요. 현재 저장된 ${verified.length}일 중 ${signedCount}일만 서명이 확인됩니다.`
        );
      } else if (verified.length) {
        alertMsg(
          `서명 적용 완료 · 저장된 ${verified.length}일 모두 서명이 확인되었습니다.\n새로 적용된 일차: ${copied}일`
        );
      } else {
        alertMsg('저장된 일차 기록이 없어 서명을 적용하지 못했습니다.');
      }

      await window.openCase(caseId, true);
    } catch (error) {
      console.error(error);
      alertMsg(`서명을 일괄 적용하지 못했습니다. ${error?.message || ''}`);
    } finally {
      if (button) button.disabled = false;
    }
  }

  function addButton(caseId, adminMode) {
    if (!adminMode || !isAdmin() || document.getElementById('adminBulkSignature')) return;

    const recordButtons = [...document.querySelectorAll('#main .record-button')];
    const dayRow = recordButtons[0]?.parentElement;
    if (!dayRow) return;

    const bulkDraftWrap = document.querySelector('[data-admin-bulk-draft]');
    const wrap = document.createElement('div');
    wrap.dataset.adminBulkSignature = '1';
    wrap.style.marginTop = '8px';

    const button = document.createElement('button');
    button.id = 'adminBulkSignature';
    button.type = 'button';
    button.className = 'secondary full';
    button.textContent = '1일차 서명 전체 적용';
    button.style.fontWeight = '900';
    button.onclick = () => applyDay1SignatureToAll(caseId, button);

    const help = document.createElement('div');
    help.className = 'muted tiny';
    help.style.marginTop = '5px';
    help.textContent = '1일차 서명을 저장한 뒤 사용합니다. 저장된 전체 일차에 적용하고, 적용 후 실제 서명 개수를 다시 확인합니다. 이미 서명된 일차는 변경하지 않습니다.';

    wrap.append(button, help);
    if (bulkDraftWrap) bulkDraftWrap.insertAdjacentElement('afterend', wrap);
    else dayRow.insertAdjacentElement('afterend', wrap);
  }

  window.openCase = async function openCaseWithBulkSignature(caseId, adminMode) {
    await previousOpenCase(caseId, adminMode);
    addButton(caseId, Boolean(adminMode));
  };
})();