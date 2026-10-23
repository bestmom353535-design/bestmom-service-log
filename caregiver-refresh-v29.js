(() => {
  let busy = false;

  async function refreshCaregiverHome(button) {
    if (busy || typeof me === 'undefined' || me?.role !== 'caregiver') return;

    const dayCard = document.querySelector('#day > .card');
    if (dayCard) {
      const ok = window.confirm('작성 중인 내용이 저장되지 않았다면 사라질 수 있습니다.\n\n새로고침하시겠습니까?');
      if (!ok) return;
    }

    busy = true;
    const originalText = button?.textContent || '새로고침';
    if (button) {
      button.disabled = true;
      button.textContent = '불러오는 중...';
    }

    try {
      // 명단만 다시 그리던 기존 동작 대신 앱 전체를 다시 불러옵니다.
      // 주소는 기존과 동일하며, 캐시 우회 파라미터만 내부적으로 추가합니다.
      // 브라우저 자동로그인 세션 및 기록 데이터는 변경하지 않습니다.
      const url = new URL(window.location.href);
      url.searchParams.set('bestmom_fresh', String(Date.now()));
      window.location.replace(url.toString());
    } catch (err) {
      console.error(err);
      alertMsg(`새로고침하지 못했습니다. ${err?.message || ''}`);
    } finally {
      busy = false;
      if (button && document.body.contains(button)) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  }

  function ensureRefreshButton() {
    if (typeof me === 'undefined' || me?.role !== 'caregiver') return;
    const appView = document.getElementById('appView');
    if (!appView || appView.classList.contains('hidden')) return;
    if (document.getElementById('caregiverRefreshBtn')) return;

    const logout = document.getElementById('logoutBtn');
    if (!logout?.parentElement) return;

    let controls = document.getElementById('caregiverTopControls');
    if (!controls) {
      controls = document.createElement('div');
      controls.id = 'caregiverTopControls';
      controls.className = 'row';
      controls.style.flexWrap = 'nowrap';
      logout.parentElement.insertBefore(controls, logout);
      controls.appendChild(logout);
    }

    const button = document.createElement('button');
    button.id = 'caregiverRefreshBtn';
    button.type = 'button';
    button.className = 'secondary';
    button.textContent = '새로고침';
    button.onclick = () => refreshCaregiverHome(button);
    controls.insertBefore(button, logout);
  }

  function start() {
    const appView = document.getElementById('appView');
    const who = document.getElementById('who');
    if (appView) new MutationObserver(ensureRefreshButton).observe(appView, { attributes: true, attributeFilter: ['class'] });
    if (who) new MutationObserver(ensureRefreshButton).observe(who, { childList: true, subtree: true });
    ensureRefreshButton();
    setTimeout(ensureRefreshButton, 150);
    setTimeout(ensureRefreshButton, 600);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
