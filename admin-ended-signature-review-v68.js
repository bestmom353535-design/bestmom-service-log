(() => {
  if (window.__BESTMOM_ENDED_SIGNATURE_REVIEW_V68__) return;
  window.__BESTMOM_ENDED_SIGNATURE_REVIEW_V68__ = true;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g, (ch) => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[ch]));
  }

  function fmtDate(value) {
    const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${Number(m[2])}/${Number(m[3])}` : '날짜 없음';
  }

  function closeReview() {
    document.getElementById('endedSignatureReviewModal')?.remove();
  }

  function setupCanvas(canvas) {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#111827';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let drawing = false;
    let dirty = false;
    let hasContent = false;

    const point = (event) => {
      const r = canvas.getBoundingClientRect();
      return { x: event.clientX - r.left, y: event.clientY - r.top };
    };

    canvas.onpointerdown = (event) => {
      drawing = true;
      canvas.setPointerCapture?.(event.pointerId);
      const p = point(event);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      dirty = true;
      hasContent = true;
    };
    canvas.onpointermove = (event) => {
      if (!drawing) return;
      const p = point(event);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      dirty = true;
    };
    canvas.onpointerup = () => { drawing = false; };
    canvas.onpointercancel = () => { drawing = false; };

    return {
      ctx,
      width: rect.width,
      height: rect.height,
      markContent() { hasContent = true; },
      markDirty() { dirty = true; hasContent = true; },
      clear() {
        ctx.clearRect(0, 0, rect.width, rect.height);
        dirty = true;
        hasContent = false;
      },
      hasContent() { return hasContent; },
      isDirty() { return dirty; }
    };
  }

  async function loadImage(src) {
    if (!src) return null;
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error('서명을 불러오지 못했습니다.'));
      img.src = src;
    });
    return img;
  }

  async function drawImage(state, src) {
    if (!src) return;
    const image = await loadImage(src);
    const pad = 10;
    const maxW = state.width - pad * 2;
    const maxH = state.height - pad * 2;
    const ratio = Math.min(maxW / image.width, maxH / image.height);
    const w = image.width * ratio;
    const h = image.height * ratio;
    state.ctx.clearRect(0, 0, state.width, state.height);
    state.ctx.drawImage(image, (state.width - w) / 2, (state.height - h) / 2, w, h);
    state.markContent();
  }

  async function previousSignature(caseId, day) {
    const { data, error } = await sb
      .from('daily_records')
      .select('service_day,signature_data')
      .eq('case_id', caseId)
      .lt('service_day', Number(day))
      .not('signature_data', 'is', null)
      .order('service_day', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function openInlineEditor(caseId, record, container, refresh) {
    container.querySelector('[data-sign-inline-editor]')?.remove();

    const editor = document.createElement('div');
    editor.dataset.signInlineEditor = '1';
    editor.style.cssText = 'margin-top:10px;padding:10px;border:1px solid #cbd5e1;border-radius:10px;background:#f8fafc;';
    editor.innerHTML = `
      <canvas data-sign-canvas class="sigbox" style="height:210px;border:2px solid #64748b"></canvas>
      <div class="row mt" style="gap:6px;flex-wrap:wrap">
        <button type="button" class="secondary" data-sign-clear>지우기</button>
        <button type="button" class="secondary" data-sign-copy>이전 서명 불러오기</button>
        <button type="button" class="secondary" data-sign-cancel>취소</button>
        <button type="button" class="primary" data-sign-save>서명 저장</button>
      </div>
    `;
    container.appendChild(editor);

    const canvas = editor.querySelector('[data-sign-canvas]');
    const state = setupCanvas(canvas);
    let copiedFromDay = null;

    if (record.signature_data) {
      try { await drawImage(state, record.signature_data); }
      catch (error) { console.warn('signature preview load error', error); }
    }

    editor.querySelector('[data-sign-clear]').onclick = () => {
      state.clear();
      copiedFromDay = null;
    };

    editor.querySelector('[data-sign-copy]').onclick = async () => {
      const button = editor.querySelector('[data-sign-copy]');
      button.disabled = true;
      try {
        const previous = await previousSignature(caseId, record.service_day);
        if (!previous?.signature_data) {
          alertMsg('이전에 저장된 산모님 서명이 없습니다.');
          return;
        }
        const ok = window.confirm(`${previous.service_day}일차 서명을 불러오시겠습니까?`);
        if (!ok) return;
        await drawImage(state, previous.signature_data);
        state.markDirty();
        copiedFromDay = Number(previous.service_day);
      } catch (error) {
        alertMsg(`이전 서명을 불러오지 못했습니다. ${error?.message || ''}`);
      } finally {
        button.disabled = false;
      }
    };

    editor.querySelector('[data-sign-cancel]').onclick = () => editor.remove();

    editor.querySelector('[data-sign-save]').onclick = async () => {
      if (!state.hasContent()) return alertMsg('서명을 작성하거나 이전 서명을 불러와주세요.');
      if (!state.isDirty() && record.signature_data) return alertMsg('수정된 서명이 없습니다.');

      const ok = window.confirm(`${record.service_day}일차 산모 서명을 수정하여 저장하시겠습니까?`);
      if (!ok) return;

      const button = editor.querySelector('[data-sign-save]');
      button.disabled = true;
      try {
        const signatureData = canvas.toDataURL('image/png');
        const previousSignedAt = record.signed_at || null;
        const hadPrevious = Boolean(record.signature_data);
        const now = new Date().toISOString();

        const { error } = await sb
          .from('daily_records')
          .update({
            signature_data: signatureData,
            signed_at: now,
            signed_user_agent: navigator.userAgent,
            locked: true
          })
          .eq('id', record.id);
        if (error) throw error;

        try {
          await sb.from('record_audit').insert({
            record_id: record.id,
            case_id: caseId,
            actor_id: me?.id || null,
            action: 'admin_signature_corrected_from_review',
            details: {
              service_day: Number(record.service_day),
              had_previous_signature: hadPrevious,
              previous_signed_at: previousSignedAt,
              copied_from_service_day: copiedFromDay
            }
          });
        } catch (auditError) {
          console.warn('signature review audit error', auditError);
        }

        alertMsg(`${record.service_day}일차 서명을 수정했습니다.`);
        await refresh();
      } catch (error) {
        console.error(error);
        alertMsg(`서명을 저장하지 못했습니다. ${error?.message || ''}`);
        button.disabled = false;
      }
    };
  }

  async function renderReview(caseId, motherName) {
    const overlay = document.getElementById('endedSignatureReviewModal');
    if (!overlay) return;

    const body = overlay.querySelector('[data-sign-review-body]');
    body.innerHTML = '<p class="muted">서명을 불러오는 중...</p>';

    const { data: records, error } = await sb
      .from('daily_records')
      .select('id,service_day,service_date,signature_data,signed_at,locked')
      .eq('case_id', caseId)
      .order('service_day');

    if (error) {
      body.innerHTML = '<p>서명 정보를 불러오지 못했습니다.</p>';
      return;
    }

    const rows = records || [];
    const signed = rows.filter((r) => Boolean(r.signature_data)).length;

    overlay.querySelector('[data-sign-review-summary]').textContent =
      `저장된 기록 ${rows.length}일 · 서명 ${signed}/${rows.length}일`;

    if (!rows.length) {
      body.innerHTML = '<div class="notice">저장된 일차 기록이 없습니다.</div>';
      return;
    }

    body.innerHTML = rows.map((r) => `
      <div data-sign-review-day="${r.service_day}" style="border:1px solid #e5e7eb;border-radius:12px;padding:12px;background:#fff">
        <div class="row space" style="align-items:center">
          <div>
            <b>${r.service_day}일차 · ${esc(fmtDate(r.service_date))}</b>
            <div class="muted tiny" style="margin-top:3px">${r.signature_data ? '서명 저장됨' : '서명 없음'}</div>
          </div>
          <span style="padding:4px 8px;border-radius:999px;font-size:11px;font-weight:900;background:${r.signature_data ? '#dcfce7' : '#fee2e2'};color:${r.signature_data ? '#166534' : '#991b1b'}">${r.signature_data ? '서명 있음' : '서명 없음'}</span>
        </div>
        <div style="margin-top:8px;height:120px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;display:flex;align-items:center;justify-content:center;overflow:hidden">
          ${r.signature_data
            ? `<img src="${r.signature_data}" alt="${r.service_day}일차 서명" style="max-width:100%;max-height:112px;object-fit:contain">`
            : '<span class="muted" style="font-weight:700">저장된 서명이 없습니다</span>'}
        </div>
        <div class="row mt">
          <button type="button" class="secondary" data-sign-review-edit="${r.service_day}">${r.signature_data ? '서명 수정' : '서명 입력'}</button>
        </div>
      </div>
    `).join('');

    rows.forEach((record) => {
      const card = body.querySelector(`[data-sign-review-day="${record.service_day}"]`);
      const button = card?.querySelector(`[data-sign-review-edit="${record.service_day}"]`);
      if (button) {
        button.onclick = () => openInlineEditor(caseId, record, card, () => renderReview(caseId, motherName));
      }
    });
  }

  window.openEndedSignatureReview = async function openEndedSignatureReview(caseId, motherName) {
    closeReview();

    const overlay = document.createElement('div');
    overlay.id = 'endedSignatureReviewModal';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(17,24,39,.52);display:flex;align-items:flex-start;justify-content:center;padding:14px;overflow:auto;';
    overlay.innerHTML = `
      <div style="width:min(96vw,900px);background:#f8fafc;border-radius:16px;padding:16px;margin:12px 0 28px;box-shadow:0 18px 50px rgba(0,0,0,.25)">
        <div class="row space" style="align-items:flex-start">
          <div>
            <h3 style="margin-bottom:4px">${esc(motherName || '산모')} · 서명 확인</h3>
            <div class="muted" data-sign-review-summary>서명을 불러오는 중...</div>
          </div>
          <button type="button" class="secondary" data-sign-review-close style="width:auto">닫기</button>
        </div>
        <div class="notice mt" style="background:#fff7ed;border-color:#fed7aa">일차별 실제 서명 이미지를 확인해주세요. 선만 그은 서명처럼 이상해 보이는 경우 해당 일차의 <b>서명 수정</b>을 눌러 바로 교정할 수 있습니다.</div>
        <div data-sign-review-body style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:10px;margin-top:12px"></div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('[data-sign-review-close]').onclick = closeReview;
    overlay.onclick = (event) => { if (event.target === overlay) closeReview(); };

    await renderReview(caseId, motherName);
  };
})();