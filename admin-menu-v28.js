(() => {
  const originalAdminCases = window.adminCases;
  const originalAdminCaregivers = window.adminCaregivers;
  const originalTemplatePage = window.templatePage;

  if (typeof originalAdminCases !== 'function') return;

  function setActiveTab(tabName) {
    document.querySelectorAll('#adminNav [data-tab]').forEach((button) => {
      button.classList.toggle('active', button.dataset.tab === tabName);
    });
  }

  function findCard(title) {
    return [...document.querySelectorAll('#main > .card')].find(
      (card) => card.querySelector('h3')?.textContent?.trim() === title
    );
  }

  async function renderRegister() {
    setActiveTab('register');
    await originalAdminCases();

    const statusCard = findCard('서비스 현황');
    statusCard?.remove();

    const registerCard = findCard('새 서비스 등록');
    if (registerCard) {
      const title = registerCard.querySelector('h3');
      if (title) title.textContent = '산모 등록';

      const addButton = document.getElementById('addCase');
      if (addButton && addButton.dataset.menuV28 !== '1') {
        const originalClick = addButton.onclick;
        addButton.dataset.menuV28 = '1';
        addButton.onclick = async (event) => {
          if (typeof originalClick !== 'function') return;
          const beforeCount = await getCaseCount();
          await originalClick.call(addButton, event);
          const afterCount = await getCaseCount();
          if (afterCount > beforeCount) {
            await window.adminCases();
          }
        };
      }
    }
  }

  async function getCaseCount() {
    try {
      const { count } = await sb
        .from('service_cases')
        .select('id', { count: 'exact', head: true });
      return Number(count || 0);
    } catch (_) {
      return 0;
    }
  }

  async function renderCases() {
    setActiveTab('cases');
    await originalAdminCases();

    const registerCard = findCard('새 서비스 등록');
    registerCard?.remove();

    const statusCard = findCard('서비스 현황');
    if (statusCard) {
      const title = statusCard.querySelector('h3');
      if (title) title.textContent = '서비스 현황';
    }
  }

  window.adminCases = renderCases;

  window.showAdminTab = function showSeparatedAdminTab(tabName) {
    setActiveTab(tabName);
    if (tabName === 'register') return renderRegister();
    if (tabName === 'cases') return renderCases();
    if (tabName === 'caregivers') return originalAdminCaregivers?.();
    if (tabName === 'template') return originalTemplatePage?.();
  };

  // 이미 자동 로그인된 운영자 화면도 새 메뉴 구조로 다시 정리한다.
  setTimeout(() => {
    if (typeof me !== 'undefined' && me?.role === 'admin' && !document.getElementById('appView')?.classList.contains('hidden')) {
      window.showAdminTab('cases');
    }
  }, 120);
})();
