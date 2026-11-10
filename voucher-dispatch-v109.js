(() => {
  if (window.__BESTMOM_VOUCHER_DISPATCH_V109__) return;
  window.__BESTMOM_VOUCHER_DISPATCH_V109__ = true;

  const $ = (id) => document.getElementById(id);
  const escape = (v) => String(v ?? "").replace(/[&<>"']/g, x => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[x]));
  const kstDate = () => new Intl.DateTimeFormat('en-CA', {
    timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'
  }).format(new Date());
  const nameKey = (v) => String(v||'').replace(/\s/g,'').toLowerCase();
  let date = kstDate();
  let reservationRows = [], serviceRows = [], caregiverRows = [], loaded = false, busy = false;
  const selectStatus = (record) => {
    if (record.linked) return {text:'관리사 배정완료',className:'ok'};
    if (record.conflict) return {text:'기존 기록 확인',className:'warn'};
    if (record.sameDate) return {text:'기존 기록 연결',className:'warn'};
    return {text:'제공기록지 발송예정',className:'pending'};
  };
  async function loadData() {
    const [r,c,g]=await Promise.all([
      sb.from('reservation_applications').select('id,mother_name,mother_birth_date,phone,due_date,actual_birth_date,confirmed_start_date,service_weeks,service_address,income_group,status,assigned_caregiver_id,assigned_caregiver_name,hidden_from_admin').eq('income_group','under').eq('status','confirmed').not('confirmed_start_date','is',null).order('confirmed_start_date',{ascending:false}),
      sb.from('service_cases').select('id,mother_name,start_date,service_days,caregiver_id,reservation_application_id,caregiver_name_override'),
      sb.from('profiles').select('id,full_name,login_id,active').eq('role','caregiver').order('full_name')
    ]);
    for(const response of [r,c,g]) if(response.error) throw response.error;
    reservationRows=r.data||[];serviceRows=c.data||[];caregiverRows=(g.data||[]).filter(x=>x.active);
    loaded=true;
  }
  function classify(r) {
    const linked=serviceRows.find(s=>s.reservation_application_id===r.id);
    const otherByName=serviceRows.filter(s=>!s.reservation_application_id && nameKey(s.mother_name)===nameKey(r.mother_name));
    const sameDate=otherByName.find(s=>s.start_date===r.confirmed_start_date);
    const start=new Date(r.confirmed_start_date+'T00:00:00Z');
    const nearby=otherByName.filter(s=>{
      const t=new Date(String(s.start_date||'')+'T00:00:00Z');
      return !Number.isNaN(t.valueOf()) && Math.abs(t-start)<=30*86400000;
    });
    const conflict=!linked && (nearby.length>1 || (nearby.length===1 && !sameDate) ||
      (sameDate && Number(sameDate.service_days)!==Number(r.service_weeks)*5));
    return {linked,sameDate,conflict};
  }
  function setMessage(text, bad=false){
    const el=$('voucherDispatchMsg');if(!el)return;
    el.textContent=text;el.style.color=bad?'#aa3939':'#2c674b';
  }
  function render(){
    const host=$('main');if(!host)return;
    const rows=reservationRows.filter(r=>r.confirmed_start_date===date&&!r.hidden_from_admin);
    const waiting=rows.filter(r=>!classify(r).linked).length;
    host.innerHTML=`
      <section class="card" id="voucherDispatch">
        <div class="row space" style="gap:10px">
          <h3 style="margin:0">제공기록지 발송예정</h3>
          <button type="button" class="secondary" id="voucherDispatchReload" style="width:auto;min-height:36px">새로고침</button>
        </div>
        <div class="row mt" style="gap:12px">
          <label style="margin:0;flex:1;min-width:175px">서비스 시작일
            <input id="voucherDispatchDate" type="date" value="${escape(date)}" style="margin-top:5px">
          </label>
          <div class="muted" style="flex:1;min-width:145px;align-self:end">바우처 ${rows.length}명 · 배정 전 ${waiting}명</div>
        </div>
        <div id="voucherDispatchMsg" class="muted mt" role="status"></div>
        <div id="voucherDispatchList">
          ${rows.length?rows.map(r=>{
            const found=classify(r),state=selectStatus(found);
            const caseRow=found.linked||found.sameDate;
            const assigned=caseRow?.caregiver_id||r.assigned_caregiver_id||'';
            const other=caregiverRows.find(g=>g.id===assigned);
            const selectedName=other?.full_name||r.assigned_caregiver_name||'';
            const options='<option value="">관리사 선택</option>'+caregiverRows.map(g=>`<option value="${escape(g.id)}" ${g.id===assigned?'selected':''}>${escape(g.full_name)} (${escape(g.login_id||'')})</option>`).join('');
            const workDate=caseRow?.start_date&&caseRow.start_date!==r.confirmed_start_date?
              `<small class="muted" style="display:block;color:#a35b39">기존 기록 시작일: ${escape(caseRow.start_date)}</small>`:'';
            const disabled=found.conflict?'disabled':'';
            const caption=found.linked?'기록지 열기':found.conflict?'기존 기록 확인':found.sameDate?'기존 기록 연결':'관리사 매칭·기록지 등록';
            return `<div class="case" data-reservation-id="${escape(r.id)}" style="margin-top:10px">
                <div class="row space" style="align-items:flex-start">
                  <div style="min-width:0">
                    <b>${escape(r.mother_name)}</b> <span class="pill" style="font-size:11px">${escape(state.text)}</span>
                    <div class="muted">${escape(r.confirmed_start_date)} · ${Number(r.service_weeks)||'-'}주 (${(Number(r.service_weeks)||0)*5||'-'}일)</div>
                    ${workDate}
                    <div class="muted" style="margin-top:4px;overflow-wrap:anywhere">${escape(r.service_address||'')}</div>
                  </div>
                </div>
                <div class="row mt" style="gap:8px">
                  <select data-voucher-caregiver="${escape(r.id)}" aria-label="${escape(r.mother_name)} 담당 관리사" style="flex:2;min-width:165px" ${disabled}>${options}</select>
                  <button type="button" class="primary" data-voucher-assign="${escape(r.id)}" style="width:auto;flex:1;min-width:112px" ${disabled}>${caption}</button>
                </div>
                ${found.linked && selectedName?`<div class="muted tiny" style="margin-top:5px">담당 제공인력: ${escape(selectedName)} · 관리사 앱에서 기록 작성 가능</div>`:''}
                ${found.conflict?'<div class="notice mt">같은 이름의 기존 제공기록지가 인접 날짜에 있습니다. 중복 등록 방지를 위해 서비스 현황에서 먼저 확인해 주세요.</div>':''}
              </div>`;
          }).join(''):'<div class="notice mt">해당 날짜에 시작하는 바우처 확정예약이 없습니다.</div>'}
        </div>
      </section>`;
    $('voucherDispatchDate').addEventListener('change',async e=>{date=e.target.value;render()});
    $('voucherDispatchReload').onclick=async()=>{try{setMessage('조회 중...');await loadData();render()}catch(e){setMessage('불러오지 못했습니다: '+e.message,true)}};
    host.querySelectorAll('[data-voucher-assign]').forEach(b=>{
      b.onclick=async()=>{
        if(busy)return;
        const reservationId=b.dataset.voucherAssign;
        const r=reservationRows.find(x=>x.id===reservationId);
        const found=classify(r);
        if(found.linked){
          if(typeof window.openCase==='function') return window.openCase(found.linked.id,true);
          return window.showAdminTab('cases');
        }
        const cg=host.querySelector('[data-voucher-caregiver="'+reservationId+'"]')?.value;
        if(!cg)return window.alert('담당 관리사를 선택해 주세요.');
        if(found.conflict)return window.alert('기존 기록을 먼저 확인해 주세요.');
        if(!window.confirm(r.mother_name+' 산모님 제공기록지를 선택한 관리사에게 배정하시겠습니까?'))return;
        busy=true;b.disabled=true;
        try{
          const {data,error}=await sb.rpc('bestmom_prepare_voucher_service_log',{
            p_reservation_id:reservationId,p_caregiver_id:cg
          });
          if(error)throw error;
          await loadData();render();
          setMessage(r.mother_name+' 산모님 담당 관리사를 배정했습니다. 관리사님이 제공기록지 앱에서 확인할 수 있습니다.');
        }catch(e){
          b.disabled=false;
          setMessage('배정 실패: '+(e?.message||'관리자에게 확인해 주세요.'),true);
        }finally{busy=false}
      };
    });
  }
  async function openDispatch() {
    if(typeof me==='undefined' || me?.role!=='admin') return;
    document.querySelectorAll('#adminNav [data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab==='dispatch'));
    $('main').innerHTML='<div class="card"><h3>제공기록지 발송예정</h3><div class="muted">불러오는 중...</div></div>';
    try{await loadData();render()}
    catch(e){$('main').innerHTML='<div class="card"><h3>제공기록지 발송예정</h3><p class="notice">조회 실패: '+escape(e.message)+'</p><button type="button" id="voucherDispatchRetry" class="secondary">다시 시도</button></div>';$('voucherDispatchRetry').onclick=openDispatch}
  }
  const previous=window.showAdminTab;
  window.showAdminTab=function(tab){
    if(tab==='dispatch')return openDispatch();
    return typeof previous==='function'?previous(tab):undefined;
  };
  const btn=document.querySelector('#adminNav [data-tab="dispatch"]');
  if(btn)btn.onclick=()=>window.showAdminTab('dispatch');
})();