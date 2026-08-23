// 드래그 기반 360도 시점 컨트롤 (Pointer Lock API 미사용)
// 아티팩트/iframe 등 포인터락이 차단되는 임베드 환경에서도 동작하도록
// 마우스를 누른 채 드래그하면 시점이 회전하고, 이동량이 작으면(=드래그가 아니면) 클릭으로 처리한다.
const CLICK_THRESHOLD = 6; // px

export class PointerLookControls {
  constructor(domElement) {
    this.dom = domElement;
    this.yaw = Math.PI;
    this.pitch = -0.25;
    this.leftDown = false;
    this.rightDown = false;
    this.dragging = false;
    this.dragButton = null;
    this.sensitivity = 0.0055;
    this.minPitch = -1.3;
    this.maxPitch = 0.9;
    this._lastX = 0;
    this._lastY = 0;
    this._moved = 0;

    this.onLeftClick = null;
    this.onRightClick = null;

    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onContextMenu = (e) => e.preventDefault();

    this.dom.addEventListener('mousedown', this._onMouseDown);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mouseup', this._onMouseUp);
    this.dom.addEventListener('contextmenu', this._onContextMenu);
  }

  _onMouseDown(e) {
    if (e.button === 0) this.leftDown = true;
    if (e.button === 2) this.rightDown = true;
    this.dragging = true;
    this.dragButton = e.button;
    this._lastX = e.clientX;
    this._lastY = e.clientY;
    this._moved = 0;
  }

  _onMouseMove(e) {
    if (!this.dragging) return;
    const dx = e.clientX - this._lastX;
    const dy = e.clientY - this._lastY;
    this._lastX = e.clientX;
    this._lastY = e.clientY;
    this._moved += Math.abs(dx) + Math.abs(dy);

    this.yaw -= dx * this.sensitivity;
    this.pitch -= dy * this.sensitivity;
    this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
  }

  _onMouseUp(e) {
    if (e.button === 0) this.leftDown = false;
    if (e.button === 2) this.rightDown = false;
    if (this.dragging && this.dragButton === e.button) {
      const wasClick = this._moved < CLICK_THRESHOLD;
      this.dragging = false;
      if (wasClick) {
        if (e.button === 0 && this.onLeftClick) this.onLeftClick();
        if (e.button === 2 && this.onRightClick) this.onRightClick();
      }
    }
  }

  dispose() {
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup', this._onMouseUp);
    this.dom.removeEventListener('mousedown', this._onMouseDown);
    this.dom.removeEventListener('contextmenu', this._onContextMenu);
  }
}
