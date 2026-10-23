(() => {
  if (window.__BESTMOM_AUTO_UPDATE_V107__) return;
  window.__BESTMOM_AUTO_UPDATE_V107__ = true;

  // 모든 사용자(운영자 포함)의 기존 링크/자동로그인 상태에 적용.
  // 기록 작성 중인 화면을 강제로 닫거나 서명을 버리지 않도록 설계.
  const currentVersion = '20261023-app107';
  const currentNumber = Number(currentVersion.match(/app(\d+)/)?.[1] || 0);
  let checking = false, lastCheck = 0, pending = null, dirty = false, redirecting = false;

  const safeToReload = () => {
    if (document.querySelector('#day > .card')) return false;
    if (dirty) return false;
    const active = document.activeElement;
    if (active?.matches?.('input,textarea,select,[contenteditable=true]') &&
      !active.disabled) return false;
    return true;
  };
  document.addEventListener('input', (e) => {
    if (e.target?.matches?.('input,textarea,select,[contenteditable=true]')) dirty = true;
  }, true);
  document.addEventListener('change', (e) => {
    if (e.target?.matches?.('input,textarea,select,[contenteditable=true]')) dirty = true;
  }, true);

  // 화면을 아예 새로 그리면 앞선 입력값은 더 이상 남아 있지 않음.
  const main = document.getElementById('main');
  if (main && typeof MutationObserver === 'function') {
    let previousMainCard = main.firstElementChild;
    new MutationObserver(() => {
      const nextMainCard = main.firstElementChild;
      if (nextMainCard !== previousMainCard) {
        previousMainCard = nextMainCard;
        dirty = false;
      }
    }).observe(main, {childList:true});
  }

  function redirectToFresh(version) {
    if (redirecting) return;
    redirecting = true;
    const next = new URL(window.location.href);
    next.searchParams.set('v', version);
    next.searchParams.set('bestmom_fresh', String(Date.now()));
    window.location.replace(next.toString());
  }
  function showAvailable(version) {
    if (document.getElementById('bestmomUpdateAvailable')) return;
    const app = document.getElementById('appView');
    if (!app || app.classList.contains('hidden')) return;
    const panel = document.createElement('div');
    panel.id = 'bestmomUpdateAvailable';
    panel.style.cssText = 'display:flex;gap:10px;align-items:center;justify-content:space-between;flex-wrap:wrap;margin:8px 0 12px;padding:11px 12px;border:1px solid #93c5fd;border-radius:11px;background:#eff6ff;color:#1e3a8a;font-size:13px;font-weight:800;';
    panel.innerHTML =
      '<span>새 화면이 준비됐습니다. 작성 중인 기록을 저장한 뒤 적용해주세요.</span>'+
      '<button id="bestmomUpdateNow" type="button" class="primary" style="width:auto;min-height:38px;padding:7px 10px;font-size:13px;">최신 화면 적용</button>';
    const top = app.querySelector('.top');
    if (top) top.insertAdjacentElement('afterend',panel);
    else app.prepend(panel);
    panel.querySelector('#bestmomUpdateNow').onclick = () => {
      if (!safeToReload()) {
        const ok=window.confirm('아직 저장하지 않은 입력내용이 있으면 사라질 수 있습니다.\n기록과 서명을 저장했는지 확인하셨나요?');
        if (!ok) return;
      }
      redirectToFresh(version);
    };
  }
  async function checkLatest(force=false) {
    if (checking || document.visibilityState === 'hidden') return;
    const now = Date.now();
    if (!force && now-lastCheck<45000) return;
    checking=true;lastCheck=now;
    try {
      const check = new URL('./index.html', window.location.href);
      check.searchParams.set('bestmom_latest',String(now));
      const result=await fetch(check.toString(),{
        cache:'no-store',credentials:'same-origin'
      });
      if (!result.ok) return;
      const text=await result.text();
      const match=text.match(/const VER = ['"]([0-9]{8}-app[0-9]+)['"]/);
      if (!match) return;
      const remoteVersion=match[1];
      const remoteNumber=Number(remoteVersion.match(/app(\d+)/)?.[1] || 0);
      if (remoteNumber<=currentNumber) return;
      pending=remoteVersion;
      if (safeToReload()) redirectToFresh(remoteVersion);
      else showAvailable(remoteVersion);
    } catch(error) {
      console.warn('베스트맘 업데이트 확인 실패',error);
    } finally {checking=false;}
  }
  window.bestmomCheckLatestApp = () => checkLatest(true);
  window.addEventListener('pageshow', () => checkLatest());
  window.addEventListener('focus', () => checkLatest());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkLatest();
  });
  // 로그인 후 목록으로 돌아오면 대기 중인 최신 화면을 안전하게 적용.
  const observer = main && typeof MutationObserver === 'function' ?
    new MutationObserver(() => {
      if (pending && safeToReload()) redirectToFresh(pending);
    }) : null;
  observer?.observe(main, {childList:true});
})();