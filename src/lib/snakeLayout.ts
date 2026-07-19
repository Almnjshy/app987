/**
 * تخطيط سلسلة الدومينو للعرض فقط.
 * يعتمد على ChainTile.left/right وهي الحقيقة القادمة من المحرك.
 */

import type { ChainTile, Tile } from '@/types/game';

export interface PositionedTile {
  tile: Tile;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  isDouble: boolean;
}

export interface SnakeLayout {
  tiles: PositionedTile[];
  width: number;
  height: number;
}

const TILE_W = 2;
const TILE_H = 1;

const MAX_ROW = 10;


/**
 * يحدد اتجاه القطعة بحيث يبقى الطرف الداخل
 * ملاصقاً للقطعة السابقة.
 */
function getRotation(
  ct: ChainTile,
  entry: number,
  horizontal: boolean
): number {

  const { tile } = ct;

  if (horizontal) {
    // قطعة أفقية
    if (tile.top === entry) {
      return 0;
    }

    return 180;
  }


  // قطعة رأسية
  if (tile.top === entry) {
    return 90;
  }

  return 270;
}



/**
 * حساب السلسلة كاملة.
 */
export function layoutChain(
  chain: ChainTile[]
): SnakeLayout {

  if (!chain.length) {
    return {
      tiles: [],
      width: 0,
      height: 0,
    };
  }


  const result: PositionedTile[] = [];


  let x = 0;
  let y = 0;


  // اتجاه الحركة
  let direction:
    | 'right'
    | 'left'
    | 'down'
    | 'up'
    = 'right';


  let rowCount = 0;


  /**
   * القطعة الأولى
   */
  const first = chain[0];

  result.push({
    tile:first.tile,

    x:0,
    y:0,

    w:first.tile.isDouble ? 1 : TILE_W,
    h:first.tile.isDouble ? 2 : TILE_H,

    rotation:first.tile.isDouble
      ? 0
      : 0,

    isDouble:first.tile.isDouble,
  });


  x = first.tile.isDouble ? 1 : 2;



  /**
   * باقي القطع
   */
  for(let i=1;i<chain.length;i++){

    const ct = chain[i];


    const previous =
      chain[i-1];


    const entry =
      ct.side === 'right'
        ? previous.right
        : previous.left;



    let w =
      ct.tile.isDouble
        ? 1
        : TILE_W;

    let h =
      ct.tile.isDouble
        ? 2
        : TILE_H;



    let rotation = 0;



    /*
      الدوبل يعامل كقطعة رأسية
    */
    if(ct.tile.isDouble){

      if(direction==='right'){

        result.push({
          tile:ct.tile,
          x,
          y:y-0.5,
          w,
          h,
          rotation:0,
          isDouble:true
        });

        x += 1;

      }
      else if(direction==='left'){

        result.push({
          tile:ct.tile,
          x:x-1,
          y:y-0.5,
          w,
          h,
          rotation:0,
          isDouble:true
        });

        x -= 1;
      }

      continue;
    }




    /*
      القطع الأفقية
    */

    if(direction==='right'){

      if(rowCount >= MAX_ROW){

        direction='down';
        rowCount=0;
      }
    }


    if(direction==='left'){

      if(rowCount >= MAX_ROW){

        direction='up';
        rowCount=0;
      }
    }



    if(direction==='right'){

      rotation=getRotation(
        ct,
        entry,
        true
      );


      result.push({
        tile:ct.tile,
        x,
        y,
        w,
        h,
        rotation,
        isDouble:false
      });


      x += 2;
      rowCount++;

    }


    else if(direction==='left'){

      rotation=getRotation(
        ct,
        entry,
        true
      );


      result.push({
        tile:ct.tile,
        x:x-2,
        y,
        w,
        h,
        rotation,
        isDouble:false
      });


      x-=2;
      rowCount++;

    }



    /*
      الانعطاف للأسفل
    */

    else if(direction==='down'){

      rotation=getRotation(
        ct,
        entry,
        false
      );


      result.push({
        tile:ct.tile,
        x,
        y:y+1,
        w:1,
        h:2,
        rotation,
        isDouble:false
      });


      y+=2;

      direction='left';

      rowCount=0;

    }



    /*
      الانعطاف للأعلى
    */

    else if(direction==='up'){

      rotation=getRotation(
        ct,
        entry,
        false
      );


      result.push({
        tile:ct.tile,
        x:x-1,
        y:y-2,
        w:1,
        h:2,
        rotation,
        isDouble:false
      });


      y-=2;

      direction='right';

      rowCount=0;

    }

  }



  /*
    إزالة الإحداثيات السالبة
  */

  let minX=Infinity;
  let minY=Infinity;
  let maxX=-Infinity;
  let maxY=-Infinity;


  for(const p of result){

    minX=Math.min(minX,p.x);
    minY=Math.min(minY,p.y);

    maxX=Math.max(maxX,p.x+p.w);
    maxY=Math.max(maxY,p.y+p.h);
  }



  for(const p of result){

    p.x-=minX;
    p.y-=minY;

  }



  return {

    tiles:result,

    width:maxX-minX,

    height:maxY-minY,

  };

}