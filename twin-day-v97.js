(() => {
  if (window.__BESTMOM_TWIN_DAY_V101__) return;
  window.__BESTMOM_TWIN_DAY_V101__ = true;
  const previousOpenCase = window.openCase;
  const previousOpenDay = window.openDay;
  if (typeof previousOpenCase !== 'function' || typeof previousOpenDay !== 'function') return;

  function esc(value) {
    return String(value ?? '').replace(/[&<>"']/g,
      ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  }
  function twin() {
    return typeof currentCase !== 'undefined' && Number(currentCase?.baby_count) === 2
      ? currentCase : null;
  }
  function nameOf(data,number) {
    return String((number===1 ? data.baby_name : data.baby2_name) ||
      (number===1?'첫째 아기':'둘째 아기'));
  }
  function numberInput(id,label,v,disabled,step) {
    return '<div><label for="'+id+'">'+label+'</label><input id="'+id+
      '" type="number" inputmode="decimal" step="'+step+'" value="'+esc(v??'')+
      '" '+(disabled?'disabled':'')+'></div>';
  }
  function colorBox(number,name) {
    const first=number===1;
    const bg=first?'#dbeafe':'#ffedd5';
    const color=first?'#1d4ed8':'#c2410c';
    const border=first?'#93c5fd':'#fdba74';
    return '<span style="background:'+bg+';color:'+color+
      ';border:2px solid '+border+
      ';border-radius:9px;padding:8px 11px;font-size:14px;font-weight:900;">신생아 '+
      number+' · '+esc(name)+'</span>';
  }
  function decorateOverview() {
    const data=twin();
    if(!data) return;
    const main=document.getElementById('main');
    if(!main?.querySelector('.record-button'))return;
    const head=main.querySelector(':scope > .card > .row.space');
    if(!head||head.querySelector('[data-twin-overview]'))return;
    const box=document.createElement('div');
    box.dataset.twinOverview='1';
    box.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;width:100%;';
    box.innerHTML=colorBox(1,nameOf(data,1))+colorBox(2,nameOf(data,2));
    head.appendChild(box);
  }
  function decorateDay() {
    const data=twin();
    if(!data)return;
    const card=document.querySelector('#day > .card');
    const firstTemp=card?.querySelector('#temp');
    const notes=card?.querySelector('#other');
    if(!card||!firstTemp||!notes||card.querySelector('[data-twin-infants]'))return;
    const notesArea=notes.closest('.grid')||notes.parentElement?.parentElement;
    const heading=[...card.querySelectorAll('.section-title')]
      .find(e=>/신생아 상태|신생아 1/.test(e.textContent));
    if(!heading||!notesArea)return;
    const record=typeof currentRecord==='undefined' ? {} : (currentRecord||{});
    const saved=record.twin_baby2||{};
    const disabled=Boolean(record.locked && (typeof me==='undefined'||me?.role!=='admin'));
    if(!card.querySelector('[data-twin-baby-one]')){
      const panel=document.createElement('section');
      panel.dataset.twinBabyOne='1';
      panel.style.cssText='background:#eff6ff;border:3px solid #2563eb;border-radius:14px;margin:16px 0;padding:14px;';
      if(heading.parentElement===notesArea.parentElement){
        heading.before(panel);
        let node=heading,limit=0;
        while(node && node!==notesArea && limit++<45) {
          const next=node.nextSibling;
          panel.appendChild(node);
          node=next;
        }
      }else{
        heading.before(panel);
        panel.appendChild(heading);
      }
    }
    heading.textContent='신생아 1 · '+nameOf(data,1)+' (⑥~⑪)';
    heading.style.cssText='background:#1d4ed8;color:white;padding:13px 14px;border-radius:9px;font-size:19px;font-weight:900;margin:0 0 14px;';
    const panel2=document.createElement('section');
    panel2.dataset.twinInfants='1';
    panel2.style.cssText='background:#fff7ed;border:3px solid #ea580c;border-radius:14px;margin:16px 0;padding:14px;';
    panel2.innerHTML=
      '<div class="section-title" style="background:#c2410c;color:white;padding:13px 14px;border-radius:9px;font-size:19px;font-weight:900;margin:0 0 14px;">신생아 2 · '+
      esc(nameOf(data,2))+' (⑥~⑪)</div>'+
      '<div class="grid">'+
       numberInput('twin2Temp','⑥ 체온(℃)',saved.baby_temp,disabled,'0.1')+
       numberInput('twin2Bf','⑧ 모유수유 횟수',saved.breastfeed_count,disabled,'1')+'</div>'+
      '<p><b>⑦ 수면 양상</b></p>'+
      choiceGroup('twin2Sleep',['잘잠','잘못잠'],saved.sleep_status,false,disabled)+
      '<div class="grid">'+
       numberInput('twin2Fc','⑨ 분유수유 횟수',saved.formula_count,disabled,'1')+
       numberInput('twin2Ml','⑨ 회당 ml',saved.formula_ml,disabled,'1')+'</div>'+
      '<p><b>⑩ 배변양상</b></p>'+
      choiceGroup('twin2Stool',['정상변','이상변'],saved.stool_status,false,disabled)+
      '<p><b>⑪ 목욕·제대관리</b></p>'+
      choiceGroup('twin2Bath',['실시','미실시'],saved.bath_cord_status,false,disabled);
    notesArea.insertAdjacentElement('beforebegin',panel2);
  }
  function enhance() {
    if(!twin())return;
    decorateOverview();
    decorateDay();
  }
  window.openCase=async function twinOpenCase(id,adminMode){
    await previousOpenCase(id,adminMode);
    enhance();
  };
  window.openDay=async function twinOpenDay(day,adminMode){
    await previousOpenDay(day,adminMode);
    enhance();
  };
  // 화면을 그리는 다른 기능이 있어도 쌍생아 색상 구분을 복원한다.
  const main=document.getElementById('main');
  if(main&&typeof MutationObserver!=='undefined'){
    new MutationObserver(enhance).observe(main,{childList:true,subtree:true});
  }
  enhance();
})();