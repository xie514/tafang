// ============ 实体基类 ============
class Entity {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.dead = false;
  }
  distTo(other) {
    const dx = this.x - other.x;
    const dy = this.y - other.y;
    return Math.hypot(dx, dy);
  }
  distanceToPoint(px, py) {
    return Math.hypot(this.x - px, this.y - py);
  }
  update(dt) {}
  draw(ctx) {}
}

// 简易 ID 生成
let __idSeq = 1;
function nextId() { return __idSeq++; }