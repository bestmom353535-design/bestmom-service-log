(() => {
  if (window.__BESTMOM_TWIN_PDF_V97__) return;
  window.__BESTMOM_TWIN_PDF_V97__=true;

  const W=595, H=841, S=2;
  const X=[169.8,247.5,325.2,402.9,480.6];
  const family='"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",Arial,sans-serif';
  function dateShort(s) { const m=String(s||'').match(/^(\d{4})-(\d{2})-(\d{2})/);return m ? m[1].slice(2)+'.'+m[2]+'.'+m[3] : ''; }
  function stampDate(s){const m=String(s||'').match(/^\d{4}-(\d{2})-(\d{2})/);return m?Number(m[1])+'/'+Number(m[2]):'';}
  function text(ctx,v,x,y,size=8,max=74,align='center',color='#111'){
    if(v===null||v===undefined||v==='')return;
    ctx.save();ctx.textAlign=align;ctx.textBaseline='middle';
    ctx.font='600 '+size+'px '+family;ctx.fillStyle=color;
    // 기존 PDF-8의 미결제사유 글자 보정이 이 캔버스 하단에도 적용되므로
    // 쌍생아 특이사항의 좌표는 그만큼 역보정한다.
    const adjustedY=(y>730&&y<790)?y+11.4:y;
    ctx.fillText(String(v),x,adjustedY,max);ctx.restore();
  }
  function whiteText(ctx,v,x,y,size=8,max=74,width=58,height=14){
    ctx.fillStyle='#fff';ctx.fillRect(x-width/2,y-height/2,width,height);
    text(ctx,v,x,y,size,max);
  }
  function check(ctx,x,y){
    ctx.save();ctx.strokeStyle='#111';ctx.lineWidth=1.65;ctx.lineCap='round';ctx.beginPath();
    ctx.moveTo(x,y);ctx.lineTo(x+2.0,y+2.1);ctx.lineTo(x+6,y-3.3);ctx.stroke();ctx.restore();
  }
  function maybeCheck(ctx,value,choices,x,ys){
    const selected=Array.isArray(value)?value:[value];
    choices.forEach((item,i)=>{if(selected.includes(item))check(ctx,x,ys[i]);});
  }
  function noteLines(ctx,textValue,maxWidth=62,maxLines=4){
    const parts=String(textValue||'').split('\n');const lines=[];
    ctx.font='600 6.7px '+family;
    for(const part of parts){
      let line='';
      for(const ch of part){
        if(ctx.measureText(line+ch).width>maxWidth&&line){
          lines.push(line);line=ch;
          if(lines.length>=maxLines)return lines;
        }else line+=ch;
      }
      if(line){lines.push(line);if(lines.length>=maxLines)return lines;}
    }
    return lines;
  }
  function changeStamp(ctx,cx,cy){
    ctx.save();ctx.strokeStyle='#ed1c24';ctx.fillStyle='#ed1c24';ctx.lineWidth=1.15;
    ctx.beginPath();ctx.arc(cx,cy,7.1,0,Math.PI*2);ctx.stroke();
    ctx.font='bold 4.4px '+family;ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText('베스',cx,cy-2.2+11.4,12);ctx.fillText('트맘',cx,cy+2.2+11.4,12);
    ctx.restore();
  }
  function named(caseData,n){
    return n===1?caseData.baby_name||'':caseData.baby2_name||'';
  }
  function rowForBaby(record,index){
    if(index===1)return {
      baby_temp:record.baby_temp,sleep_status:record.sleep_status,
      breastfeed_count:record.breastfeed_count,formula_count:record.formula_count,
      formula_ml:record.formula_ml,stool_status:record.stool_status,
      stool_color:record.twin_baby1_stool_color,bath_cord_status:record.bath_cord_status
    };
    return record.twin_baby2||{};
  }
  function drawInfant(ctx,baby,xIndex,index){
    const start=X[xIndex], second=index===2;
    if(baby.baby_temp!==null&&baby.baby_temp!==undefined)
      text(ctx,baby.baby_temp,start+43,second?569.4:385.9,8,23);
    maybeCheck(ctx,baby.sleep_status,['잘잠','잘못잠'],start+4.5,
      second?[595.5,605.9]:[412,422.7]);
    text(ctx,baby.breastfeed_count,start+51,second?626.5:443.1,8,19);
    text(ctx,baby.formula_count,start+52,second?650:470.2,8,18);
    text(ctx,baby.formula_ml,start+43,second?661.3:483.2,7.7,22);
    maybeCheck(ctx,baby.stool_status,['정상변','이상변'],start+4.5,
      second?[676.8,687.3]:[502.6,513.4]);
    if(baby.stool_color)text(ctx,baby.stool_color,start+46,second?697.8:524.1,6.2,44);
    maybeCheck(ctx,baby.bath_cord_status,['실시','미실시'],start+4.5,
      second?[711.7,721.7]:[538.2,548.6]);
  }
  function drawMother(ctx,r,i){
    const x=X[i];
    maybeCheck(ctx,r.incision_status,['열상','혈종','불편감','이상없음'],x+4.5,[196.3,207.1,218.3,229]);
    maybeCheck(ctx,r.breast_status,['울혈','통증','이상없음'],x+4.5,[244.8,255.4,266.3]);
    maybeCheck(ctx,r.urination_bowel_status,['불편감','이상없음'],x+4.5,[289.0,299.5]);
    maybeCheck(ctx,r.sitz_bath,['실시','미실시'],x+4.5,[320.5,331]);
    text(ctx,r.meal_count,x+51,352.8,8.7,20);
    text(ctx,r.snack_count,x+51,363.1,8.7,20);
  }
  async function imageForSignature(uri){
    if(!uri)return null;
    const img=new Image();
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(new Error('산모 서명 이미지를 읽을 수 없습니다.'));img.src=uri;});
    return img;
  }
  function formatKst(value){
    if(!value)return '';
    const t=new Date(value);
    if(Number.isNaN(t.getTime()))return '';
    const y=t.getTime()+9*60*60*1000;
    return new Date(y).toISOString().slice(0,10);
  }
  function buildNames(caseData,rows,history,manual){
    const overrides=new Map((manual||[]).map(a=>[String(a.service_date||''),a.caregiver_name]));
    const events=(history||[])
      .filter(h=>h.next_name)
      .map(h=>({name:h.next_name,date:h.effective_date||formatKst(h.created_at)}))
      .filter(e=>e.date).sort((a,b)=>a.date.localeCompare(b.date));
    const firstWriter=rows.find(r=>r.record_writer?.role==='caregiver');
    let lastName=(history||[]).find(h=>h.previous_name)?.previous_name ||
      firstWriter?.record_writer?.full_name ||
      caseData.caregiver?.full_name || caseData.caregiver_name_override || '';
    let i=0;
    const changes=[];
    const names=[];
    rows.forEach((row,index)=>{
      while(i<events.length&&events[i].date<=row.service_date){
        lastName=events[i++].name;
      }
      const selected=overrides.get(row.service_date) ||
        (row.record_writer?.role==='caregiver' ? row.record_writer.full_name : '') ||
        row.verified_personnel_name || lastName;
      const prior=names[index-1];
      if(index&&prior&&selected&&prior!==selected)changes.push({
        service_day:row.service_day,previous:prior,next:selected,date:row.service_date
      });
      names.push(selected||lastName);
      lastName=selected||lastName;
    });
    return {names,changes,initial:names[0]||lastName};
  }
  async function pageOverlay(caseData,rows,pageIndex,timeline){
    const canvas=document.createElement('canvas');canvas.width=W*S;canvas.height=H*S;
    const ctx=canvas.getContext('2d',{alpha:true});
    if(!ctx)throw new Error('PDF 그림판을 시작할 수 없습니다.');
    ctx.scale(S,S);
    text(ctx,caseData.mother_name,171,76,10,82);
    whiteText(ctx,String(caseData.mother_birth_date||'').replace(/-/g,'.'),323,76,8,85,88,19);
    maybeCheck(ctx,caseData.delivery_type,['자연분만','제왕절개'],453,[73,85]);
    text(ctx,named(caseData,1),171,102.7,8,70);
    text(ctx,named(caseData,2),171,116.8,8,70);
    whiteText(ctx,String(caseData.baby_birth_date||'').replace(/-/g,'.'),323,106,8,85,88,19);
    text(ctx,caseData.birth_weight,512,100,8.2,27);
    text(ctx,caseData.baby2_birth_weight,512,114,8.2,27);
    const changesOnPage=timeline.changes.filter(c=>Math.floor((c.service_day-1)/5)===pageIndex);
    const firstDay=pageIndex*5;
    const header=changesOnPage.length
      ? changesOnPage.map(c=>c.previous+'→'+c.next+'('+stampDate(c.date)+')').join(', ')
      : (timeline.names[firstDay]||timeline.names.at(-1)||caseData.caregiver?.full_name||caseData.caregiver_name_override||'');
    text(ctx,header,323,139,changesOnPage.length?7:9,100);

    for(const row of rows.filter(r=>Math.floor((r.service_day-1)/5)===pageIndex)){
      const col=(row.service_day-1)%5,start=X[col];
      whiteText(ctx,dateShort(row.service_date),start+38.4,176.3,8.3,70,76,15);
      if(!row.is_missing_day) {
        drawMother(ctx,row,col);
        drawInfant(ctx,rowForBaby(row,1),col,1);
        drawInfant(ctx,rowForBaby(row,2),col,2);
      }
      const dayChanges=timeline.changes.filter(c=>c.service_day===row.service_day);
      const noteChanges=dayChanges.map(c=>stampDate(c.date)+' 제공인력 '+c.next+'으로 변경');
      const written=[row.other_service,row.notes].filter(Boolean).join(' ');
      const isManualChange=/(?:제공인력|관리사).{0,30}(?:변경|교체)|(?:변경|교체).{0,30}(?:제공인력|관리사)/.test(written);
      const stamp=!!dayChanges.length||isManualChange;
      const str=[...noteChanges,written].filter(Boolean).join('\n');
      const lines=noteLines(ctx,str,stamp?54:67,4);
      lines.forEach((line,j)=>text(ctx,line,start+3,742+j*7.5,6.8,stamp?54:67,'left'));
      if(stamp)changeStamp(ctx,start+69,760);
      if(row.signature_data){
        const img=await imageForSignature(row.signature_data);
        const ratio=Math.min(69/img.width,22/img.height);
        const dw=img.width*ratio,dh=img.height*ratio;
        ctx.drawImage(img,start+(76-dw)/2,776+(24-dh)/2,dw,dh);
      }
    }
    return new Uint8Array(await new Promise(resolve=>canvas.toBlob(async blob=>resolve(await blob.arrayBuffer()),'image/png')));
  }
  window.makeTwinPdf=async function makeTwinPdf(caseData,preview){
    const setStatus=(v)=>{const el=document.getElementById('runtimeStatus');if(el)el.textContent='쌍생아 PDF · '+v;};
    setStatus('기록 불러오는 중');
    const [recordsResult,historyResult,manualResult,missingResult] = await Promise.all([
      sb.from('daily_records')
        .select('*,record_writer:profiles!daily_records_created_by_fkey(full_name,role)')
        .eq('case_id',caseData.id).order('service_day'),
      sb.from('caregiver_change_history')
        .select('previous_name,next_name,effective_date,created_at')
        .eq('case_id',caseData.id).order('created_at'),
      sb.from('caregiver_day_assignments')
        .select('service_day,service_date,caregiver_name').eq('case_id',caseData.id),
      sb.from('caregiver_missing_days')
        .select('service_date,caregiver_name').eq('case_id',caseData.id)
    ]);
    for(const result of [recordsResult,historyResult,manualResult,missingResult])if(result.error)throw result.error;
    const original=recordsResult.data||[];
    const recordedDates=new Set(original.map(r=>String(r.service_date)));
    const rows=[...original,...(missingResult.data||[])
      .filter(m=>!recordedDates.has(m.service_date))
      .map(m=>({service_date:m.service_date,is_missing_day:true,verified_personnel_name:m.caregiver_name}))
    ].filter(r=>r.service_date)
     .sort((a,b)=>String(a.service_date).localeCompare(String(b.service_date)))
     .map((r,i)=>({...r,service_day:i+1}));
    const manual=(manualResult.data||[]).map(m=>{
      const date=m.service_date||original.find(r=>Number(r.service_day)===Number(m.service_day))?.service_date;
      return {...m,service_date:date};
    }).filter(m=>m.service_date);
    const timeline=buildNames(caseData,rows,historyResult.data||[],[
      ...manual,...(missingResult.data||[]).map(m=>({service_date:m.service_date,caregiver_name:m.caregiver_name}))
    ]);
    setStatus('원본 다운로드 중');
    const {data:templateBlob,error:templateError}=await sb.storage.from('pdf-templates').download('bestmom_twin_template.pdf');
    if(templateError||!templateBlob)throw new Error('쌍생아 전용 PDF 원본이 아직 등록되지 않았습니다. 운영자 화면의 PDF 원본 메뉴에서 쌍생아 양식을 먼저 등록해주세요.');
    const bytes=await templateBlob.arrayBuffer();
    if(!bytes.byteLength)throw new Error('쌍생아 PDF 원본 파일이 비어 있습니다.');
    const template=await PDFLib.PDFDocument.load(bytes,{ignoreEncryption:true});
    if(template.getPageCount()!==1)throw new Error('쌍생아 PDF 원본은 5일짜리 한 페이지 양식이어야 합니다.');
    const count=caseData.final_completed_at
      ? Math.max(1,Math.ceil(rows.length/5))
      : Math.ceil(Number(caseData.service_days||10)/5);
    if(![2,3,4].includes(count)&&!caseData.final_completed_at)
      throw new Error('쌍생아는 2주, 3주, 4주 서비스를 지원합니다.');
    const doc=await PDFLib.PDFDocument.create();
    const pages=await doc.copyPages(template,Array.from({length:count},()=>0));
    pages.forEach(p=>doc.addPage(p));
    for(let i=0;i<count;i++){
      setStatus((i+1)+'/'+count+'페이지 작성 중');
      const overlay=await pageOverlay(caseData,rows,i,timeline);
      const png=await doc.embedPng(overlay);
      doc.getPage(i).drawImage(png,{x:0,y:0,width:W,height:H});
    }
    const pdfBytes=await doc.save({useObjectStreams:false});
    const url=URL.createObjectURL(new Blob([pdfBytes],{type:'application/pdf'}));
    if(preview&&!preview.closed)preview.location.replace(url);
    else {
      const a=document.createElement('a');a.href=url;a.target='_blank';a.rel='noopener';
      a.download=(caseData.mother_name||'산모')+'_쌍생아제공기록지.pdf';
      document.body.appendChild(a);a.click();a.remove();
    }
    setTimeout(()=>URL.revokeObjectURL(url),120000);
    setStatus('완료');
  };
})();