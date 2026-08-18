(() => {
  let saving = false;

  function safeName(name) {
    return String(name || '산모').replace(/[\\/:*?"<>|]/g, '_').trim() || '산모';
  }

  async function resolveMotherName(caseId) {
    try {
      const { data } = await sb.from('service_cases').select('mother_name').eq('id', caseId).single();
      return safeName(data?.mother_name);
    } catch (_) {
      return '산모';
    }
  }

  window.savePdf = async function(caseId) {
    if (saving) return;
    if (typeof window.makePdf !== 'function') {
      alert('PDF 기능이 아직 준비되지 않았습니다.');
      return;
    }

    saving = true;
    const runtime = document.getElementById('runtimeStatus');
    if (runtime) runtime.textContent = 'PDF 저장 · 파일 만드는 중';

    const originalOpen = window.open;
    const originalCreateObjectURL = globalThis.URL.createObjectURL.bind(globalThis.URL);
    let capturedBlob = null;

    const fakePreview = {
      closed: false,
      document: { title: '', body: { innerHTML: '' } },
      location: { replace: () => {} },
      close: () => { fakePreview.closed = true; }
    };

    try {
      window.open = () => fakePreview;
      globalThis.URL.createObjectURL = function(blob) {
        if (blob instanceof Blob && blob.type === 'application/pdf') capturedBlob = blob;
        return originalCreateObjectURL(blob);
      };

      await window.makePdf(caseId);

      if (!capturedBlob) throw new Error('생성된 PDF 파일을 받지 못했습니다.');

      const motherName = await resolveMotherName(caseId);
      const downloadUrl = originalCreateObjectURL(capturedBlob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${motherName}_제공기록지.pdf`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => globalThis.URL.revokeObjectURL(downloadUrl), 120000);

      if (runtime) runtime.textContent = 'PDF 저장 · 완료';
    } catch (err) {
      console.error('PDF save error:', err);
      if (runtime) runtime.textContent = 'PDF 저장 · 실패';
      alert(`PDF 저장에 실패했습니다.\n${err?.message || err}`);
    } finally {
      window.open = originalOpen;
      globalThis.URL.createObjectURL = originalCreateObjectURL;
      saving = false;
    }
  };

  function addSaveButtons() {
    document.querySelectorAll('button').forEach((button) => {
      if (button.dataset.pdfSaveAdded === '1') return;
      const text = (button.textContent || '').trim();
      if (text !== '제공기록지 PDF 보기') return;

      const onclick = button.getAttribute('onclick') || '';
      const match = onclick.match(/makePdf\(['"]([^'"]+)['"]\)/);
      if (!match) return;

      const caseId = match[1];
      const save = document.createElement('button');
      save.className = 'primary';
      save.textContent = 'PDF 저장';
      save.type = 'button';
      save.onclick = () => window.savePdf(caseId);
      button.dataset.pdfSaveAdded = '1';
      button.insertAdjacentElement('afterend', save);
    });
  }

  addSaveButtons();
  const main = document.getElementById('main');
  if (main) new MutationObserver(addSaveButtons).observe(main, { childList: true, subtree: true });
})();