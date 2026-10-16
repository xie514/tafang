// ============ 入口 & UI ============
(function () {
  const canvas = document.getElementById('game-canvas');
  const game = new Game(canvas);
  window.__game = game;

  const $ = id => document.getElementById(id);
  const elGold = $('stat-gold');
  const elHp = $('stat-hp');
  const elWave = $('stat-wave');
  const elEnemies = $('stat-enemies');
  const elTowerList = $('tower-list');
  const btnStart = $('btn-start');
  const btnPause = $('btn-pause');
  const btnSpeed = $('btn-speed');
  const btnReset = $('btn-reset');
  const hint = $('hint');
  const overlay = $('overlay');
  const overlayTitle = $('overlay-title');
  const overlayText = $('overlay-text');
  const overlayBtn = $('overlay-btn');

  function buildTowerList() {
    elTowerList.innerHTML = '';
    for (const key in CONFIG.towers) {
      const def = CONFIG.towers[key];
      const btn = document.createElement('button');
      btn.className = 'tower-btn';
      btn.dataset.type = key;
      btn.innerHTML = `
        <span class="tower-swatch" style="background:${def.color}"></span>
        <span class="tower-info">
          <span class="tname">${def.name}</span>
          <span class="tcost">${def.cost} 金</span>
        </span>`;
      btn.title = def.desc;
      btn.addEventListener('click', () => {
        const g = window.__game;
        if (g.selectedTowerType === key) g.selectTowerType(null);
        else g.selectTowerType(key);
        g.emitChange();
      });
      elTowerList.appendChild(btn);
    }
  }

  // 记录上一帧的UI签名，只有变化才重绘
  let lastSig = '';
  function makeSig() {
    const wm = game.waveManager;
    return [
      game.gold, game.hp, game.state, game.speedMul,
      wm.currentWave, wm.waveActive,
      game.enemies.length, wm.pendingCount,
      game.selectedTowerType,
      game.selectedTower ? game.selectedTower.id : 0,
      game.towers.length,
    ].join('|');
  }

  function refreshUI() {
    const sig = makeSig();
    if (sig === lastSig) return;
    lastSig = sig;

    elGold.textContent = game.gold;
    elHp.textContent = game.hp;
    elWave.textContent = `${game.waveManager.currentWave}/${game.waveManager.totalWaves}`;
    elEnemies.textContent = game.enemies.length + game.waveManager.pendingCount;

    document.querySelectorAll('.tower-btn').forEach(btn => {
      const key = btn.dataset.type;
      const def = CONFIG.towers[key];
      btn.classList.toggle('selected', game.selectedTowerType === key);
      btn.disabled = game.gold < def.cost && game.selectedTowerType !== key;
    });

    const wm = game.waveManager;
    if (game.state === 'over' || game.state === 'win') {
      btnStart.disabled = true;
      btnStart.textContent = '游戏结束';
    } else if (wm.waveActive) {
      btnStart.disabled = true;
      btnStart.textContent = '进行中...';
    } else if (wm.currentWave >= wm.totalWaves) {
      btnStart.disabled = true;
      btnStart.textContent = '已通关';
    } else {
      btnStart.disabled = false;
      btnStart.textContent = `开始第 ${wm.currentWave + 1} 波`;
    }

    btnPause.textContent = game.state === 'paused' ? '继续' : '暂停';
    btnSpeed.textContent = `速度 x${game.speedMul}`;

    if (game.selectedTower) {
      const t = game.selectedTower;
      hint.innerHTML = `已选：<b>${t.name}</b> | 伤害 ${t.damage} | 射速 ${t.fireRate}/s | 射程 ${t.range}<br>点击此塔可出售（返还 ${Math.floor(t.cost * CONFIG.sellRatio)} 金）`;
    } else if (game.selectedTowerType) {
      hint.textContent = `已选塔型：${CONFIG.towers[game.selectedTowerType].name}，点击草地放置。右键取消。`;
    } else {
      hint.textContent = '选中塔后点击草地放置。点击已放塔可查看/出售。';
    }

    if (game.state === 'over') {
      showOverlay('游戏结束', `你坚持到了第 ${game.waveManager.currentWave} 波，击杀 ${game.killedCount} 个敌人`, '重新开始', () => { game.reset(); hideOverlay(); });
    } else if (game.state === 'win') {
      showOverlay('胜利！', `全部 ${game.waveManager.totalWaves} 波已清空，击杀 ${game.killedCount} 个敌人`, '再玩一次', () => { game.reset(); hideOverlay(); });
    } else {
      hideOverlay();
    }
  }

  function showOverlay(title, text, btnText, onClick) {
    if (overlayTitle.textContent !== title) overlayTitle.textContent = title;
    if (overlayText.textContent !== text) overlayText.textContent = text;
    if (overlayBtn.textContent !== btnText) overlayBtn.textContent = btnText;
    overlay.classList.remove('hidden');
    overlayBtn.onclick = onClick;
  }
  function hideOverlay() {
    overlay.classList.add('hidden');
  }

  game.onStateChange = () => { lastSig = ''; refreshUI(); };

  btnStart.addEventListener('click', () => game.startWave());
  btnPause.addEventListener('click', () => game.togglePause());
  btnSpeed.addEventListener('click', () => game.cycleSpeed());
  btnReset.addEventListener('click', () => { game.reset(); hideOverlay(); });

  function getCanvasPos(evt) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (evt.clientX - rect.left) * scaleX,
      y: (evt.clientY - rect.top) * scaleY,
    };
  }

  canvas.addEventListener('mousemove', (evt) => {
    const p = getCanvasPos(evt);
    game.hoverCell = game.grid.pixelToCell(p.x, p.y);
  });

  canvas.addEventListener('mouseleave', () => { game.hoverCell = null; });

  canvas.addEventListener('click', (evt) => {
    if (game.state === 'over' || game.state === 'win') return;
    const p = getCanvasPos(evt);
    const cell = game.grid.pixelToCell(p.x, p.y);
    if (!game.grid.inBounds(cell.c, cell.r)) return;

    const existing = game.towerAt(cell.c, cell.r);
    if (existing) {
      if (game.selectedTower === existing) {
        game.sellTower(existing);
      } else {
        game.selectedTower = existing;
        game.selectedTowerType = null;
        game.emitChange();
      }
      return;
    }

    if (game.selectedTowerType) {
      game.placeTower(cell.c, cell.r);
    } else {
      game.selectedTower = null;
      game.emitChange();
    }
  });

  canvas.addEventListener('contextmenu', (evt) => {
    evt.preventDefault();
    game.selectedTowerType = null;
    game.selectedTower = null;
    game.emitChange();
  });

  window.addEventListener('keydown', (evt) => {
    if (evt.key === ' ') { evt.preventDefault(); game.togglePause(); }
    else if (evt.key === 'Escape') { game.selectedTowerType = null; game.selectedTower = null; game.emitChange(); }
    else if (evt.key === 'Enter') { game.startWave(); }
  });

  let lastTime = performance.now();
  function loop(now) {
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    if (dt > 0.1) dt = 0.1;

    game.update(dt);
    game.render();
    refreshUI();

    requestAnimationFrame(loop);
  }

  buildTowerList();
  refreshUI();
  requestAnimationFrame(loop);
})();