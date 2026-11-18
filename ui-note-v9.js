(() => {
  'use strict';
  if (window.__BESTMOM_SHORT_NOTES_V119__) return;
  window.__BESTMOM_SHORT_NOTES_V119__ = true;

  const originalOpenDay = window.openDay;
  if (typeof originalOpenDay !== 'function') return;

  // Keep a consistent everyday sentence ending for each mother.
  const caseHash = id => {
    let h = 2166136261;
    for (const ch of String(id || '')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
    return h;
  };
  const numberOf = id => {
    const value = document.getElementById(id)?.value;
    return value === '' || value == null ? null : Number(value);
  };
  const selected = name => document.querySelector('input[name="' + name + '"]:checked')?.value || '';
  const formats = [
    { sleepGood:'아기가 낮에 잠을 잘 잤다.', sleepBad:'아기가 낮잠을 잘 못 잤다.', stoolNormal:'아기 대변 상태가 괜찮았다.', stoolDifferent:'아기 대변 상태가 평소와 달랐다.', bath:'아기 목욕을 시켰다.', bf:'모유수유를 했다.', formula:'분유를 먹였다.' },
    { sleepGood:'아기가 낮에 잠을 잘 잤습니다.', sleepBad:'아기가 낮잠을 잘 못 잤습니다.', stoolNormal:'아기 대변 상태가 괜찮았습니다.', stoolDifferent:'아기 대변 상태가 평소와 달랐습니다.', bath:'아기 목욕을 시켰습니다.', bf:'모유수유를 했습니다.', formula:'분유를 먹였습니다.' },
    { sleepGood:'아기 낮잠 잘 잠.', sleepBad:'아기 낮잠 잘 못 잠.', stoolNormal:'아기 대변 상태 괜찮음.', stoolDifferent:'아기 대변 상태 평소와 다름.', bath:'아기 목욕함.', bf:'모유수유함.', formula:'분유 먹임.' }
  ];

  function shortSuggestion(day) {
    const h = caseHash(typeof currentCase !== 'undefined' ? currentCase?.id : '');
    const v = formats[h % formats.length];
    const options = [];
    if (selected('sleep') === '잘잠') options.push(v.sleepGood);
    if (selected('sleep') === '잘못잠') options.push(v.sleepBad);
    if (selected('stool') === '정상변') options.push(v.stoolNormal);
    if (selected('stool') === '이상변') options.push(v.stoolDifferent);
    if (selected('bath') === '실시') options.push(v.bath);
    if (numberOf('bf') > 0) options.push(v.bf);
    if (numberOf('fc') > 0) options.push(v.formula);
    return options.length ? options[(h + Number(day || 0)) % options.length] : '';
  }

  window.bestmomNotesContentError = function bestmomNotesContentError(text, bfCount, fcCount) {
    const value = String(text || '');
    if (/(저녁|밤|새벽|야간|퇴근\s*후|밤중|야식)/.test(value)) {
      return '오전 9시~오후 5시 근무 중 직접 확인한 사항만 적어주세요. 저녁·밤 이야기는 제외해주세요.';
    }
    if (/(모유|직수|젖\s*물)/.test(value) && !(Number(bfCount) > 0)) {
      return '모유수유 횟수가 기록되지 않은 일차에는 모유수유 관련 내용을 작성하지 말아주세요.';
    }
    if (/분유/.test(value) && !(Number(fcCount) > 0)) {
      return '분유수유 횟수가 기록되지 않은 일차에는 분유수유 관련 내용을 작성하지 말아주세요.';
    }
    return '';
  };

  function ensureFiveDayOption() {
    const select = document.getElementById('days');
    if (!select) return;
    if ([...select.options].some(option => Number(option.value || option.textContent) === 5)) return;
    const option = document.createElement('option');
    option.value = '5';
    option.textContent = '5';
    select.insertBefore(option, select.firstChild);
  }
  const mainEl = document.getElementById('main');
  if (mainEl) {
    new MutationObserver(ensureFiveDayOption).observe(mainEl, { childList: true, subtree: true });
    ensureFiveDayOption();
  }

  window.openDay = async function caregiverNotesGuide(day, adminMode) {
    await originalOpenDay(day, adminMode);
    if (adminMode) return;
    const notes = document.getElementById('notes');
    const label = notes?.previousElementSibling;
    if (!notes || !label || label.tagName !== 'LABEL') return;
    label.innerHTML = '특이사항 <span style="font-weight:400;color:#6b7280;font-size:12px;line-height:1.5">오전 9시~오후 5시 근무 중 확인한 일만 짧고 쉽게 적어주세요. 저녁·밤 내용은 제외하고, 모유·분유수유는 해당 일차 수유 횟수가 확인된 경우에만 작성해주세요. 특이사항이 없다면 ‘이상없음’을 선택할 수 있습니다.</span>';

    const box = document.createElement('div');
    box.className = 'row mt';
    box.style.cssText = 'gap:8px;align-items:center;flex-wrap:wrap';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'secondary';
    button.textContent = '짧은 문구 추천';
    const hint = document.createElement('span');
    hint.className = 'muted tiny';
    hint.textContent = '선택한 돌봄 항목을 바탕으로 추천합니다. 실제 상황을 확인 후 사용하세요.';
    box.append(button, hint);
    notes.insertAdjacentElement('afterend', box);
    button.onclick = () => {
      if (notes.disabled || notes.readOnly) return alert('현재 이 기록은 수정할 수 없습니다.');
      const suggested = shortSuggestion(day);
      if (!suggested) return alert('수면·대변·목욕·수유 등 실제 확인한 항목을 먼저 선택해주세요.');
      if (notes.value.trim() && !window.confirm('현재 특이사항을 추천 문장으로 바꾸시겠습니까?')) return;
      notes.value = suggested;
      notes.dispatchEvent(new Event('input', {bubbles:true}));
      notes.focus();
    };
  };
})();