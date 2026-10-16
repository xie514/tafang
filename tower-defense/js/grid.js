// ============ 网格与地图 ============
class Grid {
  constructor(cfg) {
    this.cols = cfg.cols;
    this.rows = cfg.rows;
    this.cell = cfg.cell;
    this.offsetX = cfg.offsetX;
    this.offsetY = cfg.offsetY;
    this.TILE = CONFIG.TILE;
    this.tiles = [];
    this.path = [];
    this.pathPoints = [];
    this.build();
  }

  build() {
    // 初始化全草地
    this.tiles = [];
    for (let r = 0; r < this.rows; r++) {
      const row = [];
      for (let c = 0; c < this.cols; c++) row.push(this.TILE.GROUND);
      this.tiles.push(row);
    }

    // 路径拐点（连续折线，相邻点必须共享行或列且步长为1）
    const corners = [
      {c:0,  r:1},
      {c:4,  r:1},
      {c:4,  r:5},
      {c:10, r:5},
      {c:10, r:1},
      {c:16, r:1},
      {c:16, r:7},
      {c:7,  r:7},
      {c:7,  r:10},
      {c:19, r:10},
    ];

    // 将拐点展开成连续的格子序列
    const pathCells = [];
    for (let i = 0; i < corners.length - 1; i++) {
      const a = corners[i];
      const b = corners[i + 1];
      const dc = Math.sign(b.c - a.c);
      const dr = Math.sign(b.r - a.r);
      let c = a.c, r = a.r;
      // 起点只在第一段加入，避免重复
      if (i === 0) pathCells.push({c, r});
      while (c !== b.c || r !== b.r) {
        c += dc;
        r += dr;
        pathCells.push({c, r});
      }
    }

    for (const p of pathCells) {
      if (this.inBounds(p.c, p.r)) this.tiles[p.r][p.c] = this.TILE.PATH;
    }
    const first = pathCells[0];
    const last = pathCells[pathCells.length - 1];
    this.tiles[first.r][first.c] = this.TILE.SPAWN;
    this.tiles[last.r][last.c] = this.TILE.BASE;
    this.spawnCell = first;
    this.baseCell = last;

    this.path = pathCells;
    this.pathPoints = pathCells.map(p => this.cellCenter(p.c, p.r));

    // 障碍装饰（不覆盖路径）
    const blocks = [{c:6,r:2},{c:7,r:2},{c:6,r:3},{c:13,r:4},{c:14,r:4},{c:2,r:8},{c:3,r:8}];
    for (const b of blocks) {
      if (this.inBounds(b.c, b.r) && this.tiles[b.r][b.c] === this.TILE.GROUND) {
        this.tiles[b.r][b.c] = this.TILE.BLOCK;
      }
    }
  }

  inBounds(c, r) {
    return c >= 0 && c < this.cols && r >= 0 && r < this.rows;
  }

  cellToPixel(c, r) {
    return {
      x: this.offsetX + c * this.cell,
      y: this.offsetY + r * this.cell,
    };
  }

  cellCenter(c, r) {
    const p = this.cellToPixel(c, r);
    return { x: p.x + this.cell / 2, y: p.y + this.cell / 2 };
  }

  pixelToCell(x, y) {
    const c = Math.floor((x - this.offsetX) / this.cell);
    const r = Math.floor((y - this.offsetY) / this.cell);
    return { c, r };
  }

  getTile(c, r) {
    if (!this.inBounds(c, r)) return this.TILE.BLOCK;
    return this.tiles[r][c];
  }

  canBuild(c, r) {
    return this.getTile(c, r) === this.TILE.GROUND;
  }

  draw(ctx) {
    const T = this.TILE;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const {x, y} = this.cellToPixel(c, r);
        const t = this.tiles[r][c];
        let fill = '#2b3a2b';
        if (t === T.PATH || t === T.SPAWN || t === T.BASE) fill = '#4a4238';
        else if (t === T.BLOCK) fill = '#3a3f47';
        ctx.fillStyle = fill;
        ctx.fillRect(x, y, this.cell, this.cell);

        ctx.strokeStyle = 'rgba(0,0,0,0.18)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, this.cell - 1, this.cell - 1);

        if (t === T.BLOCK) {
          ctx.fillStyle = '#555c66';
          ctx.beginPath();
          ctx.arc(x + this.cell/2, y + this.cell/2, this.cell*0.28, 0, Math.PI*2);
          ctx.fill();
        }
      }
    }
    if (this.spawnCell) {
      const p = this.cellCenter(this.spawnCell.c, this.spawnCell.r);
      ctx.fillStyle = 'rgba(255,80,80,0.85)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, this.cell*0.3, 0, Math.PI*2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('出', p.x, p.y);
    }
    if (this.baseCell) {
      const p = this.cellCenter(this.baseCell.c, this.baseCell.r);
      ctx.fillStyle = 'rgba(80,160,255,0.9)';
      ctx.fillRect(p.x - this.cell*0.32, p.y - this.cell*0.32, this.cell*0.64, this.cell*0.64);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('基', p.x, p.y);
    }
  }
}