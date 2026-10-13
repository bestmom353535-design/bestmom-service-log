(() => {
  if (window.__BESTMOM_ADMIN_CASE_EDIT_V83__) return;
  window.__BESTMOM_ADMIN_CASE_EDIT_V83__ = true;

  const CHOSEONG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  const consonantRe = /^[ㄱ-ㅎ]$/;
  let scanTimer = null;
  let scanning = false;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[ch]));
  }

  function initialOf(char) {
    const code = char?.charCodeAt?.(0);
    if (Number.isFinite(code) && code >= 0xAC00 && code <= 0xD7A3) {
      return CHOSEONG[Math.floor((code - 0xAC00) / 588)] || char;
    }
    return char || '';
  }

  function normalize(value) {
    return String(value || '').replace(/\s+/g, '').toLowerCase();
  }

  function mixedMatch(name, query) {
    const target = normalize(name);
    const q = normalize(query);
    if (!q) return true;
    if (target.includes(q)) return true;
    const initials = [...target].map(initialOf).join('');
    if (initials.includes(q)) return true;

    const qChars = [...q];
    const nChars = [...target];
    if (qChars.length > nChars.length) return false;
    for (let start = 0; start <= nChars.length - qChars.length; start += 1) {
      let ok = true;
      for (let i = 0; i < qChars.length; i += 1) {
        const qc = qChars[i];
        const nc = nChars[start + i];
        if (consonantRe.test(qc)) {
          if (initialOf(nc) !== qc) { ok = false; break; }
        } else if (nc !== qc) {
          ok = false;
          break;
        }
      }
      if (ok) return true;
    }
    return false;
  }

  function removeModal() {
    document.getElementById('adminCaseEditModal')?.remove();
  }

  async function openEditor(caseId) {
    if (typeof me === 'undefined' || me?.role !== 'admin') return;

    try {
      const [{ data: serviceCase, error: caseError }, { data: caregivers, error: cgError }] = await Promise.all([
        sb.from('service_cases').select('*').eq('id', caseId).single(),
        sb.from('profiles').select('id,full_name,active').eq('role', 'caregiver').order('full_name')
      ]);
      if (caseError) throw caseError;
      if (cgError) throw cgError;
      if (!serviceCase) throw new Error('서비스 정보를 찾을 수 없습니다.');

      const caregiverList = (caregivers || []).filter((x) => x.active || x.id === serviceCase.caregiver_id);
      const currentCaregiver = caregiverList.find((x) => x.id === serviceCase.caregiver_id) || null;
      const currentCaregiverName = currentCaregiver?.full_name || serviceCase.caregiver_name_override || '';
      const historyRes = await sb.from('caregiver_change_history')
        .select('id,previous_name,next_name,effective_date,created_at')
        .eq('case_id', caseId)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true });
      if (historyRes.error) throw historyRes.error;
      const caregiverHistory = historyRes.data || [];
      const md = (date) => date ? `${Number(String(date).slice(5,7))}/${Number(String(date).slice(8,10))}` : '변경일 미입력';

      removeModal();
      const overlay = document.createElement('div');
      overlay.id = 'adminCaseEditModal';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(17,24,39,.48);display:flex;align-items:flex-start;justify-content:center;padding:18px;overflow:auto;';
      overlay.innerHTML = `
        <div style="width:min(94vw,720px);background:#fff;border-radius:16px;padding:18px;margin:20px 0;box-shadow:0 18px 45px rgba(0,0,0,.22)">
          <div class="row space" style="align-items:flex-start">
            <div>
              <h3 style="margin-bottom:4px">서비스 정보 수정</h3>
              <div class="muted">기존 제공기록과 산모 서명은 그대로 유지됩니다.</div>
            </div>
            <button type="button" id="adminCaseEditClose" class="secondary" style="width:auto;min-width:70px">닫기</button>
          </div>

          <div class="grid3 mt">
            <div><label>산모명</label><input id="editMotherName" value="${esc(serviceCase.mother_name || '')}"></div>
            <div><label>산모 생년월일</label><input id="editMotherBirth" type="date" value="${esc(serviceCase.mother_birth_date || '')}"></div>
            <div><label>분만형태</label><select id="editDelivery">
              <option value="">선택</option>
              <option value="자연분만" ${serviceCase.delivery_type === '자연분만' ? 'selected' : ''}>자연분만</option>
              <option value="제왕절개" ${serviceCase.delivery_type === '제왕절개' ? 'selected' : ''}>제왕절개</option>
            </select></div>
            <div><label>신생아명</label><input id="editBabyName" value="${esc(serviceCase.baby_name || '')}"></div>
            <div><label>신생아 출생일</label><input id="editBabyBirth" type="date" value="${esc(serviceCase.baby_birth_date || '')}"></div>
            <div><label>출생체중(kg)</label><input id="editBirthWeight" type="number" step="0.01" inputmode="decimal" value="${esc(serviceCase.birth_weight ?? '')}"></div>
            <div><label>서비스 기간</label><select id="editServiceDays">
              <option value="5" ${Number(serviceCase.service_days) === 5 ? 'selected' : ''}>1주 (5일)</option>
              <option value="10" ${Number(serviceCase.service_days) === 10 ? 'selected' : ''}>2주 (10일)</option>
              <option value="15" ${Number(serviceCase.service_days) === 15 ? 'selected' : ''}>3주 (15일)</option>
              <option value="20" ${Number(serviceCase.service_days) === 20 ? 'selected' : ''}>4주 (20일)</option>
            </select></div>
            <div><label>서비스 시작일</label><input id="editStartDate" type="date" value="${esc(serviceCase.start_date || '')}"></div>
          </div>

          <div class="mt" style="position:relative">
            <label>배정 관리사</label>
            <input id="editCaregiverSearch" type="search" autocomplete="off" placeholder="관리사 이름 검색 또는 직접 입력 (예: 김영숙)" value="${esc(currentCaregiverName)}">
            <input id="editCaregiverId" type="hidden" value="${esc(serviceCase.caregiver_id || '')}">
            <div id="editCaregiverSelected" class="muted tiny" style="margin-top:5px">${currentCaregiver
              ? `현재 배정: ${esc(currentCaregiver.full_name)} 관리사`
              : serviceCase.caregiver_name_override
                ? `현재 입력: ${esc(serviceCase.caregiver_name_override)} (미등록)`
                : '현재 배정: 미지정'}</div>
            <div id="editCaregiverResults" style="display:none;position:absolute;z-index:100001;left:0;right:0;top:76px;background:#fff;border:1px solid #d1d5db;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.14);max-height:230px;overflow:auto;padding:5px"></div>
            <button type="button" id="editCaregiverClear" class="secondary" style="margin-top:7px;width:auto;min-height:34px;padding:6px 10px;font-size:12px">관리사 미지정으로 변경</button>
          </div>

          <div id="editCaregiverChangeDateWrap" class="notice mt" style="display:none;background:#eff6ff;border-color:#bfdbfe">
            <label for="editCaregiverChangeDate">새 관리사 실제 투입일 (필수)</label>
            <input type="date" id="editCaregiverChangeDate" style="margin-top:6px">
            <div class="muted tiny mt">이 날짜부터 새 관리사로 변경됩니다. PDF의 제공인력 이름과 해당 일자의 특이사항에 자동으로 표시됩니다.</div>
          </div>
          <div class="notice mt" style="background:#f8fafc;border-color:#e5e7eb">
            관리사 등록 전이라면 이름만 직접 입력해도 저장할 수 있습니다. 미등록 이름은 기록지에는 표시되지만 관리사 로그인과는 연결되지 않습니다. 등록된 관리사를 선택하면 해당 계정으로 배정됩니다.
          </div>
          ${caregiverHistory.length ? `<div class="card mt" style="box-shadow:none;border:1px solid #e5e7eb">
            <h4 style="margin:0 0 8px">기존 관리사 변경 이력</h4>
            <p class="muted tiny">이전에 변경한 건은 실제 교체일을 입력해야 기록지 특이사항에 자동 반영됩니다.</p>
            ${caregiverHistory.map((item) => `<div class="row mt" style="flex-wrap:wrap;align-items:center;gap:8px">
              <span style="flex:1 1 170px;font-size:13px">${esc(item.previous_name)} → ${esc(item.next_name)}</span>
              <input type="date" data-history-date="${item.id}" value="${esc(item.effective_date || '')}" aria-label="교체 시작일" style="flex:0 1 155px">
              <button type="button" class="secondary" data-history-save="${item.id}" style="width:auto;min-height:34px;padding:6px 10px;font-size:12px">날짜 저장</button>
            </div>`).join('')}
          </div>` : ''}

          <div class="card mt" style="border:1px solid #dbeafe;box-shadow:none;background:#f8fbff">
            <h4 style="margin:0 0 7px">제공인력 실제 근무일 확인</h4>
            <p class="muted tiny">관리사별 근무 시작일·마지막 근무일을 한눈에 확인하고, 실제 근무자를 일차별 또는 기간별로 수정할 수 있습니다. PDF에는 확인 후 저장한 내용을 우선 적용합니다.</p>
            <button type="button" id="cgDayScheduleOpen" class="secondary mt" style="width:auto">제공인력 근무일 확인 · 수정</button>
          </div>

          <div class="row" style="justify-content:flex-end;margin-top:16px">
            <button type="button" id="adminCaseEditCancel" class="secondary" style="width:auto">취소</button>
            <button type="button" id="adminCaseEditSave" class="primary" style="width:auto;min-width:130px">수정내용 저장</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);

      const search = document.getElementById('editCaregiverSearch');
      const hiddenId = document.getElementById('editCaregiverId');
      const selected = document.getElementById('editCaregiverSelected');
      const results = document.getElementById('editCaregiverResults');
      const changeDateWrap = document.getElementById('editCaregiverChangeDateWrap');
      const actualReplacement = () => {
        const newId = hiddenId.value || null;
        const picked = caregiverList.find((x) => x.id === newId);
        const newName = picked?.full_name || search.value.trim();
        const changed = (serviceCase.caregiver_id || null) !== newId
          || (serviceCase.caregiver_name_override || null) !== (newId ? null : (search.value.trim() || null));
        return !!(currentCaregiverName && newName && currentCaregiverName !== newName && changed);
      };
      const refreshChangeDate = () => {
        changeDateWrap.style.display = actualReplacement() ? 'block' : 'none';
      };
      overlay.querySelectorAll('[data-history-save]').forEach((button) => {
        button.onclick = async () => {
          const historyId = Number(button.dataset.historySave);
          const dateInput = overlay.querySelector(`[data-history-date="${historyId}"]`);
          const actualDate = dateInput?.value || null;
          if (!actualDate) return alertMsg('실제 교체 시작일을 선택해주세요.');
          button.disabled = true;
          try {
            const { data, error } = await sb.from('caregiver_change_history')
              .update({ effective_date: actualDate })
              .eq('id', historyId).eq('case_id', caseId).select('id');
            if (error) throw error;
            if (!data?.length) throw new Error('날짜가 저장되지 않았습니다. 권한을 확인해주세요.');
            alertMsg('관리사 변경일을 저장했습니다. 제공기록지 PDF에 반영됩니다.');
          } catch (error) {
            console.error(error);
            alertMsg(`교체일 저장 실패: ${error?.message || ''}`);
          } finally { button.disabled = false; }
        };
      });

      const showMatches = () => {
        const query = search.value.trim();
        if (!query) {
          results.style.display = 'none';
          return;
        }
        const matches = caregiverList.filter((x) => mixedMatch(x.full_name, query)).slice(0, 15);
        results.innerHTML = '';
        if (!matches.length) {
          const empty = document.createElement('div');
          empty.className = 'muted';
          empty.style.padding = '10px';
          empty.textContent = '등록된 관리사가 없습니다. 입력한 이름 그대로 저장할 수 있습니다.';
          results.appendChild(empty);
        } else {
          matches.forEach((cg) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.textContent = cg.full_name;
            button.style.cssText = 'display:block;width:100%;text-align:left;background:#fff;padding:9px 10px;min-height:38px;border-radius:7px;font-size:14px';
            button.onclick = () => {
              hiddenId.value = cg.id;
              search.value = cg.full_name;
              selected.textContent = `선택됨: ${cg.full_name} 관리사`;
              results.style.display = 'none';
              refreshChangeDate();
            };
            results.appendChild(button);
          });
        }
        results.style.display = 'block';
      };

      search.addEventListener('input', () => {
        const typed = search.value.trim();
        const current = caregiverList.find((x) => x.id === hiddenId.value);
        if (current && typed === current.full_name) {
          selected.textContent = `선택됨: ${current.full_name} 관리사`;
        } else {
          hiddenId.value = '';
          selected.textContent = typed
            ? `미등록 이름으로 저장: ${typed}`
            : '선택됨: 미지정';
        }
        showMatches();
        refreshChangeDate();
      });
      search.addEventListener('focus', showMatches);

      document.getElementById('editCaregiverClear').onclick = () => {
        hiddenId.value = '';
        search.value = '';
        selected.textContent = '선택됨: 미지정';
        results.style.display = 'none';
        refreshChangeDate();
      };
      refreshChangeDate();

      document.getElementById('cgDayScheduleOpen').onclick = () => {
        if (typeof window.openCaregiverDayEditor !== 'function')
          return alertMsg('제공인력 근무일 수정 기능이 아직 준비되지 않았습니다. 새로고침해주세요.');
        window.openCaregiverDayEditor(caseId);
      };
      document.getElementById('adminCaseEditClose').onclick = removeModal;
      document.getElementById('adminCaseEditCancel').onclick = removeModal;
      overlay.onclick = (event) => { if (event.target === overlay) removeModal(); };

      document.getElementById('adminCaseEditSave').onclick = async () => {
        const saveButton = document.getElementById('adminCaseEditSave');
        const motherName = document.getElementById('editMotherName').value.trim();
        if (!motherName) return alertMsg('산모명을 입력해주세요.');

        const payload = {
          mother_name: motherName,
          mother_birth_date: document.getElementById('editMotherBirth').value || null,
          delivery_type: document.getElementById('editDelivery').value || null,
          baby_name: document.getElementById('editBabyName').value.trim() || null,
          baby_birth_date: document.getElementById('editBabyBirth').value || null,
          birth_weight: document.getElementById('editBirthWeight').value || null,
          service_days: Number(document.getElementById('editServiceDays').value),
          start_date: document.getElementById('editStartDate').value || null,
          caregiver_id: hiddenId.value || null,
          caregiver_name_override: hiddenId.value
            ? null
            : (search.value.trim() || null),
          caregiver_change_effective_date: actualReplacement()
            ? (document.getElementById('editCaregiverChangeDate').value || null)
            : null
        };
        if (actualReplacement() && !payload.caregiver_change_effective_date) {
          return alertMsg('관리사가 변경되는 날짜를 반드시 선택해주세요.');
        }

        if (![5, 10, 15, 20].includes(payload.service_days)) {
          return alertMsg('서비스 기간을 다시 선택해주세요.');
        }

        if (payload.service_days < Number(serviceCase.service_days || 0)) {
          const { data: laterRecords, error: laterError } = await sb
            .from('daily_records')
            .select('service_day')
            .eq('case_id', caseId)
            .gt('service_day', payload.service_days)
            .order('service_day');
          if (laterError) return alertMsg('기존 기록을 확인하지 못했습니다.');
          if ((laterRecords || []).length) {
            const firstDay = Number(laterRecords[0].service_day);
            return alertMsg(
              `${firstDay}일차 이후에 이미 작성된 기록이 있어 서비스 기간을 ${payload.service_days}일로 줄일 수 없습니다.\n\n기존 기록 보호를 위해 자동 삭제하지 않습니다.`
            );
          }
        }

        const oldCaregiverId = serviceCase.caregiver_id || null;
        const newCaregiverId = payload.caregiver_id || null;
        const newCaregiver = caregiverList.find((x) => x.id === newCaregiverId);
        const oldCaregiver = caregiverList.find((x) => x.id === oldCaregiverId);
        const oldCaregiverName = oldCaregiver?.full_name || serviceCase.caregiver_name_override || '미지정';
        const newCaregiverName = newCaregiver?.full_name || payload.caregiver_name_override || '미지정';
        const caregiverChanged =
          oldCaregiverId !== newCaregiverId ||
          (serviceCase.caregiver_name_override || null) !== (payload.caregiver_name_override || null);

        const serviceDaysChanged = Number(serviceCase.service_days) !== payload.service_days;
        const startDateChanged = (serviceCase.start_date || null) !== payload.start_date;
        const changeLines = [];
        if (caregiverChanged) changeLines.push(`관리사: ${oldCaregiverName} → ${newCaregiverName}${payload.caregiver_change_effective_date ? ' (' + md(payload.caregiver_change_effective_date) + '부터)' : ''}`);
        if (serviceDaysChanged) changeLines.push(`서비스 기간: ${serviceCase.service_days}일 → ${payload.service_days}일`);
        if (startDateChanged) changeLines.push(`시작일: ${serviceCase.start_date || '미입력'} → ${payload.start_date || '미입력'}`);

        const message =
          '서비스 정보를 수정하시겠습니까?' +
          (changeLines.length ? '\n\n' + changeLines.join('\n') : '') +
          '\n\n기존 제공기록과 산모 서명은 그대로 유지됩니다.';

        if (!window.confirm(message)) return;

        saveButton.disabled = true;
        try {
          const { error } = await sb.from('service_cases').update(payload).eq('id', caseId);
          if (error) throw error;

          try {
            if (typeof me !== 'undefined' && me?.id) {
              await sb.from('record_audit').insert({
                record_id: null,
                case_id: caseId,
                actor_id: me.id,
                action: 'admin_case_info_updated',
                details: {
                  mother_name_before: serviceCase.mother_name || null,
                  mother_name_after: payload.mother_name,
                  service_days_before: Number(serviceCase.service_days || 0),
                  service_days_after: payload.service_days,
                  start_date_before: serviceCase.start_date || null,
                  start_date_after: payload.start_date,
                  caregiver_id_before: oldCaregiverId,
                  caregiver_id_after: newCaregiverId,
                  caregiver_name_before: oldCaregiverName === '미지정' ? null : oldCaregiverName,
                  caregiver_name_after: newCaregiverName === '미지정' ? null : newCaregiverName,
                  caregiver_name_override_before: serviceCase.caregiver_name_override || null,
                  caregiver_name_override_after: payload.caregiver_name_override || null,
                  caregiver_effective_date: payload.caregiver_change_effective_date || null
                }
              });
            }
          } catch (auditError) {
            console.warn('case edit audit error', auditError);
          }

          removeModal();
          alertMsg('서비스 정보를 수정했습니다. 기존 기록과 서명은 그대로 유지됩니다.');
          if (serviceCase.final_completed_at && typeof window.renderFinalCompletedServices === 'function') {
            if (typeof window.requestFinalListRestore === 'function') {
              window.requestFinalListRestore(caseId);
            }
            await window.renderFinalCompletedServices();
          } else if (['completed', 'stopped'].includes(serviceCase.status) && typeof window.renderEndedServices === 'function') {
            if (typeof window.requestEndedListRestore === 'function') {
              window.requestEndedListRestore(caseId);
            }
            await window.renderEndedServices();
          } else if (typeof adminCases === 'function') {
            await adminCases();
          } else {
            location.reload();
          }
        } catch (error) {
          console.error(error);
          alertMsg(`수정하지 못했습니다. ${error?.message || ''}`);
          saveButton.disabled = false;
        }
      };
    } catch (error) {
      console.error(error);
      alertMsg(`수정 정보를 불러오지 못했습니다. ${error?.message || ''}`);
    }
  }

  window.openAdminCaseEditor = openEditor;

  function scheduleScan() {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scanRows, 100);
  }

  async function scanRows() {
    if (scanning || typeof me === 'undefined' || me?.role !== 'admin') return;
    const mainEl = document.getElementById('main');
    if (!mainEl) return;

    const card = [...mainEl.querySelectorAll('.card')].find(
      (el) => el.querySelector('h3')?.textContent?.trim()?.startsWith('서비스 현황')
    );
    if (!card) return;

    const targets = [...card.querySelectorAll(':scope > .case')].map((row) => {
      const openButton = [...row.querySelectorAll('button')].find((b) => (b.getAttribute('onclick') || '').includes('openCase('));
      const match = openButton?.getAttribute('onclick')?.match(/openCase\('([^']+)'/);
      return match ? { row, caseId: match[1], openButton } : null;
    }).filter(Boolean);
    if (!targets.length) return;

    scanning = true;
    try {
      const ids = targets.map((x) => x.caseId);
      const { data, error } = await sb.from('service_cases').select('id,status').in('id', ids);
      if (error) throw error;
      const statusMap = new Map((data || []).map((x) => [x.id, x.status]));

      targets.forEach(({ row, caseId, openButton }) => {
        const existing = row.querySelector(`[data-admin-edit-case="${caseId}"]`);
        if (statusMap.get(caseId) !== 'active') {
          existing?.remove();
          return;
        }
        if (existing) return;

        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'secondary';
        button.dataset.adminEditCase = caseId;
        button.textContent = '서비스 정보 수정';
        button.onclick = () => openEditor(caseId);

        const buttonRow = openButton.closest('.row') || row;
        buttonRow.appendChild(button);
      });
    } catch (error) {
      console.error('운영자 산모/관리사 수정 버튼 표시 오류', error);
    } finally {
      scanning = false;
    }
  }

  function start() {
    const mainEl = document.getElementById('main');
    if (!mainEl) return;
    new MutationObserver(scheduleScan).observe(mainEl, { childList: true, subtree: true });
    scheduleScan();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
