(() => {
  if (window.__BESTMOM_ADMIN_SIGNATURE_EDIT_V75__) return;
  window.__BESTMOM_ADMIN_SIGNATURE_EDIT_V75__ = true;

  const previousOpenDay = window.openDay;
  if (typeof previousOpenDay !== 'function') return;

  function isAdmin() {
    return typeof me !== 'undefined' && me?.role === 'admin';
  }

  function getDayCard() {
    return document.querySelector('#day > .card');
  }

  function getSignatureHeading(card) {
    return [...(card?.querySelectorAll('h3') || [])]
      .find((h) => h.textContent?.includes('산모 확인서명')) || null;
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
      rectWidth: rect.width,
      rectHeight: rect.height,
      markDirty() { dirty = true; hasContent = true; },
      setHasContent(value) { hasContent = Boolean(value); },
      isDirty() { return dirty; },
      hasContent() { return hasContent; },
      clear() {
        ctx.clearRect(0, 0, rect.width, rect.height);
        dirty = true;
        hasContent = false;
      }
    };
  }

  async function drawSignature(canvasState, image) {
    if (!image) return;
    const { ctx, rectWidth: width, rectHeight: height } = canvasState;
    ctx.clearRect(0, 0, width, height);

    const pad = 10;
    const maxW = Math.max(1, width - pad * 2);
    const maxH = Math.max(1, height - pad * 2);
    const ratio = Math.min(maxW / image.width, maxH / image.height);
    const drawW = image.width * ratio;
    const drawH = image.height * ratio;
    ctx.drawImage(image, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);
    canvasState.setHasContent(true);
  }

  async function findPreviousSignature(day) {
    const { data, error } = await sb
      .from('daily_records')
      .select('service_day,signature_data,signed_at')
      .eq('case_id', currentCase.id)
      .lt('service_day', Number(day))
      .not('signature_data', 'is', null)
      .order('service_day', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  function askCopyConsent(sourceDay) {
    return window.confirm(
      `${sourceDay}일차에 저장된 산모님 서명을 불러오시겠습니까?\n\n산모님께서 해당 서명 사용에 동의한 경우에만 진행해주세요.`
    );
  }

  function removeEditor() {
    document.querySelector('[data-admin-signature-editor]')?.remove();
  }

  async function openEditor(day, section) {
    removeEditor();

    const record = (typeof currentRecord !== 'undefined' && currentRecord?.id)
      ? currentRecord
      : null;
    if (!record) {
      alertMsg('먼저 해당 일차의 제공기록을 저장해주세요.');
      return;
    }

    const editor = document.createElement('div');
    editor.dataset.adminSignatureEditor = '1';
    editor.style.cssText = 'margin-top:12px;padding:12px;border:1px solid #cbd5e1;border-radius:12px;background:#f8fafc;';
    editor.innerHTML = `
      <div style="font-size:13px;font-weight:800;margin-bottom:8px">운영자 서명 수정</div>
      <canvas id="adminSignatureCanvas" class="sigbox" style="height:230px;border:2px solid #64748b"></canvas>
      <div class="row mt">
        <button type="button" id="adminSignatureClear" class="secondary">지우기</button>
        <button type="button" id="adminSignatureCopy" class="secondary">이전 서명 불러오기</button>
      </div>
      <div class="row mt" style="justify-content:flex-end">
        <button type="button" id="adminSignatureCancel" class="secondary">취소</button>
        <button type="button" id="adminSignatureSave" class="primary">서명 수정 저장</button>
      </div>
      <div class="muted tiny" style="margin-top:7px">서명만 수정되며 해당 일차의 제공기록 내용은 변경하지 않습니다.</div>
    `;
    section.appendChild(editor);

    const canvas = document.getElementById('adminSignatureCanvas');
    const state = setupCanvas(canvas);
    let copiedFromDay = null;

    if (record.signature_data) {
      try {
        const image = await loadImage(record.signature_data);
        await drawSignature(state, image);
      } catch (error) {
        console.warn('existing signature load error', error);
      }
    }

    document.getElementById('adminSignatureClear').onclick = () => {
      state.clear();
      copiedFromDay = null;
    };

    document.getElementById('adminSignatureCopy').onclick = async () => {
      const button = document.getElementById('adminSignatureCopy');
      button.disabled = true;
      try {
        const previous = await findPreviousSignature(day);
        if (!previous?.signature_data) {
          alertMsg('이전에 저장된 산모님 서명이 없습니다.');
          return;
        }
        if (!askCopyConsent(previous.service_day)) return;

        const image = await loadImage(previous.signature_data);
        await drawSignature(state, image);
        state.markDirty();
        copiedFromDay = Number(previous.service_day);
      } catch (error) {
        console.error(error);
        alertMsg(`이전 서명을 불러오지 못했습니다. ${error?.message || ''}`);
      } finally {
        button.disabled = false;
      }
    };

    document.getElementById('adminSignatureCancel').onclick = removeEditor;

    document.getElementById('adminSignatureSave').onclick = async () => {
      if (!state.hasContent()) {
        return alertMsg('서명을 작성하거나 이전 서명을 불러와주세요.');
      }
      if (!state.isDirty() && record.signature_data) {
        return alertMsg('수정된 서명이 없습니다.');
      }

      const ok = window.confirm(
        `${day}일차 산모 서명을 수정하여 저장하시겠습니까?\n\n제공기록 내용은 변경되지 않고 서명만 교정됩니다.`
      );
      if (!ok) return;

      const button = document.getElementById('adminSignatureSave');
      button.disabled = true;
      try {
        const signatureData = canvas.toDataURL('image/png');
        const previousSignedAt = record.signed_at || null;
        const hadPreviousSignature = Boolean(record.signature_data);
        const now = new Date().toISOString();

        const { data: updated, error } = await sb
          .from('daily_records')
          .update({
            signature_data: signatureData,
            signed_at: now,
            signed_user_agent: navigator.userAgent,
            locked: true
          })
          .eq('id', record.id)
          .select()
          .single();
        if (error) throw error;

        try {
          await sb.from('record_audit').insert({
            record_id: record.id,
            case_id: currentCase.id,
            actor_id: me?.id || null,
            action: 'admin_signature_corrected',
            details: {
              service_day: Number(day),
              had_previous_signature: hadPreviousSignature,
              previous_signed_at: previousSignedAt,
              copied_from_service_day: copiedFromDay
            }
          });
        } catch (auditError) {
          console.warn('signature correction audit error', auditError);
        }

        currentRecord = updated;
        alertMsg('산모 서명을 수정했습니다.');
        if (typeof window.refreshRecordStatus === 'function') {
          await window.refreshRecordStatus(currentCase?.id);
        }
        await window.openDay(day, true);
      } catch (error) {
        console.error(error);
        alertMsg(`서명을 수정하지 못했습니다. ${error?.message || ''}`);
        button.disabled = false;
      }
    };
  }

  function ensureSection(day, adminMode) {
    if (!adminMode || !isAdmin()) return;

    const card = getDayCard();
    if (!card) return;

    let heading = getSignatureHeading(card);
    let section = heading?.parentElement || null;

    if (!heading) {
      section = document.createElement('div');
      section.dataset.adminSignatureSection = '1';
      section.innerHTML = `
        <div class="hr"></div>
        <div class="row space" style="align-items:center">
          <h3 style="margin:0">산모 확인서명</h3>
          <span style="display:inline-block;padding:3px 7px;border-radius:999px;background:#f3f4f6;color:#6b7280;font-size:11px;font-weight:800">서명 없음</span>
        </div>
        <div style="margin-top:10px;width:100%;height:140px;border:2px solid #9ca3af;border-radius:12px;background:#fff;display:flex;align-items:center;justify-content:center;color:#9ca3af;font-size:13px;font-weight:700">
          저장된 산모 서명이 없습니다.
        </div>
      `;
      card.appendChild(section);
      heading = getSignatureHeading(section);
    } else {
      const existingEndedWrap = card.querySelector('[data-ended-signature-empty]');
      if (existingEndedWrap) section = existingEndedWrap;
      else {
        const img = heading.nextElementSibling;
        const wrap = document.createElement('div');
        wrap.dataset.adminSignatureSection = '1';
        heading.parentElement?.insertBefore(wrap, heading);
        wrap.appendChild(heading);
        if (img?.tagName === 'IMG') wrap.appendChild(img);
        section = wrap;
      }
    }

    if (!section || section.querySelector('[data-admin-signature-edit-button]')) return;

    const recordExists = typeof currentRecord !== 'undefined' && Boolean(currentRecord?.id);
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary mt';
    button.dataset.adminSignatureEditButton = '1';
    button.textContent = currentRecord?.signature_data ? '서명 수정' : '서명 입력';
    button.disabled = !recordExists;
    button.onclick = () => openEditor(Number(day), section);
    section.appendChild(button);

    if (!recordExists) {
      const hint = document.createElement('div');
      hint.className = 'muted tiny';
      hint.style.marginTop = '5px';
      hint.textContent = '해당 일차 기록을 먼저 저장하면 서명을 입력할 수 있습니다.';
      section.appendChild(hint);
    }
  }

  window.openDay = async function openDayWithAdminSignatureEdit(day, adminMode) {
    await previousOpenDay(day, adminMode);
    ensureSection(Number(day), Boolean(adminMode));
  };
})();