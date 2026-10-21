const SUPABASE_URL = 'https://chbxwvsetyvzhxdfmzdj.supabase.co';
const SUPABASE_KEY = 'sb_publishable_zeMXKunsZoAv2t6i7zdIpg_n2dcwYW4';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let me = null;
let currentCase = null;
let currentRecord = null;
let signatureDirty = false;

const $ = (id) => document.getElementById(id);
const main = () => $('main');
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (ch) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[ch]));
const todayKST = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit'
}).format(new Date());
const alertMsg = (text) => window.alert(text);

function setLoginMessage(text) {
  const el = $('loginMsg');
  if (el) el.textContent = text || '';
}

window.addEventListener('unhandledrejection', (e) => {
  console.error(e.reason);
  if (!$('loginView')?.classList.contains('hidden')) setLoginMessage('오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
});

async function login() {
  const raw = $('loginId').value.trim();
  const password = $('loginPw').value;
  if (!raw || !password) {
    setLoginMessage('아이디와 비밀번호를 입력해주세요.');
    return;
  }
  const email = raw.includes('@') ? raw : `${raw.toLowerCase()}@bestmom.invalid`;
  setLoginMessage('로그인 중...');
  try {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      setLoginMessage('아이디 또는 비밀번호를 확인해주세요.');
      return;
    }
    await boot(data.session);
  } catch (err) {
    console.error(err);
    setLoginMessage('로그인 연결 중 오류가 발생했습니다.');
  }
}

async function boot(session) {
  const { data: profile, error } = await sb.from('profiles').select('*').eq('id', session.user.id).single();
  if (error || !profile) {
    await sb.auth.signOut();
    setLoginMessage('사용자 정보를 불러오지 못했습니다.');
    return;
  }
  if (!profile.active) {
    await sb.auth.signOut();
    setLoginMessage('사용할 수 없는 계정입니다.');
    return;
  }

  me = profile;
  $('loginView').classList.add('hidden');
  $('appView').classList.remove('hidden');
  $('who').textContent = `${profile.full_name || ''} · ${profile.role === 'admin' ? '운영자' : '관리사'}`;

  if (profile.role === 'admin') {
    $('adminNav').classList.remove('hidden');
    showAdminTab('cases');
  } else {
    $('adminNav').classList.add('hidden');
    await caregiverHome();
  }
}

async function logout() {
  await sb.auth.signOut();
  location.reload();
}

function showAdminTab(tabName) {
  document.querySelectorAll('[data-tab]').forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tabName);
  });
  if (tabName === 'cases') adminCases();
  if (tabName === 'caregivers') adminCaregivers();
  if (tabName === 'template') templatePage();
}

async function getCaregivers() {
  const { data, error } = await sb
    .from('profiles')
    .select('id,full_name,login_id,active')
    .eq('role', 'caregiver')
    .order('full_name');
  if (error) throw error;
  return data || [];
}

