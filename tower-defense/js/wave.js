// ============ 波次管理 ============
class WaveManager {
  constructor(game) {
    this.game = game;
    this.currentWave = 0;      // 已完成波次数
    this.spawning = false;
    this.spawnQueue = [];      // 待生成敌人 {typeKey, hpMul}
    this.spawnTimer = 0;
    this.spawnInterval = 1;
    this.allSpawned = false;
    this.waveActive = false;
  }

  get totalWaves() { return CONFIG.waves.length; }

  startNextWave() {
    if (this.waveActive) return false;
    if (this.currentWave >= this.totalWaves) return false;

    const w = CONFIG.waves[this.currentWave];
    this.spawnQueue = [];
    for (let i = 0; i < w.count; i++) {
      this.spawnQueue.push({ typeKey: w.type, hpMul: w.hpMul });
    }
    this.spawnInterval = w.interval;
    this.spawnTimer = 0;
    this.spawning = true;
    this.allSpawned = false;
    this.waveActive = true;
    this.currentWave++;
    return true;
  }

  update(dt) {
    if (!this.waveActive) return;

    if (this.spawning) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.spawnQueue.length > 0) {
        const item = this.spawnQueue.shift();
        const e = new Enemy(this.game.grid.pathPoints, item.typeKey, item.hpMul);
        this.game.enemies.push(e);
        this.spawnTimer = this.spawnInterval;
      }
      if (this.spawnQueue.length === 0) {
        this.spawning = false;
        this.allSpawned = true;
      }
    }

    // 波次结束：全部生成完 && 场上无敌人
    if (this.allSpawned && this.game.enemies.length === 0) {
      this.waveActive = false;
      this.game.onWaveCleared();
    }
  }

  get pendingCount() {
    return this.spawnQueue.length;
  }
}