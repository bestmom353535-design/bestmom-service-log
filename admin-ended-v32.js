(() => {
  const previousAdminCases = window.adminCases;
  const previousShowAdminTab = window.showAdminTab;
  if (typeof previousAdminCases !== 'function' || typeof previousShowAdminTab !== 'function') return;

  function setActiveTab(tabName) {
    document.querySelectorAll('#adminNav [data-tab]').forEach((button) => {
      button.classList.toggle('active', button.dataset.tab === tabName);
    });
  }

  function serviceCard() {
    return [...document.querySelectorAll('#main > .card')].find(
      (card) => card.querySelector('h3')?.textContent?.trim() === '서비스 현황'
    );
  }

  function rowCaseId(row) {
    const openButton = [...row.querySelectorAll('button')].find((button) =>
      (button.getAttribute('onclick') || '').includes('openCase(')
    );
    const match = openButton?.getAttribute('onclick')?.match(/openCase\('([^']+)'/);
    return match?.[1] || null;
  }

  async function renderActiveCases() {
    setActiveTab('cases');
    await previousAdminCases();

    const card = serviceCard();
    if (!card) return;

    const rows = [...card.querySelectorAll(':scope > .case')];
    const ids = rows.map(rowCaseId).filter(Boolean);
    if (!ids.length) {
      if (!card.querySelector('[data-active-empty]')) {
        const empty = document.createElement('p');
        empty.className = 'muted';
        empty.dataset.activeEmpty = '1';
        empty.textContent = '현재 진행 중인 서비스가 없습니다.';
        card.appendChild(empty);
      }
      return;
    }

    const { data, error } = await sb
      .from('service_cases')
      .select('id,status')
      .in('id', ids);
    if (error) return;

    const activeIds = new Set((data || []).filter((item) => item.status === 'active').map((item) => item.id));
    rows.forEach((row) => {
      const id = rowCaseId(row);
      if (id && !activeIds.has(id)) row.remove();
    });

    const remaining = card.querySelectorAll(':scope > .case').length;
    card.querySelector('[data-active-empty]')?.remove();
    if (!remaining) {
      const empty = document.createElement('p');
      empty.className = 'muted';
      empty.dataset.activeEmpty = '1';
      empty.textContent = '현재 진행 중인 서비스가 없습니다.';
      card.appendChild(empty);
    }
  }

  function kstParts(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const parts = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).formatToParts(date);
    const get = (type) => parts.find((part) => part.type === type)?.value || '';
    return { year: get('year'), month: get('month'), day: get('day') };
  }

  function monthKey(value) {
    const p = kstParts(value);
    return p ? `${p.year}-${p.month}` : 'unknown';
  }

  function monthLabel(key) {
    if (key === 'unknown') return '종료일 미확인';
    const [year, month] = key.split('-');
    return `${year}년 ${Number(month)}월`;
  }

  function dateLabel(value) {
    const p = kstParts(value);
    return p ? `${p.year}.${p.month}.${p.day}` : '미확인';
  }

  async function reopenStopped(caseId, motherName, button) {
    const ok = window.confirm(
      `${motherName || '해당 산모'}의 중도 종료를 해제하시겠습니까?\n\n진행 중 서비스로 다시 변경되며 기존 기록과 서명은 그대로 유지됩니다.`
    );
    if (!ok) return;

    if (button) button.disabled = true;
    try {
      const { error } = await sb.rpc('reopen_stopped_service_case', { p_case_id: caseId });
      if (error) throw error;
      alertMsg('중도 종료를 해제했습니다. 서비스 현황의 진행 중 목록으로 이동됩니다.');
      await renderEndedServices();
    } catch (err) {
      console.error(err);
      alertMsg(`중도 종료를 해제하지 못했습니다. ${err?.message || ''}`);
      if (button) button.disabled = false;
    }
  }

  async function deleteEnded(caseId, motherName, button) {
    const ok = window.confirm(
      `${motherName || '해당 산모'}의 종료된 서비스 기록을 정말 삭제하시겠습니까?\n해당 서비스의 일차 기록과 산모 서명도 함께 삭제됩니다.\n\n삭제 후 복구할 수 없습니다.`
    );
    if (!ok) return;

    if (button) button.disabled = true;
    try {
      const { error } = await sb.from('service_cases').delete().eq('id', caseId);
      if (error) throw error;
      alertMsg('종료된 서비스 기록을 삭제했습니다.');
      await renderEndedServices();
    } catch (err) {
      console.error(err);
      alertMsg(`삭제하지 못했습니다. ${err?.message || ''}`);
      if (button) button.disabled = false;
    }
  }

  window.openEndedRecord = async function openEndedRecord(caseId) {
    await window.openCase(caseId, true);
    const back = document.getElementById('back');
    if (back) back.onclick = () => renderEndedServices();
  };

  async function renderEndedServices() {
    setActiveTab('ended');
    main().innerHTML = '<div class="card"><h3>종료 서비스</h3><p class="muted">종료된 서비스를 불러오는 중...</p></div>';

    const { data, error } = await sb
      .from('service_cases')
      .select('*,caregiver:profiles!service_cases_caregiver_id_fkey(full_name)')
      .in('status', ['completed', 'stopped']);

    if (error) {
      console.error(error);
      main().innerHTML = '<div class="card"><h3>종료 서비스</h3><p>종료된 서비스를 불러오지 못했습니다.</p></div>';
      return;
    }

    const ended = [...(data || [])].sort((a, b) => {
      const at = a.completed_at ? new Date(a.completed_at).getTime() : -1;
      const bt = b.completed_at ? new Date(b.completed_at).getTime() : -1;
      return bt - at;
    });

    if (!ended.length) {
      main().innerHTML = `
        <div class="card">
          <h3>종료 서비스</h3>
          <p class="muted">서비스 완료 또는 중도 종료된 건이 없습니다.</p>
        </div>`;
      return;
    }

    const groups = new Map();
    ended.forEach((item) => {
      const key = monthKey(item.completed_at);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });

    const html = [...groups.entries()].map(([key, items]) => `
      <div class="card" data-ended-month="${escapeHtml(key)}">
        <div class="row space">
          <h3 style="margin-bottom:0">${escapeHtml(monthLabel(key))}</h3>
          <span class="pill">${items.length}건</span>
        </div>
        ${items.map((c) => `
          <div class="case" data-ended-case="${c.id}">
            <div class="row space">
              <div>
                <b>${escapeHtml(c.mother_name)}</b>
                <div class="muted">아기 ${escapeHtml(c.baby_name || '')} · 관리사 ${escapeHtml(c.caregiver?.full_name || '미지정')} · ${c.service_days}일</div>
                <div class="muted tiny" style="margin-top:4px">종료 처리일 ${escapeHtml(dateLabel(c.completed_at))}</div>
              </div>
              <div style="font-size:13px;font-weight:800;color:${c.status === 'completed' ? '#166534' : '#92400e'};white-space:nowrap">
                ${c.status === 'completed' ? '서비스 완료 ✓' : '중도 종료 ✓'}
              </div>
            </div>
            <div class="row mt">
              <button class="secondary" type="button" data-ended-open="${c.id}">기록 보기</button>
              <button class="secondary" type="button" onclick="makePdf('${c.id}')">제공기록지 PDF 보기</button>
              ${c.status === 'stopped' ? `<button class="ok" type="button" data-ended-reopen="${c.id}">중도 종료 해제</button>` : ''}
              <button class="danger" type="button" data-ended-delete="${c.id}">삭제</button>
            </div>
          </div>`).join('')}
      </div>`).join('');

    main().innerHTML = `
      <div class="card">
        <h3>종료 서비스</h3>
        <div class="muted">서비스 완료 및 중도 종료된 건을 <b>종료 처리한 달</b> 기준으로 모았습니다. 최근 종료 월부터 표시됩니다.</div>
      </div>
      ${html}`;

    ended.forEach((c) => {
      const row = document.querySelector(`[data-ended-case="${c.id}"]`);
      const openButton = row?.querySelector(`[data-ended-open="${c.id}"]`);
      const reopenButton = row?.querySelector(`[data-ended-reopen="${c.id}"]`);
      const deleteButton = row?.querySelector(`[data-ended-delete="${c.id}"]`);
      if (openButton) openButton.onclick = () => window.openEndedRecord(c.id);
      if (reopenButton) reopenButton.onclick = () => reopenStopped(c.id, c.mother_name, reopenButton);
      if (deleteButton) deleteButton.onclick = () => deleteEnded(c.id, c.mother_name, deleteButton);
    });
  }

  window.renderEndedServices = renderEndedServices;
  window.adminCases = renderActiveCases;

  window.showAdminTab = function showAdminTabWithEnded(tabName) {
    if (tabName === 'ended') return renderEndedServices();
    if (tabName === 'cases') return renderActiveCases();
    return previousShowAdminTab(tabName);
  };
})();
