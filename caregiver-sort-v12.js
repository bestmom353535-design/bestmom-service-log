(() => {
  window.caregiverHome = async function caregiverHomeNewestFirst() {
    const { data: cases, error } = await sb
      .from('service_cases')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(error);
      main().innerHTML = '<div class="card"><p>배정된 서비스를 불러오지 못했습니다.</p></div>';
      return;
    }

    main().innerHTML = `
      <div class="card">
        <h3>내 서비스</h3>
        ${(cases || []).length ? (cases || []).map((c) => `
          <div class="case row space">
            <div><b>${escapeHtml(c.mother_name)}</b><div class="muted">${escapeHtml(c.baby_name || '')} · ${c.service_days}일</div></div>
            <button class="primary" onclick="openCase('${c.id}', false)">기록 입력</button>
          </div>`).join('') : '<p class="muted">배정된 서비스가 없습니다.</p>'}
      </div>`;
  };
})();