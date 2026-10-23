(() => {
  if (window.__BESTMOM_CAREGIVER_CALENDAR_V103__) return;
  window.__BESTMOM_CAREGIVER_CALENDAR_V103__=true;

  const oldOpenCase=window.openCase;
  const oldOpenDay=window.openDay;
  if(typeof oldOpenCase!=='function'||typeof oldOpenDay!=='function')return;
  const weekdays=['일','월','화','수','목','금','토'];
  const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const validIso=s=>{
    if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;
    const date=new Date(s+'T00:00:00Z');
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10)===s;
  };
  const asUtc=s=>new Date(s+'T00:00:00Z');
  const dayLabel=s=>{
    if(!validIso(s))return '날짜 확인 필요';
    return s.replace(/-/g,'.')+'. ('+weekdays[asUtc(s).getUTCDay()]+')';
  };
  const isCaregiver=()=>typeof me!=='undefined' && me?.role==='caregiver';
  const currentService=()=>typeof currentCase!=='undefined'?currentCase:null;

  function monthParts(year,month){
    const first=new Date(Date.UTC(year,month-1,1));
    return {year:first.getUTCFullYear(),month:first.getUTCMonth()+1};
  }
  function dateFor(year,month,day){
    return new Date(Date.UTC(year,month-1,day)).toISOString().slice(0,10);
  }
  async function calendarForCurrentCase(id){
    if(!isCaregiver())return;
    const service=currentService();
    const main=document.getElementById('main');
    if(!service||service.id!==id||!main)return;
    const buttons=[...main.querySelectorAll('.record-button')];
    if(!buttons.length)return;
    const {data,error}=await sb.from('daily_records')
      .select('service_day,service_date,locked')
      .eq('case_id',id).order('service_day');
    if(error){console.warn('근무 달력 불러오기 실패',error);return;}
    if(currentService()?.id!==id||main.querySelector('#day > .card'))return;
    const records=(data||[]).filter(r=>validIso(r.service_date));
    const daysByDate=new Map(records.map(r=>[r.service_date,r]));
    const lastDate=records.length?records[records.length-1].service_date:null;
    const today=(typeof todayKST==='function'?todayKST():new Date(Date.now()+9*3600000).toISOString().slice(0,10));
    const monthBase=validIso(service.start_date)?service.start_date:(lastDate||today);
    let shown=monthParts(Number(monthBase.slice(0,4)),Number(monthBase.slice(5,7)));

    main.querySelector('[data-caregiver-calendar]')?.remove();
    const panel=document.createElement('section');
    panel.dataset.caregiverCalendar='1';
    panel.style.cssText='margin-top:18px;padding:14px 10px;border:1.5px solid #cbd5e1;background:#f8fafc;border-radius:14px;min-width:0;max-width:100%;';
    const dayRow=buttons[0].parentElement;
    if(!dayRow)return;
    dayRow.insertAdjacentElement('afterend',panel);

    const countSigned=(data||[]).filter(r=>r.locked).length;
    const countSaved=(data||[]).filter(r=>!r.locked).length;
    const total=Number(service.service_days)||buttons.length;
    const heading=esc('근무일 확인 달력');
    function draw(){
      if(!panel.isConnected)return;
      const {year,month}=shown;
      const offset=new Date(Date.UTC(year,month-1,1)).getUTCDay();
      const lastDay=new Date(Date.UTC(year,month,0)).getUTCDate();
      let dates='';
      for(let index=0;index<offset;index++)dates+='<div aria-hidden="true"></div>';
      for(let day=1;day<=lastDay;day++){
        const iso=dateFor(year,month,day);
        const record=daysByDate.get(iso);
        const signed=Boolean(record?.locked);
        const saved=Boolean(record&&!signed);
        const ink=signed?'#166534':saved?'#1d4ed8':indexOfWeekday(year,month,day)===0?'#dc2626':'#334155';
        const bg=signed?'#dcfce7':saved?'#dbeafe':'transparent';
        const border=signed?'2px solid #22c55e':saved?'2px solid #93c5fd':'2px solid transparent';
        const title=record
          ? ((record.service_day||'')+'일차 '+(signed?'서명완료':'기록저장'))
          : '기록 없음';
        dates+='<div title="'+esc(title)+'" style="min-width:0;display:flex;flex-direction:column;align-items:center;gap:1px;">'+
          '<span style="width:34px;height:34px;max-width:100%;border-radius:50%;display:flex;align-items:center;justify-content:center;'+
          'font-size:13px;font-weight:900;color:'+ink+';background:'+bg+';border:'+border+';">'+
          (signed?'✓':String(day))+'</span>'+
          '<span style="font-size:9px;min-height:12px;font-weight:700;color:'+ink+';">'+
          (signed?day+'일':saved?'저장':'&nbsp;')+'</span></div>';
      }
      panel.innerHTML=
        '<div style="font-size:16px;font-weight:900;margin:0 0 4px;">'+heading+'</div>'+
        '<div style="font-size:12px;color:#475569;line-height:1.6;">기록·서명 상태를 실제 저장한 날짜에 표시합니다. 빠진 근무일이 없는지 확인해주세요.</div>'+
        '<div style="display:flex;align-items:center;justify-content:space-between;gap:7px;margin:10px 0 12px;">'+
          '<button type="button" data-calendar-prev class="secondary" aria-label="이전 달" style="width:42px;min-height:36px;padding:5px 8px;">‹</button>'+
          '<b style="font-size:16px;">'+year+'년 '+month+'월</b>'+
          '<button type="button" data-calendar-next class="secondary" aria-label="다음 달" style="width:42px;min-height:36px;padding:5px 8px;">›</button>'+
        '</div>'+
        '<div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px;text-align:center;min-width:0;">'+
          weekdays.map((x,i)=>'<span style="font-size:12px;font-weight:800;color:'+(i===0?'#dc2626':i===6?'#2563eb':'#64748b')+';">'+x+'</span>').join('')+
          dates+
        '</div>'+
        '<div style="display:flex;gap:9px;flex-wrap:wrap;font-size:11px;margin-top:10px;color:#374151;">'+
          '<span>🟢 ✓ 서명 완료 '+countSigned+'일</span>'+
          '<span>🔵 기록만 저장 '+countSaved+'일</span>'+
          '<span>⚪ 미작성 '+Math.max(0,total-countSigned-countSaved)+'일</span></div>';
      panel.querySelector('[data-calendar-prev]').onclick=()=>{
        shown=monthParts(year,month-1);draw();
      };
      panel.querySelector('[data-calendar-next]').onclick=()=>{
        shown=monthParts(year,month+1);draw();
      };
    }
    function indexOfWeekday(year,month,day){
      return new Date(Date.UTC(year,month-1,day)).getUTCDay();
    }
    draw();
  }

  function decorateDateInput(day){
    if(!isCaregiver())return;
    const service=currentService();
    const card=document.querySelector('#day > .card');
    const input=card?.querySelector('#serviceDate');
    if(!service||!card||!input||card.querySelector('[data-service-date-editor]'))return;
    const oldLabel=input.previousElementSibling;
    const wrapper=document.createElement('section');
    wrapper.dataset.serviceDateEditor='1';
    wrapper.style.cssText='box-sizing:border-box;min-width:0;max-width:100%;width:100%;overflow:hidden;padding:12px;border-radius:12px;background:#f1f5f9;border:1px solid #cbd5e1;margin:8px 0 12px;';
    const formatted=document.createElement('div');
    formatted.style.cssText='font-size:16px;font-weight:900;color:#0f172a;margin-bottom:8px;line-height:1.5;overflow-wrap:anywhere;';
    formatted.textContent='서비스 날짜 · '+dayLabel(input.value);
    if(oldLabel?.tagName==='LABEL'){
      oldLabel.before(wrapper);
      oldLabel.textContent='실제 근무 날짜';
      wrapper.appendChild(formatted);
      wrapper.appendChild(oldLabel);
    }else{
      input.before(wrapper);
      wrapper.appendChild(formatted);
    }
    wrapper.appendChild(input);
    // iOS Safari date input의 고정된 최소 너비로 카드 밖까지 튀어나오는 현상 방지.
    input.style.cssText='box-sizing:border-box;width:100%;max-width:100%;min-width:0;display:block;flex:1 1 auto;font-size:16px;padding:9px 8px;';
    const oldDate=typeof currentRecord==='undefined'?null:(currentRecord?.service_date||null);
    const recordId=typeof currentRecord==='undefined'?null:currentRecord?.id;
    const wasLocked=Boolean(typeof currentRecord!=='undefined'&&currentRecord?.locked);
    if(recordId)input.disabled=false;
    const updateDisplay=()=>{formatted.textContent='서비스 날짜 · '+dayLabel(input.value);};
    input.addEventListener('input',updateDisplay);
    input.addEventListener('change',updateDisplay);

    if(recordId){
      const btn=document.createElement('button');
      btn.type='button';btn.className='secondary';
      btn.dataset.saveServiceDate='1';
      btn.textContent='날짜만 수정·저장';
      btn.style.cssText='min-height:42px;width:100%;margin-top:9px;background:#e2e8f0;color:#0f172a;font-weight:900;';
      wrapper.appendChild(btn);
      const help=document.createElement('div');
      help.style.cssText='font-size:12px;color:#475569;line-height:1.5;margin-top:6px;';
      help.textContent=wasLocked
        ? '서명 완료된 기록도 날짜만 수정할 수 있습니다. 기존 서명과 입력내용은 유지됩니다.'
        : '날짜만 바꾸려면 위 버튼으로 저장하세요. 다른 항목 수정은 아래 기록 저장을 이용하세요.';
      wrapper.appendChild(help);
      btn.onclick=async()=>{
        const next=input.value;
        if(!validIso(next))return alertMsg('올바른 서비스 날짜를 선택해주세요.');
        if(next===oldDate)return alertMsg('변경된 날짜가 없습니다.');
        const notice=wasLocked
          ? day+'일차 서명완료 기록의 날짜를\n'+dayLabel(oldDate)+' → '+dayLabel(next)+
            '\n로 변경할까요?\n기존 서명과 기록내용은 그대로 유지됩니다.'
          : day+'일차 근무 날짜를\n'+dayLabel(oldDate)+' → '+dayLabel(next)+'\n로 변경할까요?';
        if(!window.confirm(notice))return;
        btn.disabled=true;
        try{
          const {data,error}=await sb.rpc('caregiver_update_service_record_date',{
            p_case_id:service.id,p_service_day:Number(day),
            p_new_date:next,p_expected_date:oldDate
          });
          if(error)throw error;
          if(data!==next)throw new Error('변경한 날짜를 확인하지 못했습니다.');
          alertMsg('근무 날짜를 변경했습니다. 기록과 서명은 그대로 유지됩니다.');
          await window.openCase(service.id,false);
          await window.openDay(Number(day),false);
        }catch(e){
          console.error('근무일 날짜 수정 오류',e);
          alertMsg('날짜 변경 실패: '+(e.message||e));
          btn.disabled=false;
        }
      };
    }else{
      const hint=document.createElement('div');
      hint.style.cssText='font-size:12px;color:#64748b;margin-top:7px;';
      hint.textContent='첫 입력일은 아래 ‘기록 저장’ 또는 ‘서명 저장하고 완료’로 저장됩니다.';
      wrapper.appendChild(hint);
    }
  }

  function decorateSingleInfant(){
    if(!isCaregiver()||Number(currentService()?.baby_count)===2)return;
    const card=document.querySelector('#day > .card');
    if(!card||card.querySelector('[data-single-baby-yellow]'))return;
    const headings=[...card.querySelectorAll('.section-title')];
    const heading=headings.find(x=>x.textContent.includes('신생아 상태'));
    const notes=card.querySelector('#other');
    if(!heading||!notes)return;
    const notesArea=notes.closest('.grid');
    if(!notesArea)return;
    const panel=document.createElement('section');
    panel.dataset.singleBabyYellow='1';
    panel.style.cssText='background:#fefce8;border:2px solid #eab308;border-radius:13px;padding:13px;margin:17px 0 14px;';
    if(heading.parentElement===notesArea.parentElement){
      heading.before(panel);
      let node=heading,limit=0;
      while(node && node!==notesArea && limit++<45){
        const next=node.nextSibling;
        panel.appendChild(node);
        node=next;
      }
    }else{
      heading.before(panel);
      panel.appendChild(heading);
    }
    heading.style.cssText='background:#ca8a04;color:#fff;font-size:18px;font-weight:900;padding:12px 13px;border-radius:9px;margin:0 0 13px;';
  }

  window.openCase=async function caregiverCalendarCase(caseId,adminMode){
    await oldOpenCase(caseId,adminMode);
    if(adminMode||!isCaregiver())return;
    await calendarForCurrentCase(caseId);
  };
  window.openDay=async function caregiverCalendarDay(day,adminMode){
    if(!adminMode&&isCaregiver()){
      document.querySelector('[data-caregiver-calendar]')?.remove();
    }
    await oldOpenDay(day,adminMode);
    if(adminMode||!isCaregiver())return;
    decorateDateInput(day);
    decorateSingleInfant();
  };
})();