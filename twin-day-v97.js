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
  function colorBox(number,name,isCaregiver,existingName) {
    const first=number===1;
    const bg=first?'#dbeafe':'#ffedd5';
    const color=first?'#1d4ed8':'#c2410c';
    const border=first?'#93c5fd':'#fdba74';
    const entry='<span style="font-size:14px;font-weight:900;color:'+color+'">신생아 '+
      number+' · '+esc(name)+'</span>';
    const button=isCaregiver ?
      '<button type="button" data-twin-edit="'+number+'" class="secondary" '+
      'style="min-height:32px;padding:5px 10px;border:1px solid '+border+
      ';border-radius:7px;font-size:12px;font-weight:800;">수정</button>' : '';
    const editForm=isCaregiver ?
      '<div data-twin-form="'+number+'" style="display:none;margin-top:10px;">'+
      '<label for="twinNameInput'+number+'" style="font-weight:700;font-size:12px;">신생아 '+number+' 이름</label>'+
      '<input id="twinNameInput'+number+'" data-twin-input="'+number+'" type="text" '+
      'maxlength="30" autocomplete="off" placeholder="이름 입력" value="'+esc(existingName)+'">'+
      '<div style="display:flex;gap:7px;margin-top:7px;">'+
      '<button type="button" data-twin-save="'+number+'" class="primary" '+
      'style="width:auto;padding:6px 13px;min-height:34px;">저장</button>'+
      '<button type="button" data-twin-cancel="'+number+'" class="secondary" '+
      'style="width:auto;padding:6px 13px;min-height:34px;">취소</button></div></div>' : '';
    return '<div data-twin-entry="'+number+'" style="background:'+bg+';border:2px solid '+
      border+';border-radius:10px;padding:9px 11px;min-width:200px;flex:1 1 190px;">'+
      '<div style="display:flex;gap:9px;align-items:center;justify-content:space-between;flex-wrap:wrap;">'+
      entry+button+'</div>'+editForm+'</div>';
  }
  function decorateOverview() {
    const data=twin();
    if(!data) return;
    const main=document.getElementById('main');
    if(!main?.querySelector('.record-button'))return;
    const head=main.querySelector(':scope > .card > .row.space');
    if(!head||head.querySelector('[data-twin-overview]'))return;
    const isCaregiver=typeof me!=='undefined'&&me?.role==='caregiver';
    const box=document.createElement('div');
    box.dataset.twinOverview='1';
    box.style.cssText='display:flex;gap:8px;flex-wrap:wrap;margin-top:10px;width:100%;';
    box.innerHTML=colorBox(1,nameOf(data,1),isCaregiver,data.baby_name||'')+
      colorBox(2,nameOf(data,2),isCaregiver,data.baby2_name||'');
    head.appendChild(box);
    if(!isCaregiver)return;

    const toggle=(number,opened)=>{
      const form=box.querySelector('[data-twin-form="'+number+'"]');
      if(!form)return;
      form.style.display=opened?'block':'none';
      if(opened)form.querySelector('input')?.focus();
    };
    box.querySelectorAll('[data-twin-edit]').forEach(button=>{
      button.onclick=()=>toggle(Number(button.dataset.twinEdit),true);
    });
    box.querySelectorAll('[data-twin-cancel]').forEach(button=>{
      button.onclick=()=>toggle(Number(button.dataset.twinCancel),false);
    });
    box.querySelectorAll('[data-twin-save]').forEach(button=>{
      button.onclick=async()=>{
        const number=Number(button.dataset.twinSave);
        const input=box.querySelector('[data-twin-input="'+number+'"]');
        const value=input?.value.trim()||'';
        if(!value||value.length>30){
          alertMsg('아기 이름을 1~30자 이내로 입력해주세요.');
          input?.focus();
          return;
        }
        const original=number===1?data.baby_name:data.baby2_name;
        if(value===String(original||'').trim()){
          toggle(number,false);
          return;
        }
        button.disabled=true;
        try{
          const {data:savedName,error}=await sb.rpc('caregiver_update_twin_baby_name',{
            p_case_id:data.id,p_baby_number:number,p_baby_name:value
          });
          if(error)throw error;
          if(savedName!==value)throw new Error('저장한 이름이 확인되지 않았습니다.');
          // 아기 이름만 저장한 뒤 최신 서비스 정보로 화면을 다시 불러온다.
          alertMsg('신생아 '+number+' 이름을 저장했습니다.');
          await window.openCase(data.id,false);
        }catch(err){
          console.error('쌍생아 이름 수정 실패',err);
          alertMsg('이름 저장 실패: '+(err?.message||'알 수 없는 오류'));
        }finally{
          if(document.body.contains(button))button.disabled=false;
        }
      };
    });
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