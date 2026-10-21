(() => {
  if (window.__BESTMOM_TWIN_DAY_V97__) return;
  window.__BESTMOM_TWIN_DAY_V97__ = true;

  const previousOpenCase = window.openCase;
  const previousOpenDay = window.openDay;
  if (typeof previousOpenCase !== 'function' || typeof previousOpenDay !== 'function') return;

  function numInput(id,label,value,disabled,extra='') {
    const v = value ?? '';
    return `<div><label>${label}</label><input id="${id}" type="number" inputmode="decimal" ${extra} value="${escapeHtml(v)}" ${disabled?'disabled':''}></div>`;
  }
  function babyName(caseData,first) {
    return first ? (caseData.baby_name || '첫째 아기') : (caseData.baby2_name || '둘째 아기');
  }

  window.openCase = async function twinNamedServiceOpenCase(id,adminMode) {
    await previousOpenCase(id,adminMode);
    if (Number(currentCase?.baby_count)!==2) return;
    const detail = document.querySelector('#main > .card .row.space .muted');
    if (detail) detail.textContent = '신생아 1: '+babyName(currentCase,true)+' · 신생아 2: '+babyName(currentCase,false)+' · 출생일 공통';
  };

  window.openDay = async function twinInfantDetailsDay(day,adminMode) {
    await previousOpenDay(day,adminMode);
    if (Number(currentCase?.baby_count)!==2) return;
    const dayArea=document.getElementById('day');
    const record=currentRecord || {};
    const saved=record.twin_baby2 || {};
    const disabled=Boolean(record.locked && !adminMode);
    const notesArea=dayArea?.querySelector('#other')?.closest('.grid');
    if (!notesArea || dayArea.querySelector('[data-twin-infants]')) return;

    const titles=[...dayArea.querySelectorAll('.section-title')];
    const newbornTitle=titles.find(el=>el.textContent.includes('신생아 상태'));
    if (!newbornTitle || newbornTitle.parentElement !== notesArea.parentElement) return;

    // 첫째는 파란색, 둘째는 주황색: 색상만이 아니라 명확한 번호와 이름으로도 구분.
    const firstPanel=document.createElement('section');
    firstPanel.dataset.twinBabyOne='1';
    firstPanel.style.cssText='margin:18px 0 14px;padding:14px;background:#eff6ff;border:2px solid #2563eb;border-radius:14px;';
    newbornTitle.before(firstPanel);
    let nextNode=newbornTitle;
    while(nextNode && nextNode!==notesArea){
      const following=nextNode.nextSibling;
      firstPanel.appendChild(nextNode);
      nextNode=following;
    }
    newbornTitle.textContent='신생아 1 · '+babyName(currentCase,true)+' (⑥~⑪)';
    newbornTitle.style.cssText='background:#1d4ed8;color:#fff;padding:12px 14px;font-size:18px;font-weight:900;border-radius:9px;margin:0 0 14px;';

    const area=document.createElement('section');
    area.dataset.twinInfants='1';
    area.style.cssText='margin:18px 0 14px;padding:14px;background:#fff7ed;border:2px solid #ea580c;border-radius:14px;';
    area.innerHTML=`
      <div class="section-title" style="background:#c2410c;color:#fff;padding:12px 14px;font-size:18px;font-weight:900;border-radius:9px;margin:0 0 14px;">신생아 2 · ${escapeHtml(babyName(currentCase,false))} (⑥~⑪)</div>
      <div class="grid">
        ${numInput('twin2Temp','⑥ 체온(℃)',saved.baby_temp,disabled,'step="0.1"')}
        ${numInput('twin2Bf','⑧ 모유수유 횟수',saved.breastfeed_count,disabled,'step="1"')}
      </div>
      <p><b>⑦ 수면 양상</b></p>
      ${choiceGroup('twin2Sleep',['잘잠','잘못잠'],saved.sleep_status,false,disabled)}
      <div class="grid">
        ${numInput('twin2Fc','⑨ 분유수유 횟수',saved.formula_count,disabled,'step="1"')}
        ${numInput('twin2Ml','⑨ 회당 ml',saved.formula_ml,disabled,'step="1"')}
      </div>
      <p><b>⑩ 배변양상</b></p>
      ${choiceGroup('twin2Stool',['정상변','이상변'],saved.stool_status,false,disabled)}
      <p><b>⑪ 목욕·제대관리</b></p>
      ${choiceGroup('twin2Bath',['실시','미실시'],saved.bath_cord_status,false,disabled)}
    `;
    notesArea.insertAdjacentElement('beforebegin',area);
  };
})();