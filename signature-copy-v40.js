(() => {
  if (window.__BESTMOM_SIGNATURE_COPY_V40__) return;
  window.__BESTMOM_SIGNATURE_COPY_V40__ = true;

  const previousOpenDay = window.openDay;
  if (typeof previousOpenDay !== 'function') return;

  function removeConsentModal() {
    document.getElementById('signatureCopyConsentModal')?.remove();
  }

  function askConsent(sourceDay) {
    return new Promise((resolve) => {
      removeConsentModal();

      const overlay = document.createElement('div');
      overlay.id = 'signatureCopyConsentModal';
      overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.38);display:flex;align-items:center;justify-content:center;padding:20px;';
      overlay.innerHTML = `
        <div style="width:min(92vw,380px);background:#fff;border-radius:14px;padding:20px;box-shadow:0 12px 35px rgba(0,0,0,.22);">
          <div style="font-size:17px;font-weight:800;line-height:1.45;">이전 서명을 불러오는 것에 동의하십니까?</div>
          <div style="margin-top:9px;font-size:13px;line-height:1.55;color:#6b7280;">${sourceDay}일차에 받은 산모님 서명을 불러옵니다.<br>산모님께서 직접 동의하신 경우에만 눌러주세요.</div>
          <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:18px;">
            <button type="button" id="signatureCopyNo" class="secondary" style="width:auto;min-width:76px;">취소</button>
            <button type="button" id="signatureCopyYes" class="primary" style="width:auto;min-width:112px;">네, 동의합니다</button>
          </div>
        </div>`;

      document.body.appendChild(overlay);
      const finish = (value) => {
        removeConsentModal();
        resolve(value);
      };
      document.getElementById('signatureCopyNo').onclick = () => finish(false);
      document.getElementById('signatureCopyYes').onclick = () => finish(true);
      overlay.onclick = (event) => { if (event.target === overlay) finish(false); };
    });
  }

  async function findPreviousSignature(day) {
    if (typeof currentCase === 'undefined' || !currentCase?.id || day <= 1) return null;
    const { data, error } = await sb
      .from('daily_records')
      .select('id,service_day,signature_data,signed_at')
      .eq('case_id', currentCase.id)
      .lt('service_day', day)
      .not('signature_data', 'is', null)
      .order('service_day', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  }

  async function drawPreviousSignature(signatureData) {
    const canvas = document.getElementById('sig');
    if (!canvas) throw new Error('서명판을 찾지 못했습니다.');

    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('이전 서명을 불러오지 못했습니다.'));
      image.src = signatureData;
    });

    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    ctx.clearRect(0, 0, width, height);

    const pad = 8;
    const maxW = Math.max(1, width - pad * 2);
    const maxH = Math.max(1, height - pad * 2);
    const ratio = Math.min(maxW / image.width, maxH / image.height);
    const drawW = image.width * ratio;
    const drawH = image.height * ratio;
    ctx.drawImage(image, (width - drawW) / 2, (height - drawH) / 2, drawW, drawH);

    signatureDirty = true;
  }

  async function copyPrevious(day, button) {
    if (button) button.disabled = true;
    try {
      const previous = await findPreviousSignature(day);
      if (!previous?.signature_data) {
        alertMsg('이전에 저장된 산모님 서명이 없습니다.');
        return;
      }

      const agreed = await askConsent(previous.service_day);
      if (!agreed) return;

      await drawPreviousSignature(previous.signature_data);

      try {
        if (typeof me !== 'undefined' && me?.id && typeof currentCase !== 'undefined' && currentCase?.id) {
          await sb.from('record_audit').insert({
            record_id: (typeof currentRecord !== 'undefined' && currentRecord?.id) ? currentRecord.id : null,
            case_id: currentCase.id,
            actor_id: me.id,
            action: 'signature_copy_loaded',
            details: {
              service_day: day,
              source_service_day: previous.service_day,
              consent_confirmed: true
            }
          });
        }
      } catch (auditError) {
        console.warn('signature copy audit error', auditError);
      }

      alertMsg(`${previous.service_day}일차 서명을 불러왔습니다.\n확인 후 아래 ‘서명 완료 · 기록 잠금’을 눌러주세요.`);
    } catch (error) {
      console.error(error);
      alertMsg(`이전 서명을 불러오지 못했습니다. ${error?.message || ''}`);
    } finally {
      if (button) button.disabled = false;
    }
  }

  function addCopyButton(day, adminMode) {
    if (adminMode) return;
    if (typeof me === 'undefined' || me?.role !== 'caregiver') return;

    const canvas = document.getElementById('sig');
    if (!canvas || document.getElementById('copyPreviousSignature')) return;

    const row = canvas.nextElementSibling;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;align-items:center;gap:7px;margin-top:7px;margin-bottom:2px;flex-wrap:wrap;';

    const button = document.createElement('button');
    button.id = 'copyPreviousSignature';
    button.type = 'button';
    button.className = 'secondary';
    button.textContent = '이전 서명 불러오기';
    button.style.cssText = 'width:auto;min-height:32px;padding:6px 10px;font-size:12px;line-height:1.2;';
    button.onclick = () => copyPrevious(day, button);

    const hint = document.createElement('span');
    hint.textContent = '산모님 동의 후 사용';
    hint.style.cssText = 'font-size:11px;color:#6b7280;';

    wrap.append(button, hint);
    if (row) canvas.insertAdjacentElement('afterend', wrap);
    else canvas.parentElement?.appendChild(wrap);
  }

  window.openDay = async function openDayWithSignatureCopy(day, adminMode) {
    await previousOpenDay(day, adminMode);
    addCopyButton(Number(day), Boolean(adminMode));
  };
})();
