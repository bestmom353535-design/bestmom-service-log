(() => {
  const PAGE_W = 595, PAGE_H = 842, SCALE = 2;
  const COLS = [143.6,226.8,305.6,386.6,467.6,559.0];
  const DATE_X = [161.414,242.464,322.314,403.314,489.814];
  const CHECK_X = [145.6,228.7,307.5,388.4,469.4];
  const ML_LABEL_X = [197.09,280.01,358.87,439.78,520.78];
  const CHECK_PNG = 'data:image/png;base64,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';
  const headerRects = {
    mother_name:[143.6,68.0,226.8,92.9], baby_name:[143.6,92.9,226.8,117.7], worker:[143.6,117.7,226.8,145.8],
    mother_birth:[305.6,68.0,386.6,92.9], baby_birth:[305.6,92.9,386.6,117.7], delivery:[467.6,68.0,559.0,92.9], birth_weight:[475.6,92.9,549.0,117.7]
  };
  const page1Checks = {
    incision:{'열상':176.64,'혈종':191.52,'불편감':206.64,'이상없음':221.52},
    breast:{'울혈':239.40,'통증':254.28,'이상없음':269.40}, urine:{'불편감':286.56,'이상없음':301.44}, sitz:{'실시':318.24,'미실시':333.12},
    sleep:{'잘잠':414.60,'잘못잠':428.88}, stool:{'정상변':513.00,'이상변':528.96}, bath:{'실시':545.28,'미실시':560.52}
  };
  const laterChecks = {...page1Checks, sleep:{'잘잠':409.80,'잘못잠':424.08}, stool:{'정상변':504.36,'이상변':519.60}, bath:{'실시':535.92,'미실시':551.16}};
  const fontFamily = 'Arial,"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';
  const imgCache = new Map();
  function loadImg(src){ if(!src) return Promise.resolve(null); if(imgCache.has(src)) return imgCache.get(src); const p=new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src});imgCache.set(src,p);return p; }
  function setFont(ctx,size,weight=400){ctx.font=`${weight} ${size}px ${fontFamily}`;ctx.fillStyle='#111';}
  function centerText(ctx,text,rect,size=9,weight=400){if(text===null||text===undefined||text==='')return;setFont(ctx,size,weight);ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(text),(rect[0]+rect[2])/2,(rect[1]+rect[3])/2,Math.max(1,rect[2]-rect[0]-6));}
  function baselineText(ctx,text,x,y,size=9,align='left'){if(text===null||text===undefined||text==='')return;setFont(ctx,size);ctx.textAlign=align;ctx.textBaseline='alphabetic';ctx.fillText(String(text),x,y);}
  function countText(v){return v===null||v===undefined||Number(v)===0?'':String(v)}
  function weightedLen(s){let n=0;for(const ch of String(s||''))n+=ch===' '?0.5:1;return n}
  function oneLine(ctx,text,rect){if(!text)return;let size=weightedLen(text)>=8?8.65:8.95, max=rect[2]-rect[0]-7.6;setFont(ctx,size);while(ctx.measureText(text).width>max&&size>6.2){size-=.25;setFont(ctx,size)}ctx.textAlign='left';ctx.textBaseline='middle';ctx.fillText(text,rect[0]+3.8,(rect[1]+rect[3])/2,max);}
  function notes(ctx,text,rect){if(!text)return;let size=9.65,line=size*1.15,max=rect[2]-rect[0]-8,y=rect[1]+4;setFont(ctx,size);ctx.textAlign='left';ctx.textBaseline='top';let lines=[],cur='';for(const ch of String(text)){let t=cur+ch;if(ctx.measureText(t).width>max&&cur){lines.push(cur);cur=ch}else cur=t}if(cur)lines.push(cur);for(const ln of lines){if(y+line>rect[3]-2)break;ctx.fillText(ln,rect[0]+4,y,max);y+=line}}
  async function drawCheck(ctx,img,col,y){ctx.drawImage(img,CHECK_X[col]+3.1,y+2.4,6.6,8.1)}
  async function drawSignature(ctx,src,rect){if(!src)return;try{const img=await loadImg(src),pad=4,maxW=rect[2]-rect[0]-pad*2,maxH=rect[3]-rect[1]-pad*2,s=Math.min(maxW/img.width,maxH/img.height),w=img.width*s,h=img.height*s;ctx.drawImage(img,rect[0]+(rect[2]-rect[0]-w)/2,rect[1]+(rect[3]-rect[1]-h)/2,w,h)}catch{}}
  async function overlayFor(caseData,records,pageIndex){
    const canvas=document.createElement('canvas');canvas.width=PAGE_W*SCALE;canvas.height=PAGE_H*SCALE;const ctx=canvas.getContext('2d');ctx.scale(SCALE,SCALE);ctx.clearRect(0,0,PAGE_W,PAGE_H);
    centerText(ctx,caseData.mother_name,headerRects.mother_name,9.3);centerText(ctx,fmt(caseData.mother_birth_date),headerRects.mother_birth,9.1);centerText(ctx,caseData.delivery_type,headerRects.delivery,9.1);
    centerText(ctx,caseData.baby_name,headerRects.baby_name,9.3);centerText(ctx,fmt(caseData.baby_birth_date),headerRects.baby_birth,9.1);centerText(ctx,caseData.birth_weight??'',headerRects.birth_weight,9.1);
    centerText(ctx,caseData.caregiver?.full_name||'',headerRects.worker,9.3);
    const checkImg=await loadImg(CHECK_PNG), isFirst=pageIndex===0, checks=isFirst?page1Checks:laterChecks;
    const pos=isFirst?{meal:360.0,snack:375.6,temp:399.0,bf:466.7,fc:493.4,ml:506.2,other:[577.32,614.64],notes:[615.36,678.0],sig:[679.06,715.66]}:{meal:359.5,snack:375.0,temp:396.8,bf:460.8,fc:484.4,ml:498.3,other:[567.96,605.28],notes:[606.0,668.64],sig:[669.70,706.30]};
    for(const r of records.filter(x=>Math.floor((x.service_day-1)/5)===pageIndex)){
      const col=(r.service_day-1)%5,left=COLS[col],right=COLS[col+1];baselineText(ctx,fmt(r.service_date),DATE_X[col],163.5,8.4);
      for(const v of r.incision_status||[])if(checks.incision[v]!=null)await drawCheck(ctx,checkImg,col,checks.incision[v]);
      for(const v of r.breast_status||[])if(checks.breast[v]!=null)await drawCheck(ctx,checkImg,col,checks.breast[v]);
      for(const v of r.urination_bowel_status||[])if(checks.urine[v]!=null)await drawCheck(ctx,checkImg,col,checks.urine[v]);
      if(r.sitz_bath&&checks.sitz[r.sitz_bath]!=null)await drawCheck(ctx,checkImg,col,checks.sitz[r.sitz_bath]);
      if(r.sleep_status&&checks.sleep[r.sleep_status]!=null)await drawCheck(ctx,checkImg,col,checks.sleep[r.sleep_status]);
      if(r.stool_status&&checks.stool[r.stool_status]!=null)await drawCheck(ctx,checkImg,col,checks.stool[r.stool_status]);
      if(r.bath_cord_status&&checks.bath[r.bath_cord_status]!=null)await drawCheck(ctx,checkImg,col,checks.bath[r.bath_cord_status]);
      baselineText(ctx,countText(r.meal_count),left+49.5,pos.meal,9);baselineText(ctx,countText(r.snack_count),left+49.5,pos.snack,9);baselineText(ctx,r.baby_temp??'',left+30,pos.temp,9);
      baselineText(ctx,countText(r.breastfeed_count),left+35.5,pos.bf,9);baselineText(ctx,countText(r.formula_count),left+39,pos.fc,9);baselineText(ctx,countText(r.formula_ml),ML_LABEL_X[col]-4,pos.ml,9,'right');
      oneLine(ctx,r.other_service,[left,pos.other[0],right,pos.other[1]]);notes(ctx,r.notes,[left,pos.notes[0],right,pos.notes[1]]);await drawSignature(ctx,r.signature_data,[left,pos.sig[0],right,pos.sig[1]]);
    }
    return canvas.toDataURL('image/png');
  }
  window.makePdf = async function(id){
    let preview=null;try{preview=window.open('','_blank');if(preview)preview.document.body.innerHTML='<p style="font-family:sans-serif;padding:20px">제공기록지 PDF 생성 중입니다...</p>';
      const [{data:c,error:ce},{data:r,error:re},{data:b,error:be}]=await Promise.all([
        sb.from('service_cases').select('*,caregiver:profiles!service_cases_caregiver_id_fkey(full_name)').eq('id',id).single(),
        sb.from('daily_records').select('*').eq('case_id',id).order('service_day'),
        sb.storage.from('pdf-templates').download('bestmom_blank_template.pdf')
      ]);
      if(ce)throw ce;if(re)throw re;if(be)throw new Error('PDF 원본을 먼저 등록해주세요.');
      const doc=await PDFLib.PDFDocument.load(await b.arrayBuffer()),need=Math.ceil(c.service_days/5);while(doc.getPageCount()>need)doc.removePage(doc.getPageCount()-1);
      for(let i=0;i<need;i++){const png=await doc.embedPng(await overlayFor(c,r||[],i));doc.getPage(i).drawImage(png,{x:0,y:0,width:PAGE_W,height:PAGE_H});}
      const out=await doc.save(),blob=new Blob([out],{type:'application/pdf'}),url=URL.createObjectURL(blob);if(preview)preview.location.href=url;else{const a=document.createElement('a');a.href=url;a.target='_blank';a.click()}setTimeout(()=>URL.revokeObjectURL(url),120000);
    }catch(e){if(preview)preview.close();msg(e?.message||'PDF 생성 중 오류가 발생했습니다.');}
  };
})();
