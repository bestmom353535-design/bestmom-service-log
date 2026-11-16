(() => {
  const originalOpenDay = window.openDay;
  if (typeof originalOpenDay !== 'function') return;

  window.openDay = async function patchedOpenDay(day, adminMode) {
    await originalOpenDay(day, adminMode);

    const record = typeof currentRecord !== 'undefined' ? currentRecord : null;
    const unlockButton = document.getElementById('unlock');

    // Keep the original signature visible to the caregiver even after a record is unlocked.
    // It is historical confirmation, NOT a new signature approving subsequent edits.
    if (!adminMode && record?.signature_data && !record?.locked) {
      const dayCard = document.querySelector('#day > .card');
      const signatureCanvas = document.getElementById('sig');
      if (dayCard && signatureCanvas && !dayCard.querySelector('[data-retained-signature]')) {
        const previousSignature = document.createElement('div');
        previousSignature.dataset.retainedSignature = '1';
        previousSignature.className = 'notice';
        previousSignature.style.marginBottom = '12px';

        const heading = document.createElement('div');
        heading.textContent = '잠금 해제 전 저장된 산모 서명';
        heading.style.fontWeight = '800';

        const description = document.createElement('div');
        description.className = 'muted tiny';
        description.textContent = '기존 서명을 보존했습니다. 기록을 수정했다면 수정한 내용은 산모님께 다시 확인받아야 합니다.';
        description.style.marginTop = '5px';

        const image = document.createElement('img');
        image.src = record.signature_data;
        image.alt = '기존에 저장된 산모 서명';
        image.style.cssText = 'display:block;max-width:100%;height:110px;object-fit:contain;margin:8px auto 0';

        previousSignature.append(heading, description, image);
        signatureCanvas.insertAdjacentElement('beforebegin', previousSignature);
      }
    }

    if (!unlockButton) return;

    unlockButton.onclick = async () => {
      const recordId = record?.id;
      const caseId = typeof currentCase !== 'undefined' ? currentCase?.id : null;
      if (!recordId || !caseId) return alertMsg('기록 정보를 찾지 못했습니다.');
      if (unlockButton.disabled) return;

      const ok = window.confirm(
        day + '일차 기록의 잠금을 해제하시겠습니까?\n\n' +
        '기존 산모 서명 이미지와 서명 정보는 삭제하지 않고 그대로 보존됩니다.\n' +
        '단, 기록 내용을 수정하면 수정된 내용은 산모님께 다시 확인받아야 합니다.'
      );
      if (!ok) return;

      unlockButton.disabled = true;
      try {
        // Important: do not set signature_data/signed_at/signed_user_agent to null.
        // Only unlock the record. Saving regular fields also leaves these intact.
        const { data, error } = await sb.from('daily_records')
          .update({ locked: false })
          .eq('id', recordId)
          .eq('locked', true)
          .select('id')
          .maybeSingle();
        if (error) throw error;
        if (!data?.id) throw new Error('이미 잠금 해제되었거나 기록이 변경되었습니다. 다시 열어주세요.');

        try {
          const auditResult = await sb.from('record_audit').insert({
            record_id: recordId,
            case_id: caseId,
            actor_id: me?.id || null,
            action: 'admin_unlocked',
            details: {
              service_day: day,
              previous_signed_at: record.signed_at || null,
              signature_preserved: Boolean(record.signature_data),
              signed_metadata_preserved: true,
              revised_content_requires_reconfirmation: true
            }
          });
          if (auditResult.error) console.warn('잠금해제 기록 감사 저장 실패', auditResult.error);
        } catch (auditError) {
          console.warn('잠금해제 기록 감사 저장 실패', auditError);
        }

        alertMsg('잠금이 해제되었습니다. 기존 산모 서명은 그대로 보존됩니다. 수정한 내용은 산모님께 다시 확인받아주세요.');
        await window.openCase(caseId, true);
      } catch (error) {
        console.error('잠금 해제 실패', error);
        alertMsg('잠금을 해제하지 못했습니다. ' + (error?.message || '다시 시도해주세요.'));
      } finally {
        if (unlockButton.isConnected) unlockButton.disabled = false;
      }
    };
  };
})();
