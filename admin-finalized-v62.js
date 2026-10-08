(() => {
  if (window.__BESTMOM_ADMIN_FINALIZED_V62__) return;
  window.__BESTMOM_ADMIN_FINALIZED_V62__ = true;

  const previousShowAdminTab = window.showAdminTab;
  if (typeof previousShowAdminTab !== 'function') return;

  let finalBranchFilter = 'all';
  let finalMonthFilter = 'all';
  let finalReturnState = null;

  function setActiveTab(tabName) {
    document.querySelectorAll('#adminNav [data-tab]').forEach((button) => {
      button.classList.toggle('active', button.dataset.tab === tabName);
    });
  }

  function branchLabel(value) {
    if (value === 'bundang') return '분당';
    if (value === 'yongin') return '용인';
    return '미분류';
  }

  function startMonthKey(value) {
    const text = String(value || '').trim();
    const match = text.match(/^(\d{4})-(\d{2})-/);
    return match ? `${match[1]}-${match[2]}` : 'unknown';
  }

  function monthLabel(key) {
    if (key === 'unknown') return '시작일 미확인';
    const [year, month] = key.split('-');
    return `${year}년 ${Number(month)}월`;
  }

  function dateLabel(value) {
    const text = String(value || '').trim();
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[1]}.${match[2]}.${match[3]}` : '미확인';
  }

  function finalizedDateLabel(value) {
    if (!value) return '미확인';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '미확인';
    return new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date).replace(/\.\s*/g, '.').replace(/\.$/, '');
  }

  window.requestFinalListRestore = function requestFinalListRestore(caseId, scrollY = window.scrollY) {
    finalReturnState = { caseId, scrollY: Number(scrollY) || 0 };
  };

  window.openFinalCompletedRecord = async function openFinalCompletedRecord(caseId) {
    const returnState = { caseId, scrollY: window.scrollY };
    await window.openCase(caseId, true);

    const back = document.getElementById('back');
    if (back) {
      back.onclick = async () => {
        finalReturnState = returnState;
        await renderFinalCompletedServices();
      };
    }

    const topCard = document.querySelector('#main > .card');
    const topRow = topCard?.querySelector('.row.space');
    if (topRow && !document.getElementById('finalCaseInfoEdit')) {
      const button = document.createElement('button');
      button.id = 'finalCaseInfoEdit';
      button.type = 'button';
      button.className = 'secondary';
      button.textContent = '서비스 정보 수정';
      button.onclick = () => {
        if (typeof window.openAdminCaseEditor === 'function') window.openAdminCaseEditor(caseId);
        else alertMsg('수정 기능을 불러오지 못했습니다. 화면을 새로고침해주세요.');
      };
      topRow.appendChild(button);
    }
  };

  async function renderFinalCompletedServices() {
    setActiveTab('finalized');
    main().innerHTML = '<div class="card"><h3>최종완성</h3><p class="muted">최종완성된 기록을 불러오는 중...</p></div>';

    const { data, error } = await sb
      .from('service_cases')
      .select('*,caregiver:profiles!service_cases_caregiver_id_fkey(full_name)')
      .in('status', ['completed', 'stopped'])
      .not('final_completed_at', 'is', null);

    if (error) {
      console.error(error);
      main().innerHTML = '<div class="card"><h3>최종완성</h3><p>최종완성 기록을 불러오지 못했습니다.</p></div>';
      return;
    }

    const all = [...(data || [])].sort((a, b) => {
      const am = startMonthKey(a.start_date);
      const bm = startMonthKey(b.start_date);

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

    const counts = {
      all: all.length,
      bundang: all.filter((item) => item.branch === 'bundang').length,
      yongin: all.filter((item) => item.branch === 'yongin').length,
      unassigned: all.filter((item) => !item.branch).length
    };

    const visible = all.filter((item) => {
      if (finalBranchFilter === 'bundang') return item.branch === 'bundang';
      if (finalBranchFilter === 'yongin') return item.branch === 'yongin';
      if (finalBranchFilter === 'unassigned') return !item.branch;
      return true;
    });

    const availableMonths = [...new Set(visible.map((item) => startMonthKey(item.start_date)))];
    if (finalMonthFilter !== 'all' && !availableMonths.includes(finalMonthFilter)) {
      finalMonthFilter = 'all';
    }

    const monthVisibleFinal = visible.filter((item) => {
      if (finalMonthFilter === 'all') return true;
      return startMonthKey(item.start_date) === finalMonthFilter;
    });

    const groups = new Map();
    monthVisibleFinal.forEach((item) => {
      const key = startMonthKey(item.start_date);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });

    const body = monthVisibleFinal.length
      ? [...groups.entries()].map(([key, items]) => `
        <div class="card" data-final-month="${escapeHtml(key)}">
          <div class="row space">
            <h3 style="margin-bottom:0">${escapeHtml(monthLabel(key))}</h3>
            <span class="pill">${items.length}건</span>
          </div>
          <div class="muted tiny" style="margin-top:4px">서비스 시작일 기준</div>
          ${items.map((c) => `
            <div class="case" data-final-case="${c.id}">
              <div class="row space">
                <div>
                  <b>${escapeHtml(c.mother_name)}</b>
                  <div class="muted">아기 ${escapeHtml(c.baby_name || '')} · 관리사 ${escapeHtml(c.caregiver?.full_name || c.caregiver_name_override || '미지정')} · ${c.service_days}일</div>
                  <div class="muted tiny" style="margin-top:4px">시작일 ${escapeHtml(dateLabel(c.start_date))} · ${escapeHtml(branchLabel(c.branch))}</div>
                  <div class="muted tiny" style="margin-top:2px">최종완성 ${escapeHtml(finalizedDateLabel(c.final_completed_at))}</div>
                </div>
                <div style="font-size:12px;font-weight:900;color:#166534;white-space:nowrap">최종완성 ✓</div>
              </div>
              <div class="row mt">
                <button class="secondary" type="button" data-final-edit="${c.id}">수정</button>
                <button class="secondary" type="button" onclick="makePdf('${c.id}')">완성된 PDF 보기</button>
              </div>
            </div>
          `).join('')}
        </div>
      `).join('')
      : '<div class="card"><p class="muted">이 폴더에는 최종완성된 서비스가 없습니다.</p></div>';

    main().innerHTML = `
      <div class="card">
        <h3>최종완성</h3>
        <div class="muted">최종 정리된 기록입니다. 지점별로 확인할 수 있으며, 각 지점 안에서는 <b>서비스 시작월</b> 기준으로 묶이고 같은 달은 시작일이 빠른 순서로 표시됩니다.</div>
        <div class="row mt" style="gap:7px;flex-wrap:wrap">
          <button type="button" class="${finalBranchFilter === 'all' ? 'primary' : 'secondary'}" data-final-folder="all">전체 ${counts.all}</button>
          <button type="button" class="${finalBranchFilter === 'bundang' ? 'primary' : 'secondary'}" data-final-folder="bundang">분당 ${counts.bundang}</button>
          <button type="button" class="${finalBranchFilter === 'yongin' ? 'primary' : 'secondary'}" data-final-folder="yongin">용인 ${counts.yongin}</button>
          <button type="button" class="${finalBranchFilter === 'unassigned' ? 'primary' : 'secondary'}" data-final-folder="unassigned">미분류 ${counts.unassigned}</button>
        </div>
        <div class="mt" style="max-width:280px">
          <label for="finalMonthSelect">시작월 선택</label>
          <select id="finalMonthSelect">
            <option value="all" ${finalMonthFilter === 'all' ? 'selected' : ''}>전체 월 (${visible.length}건)</option>
            ${availableMonths.map((key) => {
              const count = visible.filter((item) => startMonthKey(item.start_date) === key).length;
              return `<option value="${escapeHtml(key)}" ${finalMonthFilter === key ? 'selected' : ''}>${escapeHtml(monthLabel(key))} (${count}건)</option>`;
            }).join('')}
          </select>
        </div>
      </div>
      ${body}`;

    document.querySelectorAll('[data-final-folder]').forEach((button) => {
      button.onclick = async () => {
        finalBranchFilter = button.dataset.finalFolder || 'all';
        finalMonthFilter = 'all';
        await renderFinalCompletedServices();
      };
    });

    const finalMonthSelect = document.getElementById('finalMonthSelect');
    if (finalMonthSelect) {
      finalMonthSelect.onchange = async () => {
        finalMonthFilter = finalMonthSelect.value || 'all';
        await renderFinalCompletedServices();
      };
    }

    monthVisibleFinal.forEach((c) => {
      const button = document.querySelector(`[data-final-edit="${c.id}"]`);
      if (button) button.onclick = () => window.openFinalCompletedRecord(c.id);
    });

    if (finalReturnState) {
      const state = finalReturnState;
      finalReturnState = null;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const row = document.querySelector(`[data-final-case="${state.caseId}"]`);
        if (row) {
          row.scrollIntoView({ block: 'center', behavior: 'auto' });
        } else {
          window.scrollTo({ top: state.scrollY || 0, behavior: 'auto' });
        }
      }));
    }
  }

  window.renderFinalCompletedServices = renderFinalCompletedServices;

  window.showAdminTab = function showAdminTabWithFinalized(tabName) {
    if (tabName === 'finalized') return renderFinalCompletedServices();
    return previousShowAdminTab(tabName);
  };
})();