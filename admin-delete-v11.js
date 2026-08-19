(() => {
  function confirmDelete(message) {
    return window.confirm(`${message}\n\n삭제 후 복구할 수 없습니다.`);
  }

  async function deleteService(caseId, motherName, button) {
    if (!confirmDelete(`${motherName || '해당 산모'}의 서비스 기록을 정말 삭제하시겠습니까?\n해당 서비스의 일차 기록과 산모 서명도 함께 삭제됩니다.`)) return;

    if (button) button.disabled = true;
    const { error } = await sb.from('service_cases').delete().eq('id', caseId);
    if (error) {
      if (button) button.disabled = false;
      return alertMsg(`삭제하지 못했습니다. ${error.message || ''}`);
    }

    alertMsg('산모 서비스 기록을 삭제했습니다.');
    if (typeof adminCases === 'function') await adminCases();
    else location.reload();
  }

  async function deleteCaregiver(loginId, caregiverName, button) {
    if (!confirmDelete(`${caregiverName || '해당 관리사'} 관리사를 정말 삭제하시겠습니까?\n관리사 로그인 계정은 삭제되며, 기존 산모 기록과 서명은 보존됩니다.`)) return;

    if (button) button.disabled = true;
    const { data, error } = await sb.functions.invoke('admin-caregiver', {
      body: { action: 'delete', login_id: loginId }
    });

    if (error || data?.error) {
      if (button) button.disabled = false;
      return alertMsg(`삭제하지 못했습니다. ${data?.error || error?.message || ''}`);
    }

    alertMsg('관리사 계정을 삭제했습니다.');
    if (typeof adminCaregivers === 'function') await adminCaregivers();
    else location.reload();
  }

  function addServiceDeleteButtons() {
    const cards = [...document.querySelectorAll('#main .card')];
    const card = cards.find((x) => x.querySelector('h3')?.textContent?.trim() === '서비스 현황');
    if (!card) return;

    [...card.querySelectorAll(':scope > .case')].forEach((row) => {
      if (row.dataset.deleteReady === '1') return;
      const openButton = [...row.querySelectorAll('button')].find((b) => (b.getAttribute('onclick') || '').includes('openCase('));
      const match = openButton?.getAttribute('onclick')?.match(/openCase\('([^']+)'/);
      if (!match) return;

      const caseId = match[1];
      const motherName = row.querySelector('b')?.textContent?.trim() || '해당 산모';
      const buttonRow = openButton.closest('.row') || row;
      const button = document.createElement('button');
      button.className = 'danger';
      button.textContent = '삭제';
      button.type = 'button';
      button.onclick = () => deleteService(caseId, motherName, button);
      buttonRow.appendChild(button);
      row.dataset.deleteReady = '1';
    });
  }

  function addCaregiverDeleteButtons() {
    const cards = [...document.querySelectorAll('#main .card')];
    const card = cards.find((x) => x.querySelector('h3')?.textContent?.trim() === '등록된 관리사');
    if (!card) return;

    [...card.querySelectorAll(':scope > .case')].forEach((row) => {
      if (row.dataset.deleteReady === '1') return;
      const resetButton = [...row.querySelectorAll('button')].find((b) => (b.getAttribute('onclick') || '').includes('resetCaregiverPassword('));
      const match = resetButton?.getAttribute('onclick')?.match(/resetCaregiverPassword\('([^']+)'/);
      if (!match) return;

      const loginId = match[1];
      const caregiverName = row.querySelector('b')?.textContent?.trim() || '해당 관리사';
      const buttonRow = resetButton.closest('.row') || row;
      const button = document.createElement('button');
      button.className = 'danger';
      button.textContent = '삭제';
      button.type = 'button';
      button.onclick = () => deleteCaregiver(loginId, caregiverName, button);
      buttonRow.appendChild(button);
      row.dataset.deleteReady = '1';
    });
  }

  function scan() {
    addServiceDeleteButtons();
    addCaregiverDeleteButtons();
  }

  function start() {
    const main = document.getElementById('main');
    if (!main) return;
    new MutationObserver(scan).observe(main, { childList: true, subtree: true });
    scan();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();