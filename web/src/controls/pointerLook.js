// 드래그 기반 360도 시점 컨트롤 (Pointer Lock API 미사용)
// 아티팩트/iframe 등 포인터락이 차단되는 임베드 환경에서도 동작하도록
// 마우스를 누른 채 드래그하면 시점이 회전하고, 이동량이 작으면(=드래그가 아니면) 클릭으로 처리한다.
const CLICK_THRESHOLD = 6; // px

export class PointerLookControls {
  constructor(domElement) {
    this.dom = domElement;
    this.yaw = Math.PI;
    this.pitch = 0.28;
    this.leftDown = false;
    this.rightDown = false;
    this.dragging = false;
    this.dragButton = null;
    this.sensitivity = 0.0048;
    // 위/아래로 자유롭게 둘러볼 수 있도록 넓은 범위를 허용한다.
    // 완전한 수직(짐벌락)만 피하고, 수면/지형 관통은 카메라 쪽에서
    // 별도의 파고 하한선·충돌 판정으로 막는다(각도 자체를 제한하지 않음).
    this.minPitch = -1.2;
    this.maxPitch = 1.2;
    this._lastX = 0;
    this._lastY = 0;
    this._moved = 0;

    // 마우스 휠 확대/축소 — 카메라 거리 배율(1 = 기본 거리, 작을수록 확대/가까움)
    this.zoom = 1;
    this.minZoom = 0.4;
    this.maxZoom = 2.4;
    this.zoomSensitivity = 0.0011;

    this.onLeftClick = null;
    this.onRightClick = null;

    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onWheel = this._onWheel.bind(this);
    this._onContextMenu = (e) => e.preventDefault();

    this.dom.addEventListener('mousedown', this._onMouseDown);
    document.addEventListener('mousemove', this._onMouseMove);
    document.addEventListener('mouseup', this._onMouseUp);
    this.dom.addEventListener('contextmenu', this._onContextMenu);
    this.dom.addEventListener('wheel', this._onWheel, { passive: false });
  }

  _onWheel(e) {
    e.preventDefault();
    this.zoom += e.deltaY * this.zoomSensitivity;
    this.zoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.zoom));
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
    this.dom.removeEventListener('wheel', this._onWheel);
  }
}
