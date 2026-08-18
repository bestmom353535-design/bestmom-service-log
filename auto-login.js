(() => {
  const flagKey = 'bestmom_auto_login';
  const idKey = 'bestmom_login_id';
  const checkbox = document.getElementById('autoLogin');
  const loginId = document.getElementById('loginId');
  const loginBtn = document.getElementById('loginBtn');
  const loginPw = document.getElementById('loginPw');
  if (!checkbox || !loginId || !loginBtn || !loginPw) return;

  const enabled = localStorage.getItem(flagKey) !== '0';
  checkbox.checked = enabled;
  if (enabled) {
    const savedId = localStorage.getItem(idKey);
    if (savedId && !loginId.value) loginId.value = savedId;
  }

  const savePreference = () => {
    if (checkbox.checked) {
      localStorage.setItem(flagKey, '1');
      const value = loginId.value.trim();
      if (value) localStorage.setItem(idKey, value);
    } else {
      localStorage.setItem(flagKey, '0');
      localStorage.removeItem(idKey);
    }
  };

  checkbox.addEventListener('change', savePreference);
  loginBtn.addEventListener('click', savePreference, true);
  loginPw.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') savePreference();
  }, true);
})();
