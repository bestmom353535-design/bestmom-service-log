(() => {
  if (window.__BESTMOM_ADMIN_MISSING_DRAFT_V52__) return;
  window.__BESTMOM_ADMIN_MISSING_DRAFT_V52__ = true;

  const previousOpenDay = window.openDay;
  if (typeof previousOpenDay !== 'function') return;

  function isAdmin() {
    return typeof me !== 'undefined' && me?.role === 'admin';
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
      other_service: mode(recent.map((r) => String(r.other_service || '').trim()).filter(Boolean), latest.other_service || '신생아 돌봄 및 산모 식사 지원'),
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
      other_service: '신생아 돌봄 및 산모 식사 지원',
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
    setField('other', draft.other_service);
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

    // 이미 생성된 기록이 있는 일차에는 자동 초안 버튼을 표시하지 않음.
    // 운영자가 선택한 '미작성 일차' 하나에만 적용되도록 제한함.
    if (typeof currentRecord !== 'undefined' && currentRecord?.id) return;

    const button = document.createElement('button');
    button.id = 'adminMissingDraft';
    button.type = 'button';
    button.className = 'secondary full mt';
    button.textContent = `${day}일차 누락 기록 초안 채우기`;
    button.style.fontWeight = '800';
    button.onclick = () => fillMissingDraft(day, button);

    const help = document.createElement('div');
    help.className = 'muted tiny';
    help.style.marginTop = '6px';
    help.textContent = `현재 선택한 ${day}일차에만 적용됩니다. 앞선 기록이 있으면 참고하고, 없으면 3주차 일반 초안값을 넣습니다. 날짜와 서명은 자동입력하지 않습니다.`;

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

  window.openDay = async function openDayWithMissingDraft(day, adminMode) {
    await previousOpenDay(day, adminMode);
    decorate(Number(day), Boolean(adminMode));
  };
})();