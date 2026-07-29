function layoutArm(
  tiles: ChainTile[],
  inwardValue: (ct: ChainTile) => number,
  startX: number,
  bound: number,
  turnSign: 1 | -1,
  out: PositionedTile[]
): void {
  const cursor: ArmCursor = { x: startX, y: 0, dir: turnSign === 1 ? 1 : -1, turnSign };
  cursor.dir = bound > startX ? 1 : -1;

  for (const ct of tiles) {
    const { tile } = ct;
    const inward = inwardValue(ct);

    if (tile.isDouble) {
      const w = 1;
      const h = 2;
      const x = cursor.dir === 1 ? cursor.x : cursor.x - 1;
      const y = cursor.y - 0.5;
      out.push({ tile, x, y, w, h, rotation: 0, isDouble: true });
      cursor.x += cursor.dir * 1;
      continue;
    }

    const nextEdge = cursor.x + cursor.dir * 2;
    const needTurn =
      (cursor.dir === 1 && nextEdge > bound) ||
      (cursor.dir === -1 && nextEdge < bound);

    if (needTurn) {
      const w = 1;
      const h = 2;
      const x = cursor.dir === 1 ? cursor.x : cursor.x - 1;
      
      // إصلاح الإحداثي: يجب أن تبدأ القطعة العمودية من نفس صف الخط الأفقي لتتصل به
      const y = cursor.turnSign === 1 ? cursor.y : cursor.y - 2;
      const rotation = tile.bottom === inward ? 0 : 180;
      
      out.push({ tile, x, y, w, h, rotation, isDouble: false });
      
      // إصلاح قفز الصف: ينزاح للأسفل بمقدار 2، وللأعلى بمقدار 3 (ليكون النصف العلوي هو نقطة الاتصال)
      cursor.y += cursor.turnSign === 1 ? 2 : -3;
      cursor.dir = (cursor.dir * -1) as 1 | -1;
      cursor.x = cursor.dir === 1 ? x + 1 : x;
      continue;
    }

    const w = 2;
    const h = 1;
    const x = cursor.dir === 1 ? cursor.x : cursor.x - 2;
    const y = cursor.y;
    const face: 'east' | 'west' = cursor.dir === 1 ? 'west' : 'east';
    const rotation = rotationFor(tile, inward, face);
    out.push({ tile, x, y, w, h, rotation, isDouble: false });
    cursor.x = nextEdge;
  }
}