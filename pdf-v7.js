(() => {
  const ENGINE = 'PDF-7.0';
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
  // 기존 PDF-6의 본문 좌표는 전혀 변경하지 않고 이 영역만 추가한다.
  const UNPAID_SLOTS = [
    { date:[67.0,733.0,103.0,753.0], reason:[163.0,733.0,232.0,753.0] },
    { date:[336.0,733.0,372.0,753.0], reason:[432.0,733.0,497.0,753.0] },
    { date:[67.0,772.0,103.0,792.0], reason:[163.0,772.0,232.0,792.0] },
    { date:[336.0,772.0,372.0,792.0], reason:[432.0,772.0,497.0,792.0] }
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

  function fitOneLine(ctx, text, rect, startSize = 8.3, minSize = 5.4, align = 'left') {
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
    ctx.textBaseline = 'middle';
    ctx.textAlign = align;
    const x = align === 'center' ? (rect[0] + rect[2]) / 2 : rect[0] + pad;
    ctx.fillText(clean, x, (rect[1] + rect[3]) / 2, maxWidth);
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

  async function drawSignature(ctx, src, rect, serviceDay) {
    if (!src) return;
    const img = await loadImage(src, `${serviceDay}일차 서명`);
    const pad = 4;
    const maxW = rect[2] - rect[0] - pad * 2;
    const maxH = rect[3] - rect[1] - pad * 2;
    const ratio = Math.min(maxW / img.width, maxH / img.height);
    const w = img.width * ratio, h = img.height * ratio;
    ctx.drawImage(img, rect[0] + (rect[2] - rect[0] - w) / 2, rect[1] + (rect[3] - rect[1] - h) / 2, w, h);
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

  async function overlayFor(caseData, records, unpaidReasons, pageIndex) {
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
    centerText(ctx, caseData.caregiver?.full_name || '', headerRects.worker, 10.5);

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
      notesAutoFit(ctx, r.notes, [left, POS.notes[0], right, POS.notes[1]]);
      await drawSignature(ctx, r.signature_data, [left, POS.sig[0], right, POS.sig[1]], r.service_day);
    }

    for (let i = 0; i < Math.min(UNPAID_SLOTS.length, (unpaidReasons || []).length); i++) {
      const item = unpaidReasons[i];
      const slot = UNPAID_SLOTS[i];
      fitOneLine(ctx, fmtUnpaidDate(item.unpaid_date), slot.date, 8.4, 7.0, 'center');
      fitOneLine(ctx, item.reason, slot.reason, 7.8, 5.2, 'left');
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
        .select('*')
        .eq('case_id', caseId)
        .order('service_day');
      if (recRes.error) throw recRes.error;
      const records = recRes.data || [];

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

      const need = Math.max(1, Math.ceil(Number(caseData.service_days || 0) / 5));
      if (doc.getPageCount() < need) {
        throw new Error(`원본 PDF 페이지가 부족합니다. 필요 ${need}페이지 / 원본 ${doc.getPageCount()}페이지`);
      }
      while (doc.getPageCount() > need) doc.removePage(doc.getPageCount() - 1);

      const capacity = need * UNPAID_SLOTS.length;
      if (unpaidReasons.length > capacity) {
        throw new Error(`미결제 사유가 원본 PDF 입력 칸보다 많습니다. 최대 ${capacity}건까지 입력할 수 있습니다.`);
      }
      const unpaidPages = distributeUnpaidReasons(records, unpaidReasons, need);

      for (let i = 0; i < need; i++) {
        currentStage = `${i + 1}페이지 기록 그리기`;
        stage(currentStage);
        const pngBytes = await overlayFor(caseData, records, unpaidPages[i] || [], i);

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