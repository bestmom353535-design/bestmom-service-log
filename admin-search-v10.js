(() => {
  const MAIN_ID = 'main';

  function normalize(value) {
    return String(value || '').trim().toLowerCase();
  }

  function attachSearch(card, type) {
    if (!card || card.dataset.searchReady === '1') return;

    const title = card.querySelector('h3');
    if (!title) return;

    const isCaregiver = type === 'caregiver';
    const placeholder = isCaregiver ? '관리사 이름 검색' : '산모 이름 검색';
    const emptyText = isCaregiver ? '검색된 관리사가 없습니다.' : '검색된 산모가 없습니다.';

    const wrap = document.createElement('div');
    wrap.className = 'mt';
    wrap.innerHTML = `
      <input class="admin-list-search" type="search" inputmode="search"
        placeholder="${placeholder}" aria-label="${placeholder}"
        style="width:100%;box-sizing:border-box">
      <div class="muted tiny admin-search-count" style="margin-top:6px"></div>
      <div class="muted admin-search-empty" style="display:none;margin-top:12px">${emptyText}</div>
    `;

    title.insertAdjacentElement('afterend', wrap);
    card.dataset.searchReady = '1';

    const input = wrap.querySelector('.admin-list-search');
    const count = wrap.querySelector('.admin-search-count');
    const empty = wrap.querySelector('.admin-search-empty');

    const apply = () => {
      const query = normalize(input.value);
      const rows = [...card.querySelectorAll(':scope > .case')];
      let shown = 0;

      rows.forEach((row) => {
        const name = normalize(row.querySelector('b')?.textContent);
        const visible = !query || name.includes(query);
        row.style.display = visible ? '' : 'none';
        if (visible) shown += 1;
      });

      count.textContent = query ? `${shown}명 검색됨` : '';
      empty.style.display = query && shown === 0 ? '' : 'none';
    };

    input.addEventListener('input', apply);
    input.addEventListener('search', apply);
    apply();
  }

  function scan() {
    const main = document.getElementById(MAIN_ID);
    if (!main) return;

    [...main.querySelectorAll('.card')].forEach((card) => {
      const heading = card.querySelector('h3')?.textContent?.trim();
      if (heading === '등록된 관리사') attachSearch(card, 'caregiver');
      if (heading === '서비스 현황') attachSearch(card, 'case');
    });
  }

  const observer = new MutationObserver(() => scan());

  function start() {
    const main = document.getElementById(MAIN_ID);
    if (!main) return;
    observer.observe(main, { childList: true, subtree: true });
    scan();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
