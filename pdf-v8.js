(() => {
  const ENGINE = 'PDF-8.0';
  window.BESTMOM_PDF_ENGINE = ENGINE;

  const PAGE_W = 595, PAGE_H = 842, SCALE = 2;
  const COLS = [143.78, 226.73, 305.57, 386.59, 467.50, 558.94];
  const CHECK_X = [145.56, 228.60, 307.44, 388.32, 469.32];
  const ML_LABEL_X = [197.09, 280.01, 358.87, 439.78, 520.78];

  const headerRects = {
    mother_name:[143.6,68.0,226.8,92.9],
    baby_name:[143.6,92.9,226.8,117.7],
    worker:[143.6,117.7,226.8,145.8],
    mother_birth:[305.6,68.0,386.6,92.9],
    baby_birth:[305.6,92.9,386.6,117.7],
    delivery:[467.6,68.0,559.0,92.9],
    birth_weight:[475.6,92.9,549.0,117.7]
  };

  const CHECKS = {
    incision:{'열상':176.64,'혈종':191.52,'불편감':206.64,'이상없음':221.52},
    breast:{'울혈':239.40,'통증':254.28,'이상없음':269.40},
    urine:{'불편감':286.56,'이상없음':301.44},
    sitz:{'실시':318.24,'미실시':333.12},
    sleep:{'잘잠':409.80,'잘못잠':424.08},
    stool:{'정상변':504.36,'이상변':519.60},
    bath:{'실시':535.92,'미실시':551.16}
  };

  const POS = {
    meal: 360.0,
    snack: 375.6,
    temp: 399.0,
    bf: 459.3,
    fc: 482.9,
    ml: 496.8,
    other: [567.96, 605.28],
    notes: [606.0, 668.64],
    sig: [669.70, 706.30]
  };

  // 원본 PDF 하단 '실시간 미결제 사유서' 4개 고정 칸.
  // baseline은 원본의 '일자 / 미결제사유 / 기관장 (인)' 텍스트와 동일한 기준선이다.
  // stamp는 원본 '(인)' 글자 영역의 중심 좌표이다.
  const UNPAID_SLOTS = [
    { date:[67.0,733.0,103.0,753.0], reason:[163.0,733.0,232.0,753.0], baseline:749.38, stamp:[281.03,744.47] },
    { date:[336.0,733.0,372.0,753.0], reason:[432.0,733.0,497.0,753.0], baseline:749.38, stamp:[544.72,744.47] },
    { date:[67.0,772.0,103.0,792.0], reason:[163.0,772.0,232.0,792.0], baseline:787.90, stamp:[281.03,782.99] },
    { date:[336.0,772.0,372.0,792.0], reason:[432.0,772.0,497.0,792.0], baseline:787.90, stamp:[544.72,782.99] }
  ];

  const fontFamily = 'Arial,"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
  const imageCache = new Map();

  function stage(text) {
    const el = document.getElementById('runtimeStatus');
    if (el) el.textContent = `${ENGINE} 엔진 · ${text}`;
  }

  function fmtDate(value) {
    if (!value) return '';
    const p = String(value).split('-');
    return p.length === 3 ? `${p[0].slice(-2)}-${p[1]}-${p[2]}` : String(value);
  }

  function fmtUnpaidDate(value) {
    if (!value) return '';
    const p = String(value).split('-');
    if (p.length !== 3) return String(value);
    return `${Number(p[1])}/${Number(p[2])}`;
  }

  function setFont(ctx, size, weight = 400) {
    ctx.font = `${weight} ${size}px ${fontFamily}`;
    ctx.fillStyle = '#111';
  }

  function centerText(ctx, text, rect, size = 10.5, weight = 400) {
    if (text === null || text === undefined || text === '') return;
    setFont(ctx, size, weight);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(text), (rect[0] + rect[2]) / 2, (rect[1] + rect[3]) / 2, Math.max(1, rect[2] - rect[0] - 6));
  }

  function baselineText(ctx, text, x, y, size = 10.2, align = 'left') {
    if (text === null || text === undefined || text === '') return;
    setFont(ctx, size);
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(String(text), x, y);
  }

  function fitBaselineLine(ctx, text, rect, baselineY, startSize = 8.3, minSize = 5.4, align = 'left') {
    if (text === null || text === undefined || text === '') return;
    const clean = String(text).replace(/\s*\n\s*/g, ' ').trim();
    if (!clean) return;
    const pad = align === 'center' ? 1.5 : 2.0;
    const maxWidth = Math.max(1, rect[2] - rect[0] - pad * 2);
    let size = startSize;
    setFont(ctx, size);
    while (ctx.measureText(clean).width > maxWidth && size > minSize) {
      size -= 0.2;
      setFont(ctx, size);
    }
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = align;
    const x = align === 'center' ? (rect[0] + rect[2]) / 2 : rect[0] + pad;
    ctx.fillText(clean, x, baselineY, maxWidth);
  }

  function drawBestmomStamp(ctx, center) {
    if (!center) return;
    const [cx, cy] = center;
    const radius = 9.2;
    const red = '#c40000';

    ctx.save();
    ctx.strokeStyle = red;
    ctx.fillStyle = red;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    // 정자 형태의 '베스트맘'을 원 안에 작게 배치한다. 배경은 채우지 않는다.
    ctx.font = `700 3.6px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('베스트맘', cx, cy + 0.2, radius * 1.72);
    ctx.restore();
  }

  function drawChangeStamp(ctx, cx, cy) {
    const red = '#ed1c24';
    ctx.save();
    ctx.lineWidth = 1.65;
    ctx.strokeStyle = red;
    ctx.fillStyle = red;
    ctx.beginPath();
    ctx.arc(cx, cy, 9.85, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = `800 5.1px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('베스', cx, cy - 2.8, 15.5);
    ctx.fillText('트맘', cx, cy + 2.8, 15.5);
    ctx.restore();
  }

  // 제공인력 변경은 서비스 정보 수정 내역과 실제 일별 기록 작성자(관리사 계정)를 함께 사용한다.
  // 모든 변경을 누적하지 않고 변경이 속한 5일 단위 페이지만 표시한다.
  function buildCaregiverTimeline(caseData, records, savedChanges) {
    const currentName = caseData.caregiver?.full_name || caseData.caregiver_name_override || '';
    const sortedRecords = [...(records || [])]
      .filter((row) => row.service_date && Number(row.service_day) >= 1)
      .sort((a, b) => Number(a.service_day) - Number(b.service_day));
    const history = [...(savedChanges || [])].sort((a, b) =>
      String(a.created_at || '').localeCompare(String(b.created_at || '')) ||
      Number(a.id || 0) - Number(b.id || 0)
    );
    const writerName = (row) =>
      row?.record_writer?.role === 'caregiver' ? String(row.record_writer.full_name || '').trim() : '';
    const firstWriter = sortedRecords.find((row) => writerName(row));
    const originalName = firstWriter && Number(firstWriter.service_day) === 1
      ? writerName(firstWriter)
      : (history.find((item) => item.previous_name)?.previous_name || writerName(firstWriter) || currentName);
    const events = [];
    let activeName = originalName;

    // 서명·기록 작성자의 원래 계정 정보는 관리사 교체 후에도 덮어써지지 않는다.
    for (const record of sortedRecords) {
      const actualWriter = writerName(record);
      if (!actualWriter) continue;
      if (!activeName) { activeName = actualWriter; continue; }
      if (actualWriter !== activeName) {
        events.push({
          id: 'record-' + record.service_day,
          previous_name: activeName,
          next_name: actualWriter,
          effective_date: String(record.service_date),
          service_day: Number(record.service_day),
          source: 'record'
        });
        activeName = actualWriter;
      }
    }

    const serviceDayOnOrAfter = (date) => {
      const match = sortedRecords.find((row) => String(row.service_date) >= date);
      return match ? Number(match.service_day) : null;
    };
    const localEditDate = (value) => {
      if (!value) return null;
      const timestamp = new Date(value);
      if (Number.isNaN(timestamp.valueOf())) return null;
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
      }).format(timestamp);
    };

    // 수정 창에서 입력한 실제 교체일은 우선 적용한다.
    // 과거 이력에 교체일이 없으면 작성자 변경 기록을 활용하고, 없는 변경은 수정일과
    // 서비스일이 정확히 일치할 때만 그 페이지에 반영한다.
    for (const item of history) {
      if (!item.next_name || !item.previous_name || item.next_name === item.previous_name) continue;
      const existing = events.find((event) => event.next_name === item.next_name);
      const verifiedDate = item.effective_date ? String(item.effective_date) : null;
      const editedDate = localEditDate(item.created_at);
      const editedRecord = editedDate && sortedRecords.find((r) => String(r.service_date) === editedDate);
      // '서비스 정보 수정' 시각은 실제 교체일과 다를 수 있으므로, 해당 날짜가
      // 서비스 기록에 존재하고 다른 관리사 본인이 작성한 기록과 충돌하지 않을 때만 사용한다.
      const nonConflictingEditDate = editedRecord &&
        (!writerName(editedRecord) || writerName(editedRecord) === item.next_name)
          ? editedDate : null;
      if (existing) {
        const selectedDate = verifiedDate ||
          (nonConflictingEditDate && nonConflictingEditDate <= existing.effective_date
            ? nonConflictingEditDate : null);
        if (selectedDate) {
          const day = serviceDayOnOrAfter(selectedDate);
          if (day !== null) {
            existing.effective_date = selectedDate;
            existing.service_day = day;
            existing.source = verifiedDate ? 'explicit' : 'edit-date';
          }
        }
        continue;
      }
      const matchedEditDay = !!nonConflictingEditDate;
      const date = verifiedDate || (matchedEditDay ? nonConflictingEditDate : null);
      const day = date ? serviceDayOnOrAfter(date) : null;
      if (day === null) continue; // 실제 날짜를 확인할 수 없는 경우 임의로 배치하지 않는다.
      events.push({
        id: 'history-' + item.id,
        previous_name: item.previous_name,
        next_name: item.next_name,
        effective_date: date,
        service_day: day,
        source: verifiedDate ? 'explicit' : 'edit-date'
      });
    }

    events.sort((a, b) => a.service_day - b.service_day ||
      (a.source === 'record' ? -1 : 1) ||
      String(a.id).localeCompare(String(b.id)));

    // 실제 기록 작성자와 충돌하는 과거의 '수정일만 확인된' 변경은 출력하지 않는다.
    const cleanEvents = events.filter((item) => {
      if (item.source !== 'edit-date') return true;
      const record = sortedRecords.find((r) => String(r.service_date) === item.effective_date);
      return !record || !writerName(record) || writerName(record) === item.next_name;
    });
    return { initial_name: originalName || currentName, events: cleanEvents };
  }

  // 운영자가 일차별로 확인한 제공인력 배정이 있으면
  // 저장된 배정을 최우선 적용해 PDF 페이지 표기와 변경일 특이사항을 구성한다.
  function applyVerifiedDayAssignments(baseTimeline, records, assignments, serviceDays) {
    if (!(assignments || []).length) return baseTimeline;
    const assigned = new Map((assignments || [])
      .map(a => [Number(a.service_day), a])
      .filter(([day,a]) => Number.isInteger(day) && day>=1 && String(a.caregiver_name||'').trim()));
    if (!assigned.size) return baseTimeline;
    const recorded = new Map((records || []).filter(r => r.service_date)
      .map(r => [Number(r.service_day), String(r.service_date)]));
    const baseEvents = [...(baseTimeline.events || [])].sort((a,b) =>
      Number(a.service_day)-Number(b.service_day));
    const baseNameOnDay = (day) => {
      let name=baseTimeline.initial_name || '';
      for (const e of baseEvents) {
        if (Number(e.service_day)>day) break;
        name=e.next_name || name;
      }
      return name;
    };
    const maxDay = Math.max(1,Number(serviceDays)||0,
      ...recorded.keys(),...assigned.keys());
    let lastName = assigned.get(1)?.caregiver_name || baseNameOnDay(1);
    const timeline = {initial_name:lastName||baseTimeline.initial_name,events:[]};
    for (let day=2;day<=maxDay;day++) {
      const direct = assigned.get(day);
      const name = String(direct?.caregiver_name||baseNameOnDay(day)||'').trim();
      const date = recorded.get(day)||direct?.service_date||null;
      if (name && lastName && name!==lastName) {
        timeline.events.push({
          id:'verified-day-'+day,
          previous_name:lastName,next_name:name,
          effective_date:date,service_day:day,
          silent:!date,
          source:direct?'operator-verified':'other-record'
        });
      }
      if (name) lastName=name;
    }
    return timeline;
  }

  function workerLabelForPage(caseData, timeline, pageIndex) {
    const pageChanges = timeline.events.filter((item) =>
      !item.silent && item.effective_date && Math.floor((Number(item.service_day) - 1) / 5) === pageIndex);
    if (pageChanges.length) {
      return pageChanges.map((change) =>
        `${change.previous_name} → ${change.next_name}(${fmtUnpaidDate(change.effective_date)})`
      ).join('\n');
    }
    const before = timeline.events.filter((item) =>
      Math.floor((Number(item.service_day) - 1) / 5) < pageIndex);
    return before.length
      ? before[before.length - 1].next_name
      : timeline.initial_name || caseData.caregiver?.full_name || caseData.caregiver_name_override || '';
  }

  function drawWorkerLabel(ctx, label, rect) {
    const lines = String(label || '').split('\n').filter(Boolean);
    if (!lines.length) return;
    const maxWidth = rect[2] - rect[0] - 5;
    const maxHeight = rect[3] - rect[1] - 4;
    ctx.save();
    let size = Math.min(lines.length > 1 ? 8.2 : 10.5, (maxHeight / lines.length) - 1);
    // 원본 PDF의 좁은 제공인력 칸에 글자가 찌그러져 보이지 않도록 너비에 맞춰 폰트를 조절한다.
    while (size > 5.4) {
      setFont(ctx, size);
      if (lines.every((line) => ctx.measureText(line).width <= maxWidth)) break;
      size -= 0.2;
    }
    setFont(ctx, Math.max(5.4, size));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const lineHeight = Math.min(size * 1.22, maxHeight / lines.length);
    const startY = (rect[1] + rect[3]) / 2 - (lines.length - 1) * lineHeight / 2;
    lines.forEach((line, i) => {
      ctx.fillText(line, (rect[0] + rect[2]) / 2, startY + i * lineHeight, maxWidth);
    });
    ctx.restore();
  }

  function countText(v) {
    return v === null || v === undefined || Number(v) === 0 ? '' : String(v);
  }

  function weightedLen(s) {
    let n = 0;
    for (const ch of String(s || '')) n += ch === ' ' ? 0.5 : 1;
    return n;
  }

  function oneLine(ctx, text, rect) {
    if (!text) return;
    const clean = String(text).replace(/\s*\n\s*/g, ' ');
    let size = weightedLen(clean) >= 8 ? 8.65 : 8.95;
    const max = rect[2] - rect[0] - 7.6;
    setFont(ctx, size);
    while (ctx.measureText(clean).width > max && size > 6.2) {
      size -= 0.25;
      setFont(ctx, size);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(clean, rect[0] + 3.8, (rect[1] + rect[3]) / 2, max);
  }

  function wrapLines(ctx, text, maxWidth) {
    const lines = [];
    let cur = '';
    const source = String(text || '').replace(/\r/g, '');
    for (const ch of source) {
      if (ch === '\n') {
        lines.push(cur.trimStart());
        cur = '';
        continue;
      }
      const next = cur + ch;
      if (ctx.measureText(next).width > maxWidth && cur) {
        lines.push(cur.trimStart());
        cur = ch === ' ' ? '' : ch;
      } else {
        cur = next;
      }
    }
    if (cur || !lines.length) lines.push(cur.trimStart());
    return lines;
  }

  function notesAutoFit(ctx, text, rect) {
    if (!text) return;
    const padX = 4.0, padTop = 3.0, padBottom = 2.0;
    const maxWidth = rect[2] - rect[0] - padX * 2;
    const maxHeight = rect[3] - rect[1] - padTop - padBottom;
    let size = 9.65;
    let lines = [];
    let lineHeight = 0;

    while (size >= 5.2) {
      setFont(ctx, size);
      lines = wrapLines(ctx, text, maxWidth);
      const lineRatio = size >= 8.5 ? 1.15 : size >= 7.0 ? 1.08 : 1.02;
      lineHeight = size * lineRatio;
      if (lines.length * lineHeight <= maxHeight) break;
      size -= 0.25;
    }

    setFont(ctx, size);
    lines = wrapLines(ctx, text, maxWidth);
    const lineRatio = size >= 8.5 ? 1.15 : size >= 7.0 ? 1.08 : 1.02;
    lineHeight = size * lineRatio;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    let y = rect[1] + padTop;
    const maxLines = Math.max(1, Math.floor(maxHeight / lineHeight));
    for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
      ctx.fillText(lines[i], rect[0] + padX, y, maxWidth);
      y += lineHeight;
    }
  }

  function drawCheck(ctx, col, boxTop) {
    const x = CHECK_X[col] + 3.1;
    const y = boxTop + 2.4;
    ctx.save();
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1.35;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x + 0.5, y + 4.6);
    ctx.lineTo(x + 2.3, y + 6.3);
    ctx.lineTo(x + 6.0, y + 0.9);
    ctx.stroke();
    ctx.restore();
  }

  function loadImage(src, label = '서명') {
    if (!src) return Promise.resolve(null);
    if (imageCache.has(src)) return imageCache.get(src);
    const promise = new Promise((resolve, reject) => {
      const img = new Image();
      const timer = setTimeout(() => reject(new Error(`${label} 이미지 로딩 시간 초과`)), 8000);
      img.onload = () => { clearTimeout(timer); resolve(img); };
      img.onerror = () => { clearTimeout(timer); reject(new Error(`${label} 이미지를 읽지 못했습니다.`)); };
      img.src = src;
    });
    imageCache.set(src, promise);
    return promise;
  }

  function signatureInkBounds(img) {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, img.naturalWidth || img.width || 1);
      canvas.height = Math.max(1, img.naturalHeight || img.height || 1);
      const scan = canvas.getContext('2d', { willReadFrequently: true });
      if (!scan) return null;

      scan.clearRect(0, 0, canvas.width, canvas.height);
      scan.drawImage(img, 0, 0, canvas.width, canvas.height);
      const pixels = scan.getImageData(0, 0, canvas.width, canvas.height).data;

      let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
      for (let y = 0; y < canvas.height; y += 1) {
        for (let x = 0; x < canvas.width; x += 1) {
          const i = (y * canvas.width + x) * 4;
          const a = pixels[i + 3];
          if (a <= 12) continue;

          const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
          const brightness = (r + g + b) / 3;
          if (brightness >= 246) continue;

          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }

      if (maxX < minX || maxY < minY) return null;

      const sourcePad = 4;
      const sx = Math.max(0, minX - sourcePad);
      const sy = Math.max(0, minY - sourcePad);
      const ex = Math.min(canvas.width - 1, maxX + sourcePad);
      const ey = Math.min(canvas.height - 1, maxY + sourcePad);
      return {
        sx,
        sy,
        sw: Math.max(1, ex - sx + 1),
        sh: Math.max(1, ey - sy + 1)
      };
    } catch (error) {
      console.warn('signature crop error', error);
      return null;
    }
  }

  async function drawSignature(ctx, src, rect, serviceDay) {
    if (!src) return;
    const img = await loadImage(src, `${serviceDay}일차 서명`);
    const crop = signatureInkBounds(img);
    const sourceWidth = crop?.sw || img.width;
    const sourceHeight = crop?.sh || img.height;

    // PDF 서명칸을 최대한 활용하되 테두리와 겹치지 않도록 아주 작은 여백만 둔다.
    const padX = 1.4;
    const padY = 1.0;
    const maxW = rect[2] - rect[0] - padX * 2;
    const maxH = rect[3] - rect[1] - padY * 2;
    const ratio = Math.min(maxW / sourceWidth, maxH / sourceHeight);
    const w = sourceWidth * ratio;
    const h = sourceHeight * ratio;
    const dx = rect[0] + (rect[2] - rect[0] - w) / 2;
    const dy = rect[1] + (rect[3] - rect[1] - h) / 2;

    if (crop) {
      ctx.drawImage(img, crop.sx, crop.sy, crop.sw, crop.sh, dx, dy, w, h);
    } else {
      ctx.drawImage(img, dx, dy, w, h);
    }
  }

  async function canvasPngBytes(canvas) {
    if (canvas.toBlob) {
      const blob = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('기록 이미지 변환 시간 초과')), 10000);
        canvas.toBlob((b) => {
          clearTimeout(timer);
          if (!b) reject(new Error('기록 이미지를 PNG로 변환하지 못했습니다.'));
          else resolve(b);
        }, 'image/png');
      });
      return new Uint8Array(await blob.arrayBuffer());
    }
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1] || '';
    const bin = atob(base64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }

  function distributeUnpaidReasons(records, unpaidReasons, pageCount) {
    const pages = Array.from({ length: pageCount }, () => []);
    const datePage = new Map();
    for (const record of records || []) {
      if (!record?.service_date) continue;
      const pageIndex = Math.floor((Number(record.service_day) - 1) / 5);
      if (pageIndex >= 0 && pageIndex < pageCount) datePage.set(String(record.service_date), pageIndex);
    }

    const sorted = [...(unpaidReasons || [])].sort((a, b) => String(a.unpaid_date || '').localeCompare(String(b.unpaid_date || '')));
    for (const item of sorted) {
      const preferred = datePage.has(String(item.unpaid_date)) ? datePage.get(String(item.unpaid_date)) : null;
      const candidates = [];
      if (Number.isInteger(preferred)) {
        for (let p = preferred; p < pageCount; p++) candidates.push(p);
        for (let p = 0; p < preferred; p++) candidates.push(p);
      } else {
        for (let p = 0; p < pageCount; p++) candidates.push(p);
      }
      const target = candidates.find((p) => pages[p].length < UNPAID_SLOTS.length);
      if (target !== undefined) pages[target].push(item);
    }
    return pages;
  }

  function shouldStampCaregiverChange(dayChanges, writtenNotes) {
    // 자동 교체 이력은 매 변경일마다 한 번씩 도장을 찍고,
    // 직접 작성된 특이사항에 제공인력/관리사 교체가 적혀 있어도 빠뜨리지 않는다.
    if ((dayChanges || []).length > 0) return true;
    const note = String(writtenNotes || '').replace(/\s+/g, ' ').trim();
    return /(?:제공인력|관리사|담당\s*인력|대체\s*인력|근무\s*인력).{0,30}(?:변경|교체)|(?:변경|교체).{0,30}(?:제공인력|관리사|담당\s*인력|대체\s*인력|근무\s*인력)/.test(note);
  }

  async function overlayFor(caseData, records, unpaidReasons, pageIndex, timeline) {
    const canvas = document.createElement('canvas');
    canvas.width = PAGE_W * SCALE;
    canvas.height = PAGE_H * SCALE;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) throw new Error('브라우저 캔버스를 사용할 수 없습니다.');
    ctx.scale(SCALE, SCALE);
    ctx.clearRect(0, 0, PAGE_W, PAGE_H);

    centerText(ctx, caseData.mother_name, headerRects.mother_name, 10.5);
    centerText(ctx, fmtDate(caseData.mother_birth_date), headerRects.mother_birth, 10.5);
    centerText(ctx, caseData.delivery_type, headerRects.delivery, 10.5);
    centerText(ctx, caseData.baby_name, headerRects.baby_name, 10.5);
    centerText(ctx, fmtDate(caseData.baby_birth_date), headerRects.baby_birth, 10.5);
    centerText(ctx, caseData.birth_weight ?? '', headerRects.birth_weight, 10.5);
    const workerLabel = workerLabelForPage(caseData, timeline, pageIndex);
    drawWorkerLabel(ctx, workerLabel, headerRects.worker);

    const pageRecords = (records || []).filter((r) => Math.floor((Number(r.service_day) - 1) / 5) === pageIndex);
    for (const r of pageRecords) {
      const col = (Number(r.service_day) - 1) % 5;
      const left = COLS[col], right = COLS[col + 1];

      centerText(ctx, fmtDate(r.service_date), [left,145.9,right,176.0], 10.2);

      for (const v of r.incision_status || []) if (CHECKS.incision[v] != null) drawCheck(ctx, col, CHECKS.incision[v]);
      for (const v of r.breast_status || []) if (CHECKS.breast[v] != null) drawCheck(ctx, col, CHECKS.breast[v]);
      for (const v of r.urination_bowel_status || []) if (CHECKS.urine[v] != null) drawCheck(ctx, col, CHECKS.urine[v]);
      if (r.sitz_bath && CHECKS.sitz[r.sitz_bath] != null) drawCheck(ctx, col, CHECKS.sitz[r.sitz_bath]);
      if (r.sleep_status && CHECKS.sleep[r.sleep_status] != null) drawCheck(ctx, col, CHECKS.sleep[r.sleep_status]);
      if (r.stool_status && CHECKS.stool[r.stool_status] != null) drawCheck(ctx, col, CHECKS.stool[r.stool_status]);
      if (r.bath_cord_status && CHECKS.bath[r.bath_cord_status] != null) drawCheck(ctx, col, CHECKS.bath[r.bath_cord_status]);

      baselineText(ctx, countText(r.meal_count), left + 49.5, POS.meal, 10.2);
      baselineText(ctx, countText(r.snack_count), left + 49.5, POS.snack, 10.2);
      baselineText(ctx, r.baby_temp ?? '', left + 30.0, POS.temp, 10.2);
      baselineText(ctx, countText(r.breastfeed_count), left + 35.5, POS.bf, 10.2);
      baselineText(ctx, countText(r.formula_count), left + 39.0, POS.fc, 10.2);

      const mlValue = countText(r.formula_ml);
      if (mlValue) {
        setFont(ctx, 10.2);
        const gap = mlValue.length >= 3 ? 8.8 : 7.2;
        const textWidth = ctx.measureText(mlValue).width;
        baselineText(ctx, mlValue, ML_LABEL_X[col] - gap - textWidth, POS.ml, 10.2);
      }

      oneLine(ctx, r.other_service, [left, POS.other[0], right, POS.other[1]]);
      const dayChanges = timeline.events.filter((change) =>
        !change.silent && change.effective_date && Number(change.service_day) === Number(r.service_day));
      const changeLines = dayChanges.map((change) =>
        `${fmtUnpaidDate(change.effective_date)}일자에 ${change.next_name}으로 제공인력 변경`);
      const combinedNotes = [changeLines.join('\n'), r.notes || ''].filter(Boolean).join('\n');
      const putChangeStamp = shouldStampCaregiverChange(dayChanges, r.notes);
      notesAutoFit(ctx, combinedNotes, [left, POS.notes[0], putChangeStamp ? right - 20 : right, POS.notes[1]]);
      // 1~4페이지 전체: 제공인력 변경 내용이 있는 모든 날짜의 특이사항마다 작은 원형 도장 1개.
      if (putChangeStamp) drawChangeStamp(ctx, right - 11.3, POS.notes[0] + 13.0);
      await drawSignature(ctx, r.signature_data, [left, POS.sig[0], right, POS.sig[1]], r.service_day);
    }

    for (let i = 0; i < Math.min(UNPAID_SLOTS.length, (unpaidReasons || []).length); i++) {
      const item = unpaidReasons[i];
      const slot = UNPAID_SLOTS[i];
      fitBaselineLine(ctx, fmtUnpaidDate(item.unpaid_date), slot.date, slot.baseline, 8.4, 7.0, 'center');
      fitBaselineLine(ctx, item.reason, slot.reason, slot.baseline, 7.8, 5.2, 'left');
      drawBestmomStamp(ctx, slot.stamp);
    }

    return canvasPngBytes(canvas);
  }

  function showError(currentStage, error) {
    const detail = error?.message || String(error || '알 수 없는 오류');
    console.error('PDF error:', currentStage, error);
    stage(`오류 - ${currentStage}`);
    window.alert(`PDF 생성에 실패했습니다.\n\n단계: ${currentStage}\n오류: ${detail}`);
  }

  window.makePdf = async function(caseId) {
    let preview = null;
    let currentStage = '시작';
    try {
      stage('생성 시작');
      try {
        preview = window.open('', '_blank');
        if (preview) {
          preview.document.title = '제공기록지 PDF 생성 중';
          preview.document.body.innerHTML = '<p style="font-family:sans-serif;padding:20px">제공기록지 PDF를 만들고 있습니다...</p>';
        }
      } catch (_) {
        preview = null;
      }

      currentStage = 'PDF 라이브러리 확인';
      if (!globalThis.PDFLib?.PDFDocument) throw new Error('PDF 라이브러리가 준비되지 않았습니다.');

      currentStage = '서비스 정보 불러오기';
      stage(currentStage);
      const caseRes = await sb
        .from('service_cases')
        .select('*,caregiver:profiles!service_cases_caregiver_id_fkey(full_name)')
        .eq('id', caseId)
        .single();
      if (caseRes.error) throw caseRes.error;
      const caseData = caseRes.data;

      currentStage = '기록 불러오기';
      stage(currentStage);
      const recRes = await sb
        .from('daily_records')
        .select('*,record_writer:profiles!daily_records_created_by_fkey(full_name,role)')
        .eq('case_id', caseId)
        .order('service_day');
      if (recRes.error) throw recRes.error;
      const records = recRes.data || [];

      currentStage = '누락 근무일 불러오기';
      stage(currentStage);
      const missingRes = await sb.from('caregiver_missing_days')
        .select('id,service_date,caregiver_name')
        .eq('case_id',caseId).order('service_date');
      if (missingRes.error) throw missingRes.error;
      const missingDays = missingRes.data || [];
      const recordedDates = new Set(records.map(record => String(record.service_date)));
      const displayRecords = [
        ...records.map(record => ({...record,original_service_day:record.service_day})),
        ...missingDays
          .filter(day => !recordedDates.has(String(day.service_date)))
          .map(day => ({
            service_date:day.service_date,
            service_day:null,
            is_missing_day:true,
            missing_id:day.id,
            verified_personnel_name:day.caregiver_name,
            signature_data:null, notes:null
          }))
      ].filter(record => record.service_date)
       .sort((x,y)=>String(x.service_date).localeCompare(String(y.service_date)) ||
         Number(x.original_service_day||999)-Number(y.original_service_day||999))
       .map((record,index) => ({...record,service_day:index+1}));

      currentStage = '제공인력 변경 이력 불러오기';
      stage(currentStage);
      const changeRes = await sb
        .from('caregiver_change_history')
        .select('id,previous_name,next_name,effective_date,created_at')
        .eq('case_id', caseId)
        .order('created_at', { ascending: true })
        .order('id', { ascending: true });
      if (changeRes.error) throw changeRes.error;
      const caregiverChanges = changeRes.data || [];
      const baseTimeline = buildCaregiverTimeline(caseData, displayRecords, caregiverChanges);
      currentStage = '운영자 확인 근무일 불러오기';
      stage(currentStage);
      const verifiedRes = await sb.from('caregiver_day_assignments')
        .select('service_day,service_date,caregiver_name')
        .eq('case_id',caseId).order('service_day');
      if (verifiedRes.error) throw verifiedRes.error;
      const adjustedOverrides = (verifiedRes.data || []).map(item => {
        const original = records.find(record => Number(record.service_day) === Number(item.service_day));
        const date = item.service_date || original?.service_date;
        const display = displayRecords.find(record => record.service_date === date);
        return display ? {...item,service_day:display.service_day,service_date:date} : null;
      }).filter(Boolean);
      const combinedOverrides = [
        ...adjustedOverrides,
        ...displayRecords.filter(record => record.is_missing_day)
          .map(record => ({service_day:record.service_day,service_date:record.service_date,caregiver_name:record.verified_personnel_name}))
      ];
      const timeline = applyVerifiedDayAssignments(baseTimeline, displayRecords, combinedOverrides,caseData.service_days);
      currentStage = '미결제 사유 불러오기';
      stage(currentStage);
      const unpaidRes = await sb
        .from('unpaid_reasons')
        .select('id,unpaid_date,reason')
        .eq('case_id', caseId)
        .order('unpaid_date', { ascending: true });
      if (unpaidRes.error) throw unpaidRes.error;
      const unpaidReasons = unpaidRes.data || [];

      currentStage = '원본 PDF 다운로드';
      stage(currentStage);
      const tplRes = await sb.storage
        .from('pdf-templates')
        .download('bestmom_blank_template.pdf');
      if (tplRes.error) throw tplRes.error;
      if (!tplRes.data) throw new Error('등록된 원본 PDF를 받지 못했습니다.');

      currentStage = '원본 PDF 읽기';
      stage(currentStage);
      const templateBytes = new Uint8Array(await tplRes.data.arrayBuffer());
      if (!templateBytes.length) throw new Error('원본 PDF 파일이 비어 있습니다.');
      const doc = await PDFLib.PDFDocument.load(templateBytes, { ignoreEncryption: true, updateMetadata: false });

      const contractedPages = Math.max(1, Math.ceil(Number(caseData.service_days || 0) / 5));
      const recordedDays = [...new Set(
        displayRecords
          .map((record) => Number(record?.service_day))
          .filter((day) => Number.isFinite(day) && day > 0)
      )];
      const lastRecordedDay = recordedDays.length ? Math.max(...recordedDays) : 0;

      // 최종완성 처리된 건은 실제 작성된 마지막 이용일차까지만 PDF 페이지를 만든다.
      // 예: 10일 -> 2장, 6일 -> 2장, 5일 -> 1장.
      // 최종완성 전에는 기존처럼 등록된 서비스 기간 전체 페이지를 유지한다.
      const need = caseData.final_completed_at
        ? Math.max(1, Math.ceil(lastRecordedDay / 5))
        : contractedPages;

      if (doc.getPageCount() < need) {
        throw new Error(`원본 PDF 페이지가 부족합니다. 필요 ${need}페이지 / 원본 ${doc.getPageCount()}페이지`);
      }
      while (doc.getPageCount() > need) doc.removePage(doc.getPageCount() - 1);

      const capacity = need * UNPAID_SLOTS.length;
      if (unpaidReasons.length > capacity) {
        throw new Error(`미결제 사유가 원본 PDF 입력 칸보다 많습니다. 최대 ${capacity}건까지 입력할 수 있습니다.`);
      }
      const unpaidPages = distributeUnpaidReasons(displayRecords, unpaidReasons, need);

      for (let i = 0; i < need; i++) {
        currentStage = `${i + 1}페이지 기록 그리기`;
        stage(currentStage);
        const pngBytes = await overlayFor(caseData, displayRecords, unpaidPages[i] || [], i, timeline);

        currentStage = `${i + 1}페이지 PDF에 적용`;
        stage(currentStage);
        const png = await doc.embedPng(pngBytes);
        const page = doc.getPage(i);
        const { width, height } = page.getSize();
        page.drawImage(png, { x: 0, y: 0, width, height });
      }

      try {
        doc.setProducer(`Bestmom ${ENGINE}`);
        doc.setCreator('Bestmom Service Log');
        doc.setSubject(`Bestmom service record - ${ENGINE}`);
      } catch (_) {}

      currentStage = '최종 PDF 저장';
      stage(currentStage);
      const out = await doc.save({ useObjectStreams: false, addDefaultPage: false });
      const blob = new Blob([out], { type: 'application/pdf' });
      const blobUrl = globalThis.URL.createObjectURL(blob);

      currentStage = 'PDF 열기';
      stage(currentStage);
      if (preview && !preview.closed) {
        preview.location.replace(blobUrl);
      } else {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.target = '_blank';
        a.rel = 'noopener';
        a.download = `${caseData.mother_name || '산모'}_제공기록지.pdf`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
      setTimeout(() => globalThis.URL.revokeObjectURL(blobUrl), 120000);
      stage('생성 완료');
    } catch (error) {
      try { if (preview && !preview.closed) preview.close(); } catch (_) {}
      showError(currentStage, error);
    }
  };

  stage('준비 완료');
})();