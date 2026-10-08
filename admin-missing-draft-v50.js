(() => {
  if (window.__BESTMOM_ADMIN_MISSING_DRAFT_V80__) return;
  window.__BESTMOM_ADMIN_MISSING_DRAFT_V80__ = true;

  const previousOpenDay = window.openDay;
  const previousOpenCase = window.openCase;
  if (typeof previousOpenDay !== 'function' || typeof previousOpenCase !== 'function') return;

  const BULK_STORAGE_PREFIX = 'bestmom_bulk_record_drafts_v80_';

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
    '2026-05-05', '2026-05-24', '2026-05-25',
    '2026-06-03', '2026-06-06',
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

  function serviceDateFromFirst(firstServiceDate, serviceDay) {
    const date = parseLocalDate(firstServiceDate);
    if (!date || !Number.isFinite(Number(serviceDay)) || Number(serviceDay) < 1) return '';
    if (Number(serviceDay) === 1) return formatLocalDate(date);

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

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function randomInt(min, max) {
    const lo = Math.ceil(min);
    const hi = Math.floor(max);
    return Math.floor(Math.random() * (hi - lo + 1)) + lo;
  }

  function varyCount(base, min = 0, max = 20, spread = 1) {
    if (base === null || base === undefined || base === '') return null;
    const n = Number(base);
    if (!Number.isFinite(n)) return null;
    return clamp(Math.round(n + randomInt(-spread, spread)), min, max);
  }

  function varyTemp(base) {
    const n = Number(base);
    if (!Number.isFinite(n)) return null;
    const deltas = [-0.2, -0.1, 0, 0.1, 0.2];
    return Math.round(clamp(n + deltas[randomInt(0, deltas.length - 1)], 35.8, 37.4) * 10) / 10;
  }

  function varyMl(base) {
    const n = Number(base);
    if (!Number.isFinite(n) || n <= 0) return null;
    const deltas = [-10, 0, 10];
    return Math.max(10, Math.round((n + deltas[randomInt(0, deltas.length - 1)]) / 10) * 10);
  }

  function noteStyleFromFirst(firstNote, motherName = '') {
    const text = String(firstNote || '').trim();
    if (/습니다$|했습니다$|였습니다$|보였습니다$/.test(text)) return 'polite';
    if (/다$|했다$|였다$|보였다$/.test(text)) return 'plain';
    if (text) return 'memo';
    return noteStyleForMother(motherName);
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

  function variedNote(records = [], usedNotes = null, motherName = '', forcedStyle = null) {
    const used = new Set(
      (records || [])
        .map((r) => String(r?.notes || '').trim())
        .filter(Boolean)
    );
    if (usedNotes) {
      [...usedNotes].forEach((note) => used.add(String(note || '').trim()));
    }

    const style = forcedStyle || noteStyleForMother(motherName);
    const stylePool = NOTE_VARIATIONS[style] || NOTE_VARIATIONS.memo;
    const available = stylePool.filter((note) => !used.has(note));
    const pool = available.length ? available : stylePool;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function buildFromPrevious(records, usedNotes = null, motherName = '', firstRecord = null) {
    const recent = records.slice(0, 5);
    const baseline = firstRecord || recent[recent.length - 1] || recent[0] || {};
    const breastBase = filledNumber(baseline.breastfeed_count)
      ? Number(baseline.breastfeed_count)
      : Number(pickActual(recent, 'breastfeed_count') || 0);
    const formulaBase = filledNumber(baseline.formula_count)
      ? Number(baseline.formula_count)
      : Number(pickActual(recent, 'formula_count') || 0);

    const breastActive = breastBase > 0;
    const formulaActive = formulaBase > 0;

    let breastfeedCount = breastActive ? varyCount(breastBase, 1, 20, 1) : 0;
    let formulaCount = formulaActive ? varyCount(formulaBase, 1, 20, 1) : 0;

    // 1일차의 수유 형태(모유/분유/혼합)는 유지하고 횟수와 양만 조금씩 달라지게 한다.
    if (breastActive && !formulaActive) formulaCount = 0;
    if (!breastActive && formulaActive) breastfeedCount = 0;

    const mealBase = filledNumber(baseline.meal_count)
      ? Number(baseline.meal_count)
      : Number(pickActual(recent, 'meal_count'));
    const snackBase = filledNumber(baseline.snack_count)
      ? Number(baseline.snack_count)
      : Number(pickActual(recent, 'snack_count'));
    const tempBase = filledNumber(baseline.baby_temp)
      ? Number(baseline.baby_temp)
      : Number(pickActual(recent, 'baby_temp'));
    const mlBase = filledNumber(baseline.formula_ml)
      ? Number(baseline.formula_ml)
      : Number(pickActual(recent, 'formula_ml'));

    const noteStyle = noteStyleFromFirst(firstRecord?.notes, motherName);

    return {
      incision_status: modeArray(recent.map((r) => r.incision_status), filledArray(baseline.incision_status) ? baseline.incision_status : ['이상없음']),
      breast_status: modeArray(recent.map((r) => r.breast_status), filledArray(baseline.breast_status) ? baseline.breast_status : ['이상없음']),
      urination_bowel_status: modeArray(recent.map((r) => r.urination_bowel_status), filledArray(baseline.urination_bowel_status) ? baseline.urination_bowel_status : ['이상없음']),
      sitz_bath: mode(recent.map((r) => r.sitz_bath), baseline.sitz_bath || '미실시'),
      meal_count: Number.isFinite(mealBase) ? varyCount(mealBase, 1, 4, 1) : null,
      snack_count: Number.isFinite(snackBase) ? varyCount(snackBase, 0, 3, 1) : null,
      baby_temp: Number.isFinite(tempBase) ? varyTemp(tempBase) : null,
      sleep_status: mode(recent.map((r) => r.sleep_status), baseline.sleep_status || '잘잠'),
      breastfeed_count: breastfeedCount,
      formula_count: formulaCount,
      formula_ml: formulaActive && Number.isFinite(mlBase) ? varyMl(mlBase) : null,
      stool_status: mode(recent.map((r) => r.stool_status), baseline.stool_status || '정상변'),
      bath_cord_status: mode(recent.map((r) => r.bath_cord_status), baseline.bath_cord_status || '실시'),
      notes: variedNote(recent, usedNotes, motherName, noteStyle)
    };
  }

  function firstDayReady(record) {
    if (!record?.id || !record?.service_date) return false;
    if (!filledArray(record.incision_status)) return false;
    if (!filledArray(record.breast_status)) return false;
    if (!filledArray(record.urination_bowel_status)) return false;
    if (!filledText(record.sitz_bath)) return false;
    if (!filledNumber(record.meal_count)) return false;
    if (!filledNumber(record.snack_count)) return false;
    if (!filledNumber(record.baby_temp)) return false;
    if (!filledText(record.sleep_status)) return false;
    if (!filledNumber(record.breastfeed_count)) return false;
    if (!filledNumber(record.formula_count)) return false;
    if (Number(record.formula_count) > 0 && !filledNumber(record.formula_ml)) return false;
    if (!filledText(record.stool_status)) return false;
    if (!filledText(record.bath_cord_status)) return false;
    if (!filledText(record.notes)) return false;
    return true;
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

    if (button) button.disabled = true;
    try {
      const { data: rows, error } = await sb
        .from('daily_records')
        .select('id,service_day,service_date,locked,incision_status,breast_status,urination_bowel_status,sitz_bath,meal_count,snack_count,baby_temp,sleep_status,breastfeed_count,formula_count,formula_ml,stool_status,bath_cord_status,other_service,notes')
        .eq('case_id', caseId)
        .order('service_day');
      if (error) throw error;

      let serviceMeta =
        typeof currentCase !== 'undefined' && currentCase?.id === caseId
          ? currentCase
          : null;

      if (!serviceMeta?.service_days) {
        const { data: serviceCase, error: caseError } = await sb
          .from('service_cases')
          .select('service_days,mother_name')
          .eq('id', caseId)
          .single();
        if (caseError) throw caseError;
        serviceMeta = { ...(serviceMeta || {}), ...(serviceCase || {}) };
      }

      const actual = rows || [];
      const byDay = new Map(actual.map((row) => [Number(row.service_day), row]));
      const firstRecord = byDay.get(1);

      if (!firstDayReady(firstRecord)) {
        alertMsg('전체 자동채우기를 하려면 먼저 1일차를 직접 모두 입력하고 저장해주세요. 1일차 서비스 날짜·수유·체온·식사/간식·특이사항 등이 기준이 됩니다.');
        return;
      }

      const ok = window.confirm(
        '1일차 기록을 기준으로 나머지 빈 일차의 자동 초안을 만들까요?\n\n' +
        '수유 방식·수유량·체온·식사/간식 횟수·특이사항 말투를 1일차 흐름에 맞춰 조금씩 다르게 제안합니다.\n' +
        '날짜는 1일차 실제 서비스 날짜부터 주말과 2026년 공휴일을 제외해 이어집니다.\n' +
        '자동 초안은 바로 확정 저장하지 않으며 각 일차에서 확인 후 저장합니다.'
      );
      if (!ok) return;

      const totalDays = Number(serviceMeta?.service_days || 0);
      const firstServiceDate = firstRecord.service_date;
      const usedAutoNotes = new Set(
        actual.map((row) => String(row.notes || '').trim()).filter(Boolean)
      );
      const drafts = {};

      for (let day = 2; day <= totalDays; day += 1) {
        const row = byDay.get(day);
        if (row?.locked) continue;
        if (row && !recordNeedsDraft(row)) continue;

        const previous = actual
          .filter((item) => Number(item.service_day) < day)
          .sort((a, b) => Number(b.service_day) - Number(a.service_day))
          .slice(0, 5);

        const referenceRecords = previous.length ? previous : [firstRecord];
        const generatedDraft = buildFromPrevious(
          referenceRecords,
          usedAutoNotes,
          serviceMeta?.mother_name || '',
          firstRecord
        );
        if (generatedDraft.notes) usedAutoNotes.add(generatedDraft.notes);

        drafts[day] = {
          draft: generatedDraft,
          service_date: row?.service_date || serviceDateFromFirst(firstServiceDate, day) || null,
          basis: 'day1_trend',
          reference_service_days: referenceRecords.map((item) => Number(item.service_day)),
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
          action: 'admin_day1_based_bulk_drafts_prepared',
          details: {
            prepared_service_days: Object.keys(drafts).map(Number),
            first_service_date: firstServiceDate,
            auto_date_rule: 'weekdays_excluding_2026_official_public_holidays',
            count: Object.keys(drafts).length
          }
        });
      } catch (auditError) {
        console.warn('day1 bulk draft audit error', auditError);
      }

      if (Object.keys(drafts).length) {
        alertMsg(
          `1일차 기록을 기준으로 총 ${Object.keys(drafts).length}개 일차의 초안을 준비했습니다.\n\n각 일차를 열어 실제 내용과 날짜를 확인한 뒤 저장해주세요.`
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
    button.textContent = '1일차 기준 전체 초안 만들기';
    button.style.fontWeight = '900';
    button.onclick = () => prepareAllDrafts(caseId, button);

    const help = document.createElement('div');
    help.className = 'muted tiny';
    help.style.marginTop = '6px';
    help.textContent = '1일차를 직접 입력·저장한 뒤 사용합니다. 수유방법·수유량·체온·식사/간식·특이사항 말투를 1일차 기준으로 조금씩 다르게 초안 제안하며, 날짜는 주말·2026년 공휴일을 제외합니다.';

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

    addDraftNotice('1일차 기준 자동 초안 · 실제 내용 확인 필요');
  }

  async function fillMissingDraft(day, button) {
    button.disabled = true;
    try {
      const { data: firstRecord, error: firstError } = await sb
        .from('daily_records')
        .select('*')
        .eq('case_id', currentCase.id)
        .eq('service_day', 1)
        .maybeSingle();
      if (firstError) throw firstError;
      if (!firstDayReady(firstRecord)) {
        alertMsg('먼저 1일차를 직접 모두 입력하고 저장해주세요.');
        return;
      }

      const { data: previous, error } = await sb
        .from('daily_records')
        .select('*')
        .eq('case_id', currentCase.id)
        .lt('service_day', Number(day))
        .order('service_day', { ascending: false })
        .limit(5);
      if (error) throw error;

      const referenceRecords = (previous || []).length ? previous : [firstRecord];
      const draft = buildFromPrevious(
        referenceRecords,
        null,
        currentCase?.mother_name || '',
        firstRecord
      );
      applyDraft(draft);
      addDraftNotice('1일차 및 앞선 실제 기록 참고');

      try {
        await sb.from('record_audit').insert({
          record_id: currentRecord?.id || null,
          case_id: currentCase.id,
          actor_id: me?.id || null,
          action: 'admin_missing_record_draft_applied',
          details: {
            service_day: Number(day),
            basis: 'day1_and_previous_records',
            reference_service_days: referenceRecords.map((r) => Number(r.service_day))
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
    help.textContent = '1일차와 앞선 실제 기록을 참고해 현재 일차의 빈칸만 초안으로 채웁니다. 날짜·서명·기타서비스는 건드리지 않습니다.';

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