// ============ 敌人 ============
class Enemy extends Entity {
  constructor(pathPoints, typeKey, hpMul = 1) {
    const def = CONFIG.enemies[typeKey];
    const start = pathPoints[0];
    super(start.x, start.y);
    this.id = nextId();
    this.typeKey = typeKey;
    this.def = def;
    this.maxHp = Math.round(def.hp * hpMul);
    this.hp = this.maxHp;
    this.baseSpeed = def.speed;
    this.speed = def.speed;
    this.reward = def.reward;
    this.radius = def.radius;
    this.color = def.color;
    this.armor = def.armor || 0;

    this.pathPoints = pathPoints;
    this.pathIndex = 1;        // 当前目标点索引
    this.reachedEnd = false;

    // 减速状态
    this.slowFactor = 1;
    this.slowTimer = 0;
    this.hitFlash = 0;
  }

  applySlow(factor, duration) {
    // 取更强的减速
    if (factor < this.slowFactor) this.slowFactor = factor;
    this.slowTimer = Math.max(this.slowTimer, duration);
  }

  takeDamage(dmg) {
    const real = Math.max(1, dmg - this.armor);
    this.hp -= real;
    this.hitFlash = 0.12;
    if (this.hp <= 0) {
      this.hp = 0;
      this.dead = true;
    }
  }

  update(dt) {
    // 减速计时
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      if (this.slowTimer <= 0) {
        this.slowTimer = 0;
        this.slowFactor = 1;
      }
    }
    this.speed = this.baseSpeed * this.slowFactor;
    if (this.hitFlash > 0) this.hitFlash -= dt;

    if (this.reachedEnd) return;

    // 沿路径点移动
    let move = this.speed * dt;
    while (move > 0 && this.pathIndex < this.pathPoints.length) {
      const target = this.pathPoints[this.pathIndex];
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= move) {
        this.x = target.x;
        this.y = target.y;
        move -= dist;
        this.pathIndex++;
      } else {
        this.x += (dx / dist) * move;
        this.y += (dy / dist) * move;
        move = 0;
      }
    }
    if (this.pathIndex >= this.pathPoints.length) {
      this.reachedEnd = true;
    }
  }

  draw(ctx) {
    const r = this.radius;
    // 阴影
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(this.x, this.y + r * 0.7, r * 0.9, r * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 身体
    ctx.fillStyle = this.hitFlash > 0 ? '#fff' : this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 减速标识
    if (this.slowTimer > 0) {
      ctx.strokeStyle = '#7ee0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(this.x, this.y, r + 3, 0, Math.PI * 2);
      ctx.stroke();
    }

    // 血条
    const barW = r * 2.2;
    const barH = 4;
    const bx = this.x - barW / 2;
    const by = this.y - r - 10;
    const hpRatio = this.hp / this.maxHp;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(bx, by, barW, barH);
    ctx.fillStyle = hpRatio > 0.5 ? '#51cf66' : (hpRatio > 0.25 ? '#ffd43b' : '#ff6b6b');
    ctx.fillRect(bx, by, barW * hpRatio, barH);
  }
}