async function invokeCaregiverAdmin(body) {
  const { data, error } = await sb.functions.invoke('admin-caregiver', { body });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

async function adminCaregivers() {
  try {
    const list = await getCaregivers();
    // 실제 관리사 계정으로 저장/서명한 마지막 시각 기준으로 정렬한다.
    // 저장 활동이 전혀 없는 관리사는 마지막으로 보낸다.
    const { data: recentSaves, error: recentError } = await sb
      .rpc('admin_caregiver_last_record_saves');
    if (recentError) throw recentError;
    const lastSaveByCaregiver = new Map((recentSaves || [])
      .filter(row => row.caregiver_id && row.last_saved_at)
      .map(row => [row.caregiver_id, Date.parse(row.last_saved_at)]));
    list.sort((a, b) => {
      const left = lastSaveByCaregiver.get(a.id) || 0;
      const right = lastSaveByCaregiver.get(b.id) || 0;
      if (left !== right) return right - left;
      return String(a.full_name || '').localeCompare(String(b.full_name || ''), 'ko');
    });
    main().innerHTML = `
      <div class="card">
        <h3>관리사 등록</h3>
        <div class="grid3">
          <div><label>이름</label><input id="cgName" autocomplete="off" placeholder="예: 김영숙"></div>
          <div><label>로그인 아이디</label><input id="cgId" placeholder="영문/숫자 3자 이상" autocapitalize="none" autocomplete="off"></div>
          <div><label>초기 비밀번호</label><input id="cgPw" type="password" placeholder="8자 이상" autocomplete="new-password"></div>
        </div>
        <button id="cgAdd" class="primary mt">관리사 등록</button>
        <p class="muted">관리사 본인 이메일 인증은 필요 없습니다.</p>
      </div>
      <div class="card">
        <h3>등록된 관리사</h3>
        ${list.length ? list.map((x) => `
          <div class="case row space">
            <div><b>${escapeHtml(x.full_name)}</b><div class="muted">아이디: ${escapeHtml(x.login_id || '')}</div></div>
            <div class="row">
              <button class="secondary" onclick="resetCaregiverPassword('${escapeHtml(x.login_id || '')}')">비밀번호 재설정</button>
              <button class="${x.active ? 'danger' : 'ok'}" onclick="toggleCaregiver('${escapeHtml(x.login_id || '')}', ${!x.active})">${x.active ? '사용중지' : '다시사용'}</button>
            </div>
          </div>`).join('') : '<p class="muted">등록된 관리사가 없습니다.</p>'}
      </div>`;

    $('cgAdd').onclick = async () => {
      const fullName = $('cgName').value.trim();
      const loginId = $('cgId').value.trim();
      const password = $('cgPw').value;
      if (!fullName || !loginId || !password) return alertMsg('이름, 아이디, 비밀번호를 모두 입력해주세요.');
      try {
        await invokeCaregiverAdmin({ action: 'create', full_name: fullName, login_id: loginId, password });
        alertMsg('관리사를 등록했습니다.');
        await adminCaregivers();
      } catch (err) {
        console.error(err);
        alertMsg(`등록하지 못했습니다. ${err.message || ''}`);
      }
    };
  } catch (err) {
    console.error(err);
    main().innerHTML = '<div class="card"><p>관리사 목록을 불러오지 못했습니다.</p></div>';
  }
}

window.resetCaregiverPassword = async (loginId) => {
  const password = prompt('새 비밀번호를 입력해주세요. (8자 이상)');
  if (!password) return;
  try {
    await invokeCaregiverAdmin({ action: 'reset_password', login_id: loginId, password });
    alertMsg('비밀번호를 변경했습니다.');
  } catch (err) {
    alertMsg(`변경하지 못했습니다. ${err.message || ''}`);
  }
};

window.toggleCaregiver = async (loginId, active) => {
  try {
    await invokeCaregiverAdmin({ action: 'set_active', login_id: loginId, active });
    await adminCaregivers();
  } catch (err) {
    alertMsg(`변경하지 못했습니다. ${err.message || ''}`);
  }
};

async function adminCases() {
  try {
    const caregivers = await getCaregivers();
    // 서비스 현황은 진행 중인 서비스만 보여준다.
    // 완료/중도종료/최종완성 건은 기존 전용 목록에서 조회한다.
    const { data: cases, error } = await sb
      .from('service_cases')
      .select('*,caregiver:profiles!service_cases_caregiver_id_fkey(full_name)')
      .eq('status', 'active')
      .is('final_completed_at', null)
      .order('created_at', { ascending: false });
    if (error) throw error;

    const ids = (cases || []).map((x) => x.id);
    const counts = {};
    if (ids.length) {
      const { data: records } = await sb.from('daily_records').select('case_id,locked').in('case_id', ids);
      (records || []).forEach((row) => {
        if (row.locked) counts[row.case_id] = (counts[row.case_id] || 0) + 1;
      });
    }

    main().innerHTML = `
      <div class="card">
        <h3>새 서비스 등록</h3>
        <div class="grid3">
          <div><label>산모명</label><input id="mName"></div>
          <div><label>산모 생년월일</label><input id="mBirth" type="date"></div>
          <div><label>분만형태</label><select id="delivery"><option value="">선택</option><option>자연분만</option><option>제왕절개</option></select></div>
          <div><label>신생아 유형</label><select id="babyCount"><option value="1" selected>단태아</option><option value="2">쌍생아</option></select></div>
          <div><label id="baby1NameLabel">신생아명</label><input id="bName"></div>
          <div><label id="sharedBirthLabel">신생아 출생일</label><input id="bBirth" type="date"></div>
          <div><label id="baby1WeightLabel">출생체중(kg)</label><input id="weight" type="number" step="0.01" inputmode="decimal"></div>
          <div><label>관리사</label><select id="caseCg"><option value="">미지정</option>${caregivers.filter((x) => x.active).map((x) => `<option value="${x.id}">${escapeHtml(x.full_name)}</option>`).join('')}</select></div>
          <div><label>서비스 일수</label><select id="days"><option>10</option><option>15</option><option>20</option></select></div>
          <div><label>시작일</label><input id="start" type="date"></div>
        </div>
        <section id="registerTwinBabyTwo" style="display:none;background:#fff7ed;border:2px solid #ea580c;border-radius:12px;padding:14px;margin-top:14px;">
          <div style="background:#c2410c;color:white;padding:10px 12px;border-radius:8px;font-size:16px;font-weight:800;margin-bottom:12px">신생아 2 · 둘째 아기 정보</div>
          <div class="grid">
            <div><label for="bName2">둘째 아기 이름</label><input id="bName2" autocomplete="off" placeholder="둘째 이름 입력"></div>
            <div><label for="weight2">둘째 출생체중(kg)</label><input id="weight2" type="number" step="0.01" inputmode="decimal" placeholder="예: 2.5"></div>
          </div>
          <div class="muted tiny mt">출생일은 위의 '두 아기 공통 출생일'에 한 번만 입력하면 됩니다.</div>
        </section>
        <button id="addCase" class="primary mt">서비스 등록</button>
      </div>
      <div class="card">
        <h3>서비스 현황</h3>
        ${(cases || []).length ? (cases || []).map((c) => `
          <div class="case">
            <div class="row space">
              <div><b>${escapeHtml(c.mother_name)}</b><div class="muted">아기 ${escapeHtml(c.baby_name || '')}${Number(c.baby_count)===2 ? ' · 쌍생아' : ''} · 관리사 ${escapeHtml(c.caregiver?.full_name || c.caregiver_name_override || '미지정')} · ${c.service_days}일</div></div>
              <b>${counts[c.id] || 0}/${c.service_days}</b>
            </div>
            <div class="row mt">
              <button class="secondary" onclick="openCase('${c.id}', true)">기록 보기</button>
              <button class="secondary" onclick="makePdf('${c.id}')">제공기록지 PDF 보기</button>
            </div>
          </div>`).join('') : '<p class="muted">등록된 서비스가 없습니다.</p>'}
      </div>`;

    const updateBabyType = () => {
      const twin = $('babyCount')?.value === '2';
      // 둘째 정보는 등록 영역 아래에 크게 분리해 숨겨지는 문제를 방지한다.
      const secondBox = document.getElementById('registerTwinBabyTwo');
      if (secondBox) secondBox.style.display = twin ? 'block' : 'none';
      $('baby1NameLabel').textContent = twin ? '첫째 아기 이름' : '신생아명';
      $('baby1WeightLabel').textContent = twin ? '첫째 출생체중(kg)' : '출생체중(kg)';
      $('sharedBirthLabel').textContent = twin ? '두 아기 공통 출생일' : '신생아 출생일';
      const days = $('days');
      [...days.options].forEach(option => {
        if (Number(option.value || option.textContent) === 5) option.disabled = twin;
      });
      if (twin && Number(days.value) === 5) days.value = '10';
    };
    $('babyCount').addEventListener('change', updateBabyType);
    $('babyCount').addEventListener('input', updateBabyType);
    updateBabyType();

    $('addCase').onclick = async () => {
      if (!$('mName').value.trim()) return alertMsg('산모명을 입력해주세요.');
      const twin = $('babyCount')?.value === '2';
      if (twin && ![10,15,20].includes(Number($('days').value))) {
        return alertMsg('쌍생아는 2주·3주·4주 중에서 선택해주세요.');
      }
      const payload = {
        mother_name: $('mName').value.trim(),
        mother_birth_date: $('mBirth').value || null,
        delivery_type: $('delivery').value || null,
        baby_name: $('bName').value.trim() || null,
        baby_birth_date: $('bBirth').value || null,
        birth_weight: $('weight').value || null,
        baby_count: twin ? 2 : 1,
        baby2_name: twin ? ($('bName2').value.trim() || null) : null,
        baby2_birth_weight: twin ? ($('weight2').value || null) : null,
        caregiver_id: $('caseCg').value || null,
        caregiver_name_override: $('caseCg').value
          ? null
          : (document.getElementById('caseCgManual')?.value.trim() || null),
        service_days: Number($('days').value),
        start_date: $('start').value || null,
        status: 'active'
      };
      const { error: insertError } = await sb.from('service_cases').insert(payload);
      if (insertError) alertMsg(insertError.message);
      else await adminCases();
    };
  } catch (err) {
    console.error(err);
    main().innerHTML = '<div class="card"><p>서비스 목록을 불러오지 못했습니다.</p></div>';
  }
}

async function caregiverHome() {
  const { data: cases, error } = await sb
    .from('service_cases')
    .select('*')
    .eq('status', 'active')
    .order('start_date');
  if (error) {
    console.error(error);
    main().innerHTML = '<div class="card"><p>배정된 서비스를 불러오지 못했습니다.</p></div>';
    return;
  }

  main().innerHTML = `
    <div class="card">
      <h3>내 서비스</h3>
      ${(cases || []).length ? (cases || []).map((c) => `
        <div class="case row space">
          <div><b>${escapeHtml(c.mother_name)}</b><div class="muted">${escapeHtml(c.baby_name || '')} · ${c.service_days}일</div></div>
          <button class="primary" onclick="openCase('${c.id}', false)">기록 입력</button>
        </div>`).join('') : '<p class="muted">배정된 서비스가 없습니다.</p>'}
    </div>`;
}

window.openCase = async (id, adminMode) => {
  const { data: serviceCase, error } = await sb.from('service_cases').select('*').eq('id', id).single();
  if (error || !serviceCase) return alertMsg('서비스 정보를 불러오지 못했습니다.');
  currentCase = serviceCase;

  const { data: records } = await sb.from('daily_records').select('*').eq('case_id', id).order('service_day');
  const byDay = Object.fromEntries((records || []).map((row) => [row.service_day, row]));
  const buttons = [];
  for (let day = 1; day <= serviceCase.service_days; day += 1) {
    buttons.push(`<button class="record-button ${byDay[day]?.locked ? 'ok' : 'secondary'}" onclick="openDay(${day}, ${adminMode})">${day}일차${byDay[day]?.locked ? ' ✓' : ''}</button>`);
  }

  main().innerHTML = `
    <div class="card">
      <div class="row space">
        <div><h3>${escapeHtml(serviceCase.mother_name)} 산모</h3><div class="muted">${escapeHtml(serviceCase.baby_name || '')}</div></div>
        <button id="back" class="secondary">← 목록</button>
      </div>
      <div class="hr"></div>
      <div class="row">${buttons.join('')}</div>
      ${adminMode ? `<button class="secondary mt" onclick="makePdf('${id}')">제공기록지 PDF 보기</button>` : ''}
    </div>
    <div id="day"></div>`;

  $('back').onclick = () => adminMode ? adminCases() : caregiverHome();
};

function choiceGroup(name, options, value, multiple, disabled) {
  const selected = multiple ? (Array.isArray(value) ? value : []) : [value];
  return `<div class="choices">${options.map((option) => `
    <label><input type="${multiple ? 'checkbox' : 'radio'}" name="${name}" value="${option}" ${selected.includes(option) ? 'checked' : ''} ${disabled ? 'disabled' : ''}> <span>${option}</span></label>`).join('')}</div>`;
}

window.openDay = async (day, adminMode) => {
  const { data: record } = await sb
    .from('daily_records')
    .select('*')
    .eq('case_id', currentCase.id)
    .eq('service_day', day)
    .maybeSingle();

  currentRecord = record || {};
  const locked = Boolean(record?.locked);
  const disabled = locked && !adminMode;
  const dayEl = $('day');

  dayEl.innerHTML = `
    <div class="card ${locked ? 'locked' : ''}">
      <div class="row space"><h3>${day}일차 ${locked ? '· 서명완료' : ''}</h3>${adminMode && locked ? '<button id="unlock" class="danger">잠금해제</button>' : ''}</div>
      <label>서비스 날짜</label><input id="serviceDate" type="date" value="${record?.service_date || todayKST()}" ${disabled ? 'disabled' : ''}>

      <div class="section-title">산모 상태 · 관리 (①~⑤)</div>
      <p><b>① 회음절개부위(또는 수술부위)</b></p>${choiceGroup('inc', ['열상','혈종','불편감','이상없음'], record?.incision_status, true, disabled)}
      <p><b>② 유방상태</b></p>${choiceGroup('breast', ['울혈','통증','이상없음'], record?.breast_status, true, disabled)}
      <p><b>③ 배뇨/배변</b></p>${choiceGroup('urine', ['불편감','이상없음'], record?.urination_bowel_status, true, disabled)}
      <p><b>④ 좌욕</b></p>${choiceGroup('sitz', ['실시','미실시'], record?.sitz_bath, false, disabled)}
      <div class="grid"><div><label>⑤ 식사 횟수</label><input id="meal" type="number" inputmode="numeric" value="${record?.meal_count ?? ''}" ${disabled ? 'disabled' : ''}></div><div><label>⑤ 간식 횟수</label><input id="snack" type="number" inputmode="numeric" value="${record?.snack_count ?? ''}" ${disabled ? 'disabled' : ''}></div></div>

      <div class="section-title">신생아 상태 · 관리 (⑥~⑪)</div>
      <div class="grid"><div><label>⑥ 체온(℃)</label><input id="temp" type="number" inputmode="decimal" step="0.1" value="${record?.baby_temp ?? ''}" ${disabled ? 'disabled' : ''}></div><div><label>⑧ 모유수유 횟수</label><input id="bf" type="number" inputmode="numeric" value="${record?.breastfeed_count ?? ''}" ${disabled ? 'disabled' : ''}></div></div>
      <p><b>⑦ 수면 양상</b></p>${choiceGroup('sleep', ['잘잠','잘못잠'], record?.sleep_status, false, disabled)}
      <div class="grid"><div><label>⑨ 분유수유 횟수</label><input id="fc" type="number" inputmode="numeric" value="${record?.formula_count ?? ''}" ${disabled ? 'disabled' : ''}></div><div><label>⑨ 회당 ml</label><input id="fml" type="number" inputmode="numeric" value="${record?.formula_ml ?? ''}" ${disabled ? 'disabled' : ''}></div></div>
      <p><b>⑩ 배변양상</b></p>${choiceGroup('stool', ['정상변','이상변'], record?.stool_status, false, disabled)}
      <p><b>⑪ 목욕·제대관리</b></p>${choiceGroup('bath', ['실시','미실시'], record?.bath_cord_status, false, disabled)}

      <div class="grid"><div><label>기타서비스</label><textarea id="other" ${disabled ? 'disabled' : ''}>${escapeHtml(record?.other_service || '')}</textarea></div><div><label>특이사항</label><textarea id="notes" ${disabled ? 'disabled' : ''}>${escapeHtml(record?.notes || '')}</textarea></div></div>
      ${!disabled ? '<button id="save" class="primary full mt">기록 저장</button>' : '<div class="notice mt">서명 완료되어 수정할 수 없습니다.</div>'}
      ${!adminMode && !locked ? '<div class="hr"></div><h3>산모 확인서명</h3><canvas id="sig" class="sigbox"></canvas><div class="row mt"><button id="clear" class="secondary">지우기</button><button id="sign" class="primary">서명 완료 · 기록 잠금</button></div>' : ''}
      ${adminMode && record?.signature_data ? `<div class="hr"></div><h3>산모 확인서명</h3><img src="${record.signature_data}" style="max-width:100%;height:120px;object-fit:contain"></div>` : ''}
    </div>`;

  if ($('save')) $('save').onclick = () => saveDay(day, adminMode, false);
  if ($('sign')) {
    setupSignature();
    $('clear').onclick = clearSignature;
    $('sign').onclick = () => saveDay(day, false, true);
  }
  if ($('unlock')) {
    $('unlock').onclick = async () => {
      const { error } = await sb.from('daily_records').update({ locked: false }).eq('id', record.id);
      if (error) return alertMsg(error.message);
      await sb.from('record_audit').insert({
        record_id: record.id,
        case_id: currentCase.id,
        actor_id: me.id,
        action: 'admin_unlocked',
        details: { service_day: day }
      });
      await window.openCase(currentCase.id, true);
    };
  }
};

function checkedValues(name) {
  return [...document.querySelectorAll(`input[name="${name}"]:checked`)].map((el) => el.value);
}
function checkedOne(name) {
  return document.querySelector(`input[name="${name}"]:checked`)?.value || null;
}
function numberValue(id) {
  const raw = $(id).value;
  return raw === '' ? null : Number(raw);
}

async function saveDay(day, adminMode, signing) {
  const payload = {
    case_id: currentCase.id,
    service_day: day,
    service_date: $('serviceDate').value,
    incision_status: checkedValues('inc'),
    breast_status: checkedValues('breast'),
    urination_bowel_status: checkedValues('urine'),
    sitz_bath: checkedOne('sitz'),
    meal_count: numberValue('meal'),
    snack_count: numberValue('snack'),
    baby_temp: numberValue('temp'),
    sleep_status: checkedOne('sleep'),
    breastfeed_count: numberValue('bf'),
    formula_count: numberValue('fc'),
    formula_ml: numberValue('fml'),
    stool_status: checkedOne('stool'),
    bath_cord_status: checkedOne('bath'),
    other_service: $('other').value.trim() || null,
    notes: $('notes').value.trim() || null
  };

  // 쌍생아만 추가되는 입력 정보. 단태아 저장 데이터와 기존 처리 흐름은 그대로 유지.
  if (Number(currentCase?.baby_count) === 2) {
    const twinInput = (id) => document.getElementById(id);
    const twinNum = (id) => {
      const val = twinInput(id)?.value ?? '';
      return val === '' ? null : Number(val);
    };
    const twinChoice = (name) => document.querySelector('input[name="'+name+'"]:checked')?.value || null;
    payload.twin_baby2 = {
      baby_temp: twinNum('twin2Temp'),
      sleep_status: twinChoice('twin2Sleep'),
      breastfeed_count: twinNum('twin2Bf'),
      formula_count: twinNum('twin2Fc'),
      formula_ml: twinNum('twin2Ml'),
      stool_status: twinChoice('twin2Stool'),
      bath_cord_status: twinChoice('twin2Bath')
    };
  }

  if (signing) {
    if (!signatureDirty) return alertMsg('산모님 서명을 먼저 해주세요.');
    payload.signature_data = $('sig').toDataURL('image/png');
    payload.signed_at = new Date().toISOString();
    payload.signed_user_agent = navigator.userAgent;
    payload.caregiver_completed_at = new Date().toISOString();
    payload.locked = true;
  }

  let result;
  if (currentRecord.id) result = await sb.from('daily_records').update(payload).eq('id', currentRecord.id).select().single();
  else result = await sb.from('daily_records').insert(payload).select().single();

  if (result.error) return alertMsg(result.error.message);

  await sb.from('record_audit').insert({
    record_id: result.data.id,
    case_id: currentCase.id,
    actor_id: me.id,
    action: signing ? 'signed_locked' : 'saved',
    details: { service_day: day }
  });

  alertMsg(signing ? '서명이 저장되고 기록이 잠겼습니다.' : '저장했습니다.');
  await window.openCase(currentCase.id, adminMode);
}

function setupSignature() {
  const canvas = $('sig');
  const ctx = canvas.getContext('2d');
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
  ctx.scale(ratio, ratio);
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  let drawing = false;
  signatureDirty = false;

  const point = (event) => {
    const currentRect = canvas.getBoundingClientRect();
    return { x: event.clientX - currentRect.left, y: event.clientY - currentRect.top };
  };

  canvas.onpointerdown = (event) => {
    drawing = true;
    canvas.setPointerCapture(event.pointerId);
    const p = point(event);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };
  canvas.onpointermove = (event) => {
    if (!drawing) return;
    const p = point(event);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    signatureDirty = true;
  };
  canvas.onpointerup = () => { drawing = false; };
  canvas.onpointercancel = () => { drawing = false; };
}

function clearSignature() {
  const canvas = $('sig');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  signatureDirty = false;
}

async function templatePage() {
  const { data, error } = await sb.storage.from('pdf-templates').list('');
  const files = !error ? (data || []) : [];
  const exists = files.some((x) => x.name === 'bestmom_blank_template.pdf');
  const twinExists = files.some((x) => x.name === 'bestmom_twin_template.pdf');
  main().innerHTML = `
    <div class="card">
      <h3>제공기록지 원본 PDF · 단태아</h3>
      <p>현재 상태: <b>${exists ? '등록됨' : '미등록'}</b></p>
      <div class="notice">기존 단태아 원본 PDF입니다. 쌍생아 등록 시 변경할 필요 없습니다.</div>
      <input id="tpl" type="file" accept="application/pdf" class="mt">
      <button id="upload" class="primary mt">단태아 원본 등록</button>
    </div>
    <div class="card">
      <h3>쌍생아 제공기록지 원본 PDF</h3>
      <p>현재 상태: <b>${twinExists ? '등록됨' : '미등록'}</b></p>
      <div class="notice">쌍생아용 5일짜리 PDF 원본을 등록하면 2주 2장, 3주 3장, 4주 4장으로 자동 출력됩니다.</div>
      <input id="tplTwin" type="file" accept="application/pdf" class="mt">
      <button id="uploadTwin" class="primary mt">쌍생아 원본 등록</button>
    </div>`;

  async function uploadTemplate(inputId,path) {
    const file=$(inputId)?.files?.[0];
    if(!file)return alertMsg('PDF 파일을 선택해주세요.');
    if(file.type && file.type !== 'application/pdf')return alertMsg('PDF 파일만 등록할 수 있습니다.');
    const { error: uploadError } = await sb.storage.from('pdf-templates')
      .upload(path,file,{upsert:true,contentType:'application/pdf'});
    if(uploadError)alertMsg(uploadError.message);
    else {alertMsg('PDF 원본을 등록했습니다.');await templatePage();}
  }
  $('upload').onclick=()=>uploadTemplate('tpl','bestmom_blank_template.pdf');
  $('uploadTwin').onclick=()=>uploadTemplate('tplTwin','bestmom_twin_template.pdf');
}

$('loginBtn').onclick = login;
$('loginPw').addEventListener('keydown', (event) => { if (event.key === 'Enter') login(); });
$('logoutBtn').onclick = logout;
document.querySelectorAll('[data-tab]').forEach((button) => {
  button.onclick = () => showAdminTab(button.dataset.tab);
});

sb.auth.getSession().then(({ data }) => {
  if (data.session) boot(data.session);
});
