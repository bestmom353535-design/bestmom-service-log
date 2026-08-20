(() => {
  const previousOpenCase = window.openCase;
  if (typeof previousOpenCase !== 'function') return;

  function infoHtml(serviceCase) {
    const hasName = Boolean(String(serviceCase.baby_name || '').trim());
    const hasWeight = serviceCase.birth_weight !== null && serviceCase.birth_weight !== undefined && serviceCase.birth_weight !== '';

    if (hasName && hasWeight) return '';

    return `
      <div class="notice mt" data-baby-info-box style="text-align:left">
        <div style="font-weight:800;margin-bottom:5px">아기 정보 입력</div>
        <div class="muted tiny" style="margin-bottom:10px">운영자가 비워둔 항목만 입력할 수 있습니다. 저장한 항목은 다시 수정할 수 없습니다.</div>
        <div class="grid">
          <div>
            <label>아기 이름</label>
            <input id="caregiverBabyName" value="${escapeHtml(serviceCase.baby_name || '')}" ${hasName ? 'disabled' : ''} placeholder="아기 이름">
          </div>
          <div>
            <label>출생체중(kg)</label>
            <input id="caregiverBirthWeight" type="number" inputmode="decimal" step="0.01" value="${hasWeight ? escapeHtml(serviceCase.birth_weight) : ''}" ${hasWeight ? 'disabled' : ''} placeholder="예: 3.25">
          </div>
        </div>
        <button id="saveCaregiverBabyInfo" class="secondary full mt">아기 정보 저장</button>
      </div>`;
  }

  async function saveBabyInfo(caseId, serviceCase, button) {
    const nameInput = document.getElementById('caregiverBabyName');
    const weightInput = document.getElementById('caregiverBirthWeight');

    const babyName = nameInput && !nameInput.disabled ? nameInput.value.trim() : '';
    const weightRaw = weightInput && !weightInput.disabled ? weightInput.value.trim() : '';
    const birthWeight = weightRaw === '' ? null : Number(weightRaw);

    if (!babyName && birthWeight === null) {
      alertMsg('입력할 아기 이름 또는 출생체중을 입력해주세요.');
      return;
    }

    if (birthWeight !== null && (!Number.isFinite(birthWeight) || birthWeight <= 0 || birthWeight > 20)) {
      alertMsg('출생체중을 확인해주세요.');
      weightInput?.focus();
      return;
    }

    if (button) button.disabled = true;
    try {
      const { error } = await sb.rpc('set_service_baby_info_once', {
        p_case_id: caseId,
        p_baby_name: babyName || null,
        p_birth_weight: birthWeight
      });

      if (error) {
        alertMsg(error.message || '아기 정보를 저장하지 못했습니다.');
        return;
      }

      alertMsg('아기 정보를 저장했습니다.');
      await window.openCase(caseId, false);
    } finally {
      const currentButton = document.getElementById('saveCaregiverBabyInfo');
      if (currentButton) currentButton.disabled = false;
    }
  }

  window.openCase = async function openCaseWithCaregiverBabyInfo(id, adminMode) {
    await previousOpenCase(id, adminMode);
    if (adminMode) return;

    const { data: serviceCase, error } = await sb
      .from('service_cases')
      .select('id,status,baby_name,birth_weight')
      .eq('id', id)
      .single();

    if (error || !serviceCase || serviceCase.status !== 'active') return;

    const html = infoHtml(serviceCase);
    if (!html) return;

    const topCard = document.querySelector('#main > .card');
    if (!topCard || topCard.querySelector('[data-baby-info-box]')) return;

    const hr = topCard.querySelector('.hr');
    if (hr) hr.insertAdjacentHTML('afterend', html);
    else topCard.insertAdjacentHTML('beforeend', html);

    const button = document.getElementById('saveCaregiverBabyInfo');
    if (button) button.onclick = () => saveBabyInfo(id, serviceCase, button);
  };
})();
