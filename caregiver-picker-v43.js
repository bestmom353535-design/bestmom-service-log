(() => {
  if (window.__BESTMOM_CAREGIVER_PICKER_V43__) return;
  window.__BESTMOM_CAREGIVER_PICKER_V43__ = true;

  const CHOSEONG = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  const consonantRe = /^[ㄱ-ㅎ]$/;

  function initialOf(char) {
    const code = char?.charCodeAt?.(0);
    if (Number.isFinite(code) && code >= 0xAC00 && code <= 0xD7A3) {
      return CHOSEONG[Math.floor((code - 0xAC00) / 588)] || char;
    }
    return char || '';
  }

  function normalize(value) {
    return String(value || '').replace(/\s+/g, '').toLowerCase();
  }

  function mixedMatch(name, query) {
    const target = normalize(name);
    const q = normalize(query);
    if (!q) return false;
    if (target.includes(q)) return true;

    const initials = [...target].map(initialOf).join('');
    if (initials.includes(q)) return true;

    const qChars = [...q];
    const nChars = [...target];
    if (qChars.length > nChars.length) return false;

    for (let start = 0; start <= nChars.length - qChars.length; start += 1) {
      let ok = true;
      for (let i = 0; i < qChars.length; i += 1) {
        const qc = qChars[i];
        const nc = nChars[start + i];
        if (consonantRe.test(qc)) {
          if (initialOf(nc) !== qc) { ok = false; break; }
        } else if (nc !== qc) {
          ok = false;
          break;
        }
      }
      if (ok) return true;
    }
    return false;
  }

  function closeAll(except) {
    document.querySelectorAll('[data-caregiver-search-results]').forEach((el) => {
      if (el !== except) el.style.display = 'none';
    });
  }

  function enhanceSelect(select) {
    if (!select || select.dataset.caregiverSearchEnhanced === '1') return;
    select.dataset.caregiverSearchEnhanced = '1';

    const parent = select.parentElement;
    if (!parent) return;

    const options = [...select.options]
      .filter((option) => option.value)
      .map((option) => ({ value: option.value, name: option.textContent.trim() }));

    select.style.display = 'none';

    const box = document.createElement('div');
    box.dataset.caregiverSearchBox = '1';
    box.style.cssText = 'position:relative;margin-top:4px;';

    const input = document.createElement('input');
    input.type = 'search';
    input.autocomplete = 'off';
    input.placeholder = '관리사 이름 검색 (예: 황ㅅ, ㅎㅅㅇ)';
    input.style.cssText = 'width:100%;';

    const selected = document.createElement('div');
    selected.style.cssText = 'font-size:11px;color:#6b7280;margin-top:4px;min-height:16px;';

    const results = document.createElement('div');
    results.dataset.caregiverSearchResults = '1';
    results.style.cssText = 'display:none;position:absolute;z-index:5000;left:0;right:0;top:calc(100% - 17px);background:#fff;border:1px solid #d1d5db;border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.14);max-height:260px;overflow:auto;padding:5px;';

    const showResults = () => {
      const query = input.value.trim();
      if (!query) {
        results.style.display = 'none';
        return;
      }

      const matches = options.filter((item) => mixedMatch(item.name, query)).slice(0, 15);
      results.innerHTML = '';

      if (!matches.length) {
        const empty = document.createElement('div');
        empty.textContent = '검색되는 관리사가 없습니다.';
        empty.style.cssText = 'padding:10px;font-size:12px;color:#6b7280;';
        results.appendChild(empty);
      } else {
        matches.forEach((item) => {
          const button = document.createElement('button');
          button.type = 'button';
          button.textContent = item.name;
          button.style.cssText = 'display:block;width:100%;text-align:left;padding:9px 10px;border:0;background:#fff;border-radius:7px;font-size:14px;cursor:pointer;';
          button.onmouseenter = () => { button.style.background = '#f3f4f6'; };
          button.onmouseleave = () => { button.style.background = '#fff'; };
          button.onclick = () => {
            select.value = item.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            input.value = item.name;
            selected.textContent = `선택됨: ${item.name} 관리사`;
            results.style.display = 'none';
          };
          results.appendChild(button);
        });
      }

      closeAll(results);
      results.style.display = 'block';
    };

    input.addEventListener('input', () => {
      const typed = input.value.trim();
      const currentOption = [...select.options].find((option) => option.value === select.value);
      if (!typed || (currentOption && typed !== currentOption.textContent.trim())) {
        select.value = '';
        selected.textContent = '';
      }
      showResults();
    });
    input.addEventListener('focus', () => { if (input.value.trim() && !select.value) showResults(); });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') results.style.display = 'none';
    });

    const current = [...select.options].find((option) => option.value === select.value && option.value);
    if (current) {
      input.value = current.textContent.trim();
      selected.textContent = `선택됨: ${current.textContent.trim()} 관리사`;
    }

    box.append(input, selected, results);
    select.insertAdjacentElement('beforebegin', box);
  }

  function scan() {
    if (typeof me !== 'undefined' && me?.role !== 'admin') return;
    enhanceSelect(document.getElementById('caseCg'));
  }

  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-caregiver-search-box]')) closeAll();
  });

  const main = document.getElementById('main');
  if (main) new MutationObserver(scan).observe(main, { childList: true, subtree: true });
  scan();
})();
