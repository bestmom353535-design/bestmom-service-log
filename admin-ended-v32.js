(() => {
  const previousAdminCases = window.adminCases;
  const previousShowAdminTab = window.showAdminTab;
  if (typeof previousAdminCases !== 'function' || typeof previousShowAdminTab !== 'function') return;

  let endedBranchFilter = 'all';
  let endedMonthFilter = 'all';

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
      const title = card.querySelector('h3');
      if (title && !card.querySelector('[data-active-count]')) {
        const count = document.createElement('span');
        count.dataset.activeCount = '1';
        count.className = 'pill';
        count.style.marginLeft = '8px';
        count.textContent = '진행 중 0건';
        title.appendChild(count);
      }
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
    const title = card.querySelector('h3');
    card.querySelector('[data-active-count]')?.remove();
    if (title) {
      const count = document.createElement('span');
      count.dataset.activeCount = '1';
      count.className = 'pill';
      count.style.marginLeft = '8px';
      count.textContent = `진행 중 ${remaining}건`;
      title.appendChild(count);
    }
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
    if (key === 'unknown') return '시작일 미확인';
    const [year, month] = key.split('-');
    return `${year}년 ${Number(month)}월`;
  }

  function dateLabel(value) {
    const p = kstParts(value);
    return p ? `${p.year}.${p.month}.${p.day}` : '미확인';
  }

  function branchLabel(value) {
    if (value === 'bundang') return '분당';
    if (value === 'yongin') return '용인';
    return '미분류';
  }

  async function moveEndedToBranch(caseId, motherName, branch, button) {
    const row = button?.closest?.('[data-ended-case]');
    const alreadySelected = button?.classList?.contains('primary');
    if (alreadySelected) return;
    if (button) button.disabled = true;
    try {
      const { error } = await sb
        .from('service_cases')
        .update({ branch })
        .eq('id', caseId);
      if (error) throw error;

      try {
        if (typeof me !== 'undefined' && me?.id) {
          await sb.from('record_audit').insert({
            record_id: null,
            case_id: caseId,
            actor_id: me.id,
            action: 'admin_ended_branch_changed',
            details: { branch, branch_label: branchLabel(branch) }
          });
        }
      } catch (auditError) {
        console.warn('종료 서비스 지점 분류 이력 오류', auditError);
      }

      await renderEndedServices();
    } catch (err) {
      console.error(err);
      alertMsg(`지점 분류를 변경하지 못했습니다. ${err?.message || ''}`);
      if (button) button.disabled = false;
    }
  }

  async function finalizeEnded(caseId, motherName, button) {
    const ok = window.confirm(
      `${motherName || '해당 산모'} 기록을 최종완성 처리하시겠습니까?\n\n` +
      '최종완성 목록으로 이동하며 종료 서비스 목록에서는 보이지 않습니다.\n' +
      '추후 최종완성 목록의 수정 버튼으로 다시 내용을 확인하고 수정할 수 있습니다.'
    );
    if (!ok) return;

    if (button) button.disabled = true;
    try {
      const { error } = await sb.rpc('admin_finalize_service_case', { p_case_id: caseId });
      if (error) throw error;
      alertMsg('최종완성 처리했습니다.');
      await renderEndedServices();
    } catch (err) {
      console.error(err);
      alertMsg(`최종완성 처리하지 못했습니다. ${err?.message || ''}`);
      if (button) button.disabled = false;
    }
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
      .in('status', ['completed', 'stopped'])
      .is('final_completed_at', null);

    if (error) {
      console.error(error);
      main().innerHTML = '<div class="card"><h3>종료 서비스</h3><p>종료된 서비스를 불러오지 못했습니다.</p></div>';
      return;
    }

    const ended = [...(data || [])].sort((a, b) => {
      const am = monthKey(a.start_date);
      const bm = monthKey(b.start_date);

      if (am !== bm) {
        if (am === 'unknown') return 1;
        if (bm === 'unknown') return -1;
        return bm.localeCompare(am);
      }

      const ad = String(a.start_date || '');
      const bd = String(b.start_date || '');
      if (ad !== bd) {
        if (!ad) return 1;
        if (!bd) return -1;
        return ad.localeCompare(bd);
      }

      return String(a.mother_name || '').localeCompare(String(b.mother_name || ''), 'ko');
    });

    const folderCounts = {
      all: ended.length,
      bundang: ended.filter((item) => item.branch === 'bundang').length,
      yongin: ended.filter((item) => item.branch === 'yongin').length,
      unassigned: ended.filter((item) => !item.branch).length
    };

    const displayEnded = ended.filter((item) => {
      if (endedBranchFilter === 'bundang') return item.branch === 'bundang';
      if (endedBranchFilter === 'yongin') return item.branch === 'yongin';
      if (endedBranchFilter === 'unassigned') return !item.branch;
      return true;
    });

    const availableMonths = [...new Set(displayEnded.map((item) => monthKey(item.start_date)))];
    if (endedMonthFilter !== 'all' && !availableMonths.includes(endedMonthFilter)) {
      endedMonthFilter = 'all';
    }

    const monthVisibleEnded = displayEnded.filter((item) => {
      if (endedMonthFilter === 'all') return true;
      return monthKey(item.start_date) === endedMonthFilter;
    });

    const recordCounts = {};
    if (ended.length) {
      const endedIds = ended.map((item) => item.id);
      const { data: records, error: recordsError } = await sb
        .from('daily_records')
        .select('case_id,service_day')
        .in('case_id', endedIds);

      if (!recordsError) {
        const seen = new Map();
        (records || []).forEach((row) => {
          if (!seen.has(row.case_id)) seen.set(row.case_id, new Set());
          seen.get(row.case_id).add(Number(row.service_day));
        });
        seen.forEach((days, caseId) => { recordCounts[caseId] = days.size; });
      } else {
        console.error('종료 서비스 기록 수 확인 오류', recordsError);
      }
    }
    if (!ended.length) {
      main().innerHTML = `
        <div class="card">
          <h3>종료 서비스</h3>
          <p class="muted">서비스 완료 또는 중도 종료된 건이 없습니다.</p>
        </div>`;
      return;
    }

    const groups = new Map();
    monthVisibleEnded.forEach((item) => {
      const key = monthKey(item.start_date);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });

    const html = monthVisibleEnded.length ? [...groups.entries()].map(([key, items]) => `
      <div class="card" data-ended-month="${escapeHtml(key)}">
        <div class="row space">
          <h3 style="margin-bottom:0">${escapeHtml(monthLabel(key))}</h3>
          <span class="pill">${items.length}건</span>
        </div>
        ${items.map((c) => {
          const written = recordCounts[c.id] || 0;
          const recordComplete = written >= Number(c.service_days || 0);
          return `
          <div class="case" data-ended-case="${c.id}">
            <div class="row space">
              <div>
                <b>${escapeHtml(c.mother_name)}</b>
                <div class="muted">아기 ${escapeHtml(c.baby_name || '')} · 관리사 ${escapeHtml(c.caregiver?.full_name || '미지정')} · ${c.service_days}일</div>
                <div class="muted tiny" style="margin-top:4px">시작일 ${escapeHtml(dateLabel(c.start_date))} · 종료 처리일 ${escapeHtml(dateLabel(c.completed_at))}</div>
              </div>
              <div style="text-align:right;white-space:nowrap">
                <div style="font-size:13px;font-weight:800;color:${c.status === 'completed' ? '#166534' : '#92400e'}">
                  ${c.status === 'completed' ? '서비스 완료 ✓' : '중도 종료 ✓'}
                </div>
                <div style="margin-top:6px;display:inline-block;padding:4px 8px;border-radius:999px;font-size:12px;font-weight:900;background:${recordComplete ? '#dcfce7' : '#fee2e2'};color:${recordComplete ? '#166534' : '#991b1b'};border:1px solid ${recordComplete ? '#86efac' : '#fca5a5'}">
                  ${recordComplete ? '기록완료' : '미완성'} · ${written}/${c.service_days}일
                </div>
              </div>
            </div>
            <div class="row mt">
              <button class="secondary" type="button" data-ended-open="${c.id}">기록 보기</button>
              <button class="secondary" type="button" onclick="makePdf('${c.id}')">제공기록지 PDF 보기</button>
              <button class="secondary" type="button" data-ended-edit="${c.id}">관리사 수정</button>
              ${c.status === 'stopped' ? `<button class="ok" type="button" data-ended-reopen="${c.id}">중도 종료 해제</button>` : ''}
              <button class="${c.branch === 'bundang' ? 'primary' : 'secondary'}" type="button" data-ended-branch="bundang" data-case-id="${c.id}" style="width:auto;min-width:58px;padding-left:12px;padding-right:12px">분당</button>
              <button class="${c.branch === 'yongin' ? 'primary' : 'secondary'}" type="button" data-ended-branch="yongin" data-case-id="${c.id}" style="width:auto;min-width:58px;padding-left:12px;padding-right:12px">용인</button>
              <button class="ok" type="button" data-ended-final="${c.id}">최종완성</button>
              <button class="danger" type="button" data-ended-delete="${c.id}">삭제</button>
            </div>
          </div>`;
        }).join('')}
      </div>`).join('') : '<div class="card"><p class="muted">이 폴더에는 종료된 서비스가 없습니다.</p></div>';

    main().innerHTML = `
      <div class="card">
        <div class="row space" style="align-items:flex-start">
          <div>
            <h3>종료 서비스</h3>
            <div class="muted">서비스 완료 및 중도 종료된 건을 <b>서비스 시작월</b> 기준으로 모았습니다. 최근 시작월부터 표시되며, 같은 달 안에서는 시작일이 빠른 순서로 표시됩니다.</div>
          </div>
        </div>
        <div class="row mt" style="gap:7px;flex-wrap:wrap">
          <button type="button" class="${endedBranchFilter === 'all' ? 'primary' : 'secondary'}" data-ended-folder="all">전체 ${folderCounts.all}</button>
          <button type="button" class="${endedBranchFilter === 'bundang' ? 'primary' : 'secondary'}" data-ended-folder="bundang">분당 ${folderCounts.bundang}</button>
          <button type="button" class="${endedBranchFilter === 'yongin' ? 'primary' : 'secondary'}" data-ended-folder="yongin">용인 ${folderCounts.yongin}</button>
          <button type="button" class="${endedBranchFilter === 'unassigned' ? 'primary' : 'secondary'}" data-ended-folder="unassigned">미분류 ${folderCounts.unassigned}</button>
        </div>
        <div class="mt" style="max-width:280px">
          <label for="endedMonthSelect">시작월 선택</label>
          <select id="endedMonthSelect">
            <option value="all" ${endedMonthFilter === 'all' ? 'selected' : ''}>전체 월 (${displayEnded.length}건)</option>
            ${availableMonths.map((key) => {
              const count = displayEnded.filter((item) => monthKey(item.start_date) === key).length;
              return `<option value="${escapeHtml(key)}" ${endedMonthFilter === key ? 'selected' : ''}>${escapeHtml(monthLabel(key))} (${count}건)</option>`;
            }).join('')}
          </select>
        </div>
      </div>
      ${html}`;

    document.querySelectorAll('[data-ended-folder]').forEach((button) => {
      button.onclick = async () => {
        endedBranchFilter = button.dataset.endedFolder || 'all';
        endedMonthFilter = 'all';
        await renderEndedServices();
      };
    });

    const endedMonthSelect = document.getElementById('endedMonthSelect');
    if (endedMonthSelect) {
      endedMonthSelect.onchange = async () => {
        endedMonthFilter = endedMonthSelect.value || 'all';
        await renderEndedServices();
      };
    }

    ended.forEach((c) => {
      const row = document.querySelector(`[data-ended-case="${c.id}"]`);
      const openButton = row?.querySelector(`[data-ended-open="${c.id}"]`);
      const reopenButton = row?.querySelector(`[data-ended-reopen="${c.id}"]`);
      const editButton = row?.querySelector(`[data-ended-edit="${c.id}"]`);
      const finalButton = row?.querySelector(`[data-ended-final="${c.id}"]`);
      const deleteButton = row?.querySelector(`[data-ended-delete="${c.id}"]`);
      const branchButtons = [...(row?.querySelectorAll('[data-ended-branch]') || [])];
      if (openButton) openButton.onclick = () => window.openEndedRecord(c.id);
      if (editButton) editButton.onclick = () => {
        if (typeof window.openAdminCaseEditor === 'function') window.openAdminCaseEditor(c.id);
        else alertMsg('수정 기능을 불러오지 못했습니다. 화면을 새로고침해주세요.');
      };
      if (finalButton) finalButton.onclick = () => finalizeEnded(c.id, c.mother_name, finalButton);
      if (reopenButton) reopenButton.onclick = () => reopenStopped(c.id, c.mother_name, reopenButton);
      branchButtons.forEach((branchButton) => {
        branchButton.onclick = () => moveEndedToBranch(
          c.id,
          c.mother_name,
          branchButton.dataset.endedBranch,
          branchButton
        );
      });
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
