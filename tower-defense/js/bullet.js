// ============ 子弹 ============
class Bullet extends Entity {
  constructor(tower, target) {
    super(tower.x, tower.y);
    this.id = nextId();
    this.tower = tower;
    this.target = target;
    this.damage = tower.damage;
    this.speed = tower.bulletSpeed;
    this.color = tower.bulletColor;
    this.splash = tower.splash || 0;
    this.slow = tower.slow || null;
    this.radius = 4;
    this.life = 3;   // 最长存活时间，防止追丢后永久存在
    this.trail = [];
  }

  update(dt) {
    this.life -= dt;
    if (this.life <= 0) { this.dead = true; return; }

    // 目标失效 -> 直线飞出去然后消失
    if (!this.target || this.target.dead || this.target.reachedEnd) {
      this.dead = true;
      return;
    }

    const dx = this.target.x - this.x;
    const dy = this.target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const move = this.speed * dt;

    if (dist <= move + this.target.radius) {
      this.x = this.target.x;
      this.y = this.target.y;
      this.hit();
      this.dead = true;
      return;
    }
    this.x += (dx / dist) * move;
    this.y += (dy / dist) * move;

    // 拖尾
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 5) this.trail.shift();
  }

  hit() {
    if (this.splash > 0) {
      // 溅射：对范围内所有敌人造成伤害
      const enemies = this.tower.game.enemies;
      for (const e of enemies) {
        if (e.dead) continue;
        const d = Math.hypot(e.x - this.x, e.y - this.y);
        if (d <= this.splash) {
          e.takeDamage(this.damage);
          if (this.slow) e.applySlow(this.slow.factor, this.slow.duration);
        }
      }
      // 溅射特效
      this.tower.game.effects.push(new SplashEffect(this.x, this.y, this.splash, this.color));
    } else {
      this.target.takeDamage(this.damage);
      if (this.slow) this.target.applySlow(this.slow.factor, this.slow.duration);
    }
  }

  draw(ctx) {
    // 拖尾
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const a = (i + 1) / this.trail.length * 0.5;
      ctx.fillStyle = this.color;
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.radius * (0.4 + a), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // 弹体
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

// 溅射特效
class SplashEffect {
  constructor(x, y, radius, color) {
    this.x = x; this.y = y;
    this.radius = radius;
    this.color = color;
    this.life = 0.3;
    this.maxLife = 0.3;
    this.dead = false;
  }
  update(dt) {
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }
  draw(ctx) {
    const t = 1 - this.life / this.maxLife;
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = this.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius * (0.5 + t * 0.7), 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}