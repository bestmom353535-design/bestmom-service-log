(() => {
  const previousOpenCase = window.openCase;
  const previousOpenDay = window.openDay;
  if (typeof previousOpenCase !== 'function' || typeof previousOpenDay !== 'function') return;

  const completeButtonHtml = (caseId) => `
    <button class="primary full mt" data-complete-case="${caseId}" style="margin-top:16px">
      서비스 제공 종료
    </button>
    <div class="muted tiny" style="margin-top:7px;text-align:center">관리사 교체 등으로 중간 종료할 때도 사용할 수 있습니다.</div>`;

  async function hasSavedRecord(caseId) {
    const { data, error } = await sb
      .from('daily_records')
      .select('id')
      .eq('case_id', caseId)
      .limit(1);
    if (error) return false;
    return (data || []).length > 0;
  }

  async function finishService(caseId, button) {
    const ok = window.confirm(
      '서비스 제공을 종료하시겠습니까?\n\n남은 일자가 있어도 종료 처리됩니다.\n관리사 교체 등 중도 종료인 경우에도 그대로 진행하시면 됩니다.'
    );
    if (!ok) return;

    if (button) button.disabled = true;
    try {
      const { error } = await sb.rpc('complete_service_case', { p_case_id: caseId });
      if (error) {
        alertMsg(error.message || '서비스를 종료하지 못했습니다.');
        return;
      }

      alertMsg('서비스 제공이 종료되었습니다.');
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
    if (!(await hasSavedRecord(id))) return;

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
    if (!(await hasSavedRecord(caseId))) return;

    const dayCard = document.querySelector('#day > .card');
    if (!dayCard || dayCard.querySelector(`[data-complete-case="${caseId}"]`)) return;
    dayCard.insertAdjacentHTML('beforeend', completeButtonHtml(caseId));
    bindCompleteButton(dayCard, caseId);
  };
})();
