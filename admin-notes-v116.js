(() => {
  'use strict';
  if (window.__BESTMOM_ADMIN_NOTES_V116__) return;
  window.__BESTMOM_ADMIN_NOTES_V116__ = true;

  const nav = document.getElementById('adminNav');
  if (!nav || typeof window.showAdminTab !== 'function') return;
  const previousShowAdminTab = window.showAdminTab;
  const PAGE_SIZE = 200;
  const state = { records: [], offset: 0, hasMore: true, loading: false, from: '', to: '', search: '', branch: 'all', ticket: 0 };
  const safe = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const get = (id) => document.getElementById(id);
  const authorized = () => typeof me !== 'undefined' && me?.role === 'admin';
  const active = () => authorized() && !!nav.querySelector('[data-tab="notes-summary"].active');

  const noteTab = document.createElement('button');
  noteTab.className = 'tab';
  noteTab.type = 'button';
  noteTab.dataset.tab = 'notes-summary';
  noteTab.textContent = '특이사항 모아보기';
  nav.querySelector('[data-tab="cases"]')?.insertAdjacentElement('afterend', noteTab);
  if (!noteTab.isConnected) nav.appendChild(noteTab);
  noteTab.addEventListener('click', () => window.showAdminTab('notes-summary'));

  const css = document.createElement('style');
  css.textContent = `
    .bm-notes-toolbar {display:flex;flex-wrap:wrap;gap:10px;align-items:end}
    .bm-notes-toolbar label {flex:1 1 135px;font-size:12px;font-weight:700;min-width:0}
    .bm-notes-toolbar input,.bm-notes-toolbar select {display:block;margin-top:5px;width:100%;box-sizing:border-box}
    .bm-notes-toolbar .bm-notes-search {flex:2 1 210px}
    .bm-notes-datehead {font-weight:800;font-size:14px;margin:20px 0 7px;border-bottom:1px solid #dce2e8;padding-bottom:7px}
    .bm-note-item {border:1px solid #e0e4e9;border-radius:10px;padding:13px;margin:8px 0;background:#fff}
    .bm-note-item .bm-note-title {display:flex;align-items:center;justify-content:space-between;gap:9px;flex-wrap:wrap}
    .bm-note-item textarea {width:100%;box-sizing:border-box;min-height:72px;resize:vertical;line-height:1.65;margin-top:9px}
    .bm-note-item .bm-note-actions {display:flex;align-items:center;gap:8px;justify-content:flex-end;margin-top:6px;flex-wrap:wrap}
    .bm-note-item .bm-note-status {font-size:12px;flex:1;color:#68727c}
    .bm-note-item .bm-note-meta {font-size:12px;color:#5f6e78;margin-top:5px}
    .bm-notes-count {font-size:12px;color:#647380;margin-top:10px}
    .bm-notes-more {margin-top:12px;width:100%}
  `;
  document.head.appendChild(css);

  const branchName = value => value === 'bundang' ? '분당' : value === 'yongin' ? '용인' : '미지정';

  function prettyDate(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return iso || '날짜 미입력';
    const date = new Date(`${iso}T12:00:00+09:00`);
    const week = ['일','월','화','수','목','금','토'][date.getDay()];
    return `${Number(iso.slice(5,7))}/${Number(iso.slice(8,10))}(${week})`;
  }

  function renderShell() {
    get('main').innerHTML = `
      <div class="card">
        <h3>특이사항 모아보기</h3>
        <p class="muted">관리사님이 입력한 날짜별 특이사항을 모아 확인하고, 특이사항 내용만 수정할 수 있습니다.</p>
        <div class="bm-notes-toolbar mt">
          <label>시작일<input id="bmNotesFrom" type="date" value="${safe(state.from)}"></label>
          <label>종료일<input id="bmNotesTo" type="date" value="${safe(state.to)}"></label>
          <label>지점<select id="bmNotesBranch"><option value="all">전체 지점</option><option value="bundang">분당</option><option value="yongin">용인</option><option value="unassigned">지점 미지정</option></select></label>
          <label class="bm-notes-search">산모·관리사·특이사항 검색<input id="bmNotesSearch" type="search" placeholder="이름이나 특이사항 검색" autocomplete="off" value="${safe(state.search)}"></label>
          <button id="bmNotesRefresh" class="secondary" type="button">조회 / 새로고침</button>
        </div>
        <p class="muted tiny mt">최근 날짜순으로 표시합니다. 검색은 현재 불러온 기록에 적용되며, 아래 ‘더 불러오기’로 과거 기록을 확인할 수 있습니다.</p>
        <div id="bmNotesAlert" class="muted" role="status" aria-live="polite"></div>
        <div id="bmNotesCount" class="bm-notes-count"></div>
        <div id="bmNotesList"></div>
        <button id="bmNotesMore" class="secondary bm-notes-more" type="button" hidden>과거 특이사항 더 불러오기</button>
      </div>`;
    get('bmNotesBranch').value = state.branch;
    get('bmNotesSearch').addEventListener('input', e => { state.search = e.target.value; renderRows(); });
    get('bmNotesBranch').addEventListener('change', e => { state.branch = e.target.value; renderRows(); });
    get('bmNotesFrom').addEventListener('change', e => { state.from = e.target.value; });
    get('bmNotesTo').addEventListener('change', e => { state.to = e.target.value; });
    get('bmNotesRefresh').addEventListener('click', () => resetAndLoad());
    get('bmNotesMore').addEventListener('click', () => loadPage());
    get('bmNotesList').addEventListener('click', async e => {
      const button = e.target.closest('[data-notes-save]');
      if (button) await saveNote(button.dataset.notesSave, button);
    });
  }

  async function render() {
    if (!authorized()) return;
    state.ticket += 1;
    nav.querySelectorAll('[data-tab]').forEach(btn => btn.classList.toggle('active', btn === noteTab));
    renderShell();
    await resetAndLoad();
  }

  window.showAdminTab = function showAdminTabWithNotes(tab) {
    if (tab === 'notes-summary') return render();
    state.ticket += 1;
    return previousShowAdminTab(tab);
  };

  function message(text, warning = false) {
    const el = get('bmNotesAlert');
    if (!el) return;
    el.textContent = text;
    el.style.color = warning ? '#a33a30' : '';
  }

  async function resetAndLoad() {
    if (!active()) return;
    if (state.from && state.to && state.from > state.to) return message('시작일은 종료일보다 늦을 수 없습니다.', true);
    state.ticket += 1;
    state.records = [];
    state.offset = 0;
    state.hasMore = true;
    state.loading = false;
    renderRows();
    await loadPage();
  }

  async function lookupCaseInfo(rows) {
    const caseIds = [...new Set(rows.map(row => row.case_id).filter(Boolean))];
    if (!caseIds.length) return;
    const { data: cases, error } = await sb.from('service_cases')
      .select('id,mother_name,branch,caregiver_id,caregiver_name_override')
      .in('id', caseIds);
    if (error) throw error;
    const byCase = new Map((cases || []).map(c => [c.id, c]));
    const caregiverIds = [...new Set((cases || []).map(c => c.caregiver_id).filter(Boolean))];
    let caregivers = [];
    if (caregiverIds.length) {
      const result = await sb.from('profiles').select('id,full_name').in('id', caregiverIds);
      if (result.error) throw result.error;
      caregivers = result.data || [];
    }
    const byCaregiver = new Map(caregivers.map(c => [c.id, c.full_name]));
    rows.forEach(row => {
      const c = byCase.get(row.case_id);
      row.mother = c?.mother_name || '산모 정보 없음';
      row.branch = c?.branch || '';
      row.caregiver = c?.caregiver_name_override || byCaregiver.get(c?.caregiver_id) || '미지정';
    });
  }

  async function loadPage() {
    if (!active() || state.loading || !state.hasMore) return;
    state.loading = true;
    const ticket = state.ticket;
    message('특이사항을 불러오는 중입니다...');
    const more = get('bmNotesMore');
    if (more) more.disabled = true;
    try {
      let query = sb.from('daily_records')
        .select('id,case_id,service_day,service_date,notes,locked,updated_at')
        .not('notes', 'is', null)
        .neq('notes', '')
        .order('service_date', { ascending: false })
        .order('service_day', { ascending: false })
        .range(state.offset, state.offset + PAGE_SIZE - 1);
      if (state.from) query = query.gte('service_date', state.from);
      if (state.to) query = query.lte('service_date', state.to);
      const {data, error} = await query;
      if (error) throw error;
      const records = data || [];
      await lookupCaseInfo(records);
      if (ticket !== state.ticket || !active()) return;
      state.records.push(...records);
      state.offset += records.length;
      state.hasMore = records.length === PAGE_SIZE;
      message('');
      renderRows();
    } catch (error) {
      if (ticket === state.ticket && active()) message(`목록을 불러오지 못했습니다: ${error.message || error}`, true);
    } finally {
      if (ticket === state.ticket) {
        state.loading = false;
        if (get('bmNotesMore')) get('bmNotesMore').disabled = false;
      }
    }
  }

  function renderRows() {
    const list = get('bmNotesList');
    if (!list || !active()) return;
    const needle = state.search.normalize('NFC').replace(/\s+/g, '').toLowerCase();
    const filtered = state.records.filter(record => {
      if (state.branch === 'unassigned' && record.branch) return false;
      if (state.branch !== 'all' && state.branch !== 'unassigned' && record.branch !== state.branch) return false;
      const haystack = [record.mother, record.caregiver, record.notes, record.service_date]
        .join(' ').normalize('NFC').replace(/\s+/g, '').toLowerCase();
      return !needle || haystack.includes(needle);
    });
    const groups = new Map();
    filtered.forEach(record => {
      const key = record.service_date || '날짜 미입력';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(record);
    });
    list.innerHTML = [...groups].map(([date, records]) => `
      <div class="bm-notes-datehead">${safe(prettyDate(date))} <span class="muted tiny">· ${records.length}건</span></div>
      ${records.map(record => `
        <div class="bm-note-item" data-notes-record="${safe(record.id)}">
          <div class="bm-note-title"><b>${safe(record.mother)} 산모님</b><span class="muted tiny">${safe(record.service_day)}일차${record.locked ? ' · 서명 완료' : ''}</span></div>
          <div class="bm-note-meta">${safe(branchName(record.branch))} · 관리사 ${safe(record.caregiver)}</div>
          <textarea data-notes-text="${safe(record.id)}" aria-label="${safe(record.mother)} 산모 ${safe(record.service_day)}일차 특이사항">${safe(record.notes)}</textarea>
          <div class="bm-note-actions"><span class="bm-note-status" data-notes-status="${safe(record.id)}"></span><button class="primary" type="button" data-notes-save="${safe(record.id)}">수정 저장</button></div>
        </div>`).join('')}
    `).join('') || '<p class="muted mt">표시할 특이사항이 없습니다.</p>';
    const count = get('bmNotesCount');
    if (count) count.textContent = `현재 불러온 ${state.records.length}건 중 ${filtered.length}건 표시`;
    const more = get('bmNotesMore');
    if (more) more.hidden = !state.hasMore;
  }

  async function saveNote(id, button) {
    if (!authorized() || !active()) return;
    const record = state.records.find(r => r.id === id);
    const input = get('bmNotesList')?.querySelector('[data-notes-text="' + id + '"]');
    const status = get('bmNotesList')?.querySelector('[data-notes-status="' + id + '"]');
    if (!record || !input) return;
    const newNotes = input.value.trim();
    if (!newNotes) {
      if (status) status.textContent = '특이사항을 비우려면 기존 일차 기록 화면에서 수정해주세요.';
      return;
    }
    if (newNotes === String(record.notes || '').trim()) {
      if (status) status.textContent = '변경된 내용이 없습니다.';
      return;
    }
    if (record.locked && !window.confirm('서명이 완료된 기록입니다. 산모 서명은 그대로 두고 특이사항만 수정하시겠습니까?')) return;
    button.disabled = true;
    if (status) status.textContent = '저장 중...';
    try {
      const current = await sb.from('daily_records').select('id,notes,updated_at,locked')
        .eq('id', id).single();
      if (current.error) throw current.error;
      if (String(current.data?.notes ?? '') !== String(record.notes ?? '') || current.data?.updated_at !== record.updated_at) {
        if (status) status.textContent = '다른 곳에서 이미 변경한 기록입니다. 새로고침 후 다시 수정해주세요.';
        return;
      }
      const updated = await sb.from('daily_records').update({notes:newNotes})
        .eq('id',id).eq('updated_at',record.updated_at)
        .select('id,notes,updated_at,locked').maybeSingle();
      if (updated.error) throw updated.error;
      if (!updated.data) {
        if (status) status.textContent = '기록이 다른 곳에서 변경되었습니다. 새로고침 후 다시 수정해주세요.';
        return;
      }
      record.notes = updated.data.notes;
      record.updated_at = updated.data.updated_at;
      record.locked = updated.data.locked;
      const audit = await sb.from('record_audit').insert({
        record_id:id,case_id:record.case_id,actor_id:me.id,
        action:record.locked ? 'admin_signed_record_edited' : 'admin_notes_edited',
        details:{service_day:record.service_day,changed_fields:['notes'],original_signature_preserved:true,original_locked_status_preserved:true,source:'admin_notes_summary'}
      });
      if (status) status.textContent = audit.error ? '특이사항 저장됨 · 변경 이력 저장 실패(확인 필요)' : '저장 완료';
      if (audit.error) console.warn('특이사항 변경 이력 저장 실패', audit.error);
    } catch (error) {
      if (status) status.textContent = `수정 실패: ${error.message || error}`;
    } finally {
      button.disabled = false;
    }
  }
})();
