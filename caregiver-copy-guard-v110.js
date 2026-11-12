(() => {
  if (window.__bestmomCaregiverCopyGuard110) return;
  window.__bestmomCaregiverCopyGuard110 = true;

  function caregiverScreenActive() {
    const app = document.getElementById('appView');
    return Boolean(app && !app.classList.contains('hidden') &&
      typeof me !== 'undefined' && me?.role === 'caregiver');
  }
  function shouldBlock(event) {
    if (!caregiverScreenActive()) return false;
    const target = event.target instanceof Element ? event.target : event.target?.parentElement;
    if (!target) return false;
    return !target.closest('#loginView');
  }
  const css = document.createElement('style');
  css.id='bestmomCaregiverCopyGuardStyle';
  css.textContent=`
    body.bm-caregiver-screen, body.bm-caregiver-screen #appView,
    body.bm-caregiver-screen #appView * {
      -webkit-user-select: none !important;
      user-select: none !important;
      -webkit-touch-callout: none !important;
    }
    body.bm-caregiver-screen input,
    body.bm-caregiver-screen textarea,
    body.bm-caregiver-screen [contenteditable] {
      -webkit-touch-callout: none !important;
    }
    body.bm-caregiver-screen #loginView,
    body.bm-caregiver-screen #loginView * {
      -webkit-user-select: auto !important;
      user-select: auto !important;
      -webkit-touch-callout: default !important;
    }
  `;
  document.head.appendChild(css);
  function syncRole() {
    document.body.classList.toggle('bm-caregiver-screen',caregiverScreenActive());
  }
  const app=document.getElementById('appView');
  if(app) {
    const observer = new MutationObserver(syncRole);
    observer.observe(app,{attributes:true,attributeFilter:['class']});
  }
  ['contextmenu','selectstart','copy','cut','paste','dragstart'].forEach(type => {
    document.addEventListener(type, (event) => {
      if(!shouldBlock(event)) return;
      event.preventDefault();
      if(type==='copy'||type==='cut'||type==='paste'){
        event.stopImmediatePropagation();
      }
      if(type==='selectstart'){
        try { window.getSelection()?.removeAllRanges(); } catch (_) {}
      }
    },true);
  });
  document.addEventListener('visibilitychange',syncRole);
  syncRole();
})();