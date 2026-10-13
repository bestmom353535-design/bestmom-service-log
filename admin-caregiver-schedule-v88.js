(() => {
  if (window.__BESTMOM_CAREGIVER_SCHEDULE_V88__) return;
  window.__BESTMOM_CAREGIVER_SCHEDULE_V88__ = true;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) =>
      ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function shortDate(value) {
    if (!value) return '날짜 미작성';
    const text = String(value);
    return `${Number(text.slice(5, 7))}/${Number(text.slice(8, 10))}`;
  }
  function editedDateKst(value) {
    if (!value) return null;
    const timestamp = new Date(value);
    if (Number.isNaN(timestamp.valueOf())) return null;
    return new Date(timestamp.getTime() + 9 * 60 * 60 * 1000)
      .toISOString().slice(0, 10);
  }
  function getSourceSuggestion(serviceCase, records, histories) {
    const byDay = new Map(records.map((record) => [Number(record.service_day), record]));
    const history = [...histories].sort((a, b) =>
      String(a.created_at || '').localeCompare(String(b.created_at || '')) ||
      Number(a.id || 0) - Number(b.id || 0));
    const events = history
      .filter((h) => h.previous_name && h.next_name && h.previous_name !== h.next_name)
      .map((h) => ({
        name: h.next_name,
        date: h.effective_date || editedDateKst(h.created_at),
        confirmed: !!h.effective_date
      }))
      .filter((h) => h.date).sort((a, b) => a.date.localeCompare(b.date));
    const firstRealWriter = [...records].sort((a, b) => a.service_day - b.service_day)
      .find((r) => r.record_writer?.role === 'caregiver' && r.record_writer.full_name);
    let lastName = history[0]?.previous_name || firstRealWriter?.record_writer?.full_name ||
      serviceCase.caregiver?.full_name || serviceCase.caregiver_name_override || '';
    let eventIndex = 0;
    return Array.from({ length: Number(serviceCase.service_days || 0) }, (_, index) => {
      const day = index + 1;
      const record = byDay.get(day);
      const date = record?.service_date || null;
      let source = '이전 배정 참고';
      if (date) {
        while (eventIndex < events.length && events[eventIndex].date <= date) {
          lastName = events[eventIndex].name;
          source = events[eventIndex].confirmed ? '교체일 입력' : '수정일 참고';
          eventIndex++;
        }
        if (record.record_writer?.role === 'caregiver' && record.record_writer.full_name) {
          lastName = record.record_writer.full_name;
          source = '관리사 작성 계정';
        }
      }
      return {
        day, date,
        recordWriter: record?.record_writer?.full_name || '',
        writerRole: record?.record_writer?.role || '',
        suggested: date ? lastName : '',
        source: date ? source : '기록 미작성'
      };
    });
  }
  function summarize(rows, values, overrides) {
    const segments = [];
    for (const row of rows) {
      if (!row.date) continue;
      const name = String(values.get(row.day) || '').trim();
      const kind = overrides.has(row.day) ? '직접 지정' : '기존 자료 참고';
      const last = segments[segments.length - 1];
      if (last && last.name === name && last.kind === kind &&
          last.lastDay + 1 === row.day) {
        last.end = row.date;
        last.lastDay = row.day;
        last.count++;
      } else {
        segments.push({name, kind, start:row.date, end:row.date, lastDay:row.day, count:1});
      }
    }
    return segments;
  }

  async function openEditor(caseId) {
    if (typeof me === 'undefined' || me?.role !== 'admin') {
      alert('운영자만 이용할 수 있습니다.');
      return;
    }
    const old = document.getElementById('caregiverScheduleModal');
    old?.remove();
    try {
      const [caseRes, recordRes, historyRes, manualRes, cgRes] = await Promise.all([
        sb.from('service_cases')
          .select('id,mother_name,service_days,start_date,caregiver_name_override,caregiver:profiles!service_cases_caregiver_id_fkey(full_name)')
          .eq('id',caseId).single(),
        sb.from('daily_records')
          .select('service_day,service_date,record_writer:profiles!daily_records_created_by_fkey(full_name,role)')
          .eq('case_id',caseId).order('service_day'),
        sb.from('caregiver_change_history')
          .select('id,previous_name,next_name,effective_date,created_at')
          .eq('case_id',caseId).order('created_at'),
        sb.from('caregiver_day_assignments')
          .select('service_day,caregiver_name,updated_at')
          .eq('case_id',caseId).order('service_day'),
        sb.from('profiles').select('full_name').eq('role','caregiver').order('full_name')
      ]);
      for (const response of [caseRes, recordRes, historyRes, manualRes, cgRes]) {
        if (response.error) throw response.error;
      }
      const serviceCase = caseRes.data;
      const rows = getSourceSuggestion(serviceCase, recordRes.data || [], historyRes.data || []);
      const manual = new Map((manualRes.data || []).map((x) => [Number(x.service_day), x.caregiver_name]));
      const pending = new Map();
      const options = [...new Set([
        ...(cgRes.data || []).map(x => x.full_name),
        ...(historyRes.data || []).flatMap(x => [x.previous_name,x.next_name]),
        ...(recordRes.data || []).filter(x => x.record_writer?.role === 'caregiver')
          .map(x => x.record_writer.full_name),
        ...manual.values()
      ].filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ko'));
      const overlay = document.createElement('div');
      overlay.id = 'caregiverScheduleModal';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:100005;background:rgba(15,23,42,.55);padding:14px;display:flex;justify-content:center;align-items:flex-start;overflow:auto;';
      overlay.innerHTML = `
        <div style="background:#fff;border-radius:14px;padding:16px;width:min(780px,100%);margin:10px 0 30px;box-shadow:0 15px 45px rgba(0,0,0,.2)">
          <div class="row space" style="align-items:flex-start;gap:12px">
            <div><h3 style="margin:0 0 5px">제공인력 근무일 확인·수정</h3>
              <div class="muted">${esc(serviceCase.mother_name)} 산모님 · ${esc(serviceCase.service_days)}일 등록</div>
            </div>
            <button type="button" class="secondary" id="cgScheduleClose" style="width:auto;flex:0 0 auto">닫기</button>
          </div>
          <div class="notice mt" style="background:#f8fafc;border-color:#dbe4ee">
            <b>기존 자료는 참고용</b>입니다. 기록 작성 계정과 실제 근무자가 다를 수 있습니다.
            날짜를 확인한 뒤 제공인력 이름을 직접 저장하면 해당 일차는 PDF에도 우선 반영됩니다.
            이미 작성한 기록·산모 서명·기존 배정 계정은 변경하지 않습니다.
          </div>
          <div class="card mt" style="border:1px solid #dbeafe;box-shadow:none">
            <h4 style="margin:0 0 7px">근무 기간 요약</h4>
            <div id="cgScheduleSummary"></div>
          </div>
          <div class="card mt" style="border:1px solid #e5e7eb;box-shadow:none">
            <h4 style="margin:0 0 8px">여러 일차에 한 번에 적용</h4>
            <div class="grid3">
              <div><label>시작 일차</label><select id="cgScheduleFrom"></select></div>
              <div><label>마지막 일차</label><select id="cgScheduleTo"></select></div>
              <div><label>제공인력</label><input id="cgScheduleBulkName" list="cgScheduleNames" placeholder="이름 선택·입력"></div>
            </div>
            <button type="button" id="cgScheduleBulkApply" class="secondary mt" style="width:auto">선택한 기간에 적용</button>
            <p class="muted tiny mt">실제 날짜가 작성된 일차에만 적용됩니다. PDF에는 저장 이후 반영됩니다.</p>
          </div>
          <datalist id="cgScheduleNames">${options.map(n=>`<option value="${esc(n)}"></option>`).join('')}</datalist>
          <div class="mt"><h4 style="margin:0 0 8px">일차별 확인 및 수정</h4>
            <div id="cgScheduleRows" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
              ${rows.map((r) => `
                <div data-cg-day="${r.day}" style="padding:10px 12px;border-bottom:1px solid #eef0f3">
                  <div class="row space" style="gap:8px;flex-wrap:wrap">
                    <b style="font-size:13px">${r.day}일차 · ${esc(shortDate(r.date))}</b>
                    <span class="muted tiny" data-cg-state="${r.day}"></span>
                  </div>
                  <div class="muted tiny" style="margin:4px 0 7px">기록 작성자: ${esc(r.recordWriter || '없음')}${r.writerRole === 'admin' ? ' (운영자 계정)' : ''} · ${esc(r.source)}</div>
                  <div class="row" style="align-items:center;gap:6px">
                    <input type="text" data-cg-input="${r.day}" list="cgScheduleNames" maxlength="80"
                      placeholder="${r.date ? '실제 제공인력 이름' : '서비스 날짜 미작성'}"
                      value="${esc(manual.get(r.day) || r.suggested)}" ${!r.date?'disabled':''}
                      style="flex:1;min-width:0">
                    <button type="button" class="secondary" data-cg-restore="${r.day}"
                      ${!r.date?'disabled':''} style="flex:0 0 auto;width:auto;min-height:36px;padding:6px 9px;font-size:12px">자동값</button>
                  </div>
                </div>`).join('')}
            </div>
          </div>
          <div class="row" style="justify-content:flex-end;align-items:center;gap:10px;margin-top:14px;flex-wrap:wrap">
            <span id="cgSchedulePending" class="muted tiny"></span>
            <button type="button" id="cgScheduleSave" class="primary" disabled style="width:auto;min-width:145px">수정한 날짜 저장</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      const el = (selector) => overlay.querySelector(selector);
      const displayName = (day) => pending.has(day) ? pending.get(day) : manual.get(day);
      const values = () => new Map(rows.map(r => [r.day,
        pending.has(r.day) ? (pending.get(r.day) || r.suggested) :
        (manual.get(r.day) || r.suggested)]));
      const explicitSet = () => new Set(rows
        .filter(r => (pending.has(r.day) ? !!pending.get(r.day) : manual.has(r.day)))
        .map(r => r.day));
      const refresh = () => {
        const v = values(), verified = explicitSet();
        const summary = summarize(rows, v, verified);
        el('#cgScheduleSummary').innerHTML = summary.length ?
          summary.map(s => `<div class="row space" style="gap:10px;flex-wrap:wrap;padding:6px 0;border-bottom:1px solid #eff1f4">
            <span><b>${esc(s.name || '확인 필요')}</b> <span class="muted tiny">${esc(s.kind)}</span></span>
            <span style="font-size:12px">${shortDate(s.start)}${s.start!==s.end ? ' ~ ' + shortDate(s.end) : ''} · ${s.count}일</span>
          </div>`).join('') : '<p class="muted">아직 실제 서비스 날짜가 작성되지 않았습니다.</p>';
        for (const row of rows) {
          const state = el(`[data-cg-state="${row.day}"]`);
          state.textContent = !row.date ? '기록 미작성' :
            pending.has(row.day) ? '수정 대기 중' :
            manual.has(row.day) ? '직접 확인하여 저장됨' : '자동 참고값 · 확인 필요';
        }
        el('#cgSchedulePending').textContent = pending.size ? `${pending.size}일 수정 대기` : '수정사항 없음';
        el('#cgScheduleSave').disabled = !pending.size;
      };
      for (const row of rows) {
        const input = el(`[data-cg-input="${row.day}"]`);
        if (!input || !row.date) continue;
        input.addEventListener('input', () => {
          const val = input.value.trim();
          if (val === (manual.get(row.day) || row.suggested)) pending.delete(row.day);
          else pending.set(row.day, val || null);
          refresh();
        });
        el(`[data-cg-restore="${row.day}"]`).onclick = () => {
          input.value = row.suggested;
          if (manual.has(row.day)) pending.set(row.day, null);
          else pending.delete(row.day);
          refresh();
        };
      }
      const dayOptions = rows.filter(row=>row.date).map(row=>
        `<option value="${row.day}">${row.day}일차 (${esc(shortDate(row.date))})</option>`).join('');
      el('#cgScheduleFrom').innerHTML = dayOptions;
      el('#cgScheduleTo').innerHTML = dayOptions;
      const datedRows = rows.filter(r=>r.date);
      if (datedRows.length) el('#cgScheduleTo').value = String(datedRows[datedRows.length-1].day);
      else el('#cgScheduleBulkApply').disabled = true;
      el('#cgScheduleBulkApply').onclick = () => {
        const from = Number(el('#cgScheduleFrom').value);
        const to = Number(el('#cgScheduleTo').value);
        const name = el('#cgScheduleBulkName').value.trim();
        if (!name) return alert('제공인력 이름을 입력해주세요.');
        if (name.length>80) return alert('이름이 너무 깁니다.');
        if (from > to) return alert('마지막 일차는 시작 일차 이후여야 합니다.');
        const affected = rows.filter(r=>r.date && r.day>=from && r.day<=to);
        if (!affected.length) return alert('선택한 기간에 작성된 서비스 날짜가 없습니다.');
        for (const row of affected) {
          el(`[data-cg-input="${row.day}"]`).value = name;
          if (name === (manual.get(row.day) || row.suggested)) pending.delete(row.day);
          else pending.set(row.day, name);
        }
        refresh();
      };
      el('#cgScheduleClose').onclick = () => overlay.remove();
      overlay.onclick = (event) => { if (event.target===overlay) overlay.remove(); };
      el('#cgScheduleSave').onclick = async () => {
        const changes = [...pending.entries()].map(([day,name]) =>
          ({service_day:day,caregiver_name:name}));
        if (!changes.length) return;
        if (!window.confirm(`${changes.length}일의 제공인력을 저장할까요?\n기존 기록과 산모 서명은 변경되지 않습니다.`)) return;
        const btn=el('#cgScheduleSave');
        btn.disabled=true;
        try {
          const {data,error} = await sb.rpc('admin_save_caregiver_day_assignments',{
            p_case_id:caseId, p_changes:changes
          });
          if (error) throw error;
          overlay.remove();
          alert(`${Number(data)||changes.length}일의 근무인력을 저장했습니다. PDF에 반영됩니다.`);
          await openEditor(caseId);
        } catch(err) {
          console.error('관리사 근무일 저장 실패',err);
          alert(`저장하지 못했습니다: ${err?.message || err}`);
          btn.disabled=false;
        }
      };
      refresh();
    } catch (error) {
      console.error('제공인력 근무일 확인 오류',error);
      alert(`근무일 확인 창을 열지 못했습니다. ${error?.message || error}`);
    }
  }
  window.openCaregiverDayEditor = openEditor;
})();