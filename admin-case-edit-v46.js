(() => {
  if (window.__BESTMOM_ADMIN_CASE_EDIT_V46__) return;
  window.__BESTMOM_ADMIN_CASE_EDIT_V46__ = true;

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

      removeModal();
      const overlay = document.createElement('div');
      overlay.id = 'adminCaseEditModal';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(17,24,39,.48);display:flex;align-items:flex-start;justify-content:center;padding:18px;overflow:auto;';
      overlay.innerHTML = `
        <div style="width:min(94vw,720px);background:#fff;border-radius:16px;padding:18px;margin:20px 0;box-shadow:0 18px 45px rgba(0,0,0,.22)">
          <div class="row space" style="align-items:flex-start">
            <div>
              <h3 style="margin-bottom:4px">산모 · 배정정보 수정</h3>
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
          </div>

          <div class="mt" style="position:relative">
            <label>배정 관리사</label>
            <input id="editCaregiverSearch" type="search" autocomplete="off" placeholder="관리사 이름 검색 (예: 황ㅅ, ㅎㅅㅇ)" value="${esc(currentCaregiver?.full_name || '')}">
            <input id="editCaregiverId" type="hidden" value="${esc(serviceCase.caregiver_id || '')}">
            <div id="editCaregiverSelected" class="muted tiny" style="margin-top:5px">${currentCaregiver ? `현재 배정: ${esc(currentCaregiver.full_name)} 관리사` : '현재 배정: 미지정'}</div>
            <div id="editCaregiverResults" style="display:none;position:absolute;z-index:100001;left:0;right:0;top:76px;background:#fff;border:1px solid #d1d5db;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.14);max-height:230px;overflow:auto;padding:5px"></div>
            <button type="button" id="editCaregiverClear" class="secondary" style="margin-top:7px;width:auto;min-height:34px;padding:6px 10px;font-size:12px">관리사 미지정으로 변경</button>
          </div>

          <div class="notice mt" style="background:#f8fafc;border-color:#e5e7eb">
            관리사를 변경하면 저장 즉시 새 관리사에게 해당 서비스가 표시되고, 기존 관리사 화면에서는 빠집니다.
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
          empty.textContent = '검색되는 관리사가 없습니다.';
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
            };
            results.appendChild(button);
          });
        }
        results.style.display = 'block';
      };

      search.addEventListener('input', () => {
        const current = caregiverList.find((x) => x.id === hiddenId.value);
        if (!current || search.value.trim() !== current.full_name) {
          hiddenId.value = '';
          selected.textContent = '검색 후 관리사 이름을 눌러 선택해주세요.';
        }
        showMatches();
      });
      search.addEventListener('focus', showMatches);

      document.getElementById('editCaregiverClear').onclick = () => {
        hiddenId.value = '';
        search.value = '';
        selected.textContent = '선택됨: 미지정';
        results.style.display = 'none';
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
          caregiver_id: hiddenId.value || null
        };

        const oldCaregiverId = serviceCase.caregiver_id || null;
        const newCaregiverId = payload.caregiver_id || null;
        const caregiverChanged = oldCaregiverId !== newCaregiverId;
        const newCaregiver = caregiverList.find((x) => x.id === newCaregiverId);
        const oldCaregiver = caregiverList.find((x) => x.id === oldCaregiverId);

        const message = caregiverChanged
          ? `산모 정보와 배정 관리사를 수정하시겠습니까?\n\n관리사: ${oldCaregiver?.full_name || '미지정'} → ${newCaregiver?.full_name || '미지정'}\n\n기존 제공기록과 산모 서명은 그대로 유지됩니다.`
          : '산모 정보를 수정하시겠습니까?\n\n기존 제공기록과 산모 서명은 그대로 유지됩니다.';
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
                  caregiver_id_before: oldCaregiverId,
                  caregiver_id_after: newCaregiverId,
                  caregiver_name_before: oldCaregiver?.full_name || null,
                  caregiver_name_after: newCaregiver?.full_name || null
                }
              });
            }
          } catch (auditError) {
            console.warn('case edit audit error', auditError);
          }

          removeModal();
          alertMsg('산모 및 배정정보를 수정했습니다. 기존 기록과 서명은 그대로 유지됩니다.');
          if (typeof adminCases === 'function') await adminCases();
          else location.reload();
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

  function scheduleScan() {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scanRows, 100);
  }

  async function scanRows() {
    if (scanning || typeof me === 'undefined' || me?.role !== 'admin') return;
    const mainEl = document.getElementById('main');
    if (!mainEl) return;

    const card = [...mainEl.querySelectorAll('.card')].find(
      (el) => el.querySelector('h3')?.textContent?.trim() === '서비스 현황'
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
        button.textContent = '산모 · 관리사 수정';
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
