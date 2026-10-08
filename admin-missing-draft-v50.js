(() => {
  if (window.__BESTMOM_ADMIN_MISSING_DRAFT_V79__) return;
  window.__BESTMOM_ADMIN_MISSING_DRAFT_V79__ = true;

  const previousOpenDay = window.openDay;
  const previousOpenCase = window.openCase;
  if (typeof previousOpenDay !== 'function' || typeof previousOpenCase !== 'function') return;

  const BULK_STORAGE_PREFIX = 'bestmom_bulk_record_drafts_v79_';

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

  function parseLocalDate(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatLocalDate(date) {
    if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const KOREA_PUBLIC_HOLIDAYS_2026 = new Set([
    '2026-01-01',
    '2026-02-16', '2026-02-17', '2026-02-18',
    '2026-03-01', '2026-03-02',
    '2026-05-01', '2026-05-05', '2026-05-24', '2026-05-25',
    '2026-06-03', '2026-06-06',
    '2026-07-17',
    '2026-08-15', '2026-08-17',
    '2026-09-24', '2026-09-25', '2026-09-26',
    '2026-10-03', '2026-10-05', '2026-10-09',
    '2026-12-25'
  ]);

  function isServiceWorkday(date) {
    const day = date.getDay();
    if (day === 0 || day === 6) return false;
    const key = formatLocalDate(date);
    if (date.getFullYear() === 2026 && KOREA_PUBLIC_HOLIDAYS_2026.has(key)) return false;
    return true;
  }

  function weekdayDateForServiceDay(startDate, serviceDay) {
    const date = parseLocalDate(startDate);
    if (!date || !Number.isFinite(Number(serviceDay)) || Number(serviceDay) < 1) return '';

    while (!isServiceWorkday(date)) date.setDate(date.getDate() + 1);

    let count = 1;
    while (count < Number(serviceDay)) {
      date.setDate(date.getDate() + 1);
      if (isServiceWorkday(date)) count += 1;
    }
    return formatLocalDate(date);
  }

  function recordNeedsDraft(row) {
    if (!row) return true;
    if (row.locked) return false;

    const missingArray = (value) => !Array.isArray(value) || value.length === 0;
    const missingText = (value) => !String(value || '').trim();
    const missingNumber = (value) => value === null || value === undefined || value === '';

    if (missingText(row.service_date)) return true;
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

  function filledArray(value) {
    return Array.isArray(value) && value.length > 0;
  }

  function filledText(value) {
    return String(value || '').trim() !== '';
  }

  function filledNumber(value) {
    return value !== null && value !== undefined && value !== '';
  }

  function mergeAutoRecord(caseId, day, row, draft, serviceDate) {
    const formulaCount = filledNumber(row?.formula_count) ? row.formula_count : draft.formula_count;
    return {
      case_id: caseId,
      service_day: Number(day),
      service_date: row?.service_date || serviceDate,
      incision_status: filledArray(row?.incision_status) ? row.incision_status : (draft.incision_status || []),
      breast_status: filledArray(row?.breast_status) ? row.breast_status : (draft.breast_status || []),
      urination_bowel_status: filledArray(row?.urination_bowel_status) ? row.urination_bowel_status : (draft.urination_bowel_status || []),
      sitz_bath: filledText(row?.sitz_bath) ? row.sitz_bath : (draft.sitz_bath || null),
      meal_count: filledNumber(row?.meal_count) ? row.meal_count : draft.meal_count,
      snack_count: filledNumber(row?.snack_count) ? row.snack_count : draft.snack_count,
      baby_temp: filledNumber(row?.baby_temp) ? row.baby_temp : draft.baby_temp,
      sleep_status: filledText(row?.sleep_status) ? row.sleep_status : (draft.sleep_status || null),
      breastfeed_count: filledNumber(row?.breastfeed_count) ? row.breastfeed_count : draft.breastfeed_count,
      formula_count: formulaCount,
      formula_ml: filledNumber(row?.formula_ml)
        ? row.formula_ml
        : (Number(formulaCount) === 0 ? null : draft.formula_ml),
      stool_status: filledText(row?.stool_status) ? row.stool_status : (draft.stool_status || null),
      bath_cord_status: filledText(row?.bath_cord_status) ? row.bath_cord_status : (draft.bath_cord_status || null),
      other_service: row?.other_service || null,
      notes: filledText(row?.notes) ? row.notes : (draft.notes || null)
    };
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

  function pickActual(records, field) {
    const available = (records || [])
      .map((row) => row?.[field])
      .filter((value) => value !== null && value !== undefined && value !== '');
    if (!available.length) return null;
    return available[Math.floor(Math.random() * available.length)];
  }

  const NOTE_VARIATIONS = {
    memo: [
      '아기 잘 먹고 잘 잤음',
      '수유 후 편안히 잘 잤음',
      '트림 잘 하고 편안해 보였음',
      '기저귀 갈고 잘 쉬었음',
      '분유 잘 먹고 편안히 잤음',
      '배변 괜찮고 잘 먹었음',
      '수유하고 트림 잘 했음',
      '잘 먹고 편안히 지냈음',
      '낮잠 잘 자고 수유 잘 했음',
      '기저귀 갈고 수유 잘 했음',
      '아기 컨디션 좋아 보였음',
      '수유 후 편안히 쉬었음',
      '잠 잘 자고 잘 먹었음',
      '배변 상태 괜찮았음',
      '수유 후 트림 잘 했음',
      '잘 먹고 잘 자는 편이었음',
      '아기 편안하게 잘 있었음',
      '분유 잘 먹고 잘 쉬었음',
      '수유와 기저귀 교환 잘 했음',
      '특별한 불편 없이 잘 지냈음'
    ],
    polite: [
      '아기 잘 먹고 잘 잤습니다',
      '수유 후 편안히 잘 잤습니다',
      '트림 잘 하고 편안해 보였습니다',
      '기저귀 갈고 잘 쉬었습니다',
      '분유 잘 먹고 편안히 잤습니다',
      '배변 괜찮고 잘 먹었습니다',
      '수유하고 트림 잘 했습니다',
      '잘 먹고 편안히 지냈습니다',
      '낮잠 잘 자고 수유 잘 했습니다',
      '기저귀 갈고 수유 잘 했습니다',
      '아기 컨디션 좋아 보였습니다',
      '수유 후 편안히 쉬었습니다',
      '잠 잘 자고 잘 먹었습니다',
      '배변 상태 괜찮았습니다',
      '수유 후 트림 잘 했습니다',
      '잘 먹고 잘 자는 편이었습니다',
      '아기 편안하게 잘 있었습니다',
      '분유 잘 먹고 잘 쉬었습니다',
      '수유와 기저귀 교환 잘 했습니다',
      '특별한 불편 없이 잘 지냈습니다'
    ],
    plain: [
      '아기 잘 먹고 잘 잤다',
      '수유 후 편안히 잘 잤다',
      '트림 잘 하고 편안해 보였다',
      '기저귀 갈고 잘 쉬었다',
      '분유 잘 먹고 편안히 잤다',
      '배변 괜찮고 잘 먹었다',
      '수유하고 트림 잘 했다',
      '잘 먹고 편안히 지냈다',
      '낮잠 잘 자고 수유 잘 했다',
      '기저귀 갈고 수유 잘 했다',
      '아기 컨디션 좋아 보였다',
      '수유 후 편안히 쉬었다',
      '잠 잘 자고 잘 먹었다',
      '배변 상태 괜찮았다',
      '수유 후 트림 잘 했다',
      '잘 먹고 잘 자는 편이었다',
      '아기 편안하게 잘 있었다',
      '분유 잘 먹고 잘 쉬었다',
      '수유와 기저귀 교환 잘 했다',
      '특별한 불편 없이 잘 지냈다'
    ]
  };

  function noteStyleForMother(motherName) {
    const text = String(motherName || '').trim() || '산모';
    let hash = 0;
    for (const ch of text) hash = ((hash * 31) + ch.charCodeAt(0)) >>> 0;
    return ['memo', 'polite', 'plain'][hash % 3];
  }

  function variedNote(records = [], usedNotes = null, motherName = '') {
    const used = new Set(
      (records || [])
        .map((r) => String(r?.notes || '').trim())
        .filter(Boolean)
    );
    if (usedNotes) {
      [...usedNotes].forEach((note) => used.add(String(note || '').trim()));
    }

    const style = noteStyleForMother(motherName);
    const stylePool = NOTE_VARIATIONS[style] || NOTE_VARIATIONS.memo;
    const available = stylePool.filter((note) => !used.has(note));
    const pool = available.length ? available : stylePool;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function buildFromPrevious(records, usedNotes = null, motherName = '') {
    const recent = records.slice(0, 5);
    const formulaCount = pickActual(recent, 'formula_count');
    const result = {
      incision_status: modeArray(recent.map((r) => r.incision_status), ['이상없음']),
      breast_status: modeArray(recent.map((r) => r.breast_status), ['이상없음']),
      urination_bowel_status: modeArray(recent.map((r) => r.urination_bowel_status), ['이상없음']),
      sitz_bath: mode(recent.map((r) => r.sitz_bath), '미실시'),
      meal_count: pickActual(recent, 'meal_count'),
      snack_count: pickActual(recent, 'snack_count'),
      baby_temp: pickActual(recent, 'baby_temp'),
      sleep_status: mode(recent.map((r) => r.sleep_status), '잘잠'),
      breastfeed_count: pickActual(recent, 'breastfeed_count'),
      formula_count: formulaCount,
      formula_ml: formulaCount === 0 ? null : pickActual(recent, 'formula_ml'),
      stool_status: mode(recent.map((r) => r.stool_status), '정상변'),
      bath_cord_status: mode(recent.map((r) => r.bath_cord_status), '실시'),
      notes: variedNote(recent, usedNotes, motherName)
    };
    return result;
  }

  function buildGenericThreeWeekDraft(usedNotes = null, motherName = '') {
    return {
      incision_status: ['이상없음'],
      breast_status: ['이상없음'],
      urination_bowel_status: ['이상없음'],
      sitz_bath: '미실시',
      meal_count: null,
      snack_count: null,
      baby_temp: null,
      sleep_status: '잘잠',
      breastfeed_count: null,
      formula_count: null,
      formula_ml: null,
      stool_status: '정상변',
      bath_cord_status: '실시',
      notes: variedNote([], usedNotes, motherName)
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
    notice.innerHTML = `자동 초안 적용됨 · ${basisText}<br><span style="font-weight:500">저장 전 날짜와 실제 제공내용이 맞는지 확인해주세요.</span>`;
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
      '전체 일차의 빈칸을 자동으로 채우고 바로 저장하시겠습니까?\n\n' +
      '기존 입력값·산모 서명·기타서비스는 건드리지 않습니다.\n' +
      '빈 서비스 날짜는 시작일 기준으로 주말과 2026년 공휴일·대체공휴일·명절·선거일을 제외해 자동 입력합니다.\n' +
      '저장 후 각 일차를 열어 바로 산모 서명을 입력하거나 수정할 수 있습니다.'
    );
    if (!ok) return;

    if (button) button.disabled = true;
    try {
      const { data: rows, error } = await sb
        .from('daily_records')
        .select('service_day,service_date,locked,incision_status,breast_status,urination_bowel_status,sitz_bath,meal_count,snack_count,baby_temp,sleep_status,breastfeed_count,formula_count,formula_ml,stool_status,bath_cord_status,other_service,notes')
        .eq('case_id', caseId)
        .order('service_day');
      if (error) throw error;

      let serviceMeta =
        typeof currentCase !== 'undefined' && currentCase?.id === caseId
          ? currentCase
          : null;

      if (!serviceMeta?.service_days || !serviceMeta?.start_date) {
        const { data: serviceCase, error: caseError } = await sb
          .from('service_cases')
          .select('service_days,start_date,mother_name')
          .eq('id', caseId)
          .single();
        if (caseError) throw caseError;
        serviceMeta = { ...(serviceMeta || {}), ...(serviceCase || {}) };
      }

      const totalDays = Number(serviceMeta?.service_days || 0);
      const startDate = serviceMeta?.start_date || null;
      if (!startDate) {
        throw new Error('서비스 시작일이 없습니다. 서비스 정보 수정에서 시작일을 먼저 입력해주세요.');
      }

      const actual = rows || [];
      const byDay = new Map(actual.map((row) => [Number(row.service_day), row]));
      const usedAutoNotes = new Set(
        actual.map((row) => String(row.notes || '').trim()).filter(Boolean)
      );
      const savedDays = [];
      const generatedRows = [];

      for (let day = 1; day <= totalDays; day += 1) {
        const row = byDay.get(day);
        if (!recordNeedsDraft(row)) continue;
        if (row?.locked) continue;

        const previous = [...actual, ...generatedRows]
          .filter((item) => Number(item.service_day) < day)
          .sort((a, b) => Number(b.service_day) - Number(a.service_day))
          .slice(0, 5);

        const hasPrevious = previous.length > 0;
        const generatedDraft = hasPrevious
          ? buildFromPrevious(previous, usedAutoNotes, serviceMeta?.mother_name || '')
          : buildGenericThreeWeekDraft(usedAutoNotes, serviceMeta?.mother_name || '');
        if (generatedDraft.notes) usedAutoNotes.add(generatedDraft.notes);

        const serviceDate = row?.service_date || weekdayDateForServiceDay(startDate, day);
        if (!serviceDate) continue;

        const payload = mergeAutoRecord(caseId, day, row, generatedDraft, serviceDate);

        let result;
        if (row?.id) {
          result = await sb
            .from('daily_records')
            .update(payload)
            .eq('id', row.id)
            .select()
            .single();
        } else {
          result = await sb
            .from('daily_records')
            .insert(payload)
            .select()
            .single();
        }
        if (result.error) throw result.error;

        savedDays.push(Number(day));
        generatedRows.push(result.data);
        byDay.set(Number(day), result.data);
      }

      saveBulkDrafts(caseId, {});

      try {
        await sb.from('record_audit').insert({
          record_id: null,
          case_id: caseId,
          actor_id: me?.id || null,
          action: 'admin_bulk_missing_records_autosaved',
          details: {
            saved_service_days: savedDays,
            auto_date_start: startDate,
            auto_date_rule: 'weekdays_excluding_2026_korean_public_holidays',
            count: savedDays.length
          }
        });
      } catch (auditError) {
        console.warn('bulk autosave audit error', auditError);
      }

      if (savedDays.length) {
        alertMsg(
          `총 ${savedDays.length}개 일차의 빈칸을 채우고 바로 저장했습니다.\n\n각 일차를 열면 기록 저장을 다시 누르지 않고 바로 산모 서명을 입력·수정할 수 있습니다.`
        );
        await window.openCase(caseId, true);
      } else {
        alertMsg('현재 자동으로 채울 빈칸이 없습니다.');
      }
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
    button.textContent = '전체 빈칸 자동 채우기 · 바로 저장';
    button.style.fontWeight = '900';
    button.onclick = () => prepareAllDrafts(caseId, button);

    const help = document.createElement('div');
    help.className = 'muted tiny';
    help.style.marginTop = '6px';
    help.textContent = '전체 일차의 빈칸과 빈 날짜를 자동으로 채운 뒤 바로 저장합니다. 날짜는 2026년 공휴일을 제외하며, 체온·수유량·식사/간식 횟수는 이전 실제 기록값이 있을 때만 그 값들 중에서 제안합니다. 기존 입력값·서명·기타서비스는 유지됩니다.';

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
    if (date && !date.disabled) {
      const savedDate = String(currentRecord?.service_date || '').trim();
      if (!savedDate && prepared.service_date) {
        date.value = prepared.service_date;
        date.dispatchEvent(new Event('input', { bubbles: true }));
        date.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

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
      const draft = hasPrevious ? buildFromPrevious(previous, null, currentCase?.mother_name || '') : buildGenericThreeWeekDraft(null, currentCase?.mother_name || '');
      applyDraft(draft);

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
    button.className = 'secondary';
    button.textContent = `${day}일차 빈칸 채우기`;
    button.style.cssText = 'font-weight:800;width:auto;min-width:150px;flex:0 0 auto;';
    button.onclick = () => fillMissingDraft(day, button);

    const help = document.createElement('div');
    help.className = 'muted tiny';
    help.style.marginTop = '5px';
    help.textContent = '비어 있는 항목만 채우며 기존 입력값·서비스 날짜·서명·기타서비스는 건드리지 않습니다.';

    const dateInput = document.getElementById('serviceDate');
    if (dateInput) {
      const dateRow = document.createElement('div');
      dateRow.dataset.adminDraftTop = '1';
      dateRow.className = 'row';
      dateRow.style.cssText = 'align-items:flex-end;gap:8px;flex-wrap:wrap;';
      dateInput.insertAdjacentElement('beforebegin', dateRow);
      dateRow.appendChild(dateInput);
      dateInput.style.flex = '1 1 190px';
      dateRow.appendChild(button);
      dateRow.insertAdjacentElement('afterend', help);
    } else {
      save.insertAdjacentElement('beforebegin', button);
      button.insertAdjacentElement('afterend', help);
    }

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