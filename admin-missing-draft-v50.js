(() => {
  if (window.__BESTMOM_ADMIN_MISSING_DRAFT_V82__) return;
  window.__BESTMOM_ADMIN_MISSING_DRAFT_V82__ = true;

  const previousOpenDay = window.openDay;
  const previousOpenCase = window.openCase;
  if (typeof previousOpenDay !== 'function' || typeof previousOpenCase !== 'function') return;

  const BULK_STORAGE_PREFIX = 'bestmom_bulk_record_drafts_v82_';

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

  const NOTE_CATEGORIES = {
    feeding: [
      '분유를 아주 잘 먹었습니다', '오늘은 평소보다 많이 먹었습니다', '오늘은 수유량이 조금 적었습니다',
      '한 번 먹는 양이 늘었습니다', '분유량을 10ml 늘려 먹였고 잘 적응했습니다',
      '오전에는 적게 먹고 오후부터 잘 먹었습니다', '낮에는 적게 먹고 밤 수유량이 많은 편이었습니다',
      '한 번에 많이 먹기보다 나누어 먹었습니다', '수유 시간이 점점 규칙적으로 잡혀갔습니다',
      '먹는 힘이 전보다 좋아졌습니다', '오늘은 천천히 오래 먹었습니다',
      '수유 중 잠들어 깨워 먹였습니다', '먹다가 쉬었다가 다시 먹었습니다',
      '조금 남기고 더 이상 먹지 않았습니다', '수유 중간에 울고 보채는 모습이 있었습니다',
      '졸린 상태라 수유량이 적었습니다', '잠을 푹 자고 일어나 많이 먹었습니다',
      '수유 후 만족한 듯 편안하게 잠들었습니다', '오늘은 수유 간격이 조금 짧았습니다',
      '평소보다 수유 간격이 길었습니다', '분유 종류를 변경한 뒤 상태를 지켜보았습니다'
    ],
    breastMilk: [
      '모유 수유를 잘 이어갔습니다', '양쪽 젖을 모두 잘 물었습니다',
      '한쪽 젖을 더 편하게 무는 편이었습니다', '엄마 젖을 빠는 힘이 좋아졌습니다',
      '직수 후 편안하게 잘 잤습니다', '모유를 먹고 추가 분유 없이 잘 지냈습니다',
      '직수 후 부족한 양만 보충 수유했습니다', '유축 모유를 잘 먹었습니다',
      '모유 수유 간격이 조금씩 안정되었습니다', '모유를 먹고 트림도 잘했습니다',
      '젖 물기가 전보다 좋아졌습니다', '산모님 마사지 중 유축 모유를 먹였습니다'
    ],
    digestion: [
      '트림을 아주 잘했습니다', '수유 후 트림이 바로 나왔습니다',
      '트림이 늦게 나와 한동안 안아주었습니다', '작은 트림을 여러 번 했습니다',
      '수유 중간에 트림을 시켰습니다', '트림 후 편안하게 잠들었습니다',
      '트림 후 잔토가 조금 있었습니다', '수유 후 소량의 잔토가 있었습니다',
      '오늘은 토하지 않고 잘 지냈습니다', '수유 후 한동안 세워 안아주었습니다',
      '먹은 뒤 배에 힘을 많이 주었습니다', '가스가 찬 듯 다리를 자주 움직였습니다',
      '방귀를 뀐 뒤 편안해졌습니다', '배가 빵빵해 보여 한동안 안아주었습니다',
      '수유량이 늘었지만 소화는 편안해 보였습니다',
      '효소를 섭취하며 배변 상태를 지켜보고 있다고 들었습니다'
    ],
    stool: [
      '오늘은 변을 여러 번 보았습니다', '오늘은 변을 한 번 보았습니다',
      '오늘은 변을 보지 않았습니다', '며칠 만에 시원하게 변을 보았습니다',
      '오전에 변을 많이 보았습니다', '오후에 변을 자주 보았습니다',
      '수유할 때마다 변을 조금씩 보았습니다', '조금씩 여러 번 나누어 변을 보았습니다',
      '한 번에 많은 양의 변을 보았습니다', '오늘은 변 양이 적었습니다',
      '아침에 변을 보고 오후에는 보지 않았습니다', '수유 직후 변을 보았습니다',
      '잠에서 깨자마자 변을 보았습니다', '변을 보기 전 힘을 많이 주었습니다',
      '한참 힘을 준 뒤 시원하게 변을 보았습니다', '변을 본 뒤 한결 편안해졌습니다',
      '변을 본 뒤 보채는 모습이 줄었습니다', '변 색깔은 평소와 비슷했습니다',
      '노란색 변을 보았습니다', '묽은 변을 여러 번 보았습니다',
      '평소보다 되직한 변을 보았습니다', '오늘은 방귀만 자주 뀌고 변은 보지 않았습니다',
      '방귀와 함께 소량의 변이 나왔습니다', '변 보는 횟수가 조금씩 안정되어 갔습니다'
    ],
    urine: [
      '소변을 자주 보았습니다', '오늘 소변 양이 많은 편이었습니다',
      '평소보다 소변 횟수가 적었습니다', '수유량이 늘면서 소변 횟수도 늘었습니다',
      '기저귀가 자주 젖었습니다', '오전부터 소변을 여러 차례 보았습니다',
      '오후에도 소변을 잘 보았습니다', '소변 양은 충분한 편이었습니다',
      '기저귀 갈 때마다 소변 양이 많았습니다', '기저귀가 젖으면 바로 보챘습니다',
      '기저귀 교체 후 금방 편안해졌습니다', '소변과 대변을 모두 잘 보았습니다'
    ],
    sleep: [
      '오늘은 잠을 아주 잘 잤습니다', '평소보다 낮잠을 많이 잤습니다',
      '오전에 많이 자고 오후에는 잘 놀았습니다', '오전에는 잘 못 자고 오후에 깊게 잤습니다',
      '낮에는 많이 자고 저녁부터 깨어 있었습니다', '한 번 잠들면 오래 자는 편이었습니다',
      '짧게 자고 자주 깨는 편이었습니다', '오늘은 깊은 잠을 잘 못 잤습니다',
      '어제보다 잠을 잘 잤습니다', '먹고 바로 깊게 잠들었습니다',
      '수유 후 한참 놀다가 잠들었습니다', '잠들기 전 많이 보챘습니다',
      '안아주니 금방 잠들었습니다', '오늘은 누워서도 제법 잘 잤습니다',
      '작은 소리에 놀라 자주 깼습니다', '생활 소리에도 잘 잤습니다',
      '깨어 노는 시간이 점점 늘었습니다', '잠깐 깼다가도 다시 잘 잠들었습니다',
      '오늘은 수면 리듬이 안정적인 편이었습니다'
    ],
    crying: [
      '오늘은 아기가 많이 울었습니다', '평소보다 보채는 시간이 많았습니다',
      '오전에는 많이 보채고 오후에는 편안해졌습니다', '오후부터 유난히 칭얼거렸습니다',
      '안아달라고 자주 울었습니다', '안아주니 바로 조용해졌습니다',
      '계속 안겨 있으려고 했습니다', '내려놓으면 울고 다시 안으면 잠들었습니다',
      '배고플 때 울음이 큰 편이었습니다', '졸릴 때 가장 많이 보챘습니다',
      '수유 전 많이 울다가 먹고 진정되었습니다', '오늘은 특별히 보채지 않고 편안했습니다',
      '낯선 소리에 예민하게 반응했습니다', '산모님 품에서 금방 진정되었습니다'
    ],
    play: [
      '방긋방긋 잘 웃었습니다', '오늘은 유난히 웃는 모습이 많았습니다',
      '눈을 마주치면 잘 웃어주었습니다', '표정이 다양해졌습니다',
      '깨어서 노는 시간이 많아졌습니다', '혼자 누워서도 잘 놀았습니다',
      '모빌을 오래 바라보았습니다', '초점책을 집중해서 잘 보았습니다',
      '사람 얼굴을 오래 바라보았습니다', '눈맞춤이 전보다 잘되었습니다',
      '옹알이를 많이 했습니다', '옹알이 소리가 점점 다양해졌습니다',
      '말을 걸면 소리 내며 반응했습니다', '목소리에 반응해 고개를 돌렸습니다',
      '손발 움직임이 활발했습니다', '기지개를 자주 켰습니다',
      '손을 얼굴 쪽으로 자주 가져갔습니다', '깨어 있을 때 주변을 많이 구경했습니다'
    ],
    growth: [
      '몸무게가 늘면서 건강하게 자라고 있다고 들었습니다',
      '지난주보다 몸이 묵직해진 느낌이었습니다', '며칠 사이 얼굴에 살이 붙은 모습이었습니다',
      '주말 사이 많이 큰 느낌이었습니다', '수유량이 늘면서 몸도 자란 듯했습니다',
      '얼굴이 전보다 통통해졌습니다', '볼살이 조금씩 올랐습니다',
      '옷이 전보다 잘 맞는 느낌이었습니다', '기저귀를 채울 때 다리가 통통해진 모습이 보였습니다',
      '하루가 다르게 크는 모습이 보였습니다'
    ],
    skin: [
      '볼에 태열이 조금 올라왔습니다', '양쪽 볼에 태열이 보였습니다',
      '태열을 관리하며 상태를 살폈습니다', '태열이 전날보다 조금 좋아졌습니다',
      '얼굴 태열이 많이 가라앉았습니다', '오늘은 태열 없이 피부가 깨끗했습니다',
      '더워지면 볼이 조금 붉어졌습니다', '시원하게 해주니 붉은기가 가라앉았습니다',
      '목 주변에 땀이 많이 찼습니다', '목 접힌 부분의 붉은기를 살폈습니다',
      '얼굴에 좁쌀처럼 작은 발진이 보였습니다', '좁쌀이 전날보다 줄었습니다',
      '피부가 전반적으로 맑아졌습니다', '얼굴빛이 전보다 맑아 보였습니다',
      '황달기가 조금 남아 있다고 들었습니다', '황달기가 전보다 많이 빠진 듯했습니다'
    ],
    diaperRash: [
      '엉덩이 발진을 살피며 관리했습니다', '엉덩이가 많이 붉어져 있었습니다',
      '발진이 전날보다 좋아졌습니다', '엉덩이 붉은기가 조금 줄었습니다',
      '발진 부위가 많이 진정되었습니다', '엉덩이 상태가 점점 좋아지고 있었습니다',
      '대변을 자주 봐 엉덩이가 조금 붉어졌습니다',
      '기저귀 교체 때마다 엉덩이를 잘 말려주었습니다',
      '대변 후 물로 씻어 관리했습니다', '엉덩이에 작은 딱지가 생겼습니다',
      '붉은기는 줄고 딱지만 조금 남아 있었습니다',
      '엉덩이 발진이 거의 좋아졌습니다', '오늘은 엉덩이 상태가 깨끗했습니다'
    ],
    cord: [
      '배꼽 상태가 깨끗했습니다', '배꼽이 잘 마르고 있었습니다',
      '배꼽이 떨어진 자리가 깨끗했습니다', '배꼽 주변에 특별한 변화는 없었습니다',
      '배꼽 주변을 잘 말려 관리했습니다', '배꼽 상태가 전날보다 좋아 보였습니다',
      '배꼽에 진물 없이 깨끗했습니다', '배꼽이 떨어진 뒤 상태를 살폈습니다'
    ],
    noseEyes: [
      '콧물이 조금 있었습니다', '코가 막힌 듯 킁킁거렸습니다',
      '콧속에 코딱지가 많이 보였습니다', '코를 정리해주니 편안해했습니다',
      '식염수를 사용한 뒤 코를 정리했습니다', '산모님이 식염수를 넣어 코딱지를 제거했습니다',
      '오늘따라 재채기를 자주 했습니다', '눈곱이 조금 끼어 있었습니다',
      '한쪽 눈에 눈곱이 자주 꼈습니다', '자고 일어나 눈곱이 조금 생겼습니다',
      '눈가를 닦아 깨끗하게 관리했습니다'
    ],
    bath: [
      '아기가 목욕을 아주 좋아했습니다', '목욕할 때 편안하게 잘 있었습니다',
      '목욕 중 거의 울지 않았습니다', '목욕 후 기분 좋게 잘 잤습니다',
      '목욕 후 분유를 잘 먹었습니다', '오늘 목욕은 저녁에 하기로 했습니다',
      '아기 목욕은 남편분과 저녁에 하기로 했습니다',
      '산모님 요청으로 오늘은 목욕하지 않았습니다',
      '오늘은 목욕 없이 부분 세정만 했습니다',
      '병원에 다녀온 날이라 목욕하지 않기로 했습니다',
      '목욕 후 피부 상태가 깨끗했습니다', '목욕 후 몸을 잘 말려주었습니다'
    ],
    clinic: [
      '영유아검진을 다녀왔습니다', 'BCG 접종을 다녀왔습니다',
      'BCG 접종과 영유아검진을 함께 다녀왔습니다', '소아과 진료를 다녀왔습니다',
      '엉덩이 발진으로 소아과에 다녀왔습니다', '태열로 소아과 진료를 받았습니다',
      '예방접종 후 집에 와서 많이 잤습니다', '주사를 맞고 와서 평소보다 보챘습니다',
      '병원에 다녀온 후 수유하고 쉬었습니다', '검진 후 컨디션은 괜찮았습니다',
      '진료 후 안내받은 내용대로 관리하고 있다고 들었습니다',
      '병원에 다녀온 날이라 평소보다 피곤해 보였습니다'
    ],
    motherSchedule: [
      '산모님이 산부인과에 다녀오셨습니다', '산모님이 산후검진을 다녀오셨습니다',
      '산모님이 한의원에 다녀오셨습니다', '산모님이 병원 진료로 잠시 외출하셨습니다',
      '산모님이 방문 마사지를 받으셨습니다', '산모님 마사지 중 아기를 돌보았습니다',
      '산모님 외출 중 아기 수유와 돌봄을 했습니다',
      '산모님이 검진을 다녀오신 뒤 휴식하셨습니다',
      '산모님 오전에 병원 일정이 있었습니다', '산모님이 잠시 외출 후 돌아오셨습니다'
    ],
    motherRest: [
      '산모님이 식사를 잘하셨습니다', '오늘은 산모님 식사량이 많은 편이었습니다',
      '산모님 입맛이 좋아졌다고 하셨습니다', '산모님이 점심을 늦게 드셨습니다',
      '산모님이 아기가 잘 때 식사하셨습니다', '산모님이 식사 후 편하게 쉬셨습니다',
      '산모님이 오늘은 많이 피곤해 보이셨습니다', '산모님이 오전에 잠깐 낮잠을 주무셨습니다',
      '아기 자는 동안 산모님도 함께 쉬셨습니다',
      '산모님 컨디션이 전날보다 좋아 보였습니다',
      '산모님이 수면 부족으로 오전에 휴식하셨습니다',
      '산모님이 식사와 수분 섭취를 잘하셨습니다'
    ],
    household: [
      '전날 하지 못한 설거지를 정리했습니다', '아침에 밀린 설거지를 먼저 정리했습니다',
      '아기가 자는 동안 주방을 정리했습니다', '산모님 외출 중 간단히 집안을 정리했습니다',
      '방문객이 다녀간 뒤 거실을 정리했습니다', '택배 물품 정리를 도와드렸습니다',
      '아기 용품을 정리했습니다', '젖병을 세척하고 소독했습니다',
      '수유 후 젖병을 바로 세척했습니다', '아기 빨래를 정리했습니다',
      '아기 옷과 수건을 정리했습니다', '아기 침구를 정리했습니다',
      '산모님 식사 후 주방을 정리했습니다', '분리수거를 정리했습니다'
    ],
    daily: [
      '오늘은 잘 먹고 잘 잤습니다', '잘 먹고 잘 놀고 잘 잤습니다',
      '하루 종일 편안하게 잘 지냈습니다', '오늘은 컨디션이 좋은 편이었습니다',
      '오전보다 오후 컨디션이 좋았습니다',
      '오전에는 조금 예민하고 오후에는 편안해졌습니다',
      '어제보다 잘 자고 잘 먹었습니다', '어제보다 깨어 노는 시간이 늘었습니다',
      '수유와 수면이 모두 안정적인 편이었습니다', '오늘은 잠이 많은 하루였습니다',
      '오늘은 깨어 노는 시간이 많은 편이었습니다',
      '평소보다 안아달라고 많이 한 하루였습니다',
      '특별한 변화 없이 잘 지냈습니다', '하루 동안 큰 불편 없이 편안하게 지냈습니다'
    ]
  };

  function noteStyleForMother(motherName) {
    const text = String(motherName || '').trim() || '산모';
    let hash = 0;
    for (const ch of text) hash = ((hash * 31) + ch.charCodeAt(0)) >>> 0;
    return ['memo', 'polite', 'plain'][hash % 3];
  }

  function styleNote(note, style) {
    if (style === 'memo') return note.replace(/습니다/g, '음');
    if (style === 'plain') return note.replace(/습니다/g, '다');
    return note;
  }

  function categoryOffset(motherName) {
    const text = String(motherName || '').trim() || '산모';
    let hash = 0;
    for (const ch of text) hash = ((hash * 31) + ch.charCodeAt(0)) >>> 0;
    return hash % Object.keys(NOTE_CATEGORIES).length;
  }

  function variedNote(records = [], usedNotes = null, motherName = '', forcedStyle = null, serviceDay = 2) {
    const used = new Set(
      (records || []).map((r) => String(r?.notes || '').trim()).filter(Boolean)
    );
    if (usedNotes) [...usedNotes].forEach((note) => used.add(String(note || '').trim()));

    const categories = Object.values(NOTE_CATEGORIES);
    const offset = categoryOffset(motherName);
    const preferred = ((Math.max(2, Number(serviceDay) || 2) - 2 + offset) % categories.length + categories.length) % categories.length;
    for (let step = 0; step < categories.length; step += 1) {
      const pool = categories[(preferred + step) % categories.length];
      const available = pool.filter((note) => !used.has(note));
      if (available.length) {
        const note = available[Math.floor(Math.random() * available.length)];
        const style = forcedStyle || 'polite';
        return styleNote(note, style);
      }
    }
    const fallback = Object.values(NOTE_CATEGORIES).flat().filter((note) => !used.has(note));
    if (fallback.length) {
      const note = fallback[Math.floor(Math.random() * fallback.length)];
      return styleNote(note, forcedStyle || 'polite');
    }
    return styleNote('오늘은 아기 상태를 확인하며 돌봄을 제공했습니다', forcedStyle || 'polite');
  }

  function buildFromPrevious(records, usedNotes = null, motherName = '', firstRecord = null, serviceDay = 2) {
    const recent = records.slice(0, 5);
    const baseline = firstRecord || recent[recent.length - 1] || recent[0] || {};
    const breastPicked = filledNumber(baseline.breastfeed_count)
      ? baseline.breastfeed_count
      : pickActual(recent, 'breastfeed_count');
    const formulaPicked = filledNumber(baseline.formula_count)
      ? baseline.formula_count
      : pickActual(recent, 'formula_count');

    const breastBase = breastPicked === null || breastPicked === undefined || breastPicked === ''
      ? null
      : Number(breastPicked);
    const formulaBase = formulaPicked === null || formulaPicked === undefined || formulaPicked === ''
      ? null
      : Number(formulaPicked);

    const breastKnown = Number.isFinite(breastBase);
    const formulaKnown = Number.isFinite(formulaBase);
    const breastActive = breastKnown && breastBase > 0;
    const formulaActive = formulaKnown && formulaBase > 0;

    let breastfeedCount = breastKnown ? (breastActive ? varyCount(breastBase, 1, 20, 1) : 0) : null;
    let formulaCount = formulaKnown ? (formulaActive ? varyCount(formulaBase, 1, 20, 1) : 0) : null;

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
      notes: variedNote(recent, usedNotes, motherName, noteStyle, serviceDay)
    };
  }

  function firstDayReady(record) {
    // 1일차가 실제 DB에 저장되어 있고 날짜만 있으면 기준 기록으로 인정한다.
    // 모유/분유 중 사용하지 않는 항목이나 간식 등 일부 칸이 비어 있어도
    // 전체 자동채우기 자체를 막지 않는다.
    return Boolean(record?.id && record?.service_date);
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
        alertMsg('전체 자동채우기를 하려면 먼저 1일차 기록을 저장해주세요. 입력된 1일차 내용을 기준으로 나머지 일차의 빈칸을 만듭니다.');
        return;
      }

      const ok = window.confirm(
        '1일차 기록을 기준으로 나머지 빈 일차의 자동 초안을 만들까요?\n\n' +
        '기록 항목과 특이사항 문구를 일차별 초안으로 제안합니다. 특이사항은 제공된 주제별 문구에서 하루 한 건씩 순환 선택합니다. 실제 관찰 내용과 맞지 않는 문구는 저장 전 수정해주세요.\n' +
        '날짜는 1일차 실제 서비스 날짜부터 주말과 2026년 공휴일을 제외해 이어집니다.\n' +
        '자동 입력된 나머지 일차는 바로 저장됩니다. 특이사항은 제안 문구이므로 실제 제공내용과 일치하는지 확인하고, 맞지 않으면 반드시 수정해주세요.'
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
          firstRecord,
          day
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

      const preparedDays = Object.keys(drafts).map(Number).sort((a, b) => a - b);
      const savedDays = [];

      for (const day of preparedDays) {
        const prepared = drafts[day];
        const row = byDay.get(Number(day));
        const payload = mergeAutoRecord(
          caseId,
          Number(day),
          row,
          prepared.draft,
          prepared.service_date
        );

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
        byDay.set(Number(day), result.data);
      }

      saveBulkDrafts(caseId, {});

      try {
        await sb.from('record_audit').insert({
          record_id: null,
          case_id: caseId,
          actor_id: me?.id || null,
          action: 'admin_day1_based_bulk_records_autosaved',
          details: {
            saved_service_days: savedDays,
            first_service_date: firstServiceDate,
            auto_date_rule: 'weekdays_excluding_2026_official_public_holidays',
            count: savedDays.length
          }
        });
      } catch (auditError) {
        console.warn('day1 bulk autosave audit error', auditError);
      }

      if (savedDays.length) {
        alertMsg(
          `1일차 기록을 기준으로 총 ${savedDays.length}개 일차를 자동 입력하고 저장했습니다.\n\n이제 ‘1일차 서명 전체 적용’을 누르면 저장된 일차 전체에 서명을 적용할 수 있습니다.`
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
    button.textContent = '1일차 기준 전체 자동 입력';
    button.style.fontWeight = '900';
    button.onclick = () => prepareAllDrafts(caseId, button);

    const help = document.createElement('div');
    help.className = 'muted tiny';
    help.style.marginTop = '6px';
    help.textContent = '1일차를 저장한 뒤 사용합니다. 특이사항은 주제별 문구를 일차마다 하나씩 순환 제안합니다. 실제 제공내용과 맞는지 확인 후 수정해주세요.';

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
        alertMsg('먼저 1일차 기록을 저장해주세요.');
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
        firstRecord,
        Number(day)
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