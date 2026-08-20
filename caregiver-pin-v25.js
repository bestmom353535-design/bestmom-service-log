(() => {
  if (typeof sb === 'undefined' || !sb.auth || typeof sb.auth.signInWithPassword !== 'function') return;

  const encodePin = (pin) => `BestMom!${pin}#Care`;
  const originalSignIn = sb.auth.signInWithPassword.bind(sb.auth);

  sb.auth.signInWithPassword = async (credentials) => {
    const email = String(credentials?.email || '').toLowerCase();
    const password = String(credentials?.password || '');

    if (email.endsWith('@bestmom.invalid') && /^\d{4,}$/.test(password)) {
      const converted = await originalSignIn({ ...credentials, password: encodePin(password) });
      if (!converted.error) return converted;
      return originalSignIn(credentials);
    }

    return originalSignIn(credentials);
  };

  function patchCaregiverAdminUi() {
    const input = document.getElementById('cgPw');
    if (input && input.dataset.pinV25 !== '1') {
      input.dataset.pinV25 = '1';
      input.placeholder = '숫자 4자리 이상';
      input.inputMode = 'numeric';
      input.pattern = '[0-9]*';
      input.autocomplete = 'new-password';
      input.addEventListener('input', () => {
        const digits = input.value.replace(/\D/g, '');
        if (input.value !== digits) input.value = digits;
      });
    }

    const addButton = document.getElementById('cgAdd');
    if (addButton && addButton.dataset.pinV25 !== '1' && typeof addButton.onclick === 'function') {
      const originalAdd = addButton.onclick;
      addButton.dataset.pinV25 = '1';
      addButton.onclick = async (event) => {
        const pin = String(document.getElementById('cgPw')?.value || '');
        if (!/^\d{4,}$/.test(pin)) {
          alertMsg('비밀번호는 숫자 4자리 이상으로 입력해주세요.');
          document.getElementById('cgPw')?.focus();
          return;
        }
        return originalAdd.call(addButton, event);
      };
    }
  }

  window.resetCaregiverPassword = async (loginId) => {
    const pin = window.prompt('새 비밀번호를 숫자 4자리 이상으로 입력해주세요.');
    if (pin === null || pin === '') return;
    if (!/^\d{4,}$/.test(pin)) {
      alertMsg('비밀번호는 숫자 4자리 이상으로 입력해주세요.');
      return;
    }

    try {
      const data = await invokeCaregiverAdmin({ action: 'reset_password', login_id: loginId, password: pin });
      if (data?.error) throw new Error(data.error);
      alertMsg('비밀번호를 변경했습니다.');
    } catch (err) {
      console.error(err);
      alertMsg(`변경하지 못했습니다. ${err?.message || ''}`);
    }
  };

  const observer = new MutationObserver(patchCaregiverAdminUi);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  patchCaregiverAdminUi();
})();
