(() => {
  if (window.__BESTMOM_ENDED_SEARCH_V111__) return;
  window.__BESTMOM_ENDED_SEARCH_V111__ = true;

  let query = '';
  let restoreFocus = false;

  const normalize = (value) => String(value || '').normalize('NFC').toLowerCase().replace(/\s+/g, '');

  function applySearch() {
    const main = document.getElementById('main');
    const input = main?.querySelector('[data-ended-search-input]');
    if (!input) return;

    const needle = normalize(query);
    const rows = [...main.querySelectorAll('[data-ended-case]')];
    let shown = 0;

    rows.forEach((row) => {
      const mother = row.querySelector('b')?.textContent || '';
      const details = [...row.querySelectorAll('.muted')].map((el) => el.textContent || '').join(' ');
      const matched = !needle || normalize(mother + ' ' + details).includes(needle);
      row.style.display = matched ? '' : 'none';
      if (matched) shown += 1;
    });

    main.querySelectorAll('[data-ended-month]').forEach((month) => {
      const visible = [...month.querySelectorAll('[data-ended-case]')]
        .some((row) => row.style.display !== 'none');
      month.style.display = visible ? '' : 'none';
    });

    const counter = main.querySelector('[data-ended-search-count]');
    const empty = main.querySelector('[data-ended-search-empty]');
    if (counter) {
      const label = needle ? `검색 결과 ${shown}건` : '';
      if (counter.textContent !== label) counter.textContent = label;
    }
    if (empty) empty.style.display = needle && shown === 0 ? '' : 'none';
  }

  function showAllBeforeSearching() {
    if (!normalize(query)) return false;
    const main = document.getElementById('main');
    const allBranch = main?.querySelector('[data-ended-folder="all"]');
    if (allBranch && !allBranch.classList.contains('primary')) {
      restoreFocus = true;
      allBranch.click();
      return true;
    }
    const month = main?.querySelector('#endedMonthSelect');
    if (month && month.value !== 'all') {
      restoreFocus = true;
      month.value = 'all';
      month.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }
    return false;
  }

  function attach() {
    const main = document.getElementById('main');
    if (!main) return;
    const card = [...main.querySelectorAll(':scope > .card')].find((el) =>
      [...el.querySelectorAll('h3')].some((heading) => heading.textContent?.trim() === '종료 서비스')
    );
    if (!card) return;

    if (!card.querySelector('[data-ended-search-wrap]')) {
      const wrap = document.createElement('div');
      wrap.dataset.endedSearchWrap = '1';
      wrap.className = 'mt';
      wrap.innerHTML = `
        <label for="endedServiceSearchV111" style="display:block;font-weight:800;margin-bottom:5px">종료 서비스 검색</label>
        <input id="endedServiceSearchV111" data-ended-search-input type="search"
          placeholder="산모명 · 관리사명 · 아기명" autocomplete="off"
          style="width:100%;box-sizing:border-box" aria-label="종료 서비스 산모명 또는 관리사명 검색">
        <div class="muted tiny" style="margin-top:5px">검색하면 지점과 시작월에 관계없이 전체 종료 서비스에서 찾습니다.</div>
        <div data-ended-search-count class="muted" role="status" style="margin-top:5px"></div>
        <div data-ended-search-empty class="muted" style="display:none;margin-top:6px">일치하는 종료 서비스가 없습니다.</div>
      `;
      const firstRow = card.querySelector(':scope > .row.mt');
      if (firstRow) firstRow.insertAdjacentElement('beforebegin', wrap);
      else card.appendChild(wrap);

      const input = wrap.querySelector('[data-ended-search-input]');
      input.value = query;
      input.addEventListener('input', () => {
        query = input.value;
        if (!showAllBeforeSearching()) applySearch();
      });
      input.addEventListener('search', () => {
        query = input.value;
        if (!showAllBeforeSearching()) applySearch();
      });
      if (restoreFocus) {
        restoreFocus = false;
        requestAnimationFrame(() => {
          input.focus({ preventScroll: true });
          input.setSelectionRange(input.value.length, input.value.length);
        });
      }
    }
    applySearch();
  }

  const observer = new MutationObserver(() => attach());
  const start = () => {
    const main = document.getElementById('main');
    if (!main) return;
    // 종료 서비스 화면의 최상위 교체만 감지합니다. 검색 결과 문구를 감지하면 무한 반복됩니다.
    observer.observe(main, { childList: true, subtree: false });
    attach();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();