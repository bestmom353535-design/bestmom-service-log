(() => {
  let stage = '진단 시작';
  const setStage = (text) => {
    stage = text;
    const el = document.getElementById('runtimeStatus');
    if (el) el.textContent = '화면 23:36 · PDF 진단: ' + text;
  };

  try {
    const originalArrayBuffer = Blob.prototype.arrayBuffer;
    Blob.prototype.arrayBuffer = async function (...args) {
      setStage('원본 PDF 바이트 읽기');
      const out = await originalArrayBuffer.apply(this, args);
      setStage('원본 PDF 바이트 읽기 완료');
      return out;
    };
  } catch (_) {}

  try {
    const originalLoad = PDFLib.PDFDocument.load.bind(PDFLib.PDFDocument);
    PDFLib.PDFDocument.load = async function (...args) {
      setStage('원본 PDF 구조 읽기');
      const doc = await originalLoad(...args);
      setStage('원본 PDF 구조 읽기 완료');
      return doc;
    };
  } catch (_) {}

  try {
    const originalEmbed = PDFLib.PDFDocument.prototype.embedPng;
    PDFLib.PDFDocument.prototype.embedPng = async function (...args) {
      setStage('기록 이미지 PDF에 넣기');
      const out = await originalEmbed.apply(this, args);
      setStage('기록 이미지 넣기 완료');
      return out;
    };
  } catch (_) {}

  try {
    const originalSave = PDFLib.PDFDocument.prototype.save;
    PDFLib.PDFDocument.prototype.save = async function (...args) {
      setStage('최종 PDF 저장');
      const out = await originalSave.apply(this, args);
      setStage('최종 PDF 저장 완료');
      return out;
    };
  } catch (_) {}

  try {
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (...args) {
      setStage('기록 화면 이미지 변환');
      const out = originalToDataURL.apply(this, args);
      setStage('기록 화면 이미지 변환 완료');
      return out;
    };
  } catch (_) {}

  try {
    const originalCreateObjectURL = globalThis.URL.createObjectURL.bind(globalThis.URL);
    globalThis.URL.createObjectURL = function (...args) {
      setStage('PDF 열기 주소 생성');
      const out = originalCreateObjectURL(...args);
      setStage('PDF 열기 주소 생성 완료');
      return out;
    };
  } catch (_) {}

  const originalMakePdf = window.makePdf;
  if (typeof originalMakePdf !== 'function') return;

  window.makePdf = async function (caseId) {
    setStage('생성 시작');
    try {
      await originalMakePdf(caseId);
    } finally {
      try {
        await sb.from('record_audit').insert({
          case_id: caseId,
          actor_id: me?.id || null,
          action: 'pdf_debug',
          details: { stage, user_agent: navigator.userAgent }
        });
      } catch (_) {}
    }
  };
})();
