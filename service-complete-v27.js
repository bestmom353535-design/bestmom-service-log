(() => {
  const previousOpenCase = window.openCase;
  const previousOpenDay = window.openDay;
  if (typeof previousOpenCase !== 'function' || typeof previousOpenDay !== 'function') return;

  const completeButtonHtml = (caseId) => `
    <button class="primary full mt" data-complete-case="${caseId}" style="margin-top:16px">
      기록지 최종 제출
    </button>
    <div class="muted tiny" style="margin-top:7px;text-align:center">해당 서비스의 기록 작성을 모두 마친 경우에만 눌러주세요.</div>`;

  async function finishService(caseId, button) {
    const ok = window.confirm(
      '기록지를 최종 제출하시겠습니까?\n\n최종 제출 후에는 추가 기록을 입력할 수 없습니다.\n관리사 교체 등으로 중간에 마치는 경우에도 본인이 작성한 기록을 모두 마친 후 제출해주세요.'
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

  window.caregiverHome = async function caregiverHomeWithEndedServices() {
    const { data: cases, error } = await sb
      .from('service_cases')
      .select('*')
      .in('status', ['active', 'completed', 'stopped'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      main().innerHTML = '<div class="card"><p>배정된 서비스를 불러오지 못했습니다.</p></div>';
      return;
    }

    const active = (cases || []).filter((c) => c.status === 'active');
    const ended = (cases || [])
      .filter((c) => c.status === 'completed' || c.status === 'stopped')
      .sort((a, b) => new Date(b.completed_at || b.updated_at || b.created_at) - new Date(a.completed_at || a.updated_at || a.created_at));

    const activeHtml = active.length ? active.map((c) => `
      <div class="case row space">
        <div>
          <b>${escapeHtml(c.mother_name)}</b>
          <div class="muted">${escapeHtml(c.baby_name || '')} · ${c.service_days}일</div>
        </div>
        <button class="primary" onclick="openCase('${c.id}', false)">기록 입력</button>
      </div>`).join('') : '<p class="muted">진행 중인 서비스가 없습니다.</p>';

    const endedHtml = ended.length ? `
      <div class="hr"></div>
      <h3 style="font-size:16px;margin-bottom:8px">종료된 서비스</h3>
      ${ended.map((c) => `
        <div class="case row space" style="background:#f8fafc">
          <div>
            <b>${escapeHtml(c.mother_name)}</b>
            <div class="muted">${escapeHtml(c.baby_name || '')} · ${c.service_days}일</div>
          </div>
          <div style="font-size:13px;font-weight:800;color:${c.status === 'completed' ? '#166534' : '#92400e'};white-space:nowrap">
            ${c.status === 'completed' ? '서비스 완료 ✓' : '중도 종료 ✓'}
          </div>
        </div>`).join('')}` : '';

    main().innerHTML = `
      <div class="card">
        <h3>내 서비스</h3>
        ${activeHtml}
        ${endedHtml}
      </div>`;
  };

  window.openCase = async function openCaseWithServiceEnd(id, adminMode) {
    await previousOpenCase(id, adminMode);
    if (adminMode) return;

    const { data: serviceCase, error: caseError } = await sb
      .from('service_cases')
      .select('id,status')
      .eq('id', id)
      .single();
    if (caseError || !serviceCase || serviceCase.status !== 'active') return;

    const topCard = document.querySelector('#main > .card');
    if (!topCard || topCard.querySelector(`[data-complete-case="${id}"]`)) return;
    topCard.insertAdjacentHTML('beforeend', completeButtonHtml(id));
    bindCompleteButton(topCard, id);
  };

  window.openDay = async function openDayWithServiceEnd(day, adminMode) {
    await previousOpenDay(day, adminMode);
    if (adminMode || !currentCase) return;

    const caseId = currentCase.id;
    const { data: serviceCase, error: caseError } = await sb
      .from('service_cases')
      .select('status')
      .eq('id', caseId)
      .single();
    if (caseError || !serviceCase || serviceCase.status !== 'active') return;

    const dayCard = document.querySelector('#day > .card');
    if (!dayCard || dayCard.querySelector(`[data-complete-case="${caseId}"]`)) return;
    dayCard.insertAdjacentHTML('beforeend', completeButtonHtml(caseId));
    bindCompleteButton(dayCard, caseId);
  };
})();
