(() => {
  const originalOpenDay = window.openDay;
  if (typeof originalOpenDay !== 'function') return;

  window.openDay = async function patchedOpenDay(day, adminMode) {
    await originalOpenDay(day, adminMode);

    const unlockButton = document.getElementById('unlock');
    if (!unlockButton) return;

    unlockButton.onclick = async () => {
      if (!currentRecord?.id) return alertMsg('기록 정보를 찾지 못했습니다.');
      const previousSignedAt = currentRecord.signed_at || null;
      const { error } = await sb.from('daily_records').update({
        locked: false,
        signature_data: null,
        signed_at: null,
        signed_user_agent: null,
        caregiver_completed_at: null
      }).eq('id', currentRecord.id);

      if (error) return alertMsg(error.message);

      await sb.from('record_audit').insert({
        record_id: currentRecord.id,
        case_id: currentCase.id,
        actor_id: me.id,
        action: 'admin_unlocked',
        details: {
          service_day: day,
          previous_signed_at: previousSignedAt,
          requires_new_signature: true
        }
      });

      alertMsg('잠금이 해제되었습니다. 수정 후 산모 서명을 다시 받아야 합니다.');
      await window.openCase(currentCase.id, true);
    };
  };
})();
