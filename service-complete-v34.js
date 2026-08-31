(() => {
  const previousOpenCase = window.openCase;
  const previousOpenDay = window.openDay;
  if (typeof previousOpenCase !== 'function' || typeof previousOpenDay !== 'function') return;

  const completeButtonHtml = (caseId) => `
    <button class="primary full mt" data-complete-case="${caseId}" style="margin-top:16px">
      마지막 근무일 · 기록지 최종 제출
    </button>
    <div class="notice" style="margin-top:8px;text-align:center;font-weight:800">
      ⚠️ 서비스 마지막 근무일에만 눌러주세요.<br>
      최종 제출 후에는 추가 기록을 입력할 수 없습니다.
    </div>`;

  const incompleteNoticeHtml = (savedDays, serviceDays) => `
    <div class="notice" data-final-submit-wait style="margin-top:16px;text-align:center">
      <b>마지막 근무일입니다.</b><br>
      전체 기록을 모두 저장한 뒤 최종 제출할 수 있습니다.<br>
      현재 ${savedDays}/${serviceDays}일 저장됨
    </div>`;

  async function finishService(caseId, button) {
    const ok = window.confirm(
      '오늘이 이 서비스의 마지막 근무일이 맞습니까?\n\n모든 일차 기록을 마쳤다면 기록지를 최종 제출해주세요.\n최종 제출 후에는 추가 기록을 입력할 수 없습니다.'
    );
    if (!ok) return;

    if (button) button.disabled = true;
    try {
      const { error } = await sb.rpc('complete_service_case', { p_case_id: caseId });
      if (error) {
        alertMsg(error.message || '기록지를 최종 제출하지 못했습니다.');
        return;
      }

      alertMsg('기록지가 최종 제출되었습니다.');
      await window.caregiverHome();
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 50);
    } finally {
      if (button && document.body.contains(button)) button.disabled = false;
    }
  }

  function bindCompleteButton(root, caseId) {
    const button = root?.querySelector?.(`[data-complete-case="${caseId}"]`);
    if (!button || button.dataset.bound === '1') return;
    button.dataset.bound = '1';
    button.onclick = () => finishService(caseId, button);
  }

  window.caregiverHome = async function caregiverHomeWithoutStoppedServices() {
    const { data: cases, error } = await sb
      .from('service_cases')
      .select('*')
      .in('status', ['active', 'completed'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      main().innerHTML = '<div class="card"><p>배정된 서비스를 불러오지 못했습니다.</p></div>';
      return;
    }

    const active = (cases || []).filter((c) => c.status === 'active');
    const completed = (cases || [])
      .filter((c) => c.status === 'completed')
      .sort((a, b) => new Date(b.completed_at || b.updated_at || b.created_at) - new Date(a.completed_at || a.updated_at || a.created_at));

    const activeHtml = active.length ? active.map((c) => `
      <div class="case row space">
        <div>
          <b>${escapeHtml(c.mother_name)}</b>
          <div class="muted">${escapeHtml(c.baby_name || '')} · ${c.service_days}일</div>
        </div>
        <button class="primary" onclick="openCase('${c.id}', false)">기록 입력</button>
      </div>`).join('') : '<p class="muted">진행 중인 서비스가 없습니다.</p>';

    const completedHtml = completed.length ? `
      <div class="hr"></div>
      <h3 style="font-size:16px;margin-bottom:8px">완료된 서비스</h3>
      ${completed.map((c) => `
        <div class="case row space" style="background:#f8fafc">
          <div>
            <b>${escapeHtml(c.mother_name)}</b>
            <div class="muted">${escapeHtml(c.baby_name || '')} · ${c.service_days}일</div>
          </div>
          <div style="font-size:13px;font-weight:800;color:#166534;white-space:nowrap">
            서비스 완료 ✓
          </div>
        </div>`).join('')}` : '';

    main().innerHTML = `
      <div class="card">
        <h3>내 서비스</h3>
        ${activeHtml}
        ${completedHtml}
      </div>`;
  };

  // 목록/일차 선택 화면에는 최종 제출 버튼을 보여주지 않는다.
  window.openCase = async function openCaseWithoutEarlySubmit(id, adminMode) {
    await previousOpenCase(id, adminMode);
  };

  window.openDay = async function openDayWithFinalSubmit(day, adminMode) {
    await previousOpenDay(day, adminMode);
    if (adminMode || !currentCase) return;

    const serviceDays = Number(currentCase.service_days || 0);
    if (Number(day) !== serviceDays) return;

    const caseId = currentCase.id;
    const { data: serviceCase, error: caseError } = await sb
      .from('service_cases')
      .select('status')
      .eq('id', caseId)
      .single();
    if (caseError || !serviceCase || serviceCase.status !== 'active') return;

    const dayCard = document.querySelector('#day > .card');
    if (!dayCard) return;

    dayCard.querySelector(`[data-complete-case="${caseId}"]`)?.remove();
    dayCard.querySelector('[data-final-submit-wait]')?.remove();

    const { data: records, error: recordError } = await sb
      .from('daily_records')
      .select('service_day')
      .eq('case_id', caseId);
    if (recordError) return;

    const savedDays = new Set((records || []).map((r) => Number(r.service_day))).size;

    if (savedDays < serviceDays) {
      dayCard.insertAdjacentHTML('beforeend', incompleteNoticeHtml(savedDays, serviceDays));
      return;
    }

    dayCard.insertAdjacentHTML('beforeend', completeButtonHtml(caseId));
    bindCompleteButton(dayCard, caseId);
  };
})();
