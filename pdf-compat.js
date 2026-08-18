var fmt = window.fmt = function (value) {
  if (!value) return '';
  var parts = String(value).split('-');
  if (parts.length !== 3) return String(value);
  return parts[0].slice(-2) + '-' + parts[1] + '-' + parts[2];
};
var msg = window.msg = function (text) {
  window.alert(text || 'PDF 처리 중 오류가 발생했습니다.');
};
