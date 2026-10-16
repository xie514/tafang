// ============ 塔 ============
class Tower extends Entity {
  constructor(col, row, typeKey, game) {
    const center = game.grid.cellCenter(col, row);
    super(center.x, center.y);
    this.id = nextId();
    this.col = col;
    this.row = row;
    this.typeKey = typeKey;
    this.game = game;
    const def = CONFIG.towers[typeKey];
    this.def = def;
    this.name = def.name;
    this.color = def.color;
    this.range = def.range;
    this.damage = def.damage;
    this.fireRate = def.fireRate;
    this.bulletSpeed = def.bulletSpeed;
    this.bulletColor = def.bulletColor;
    this.splash = def.splash || 0;
    this.slow = def.slow || null;
    this.cost = def.cost;

    this.cooldown = 0;       // 剩余冷却
    this.angle = -Math.PI / 2; // 炮口朝向
    this.target = null;
  }

  update(dt) {
    if (this.cooldown > 0) this.cooldown -= dt;

    // 索敌
    this.target = this.findTarget();
    if (this.target) {
      // 转向
      const desired = Math.atan2(this.target.y - this.y, this.target.x - this.x);
      // 平滑转向
      let diff = desired - this.angle;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.angle += diff * Math.min(1, dt * 12);

      // 开火
      if (this.cooldown <= 0) {
        this.fire();
        this.cooldown = 1 / this.fireRate;
      }
    }
  }

  findTarget() {
    let best = null;
    let bestProgress = -1;
    for (const e of this.game.enemies) {
      if (e.dead) continue;
      const d = this.distanceToPoint(e.x, e.y);
      if (d <= this.range + e.radius) {
        // 优先攻击走得最远的敌人
        const progress = e.pathIndex * 10000 + (e.reachedEnd ? 1e9 : 0) - d;
        if (progress > bestProgress) {
          bestProgress = progress;
          best = e;
        }
      }
    }
    return best;
  }

  fire() {
    if (!this.target) return;
    const b = new Bullet(this, this.target);
    this.game.bullets.push(b);
    // 枪口火光
    this.game.effects.push(new MuzzleEffect(
      this.x + Math.cos(this.angle) * 18,
      this.y + Math.sin(this.angle) * 18,
      this.color
    ));
  }

  draw(ctx) {
    const cell = this.game.grid.cell;
    // 底座
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.arc(this.x, this.y + 3, cell * 0.34, 0, Math.PI * 2);
    ctx.fill();

    // 塔身
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, cell * 0.30, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 内圈
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.arc(this.x, this.y, cell * 0.18, 0, Math.PI * 2);
    ctx.fill();

    // 炮管
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.fillStyle = '#2b3038';
    ctx.fillRect(0, -4, cell * 0.42, 8);
    ctx.fillStyle = this.color;
    ctx.fillRect(cell * 0.30, -3, 6, 6);
    ctx.restore();
  }
}

// 枪口火光特效
class MuzzleEffect {
  constructor(x, y, color) {
    this.x = x; this.y = y;
    this.color = color;
    this.life = 0.08;
    this.maxLife = 0.08;
    this.dead = false;
  }
  update(dt) {
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }
  draw(ctx) {
    const t = this.life / this.maxLife;
    ctx.globalAlpha = t;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 6 * t + 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}