// 포인터락 기반 360도 시점 컨트롤 + 좌/우 클릭 상태 추적
export class PointerLookControls {
  constructor(domElement) {
    this.dom = domElement;
    this.yaw = Math.PI;
    this.pitch = -0.25;
    this.locked = false;
    this.leftDown = false;
    this.rightDown = false;
    this.sensitivity = 0.0022;
    this.minPitch = -1.3;
    this.maxPitch = 0.9;

    this.onLeftClick = null;
    this.onRightClick = null;
    this.onLockChange = null;

    this._onMouseMove = this._onMouseMove.bind(this);
    this._onLockChange = this._onLockChange.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onContextMenu = (e) => e.preventDefault();

    document.addEventListener('pointerlockchange', this._onLockChange);
    this.dom.addEventListener('mousedown', this._onMouseDown);
    document.addEventListener('mouseup', this._onMouseUp);
    this.dom.addEventListener('contextmenu', this._onContextMenu);
  }

  requestLock() {
    if (document.pointerLockElement !== this.dom) {
      this.dom.requestPointerLock();
    }
  }

  _onLockChange() {
    this.locked = document.pointerLockElement === this.dom;
    if (this.locked) {
      document.addEventListener('mousemove', this._onMouseMove);
    } else {
      document.removeEventListener('mousemove', this._onMouseMove);
      this.leftDown = false;
      this.rightDown = false;
    }
    if (this.onLockChange) this.onLockChange(this.locked);
  }

  _onMouseMove(e) {
    this.yaw -= e.movementX * this.sensitivity;
    this.pitch -= e.movementY * this.sensitivity;
    this.pitch = Math.max(this.minPitch, Math.min(this.maxPitch, this.pitch));
  }

  _onMouseDown(e) {
    if (!this.locked) { this.requestLock(); return; }
    if (e.button === 0) { this.leftDown = true; if (this.onLeftClick) this.onLeftClick(); }
    if (e.button === 2) { this.rightDown = true; if (this.onRightClick) this.onRightClick(); }
  }

  _onMouseUp(e) {
    if (e.button === 0) this.leftDown = false;
    if (e.button === 2) this.rightDown = false;
  }

  dispose() {
    document.removeEventListener('pointerlockchange', this._onLockChange);
    document.removeEventListener('mousemove', this._onMouseMove);
    document.removeEventListener('mouseup', this._onMouseUp);
    this.dom.removeEventListener('mousedown', this._onMouseDown);
    this.dom.removeEventListener('contextmenu', this._onContextMenu);
  }
}
