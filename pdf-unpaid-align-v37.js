(() => {
  if (!globalThis.CanvasRenderingContext2D || window.__BESTMOM_UNPAID_ALIGN_V38__) return;
  window.__BESTMOM_UNPAID_ALIGN_V38__ = true;

  const proto = globalThis.CanvasRenderingContext2D.prototype;
  const originalFillText = proto.fillText;
  const originalArc = proto.arc;
  const originalStroke = proto.stroke;
  const stampState = new WeakMap();

  const TEXT_Y_SHIFT = 11.4;
  const STAMP_Y_SHIFT = 5.9;
  const STAMP_RADIUS_GROW = 0.65;
  const STAMP_RED = '#ed1c24';
  const stampFontFamily = 'Arial,"Malgun Gothic","Apple SD Gothic Neo","Noto Sans KR",sans-serif';

  proto.arc = function bestmomUnpaidArc(x, y, radius, startAngle, endAngle, counterclockwise) {
    const isUnpaidStamp =
      Number.isFinite(y) && y > 730 && y < 810 &&
      Number.isFinite(radius) && radius >= 8 && radius <= 11;

    if (isUnpaidStamp) {
      const correctedY = y - STAMP_Y_SHIFT;
      const correctedRadius = radius + STAMP_RADIUS_GROW;
      stampState.set(this, {
        cx: x,
        cy: correctedY,
        pendingStroke: true,
        pendingText: true
      });
      return originalArc.call(this, x, correctedY, correctedRadius, startAngle, endAngle, counterclockwise);
    }

    return originalArc.call(this, x, y, radius, startAngle, endAngle, counterclockwise);
  };

  proto.stroke = function bestmomUnpaidStroke(path) {
    const state = stampState.get(this);
    if (!state?.pendingStroke) {
      return arguments.length ? originalStroke.call(this, path) : originalStroke.call(this);
    }

    const previousWidth = this.lineWidth;
    const previousStroke = this.strokeStyle;
    this.lineWidth = Math.max(Number(previousWidth) || 0, 1.65);
    this.strokeStyle = STAMP_RED;

    try {
      return arguments.length ? originalStroke.call(this, path) : originalStroke.call(this);
    } finally {
      this.lineWidth = previousWidth;
      this.strokeStyle = previousStroke;
      state.pendingStroke = false;
      stampState.set(this, state);
    }
  };

  proto.fillText = function bestmomUnpaidFillText(text, x, y, maxWidth) {
    const value = String(text ?? '');
    const state = stampState.get(this);

    if (value === '베스트맘' && state?.pendingText && Number.isFinite(y) && y > 730 && y < 810) {
      const previousFont = this.font;
      const previousAlign = this.textAlign;
      const previousBaseline = this.textBaseline;
      const previousFill = this.fillStyle;

      this.font = `800 5.1px ${stampFontFamily}`;
      this.textAlign = 'center';
      this.textBaseline = 'middle';
      this.fillStyle = STAMP_RED;

      originalFillText.call(this, '베스', state.cx, state.cy - 2.8, 15.5);
      originalFillText.call(this, '트맘', state.cx, state.cy + 2.8, 15.5);

      this.font = previousFont;
      this.textAlign = previousAlign;
      this.textBaseline = previousBaseline;
      this.fillStyle = previousFill;

      state.pendingText = false;
      stampState.set(this, state);
      return;
    }

    if (Number.isFinite(y) && y > 730 && y < 810) {
      const correctedY = y - TEXT_Y_SHIFT;
      const isShortDate = /^\d{1,2}\/\d{1,2}$/.test(value.trim());

      if (isShortDate) {
        const previousAlign = this.textAlign;
        this.textAlign = 'left';
        const correctedX = x < 200 ? 68.2 : 337.4;
        try {
          return maxWidth === undefined
            ? originalFillText.call(this, value, correctedX, correctedY)
            : originalFillText.call(this, value, correctedX, correctedY, maxWidth);
        } finally {
          this.textAlign = previousAlign;
        }
      }

      return maxWidth === undefined
        ? originalFillText.call(this, value, x, correctedY)
        : originalFillText.call(this, value, x, correctedY, maxWidth);
    }

    return maxWidth === undefined
      ? originalFillText.call(this, value, x, y)
      : originalFillText.call(this, value, x, y, maxWidth);
  };
})();