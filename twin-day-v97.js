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
    if (newbornTitle) newbornTitle.textContent='신생아 1 · '+babyName(currentCase,true)+' (⑥~⑪)';

    const baby1Color = document.createElement('div');
    baby1Color.innerHTML=`<label for="baby1StoolColor">⑩ 신생아 1 배변 색깔·특징 (선택)</label>
      <input id="baby1StoolColor" type="text" maxlength="80" value="${escapeHtml(record.twin_baby1_stool_color || '')}" ${disabled?'disabled':''}>`;
    notesArea.insertAdjacentElement('beforebegin',baby1Color);

    const area=document.createElement('div');
    area.dataset.twinInfants='1';
    area.innerHTML=`
      <div class="section-title">신생아 2 · ${escapeHtml(babyName(currentCase,false))} (⑥~⑪)</div>
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
      <div><label for="twin2StoolColor">⑩ 배변 색깔·특징 (선택)</label>
        <input id="twin2StoolColor" maxlength="80" value="${escapeHtml(saved.stool_color || '')}" ${disabled?'disabled':''}></div>
      <p><b>⑪ 목욕·제대관리</b></p>
      ${choiceGroup('twin2Bath',['실시','미실시'],saved.bath_cord_status,false,disabled)}
    `;
    notesArea.insertAdjacentElement('beforebegin',area);
  };
})();