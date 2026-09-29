(() => {
  if (window.__BESTMOM_ADMIN_MISSING_DRAFT_V57__) return;
  window.__BESTMOM_ADMIN_MISSING_DRAFT_V57__ = true;

  const previousOpenDay = window.openDay;
  const previousOpenCase = window.openCase;
  if (typeof previousOpenDay !== 'function' || typeof previousOpenCase !== 'function') return;

  const BULK_STORAGE_PREFIX = 'bestmom_bulk_record_drafts_v56_';

  function isAdmin() {
    return typeof me !== 'undefined' && me?.role === 'admin';
  }

  function bulkKey(caseId) {
    return BULK_STORAGE_PREFIX + caseId;
  }

  function loadBulkDrafts(caseId) {
    try {
      return JSON.parse(localStorage.getItem(bulkKey(caseId)) || '{}') || {};
    } catch (_) {
      return {};
    }
  }

  function saveBulkDrafts(caseId, drafts) {
    try {
      localStorage.setItem(bulkKey(caseId), JSON.stringify(drafts || {}));
      return true;
    } catch (error) {
      console.error('전체 초안 저장 오류', error);
      return false;
    }
  }

  function recordNeedsDraft(row) {
    if (!row) return true;
    if (row.locked) return false;

    const missingArray = (value) => !Array.isArray(value) || value.length === 0;
    const missingText = (value) => !String(value || '').trim();
    const missingNumber = (value) => value === null || value === undefined || value === '';

    if (missingArray(row.incision_status)) return true;
    if (missingArray(row.breast_status)) return true;
    if (missingArray(row.urination_bowel_status)) return true;
    if (missingText(row.sitz_bath)) return true;
    if (missingNumber(row.meal_count)) return true;
    if (missingNumber(row.snack_count)) return true;
    if (missingNumber(row.baby_temp)) return true;
    if (missingText(row.sleep_status)) return true;
    if (missingNumber(row.breastfeed_count)) return true;
    if (missingNumber(row.formula_count)) return true;
    if (Number(row.formula_count) !== 0 && missingNumber(row.formula_ml)) return true;
    if (missingText(row.stool_status)) return true;
    if (missingText(row.bath_cord_status)) return true;
    if (missingText(row.notes)) return true;
    return false;
  }

  function values(arr) {
    return (arr || []).filter((v) => v !== null && v !== undefined && v !== '');
  }

  function median(arr) {
    const nums = values(arr).map(Number).filter(Number.isFinite).sort((a,b) => a-b);
    if (!nums.length) return null;
    const mid = Math.floor(nums.length / 2);
    return nums.length % 2 ? nums[mid] : Math.round(((nums[mid - 1] + nums[mid]) / 2) * 10) / 10;
  }

  function mode(arr, fallback = null) {
    const vals = values(arr);
    if (!vals.length) return fallback;
    const counts = new Map();
    vals.forEach((v) => {
      const key = JSON.stringify(v);
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    let best = null;
    let bestCount = -1;
    for (const [key, count] of counts) {
      if (count > bestCount) {
        best = JSON.parse(key);
        bestCount = count;
      }
    }
    return best;
  }

  function modeArray(arrays, fallback = []) {
    const normalized = values(arrays).map((a) => Array.isArray(a) ? [...a].sort() : []);
    return mode(normalized, fallback);
  }

  function shortRepeatedNote(records) {
    const notes = records.map((r) => String(r.notes || '').trim()).filter(Boolean);
    if (!notes.length) return null;
    const picked = mode(notes, null);
    if (!picked || picked.length > 36) return null;
    const count = notes.filter((x) => x === picked).length;
    if (records.length >= 2 && count < 2) return null;
    return picked;
  }

  function buildFromPrevious(records) {
    const recent = records.slice(0, 5);
    const latest = recent[0] || {};
    const formulaCount = median(recent.map((r) => r.formula_count));
    const result = {
      incision_status: modeArray(recent.map((r) => r.incision_status), ['이상없음']),
      breast_status: modeArray(recent.map((r) => r.breast_status), ['이상없음']),
      urination_bowel_status: modeArray(recent.map((r) => r.urination_bowel_status), ['이상없음']),
      sitz_bath: mode(recent.map((r) => r.sitz_bath), null),
      meal_count: median(recent.map((r) => r.meal_count)),
      snack_count: median(recent.map((r) => r.snack_count)),
      baby_temp: median(recent.map((r) => r.baby_temp)),
      sleep_status: mode(recent.map((r) => r.sleep_status), '잘잠'),
      breastfeed_count: median(recent.map((r) => r.breastfeed_count)),
      formula_count: formulaCount,
      formula_ml: formulaCount === 0 ? null : median(recent.map((r) => r.formula_ml)),
      stool_status: mode(recent.map((r) => r.stool_status), '정상변'),
      bath_cord_status: mode(recent.map((r) => r.bath_cord_status), '실시'),
      notes: shortRepeatedNote(recent) || '수유 및 수면상태 양호함.'
    };
    return result;
  }

  function buildGenericThreeWeekDraft() {
    return {
      incision_status: ['이상없음'],
      breast_status: ['이상없음'],
      urination_bowel_status: ['이상없음'],
      sitz_bath: '미실시',
      meal_count: 3,
      snack_count: 1,
      baby_temp: 36.7,
      sleep_status: '잘잠',
      breastfeed_count: 6,
      formula_count: 2,
      formula_ml: 70,
      stool_status: '정상변',
      bath_cord_status: '실시',
      notes: '수유 및 수면상태 양호함.'
    };
  }

  function setGroup(name, wanted) {
    const inputs = [...document.querySelectorAll(`input[name="${name}"]`)];
    if (!inputs.length || inputs.some((x) => x.checked)) return;
    const list = Array.isArray(wanted) ? wanted : [wanted];
    inputs.forEach((input) => {
      if (list.includes(input.value)) input.checked = true;
    });
  }

  function setField(id, value) {
    const el = document.getElementById(id);
    if (!el || el.disabled || String(el.value || '').trim() !== '') return;
    if (value === null || value === undefined || value === '') return;
    el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function applyDraft(draft) {
    setGroup('inc', draft.incision_status);
    setGroup('breast', draft.breast_status);
    setGroup('urine', draft.urination_bowel_status);
    setGroup('sitz', draft.sitz_bath);
    setField('meal', draft.meal_count);
    setField('snack', draft.snack_count);
    setField('temp', draft.baby_temp);
    setGroup('sleep', draft.sleep_status);
    setField('bf', draft.breastfeed_count);
    setField('fc', draft.formula_count);
    setField('fml', draft.formula_ml);
    setGroup('stool', draft.stool_status);
    setGroup('bath', draft.bath_cord_status);
    setField('notes', draft.notes);
  }

  function addDraftNotice(basisText) {
    document.querySelector('[data-admin-auto-draft-notice]')?.remove();
    const notice = document.createElement('div');
    notice.dataset.adminAutoDraftNotice = '1';
    notice.className = 'notice mt';
    notice.style.cssText += ';background:#eff6ff;border-color:#93c5fd;color:#1e3a8a;font-weight:700;';
    notice.innerHTML = `자동 초안 적용됨 · ${basisText}<br><span style="font-weight:500">서비스 날짜는 직접 입력하고, 저장 전 실제 제공내용과 맞는지 확인해주세요.</span>`;
    const save = document.getElementById('save');
    if (save) save.insertAdjacentElement('beforebegin', notice);
  }

  function markPreparedButtons(caseId) {
    const drafts = loadBulkDrafts(caseId);
    const buttons = [...document.querySelectorAll('#main .record-button')];
    buttons.forEach((button, index) => {
      const day = index + 1;
      if (!drafts[day]) return;
      if (!button.textContent.includes('미작성')) return;
      button.innerHTML = `${day}일차<br><small style="font-size:11px;font-weight:800">초안 준비 · 미저장</small>`;
      button.style.background = '#eff6ff';
      button.style.borderColor = '#93c5fd';
      button.style.color = '#1d4ed8';
    });
  }

  async function prepareAllDrafts(caseId, button) {
    if (!isAdmin()) return;
    const ok = window.confirm(
      '전체 일차의 비어 있는 항목에 자동 초안을 준비하시겠습니까?\n\n' +
      '기존 입력값·서비스 날짜·산모 서명·기타서비스는 건드리지 않습니다.\n' +
      '각 일차를 열어 내용을 확인한 뒤 직접 저장해주세요.'
    );
    if (!ok) return;

    if (button) button.disabled = true;
    try {
      const { data: rows, error } = await sb
        .from('daily_records')
        .select('service_day,locked,incision_status,breast_status,urination_bowel_status,sitz_bath,meal_count,snack_count,baby_temp,sleep_status,breastfeed_count,formula_count,formula_ml,stool_status,bath_cord_status,other_service,notes')
        .eq('case_id', caseId)
        .order('service_day');
      if (error) throw error;

      let totalDays = Number(
        typeof currentCase !== 'undefined' && currentCase?.id === caseId
          ? currentCase.service_days
          : 0
      );
      if (!totalDays) {
        const { data: serviceCase, error: caseError } = await sb
          .from('service_cases')
          .select('service_days')
          .eq('id', caseId)
          .single();
        if (caseError) throw caseError;
        totalDays = Number(serviceCase?.service_days || 0);
      }

      const actual = rows || [];
      const byDay = new Map(actual.map((row) => [Number(row.service_day), row]));
      const drafts = {};

      for (let day = 1; day <= totalDays; day += 1) {
        const row = byDay.get(day);
        if (!recordNeedsDraft(row)) continue;

        const previous = actual
          .filter((item) => Number(item.service_day) < day)
          .sort((a, b) => Number(b.service_day) - Number(a.service_day))
          .slice(0, 5);

        const hasPrevious = previous.length > 0;
        drafts[day] = {
          draft: hasPrevious ? buildFromPrevious(previous) : buildGenericThreeWeekDraft(),
          basis: hasPrevious ? 'previous_records' : 'generic_three_week_draft',
          reference_service_days: hasPrevious ? previous.map((item) => Number(item.service_day)) : [],
          prepared_at: new Date().toISOString()
        };
      }

      if (!saveBulkDrafts(caseId, drafts)) throw new Error('브라우저에 전체 초안을 저장하지 못했습니다.');

      markPreparedButtons(caseId);

      try {
        await sb.from('record_audit').insert({
          record_id: null,
          case_id: caseId,
          actor_id: me?.id || null,
          action: 'admin_bulk_missing_record_drafts_prepared',
          details: {
            prepared_service_days: Object.keys(drafts).map(Number),
            count: Object.keys(drafts).length
          }
        });
      } catch (auditError) {
        console.warn('bulk draft audit error', auditError);
      }

      alertMsg(
        Object.keys(drafts).length
          ? `총 ${Object.keys(drafts).length}개 일차의 빈칸 초안을 준비했습니다.\n\n각 일차를 열면 자동으로 채워져 보이며, 확인 후 저장해주세요.`
          : '현재 자동으로 채울 빈칸이 없습니다.'
      );
    } catch (error) {
      console.error(error);
      alertMsg(`전체 초안을 준비하지 못했습니다. ${error?.message || ''}`);
    } finally {
      if (button) button.disabled = false;
    }
  }

  function addBulkButton(caseId, adminMode) {
    if (!adminMode || !isAdmin() || document.getElementById('adminBulkMissingDraft')) return;
    const recordButtons = [...document.querySelectorAll('#main .record-button')];
    const row = recordButtons[0]?.parentElement;
    if (!row) return;

    const wrap = document.createElement('div');
    wrap.dataset.adminBulkDraft = '1';
    wrap.style.marginTop = '10px';

    const button = document.createElement('button');
    button.id = 'adminBulkMissingDraft';
    button.type = 'button';
    button.className = 'secondary full';
    button.textContent = '전체 빈칸 자동 채우기';
    button.style.fontWeight = '900';
    button.onclick = () => prepareAllDrafts(caseId, button);

    const help = document.createElement('div');
    help.className = 'muted tiny';
    help.style.marginTop = '6px';
    help.textContent = '전체 일차의 비어 있는 항목만 초안으로 준비합니다. 기존 입력값·서비스 날짜·서명·기타서비스는 유지되며, 실제 저장은 각 일차에서 확인 후 진행합니다.';

    wrap.append(button, help);
    row.insertAdjacentElement('afterend', wrap);
    markPreparedButtons(caseId);
  }

  function applyPreparedBulkDraft(day) {
    if (!isAdmin() || typeof currentCase === 'undefined' || !currentCase?.id) return;
    if (typeof currentRecord !== 'undefined' && currentRecord?.locked) return;

    const prepared = loadBulkDrafts(currentCase.id)?.[day];
    if (!prepared?.draft) return;

    applyDraft(prepared.draft);
    const date = document.getElementById('serviceDate');
    if (!currentRecord?.id && date) date.value = '';

    addDraftNotice(
      prepared.basis === 'previous_records'
        ? `전체 초안 · 이전 ${prepared.reference_service_days?.length || 0}개 기록 참고`
        : '전체 초안 · 이전 기록 없음 · 3주차 일반 초안값 적용'
    );
  }

  async function fillMissingDraft(day, button) {
    button.disabled = true;
    try {
      const { data: previous, error } = await sb
        .from('daily_records')
        .select('service_day,incision_status,breast_status,urination_bowel_status,sitz_bath,meal_count,snack_count,baby_temp,sleep_status,breastfeed_count,formula_count,formula_ml,stool_status,bath_cord_status,other_service,notes')
        .eq('case_id', currentCase.id)
        .lt('service_day', Number(day))
        .order('service_day', { ascending: false })
        .limit(5);
      if (error) throw error;

      const hasPrevious = (previous || []).length > 0;
      const draft = hasPrevious ? buildFromPrevious(previous) : buildGenericThreeWeekDraft();
      applyDraft(draft);

      const date = document.getElementById('serviceDate');
      if (!currentRecord?.id && date) date.value = '';

      addDraftNotice(
        hasPrevious
          ? `최근 ${Math.min(previous.length, 5)}일 기록 패턴 참고`
          : '이전 기록 없음 · 3주차 일반 초안값 적용'
      );

      try {
        await sb.from('record_audit').insert({
          record_id: currentRecord?.id || null,
          case_id: currentCase.id,
          actor_id: me?.id || null,
          action: 'admin_missing_record_draft_applied',
          details: {
            service_day: Number(day),
            basis: hasPrevious ? 'previous_records' : 'generic_three_week_draft',
            reference_service_days: hasPrevious ? previous.map((r) => r.service_day) : []
          }
        });
      } catch (auditError) {
        console.warn('draft audit error', auditError);
      }
    } catch (error) {
      console.error(error);
      alertMsg(`초안을 만들지 못했습니다. ${error?.message || ''}`);
    } finally {
      button.disabled = false;
    }
  }

  function decorate(day, adminMode) {
    if (!adminMode || !isAdmin()) return;
    const save = document.getElementById('save');
    if (!save || document.getElementById('adminMissingDraft')) return;

    // 운영자가 현재 열어둔 일차 하나에만 적용함.
    // 기존 값은 그대로 두고 비어 있는 항목만 채움.

    const button = document.createElement('button');
    button.id = 'adminMissingDraft';
    button.type = 'button';
    button.className = 'secondary full mt';
    button.textContent = `${day}일차 빈칸 자동 채우기`;
    button.style.fontWeight = '800';
    button.onclick = () => fillMissingDraft(day, button);

    const help = document.createElement('div');
    help.className = 'muted tiny';
    help.style.marginTop = '6px';
    help.textContent = `현재 선택한 ${day}일차의 비어 있는 항목만 채웁니다. 앞선 기록이 있으면 참고하고, 없으면 3주차 일반 초안값을 사용합니다. 기존 입력값·서비스 날짜·서명·기타서비스는 건드리지 않습니다.`;

    save.insertAdjacentElement('beforebegin', button);
    button.insertAdjacentElement('afterend', help);

    const originalSave = save.onclick;
    if (typeof originalSave === 'function') {
      save.onclick = async (event) => {
        if (document.querySelector('[data-admin-auto-draft-notice]')) {
          const ok = window.confirm('자동으로 채운 초안값을 실제 제공내용과 맞게 확인하셨습니까?\n\n확인 후 저장해주세요.');
          if (!ok) return;
        }
        return originalSave.call(save, event);
      };
    }
  }

  window.openCase = async function openCaseWithBulkDraft(caseId, adminMode) {
    await previousOpenCase(caseId, adminMode);
    addBulkButton(caseId, Boolean(adminMode));
  };

  window.openDay = async function openDayWithMissingDraft(day, adminMode) {
    await previousOpenDay(day, adminMode);
    if (adminMode) applyPreparedBulkDraft(Number(day));
    decorate(Number(day), Boolean(adminMode));
  };
})();