// ============ 游戏主控 ============
const GameState = {
  READY: 'ready',
  RUNNING: 'running',
  PAUSED: 'paused',
  OVER: 'over',
  WIN: 'win',
};

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.grid = new Grid(CONFIG.grid);
    this.waveManager = new WaveManager(this);

    this.gold = CONFIG.startGold;
    this.hp = CONFIG.startHp;
    this.state = GameState.READY;
    this.speedMul = 1;

    this.towers = [];
    this.enemies = [];
    this.bullets = [];
    this.effects = [];

    this.selectedTowerType = null;
    this.selectedTower = null;
    this.hoverCell = null;

    this.killedCount = 0;
    this.leakedCount = 0;

    this.onStateChange = null;   // 回调，供 main.js 更新 UI
  }

  // ---------- 操作 ----------
  selectTowerType(key) {
    this.selectedTowerType = key;
    this.selectedTower = null;
  }

  canAfford(typeKey) {
    return this.gold >= CONFIG.towers[typeKey].cost;
  }

  placeTower(col, row) {
    if (!this.selectedTowerType) return false;
    if (!this.grid.canBuild(col, row)) return false;
    // 该格是否已有塔
    if (this.towers.some(t => t.col === col && t.row === row)) return false;
    const cost = CONFIG.towers[this.selectedTowerType].cost;
    if (this.gold < cost) return false;

    this.gold -= cost;
    const t = new Tower(col, row, this.selectedTowerType, this);
    this.towers.push(t);
    this.emitChange();
    return true;
  }

  sellTower(tower) {
    const idx = this.towers.indexOf(tower);
    if (idx < 0) return false;
    const refund = Math.floor(tower.cost * CONFIG.sellRatio);
    this.gold += refund;
    this.towers.splice(idx, 1);
    if (this.selectedTower === tower) this.selectedTower = null;
    this.emitChange();
    return true;
  }

  towerAt(col, row) {
    return this.towers.find(t => t.col === col && t.row === row) || null;
  }

  // ---------- 控制 ----------
  startWave() {
    if (this.state === GameState.OVER || this.state === GameState.WIN) return;
    if (this.waveManager.startNextWave()) {
      if (this.state === GameState.READY) this.state = GameState.RUNNING;
      this.emitChange();
    }
  }

  togglePause() {
    if (this.state === GameState.RUNNING) {
      this.state = GameState.PAUSED;
    } else if (this.state === GameState.PAUSED) {
      this.state = GameState.RUNNING;
    }
    this.emitChange();
  }

  cycleSpeed() {
    const speeds = [1, 2, 3];
    const i = speeds.indexOf(this.speedMul);
    this.speedMul = speeds[(i + 1) % speeds.length];
    this.emitChange();
  }

  reset() {
    this.gold = CONFIG.startGold;
    this.hp = CONFIG.startHp;
    this.state = GameState.READY;
    this.speedMul = 1;
    this.towers = [];
    this.enemies = [];
    this.bullets = [];
    this.effects = [];
    this.selectedTower = null;
    this.selectedTowerType = null;
    this.killedCount = 0;
    this.leakedCount = 0;
    this.waveManager = new WaveManager(this);
    this.emitChange();
  }

  onWaveCleared() {
    // 波次奖励
    this.gold += CONFIG.waveClearBonus;
    if (this.waveManager.currentWave >= this.waveManager.totalWaves) {
      this.state = GameState.WIN;
    }
    this.emitChange();
  }

  emitChange() {
    if (this.onStateChange) this.onStateChange();
  }

  // ---------- 循环 ----------
  update(dt) {
    if (this.state !== GameState.RUNNING) return;
    // 速度倍率
    dt *= this.speedMul;
    // 防止卡顿导致大跳步
    dt = Math.min(dt, 0.05);

    this.waveManager.update(dt);

    for (const t of this.towers) t.update(dt);
    for (const e of this.enemies) e.update(dt);
    for (const b of this.bullets) b.update(dt);

    // 敌人到达基地 -> 扣血
    for (const e of this.enemies) {
      if (e.reachedEnd && !e.dead) {
        e.dead = true;
        this.hp -= 1;
        this.leakedCount++;
        this.effects.push(new SplashEffect(
          this.grid.cellCenter(this.grid.baseCell.c, this.grid.baseCell.r).x,
          this.grid.cellCenter(this.grid.baseCell.c, this.grid.baseCell.r).y,
          30, '#ff6b6b'
        ));
      }
    }

    // 敌人死亡 -> 给钱
    for (const e of this.enemies) {
      if (e.dead && !e._rewarded) {
        e._rewarded = true;
        if (e.hp <= 0 && !e.reachedEnd) {
          this.gold += e.reward;
          this.killedCount++;
        }
      }
    }

    // 清理
    this.enemies = this.enemies.filter(e => !e.dead);
    this.bullets = this.bullets.filter(b => !b.dead);
    this.effects = this.effects.filter(ef => !ef.dead);
    for (const ef of this.effects) ef.update(dt);

    // 失败判定
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = GameState.OVER;
      this.emitChange();
    }
  }

  // ---------- 渲染 ----------
  render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = '#20242c';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.grid.draw(ctx);

    // 选中塔的射程圈
    if (this.selectedTower) {
      this.drawRange(ctx, this.selectedTower.x, this.selectedTower.y, this.selectedTower.range, this.selectedTower.color);
    }

    // 悬停格子预览
    if (this.hoverCell && this.selectedTowerType) {
      const { c, r } = this.hoverCell;
      const canBuild = this.grid.canBuild(c, r) && !this.towerAt(c, r);
      const affordable = this.canAfford(this.selectedTowerType);
      const p = this.grid.cellToPixel(c, r);
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = (canBuild && affordable) ? '#6cf' : '#ff6b6b';
      ctx.fillRect(p.x, p.y, this.grid.cell, this.grid.cell);
      ctx.globalAlpha = 1;
      if (canBuild) {
        const center = this.grid.cellCenter(c, r);
        this.drawRange(ctx, center.x, center.y, CONFIG.towers[this.selectedTowerType].range, '#6cf');
      }
    }

    // 塔
    for (const t of this.towers) t.draw(ctx);
    // 敌人
    for (const e of this.enemies) e.draw(ctx);
    // 子弹
    for (const b of this.bullets) b.draw(ctx);
    // 特效
    for (const ef of this.effects) ef.draw(ctx);

    // 状态提示
    if (this.state === GameState.READY) {
      this.drawCenterText(ctx, '准备就绪 - 点击「开始波次」');
    } else if (this.state === GameState.OVER) {
      this.drawCenterText(ctx, '游戏结束 - 基地被摧毁', '#ff6b6b');
    } else if (this.state === GameState.WIN) {
      this.drawCenterText(ctx, '胜利！全部波次已清空', '#51cf66');
    } else if (this.state === GameState.PAUSED) {
      this.drawCenterText(ctx, '已暂停', '#ffd43b');
    }
  }

  drawRange(ctx, x, y, range, color) {
    ctx.save();
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, range, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x, y, range, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  drawCenterText(ctx, text, color = '#e6e9ef') {
    ctx.save();
    ctx.font = 'bold 28px "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, this.canvas.height / 2 - 40, this.canvas.width, 80);
    ctx.fillStyle = color;
    ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2);
    ctx.restore();
  }
}