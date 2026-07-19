import { memo, useMemo, useRef, useState, useEffect } from 'react';
import type { ChainTile, EndSide } from '@/types/game';
import { layoutChain } from '@/lib/snakeLayout';
import { DominoTile } from './DominoTile';

interface BoardProps {
  chain: ChainTile[];
  className?: string;
  highlightEnds?: EndSide[];
  onSelectSide?: (side: EndSide) => void;
}

const CELL = 32;

function BoardComponent({
  chain,
  className = '',
  highlightEnds = [],
  onSelectSide,
}: BoardProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const [size, setSize] = useState({
    width: 600,
    height: 400,
  });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const observer = new ResizeObserver(() => {
      setSize({
        width: element.clientWidth,
        height: element.clientHeight,
      });
    });

    observer.observe(element);

    setSize({
      width: element.clientWidth,
      height: element.clientHeight,
    });

    return () => observer.disconnect();
  }, []);

  const layout = useMemo(
    () => layoutChain(chain),
    [chain]
  );


  if (!chain.length) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{
          borderRadius: 16,
          border:
            '2px dashed rgba(201,168,76,.25)',
          background:
            'rgba(13,122,58,.15)',
        }}
      >
        <span className="text-[#B8A080] font-arabic">
          ابدأ اللعب
        </span>
      </div>
    );
  }


  const padding = 2;

  const boardWidth =
    (layout.width + padding * 2) * CELL;

  const boardHeight =
    (layout.height + padding * 2) * CELL;


  const scale = Math.min(
    size.width / boardWidth,
    size.height / boardHeight,
    1
  );


  const first = layout.tiles[0];
  const last =
    layout.tiles[layout.tiles.length - 1];


  const renderTile = (
    item: typeof layout.tiles[number]
  ) => {

    const centerX =
      (padding + item.x + item.w / 2) * CELL;

    const centerY =
      (padding + item.y + item.h / 2) * CELL;


    return (
      <div
        key={item.tile.id}
        className="absolute"
        style={{
          left: centerX,
          top: centerY,
          transform:
            `translate(-50%, -50%) rotate(${item.rotation}deg)`,
          transformOrigin:
            'center center',
        }}
      >
        <DominoTile
          tile={item.tile}
          size="md"
          faceUp
        />
      </div>
    );
  };


  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        borderRadius:16,
        background:
          'rgba(13,122,58,.10)',
        border:
          '1px solid rgba(201,168,76,.15)',
      }}
    >

      <div
        className="absolute"
        style={{
          width:boardWidth,
          height:boardHeight,

          left:'50%',
          top:'50%',

          transform:
            `translate(-50%,-50%) scale(${scale})`,

          transformOrigin:
            'center center',
        }}
      >

        {
          layout.tiles.map(renderTile)
        }


        {
          highlightEnds.includes('left') && first && (
            <div
              onClick={() =>
                onSelectSide?.('left')
              }
              className="
                absolute
                cursor-pointer
                animate-pulse
                rounded-lg
              "
              style={{
                left:
                  (padding + first.x - 1)
                  * CELL,

                top:
                  (padding + first.y)
                  * CELL,

                width:
                  CELL * 1.5,

                height:
                  CELL * 1.5,

                border:
                  '3px dashed #2ECC40',

                background:
                  'rgba(46,204,64,.15)',
              }}
            />
          )
        }


        {
          highlightEnds.includes('right') && last && (
            <div
              onClick={() =>
                onSelectSide?.('right')
              }
              className="
                absolute
                cursor-pointer
                animate-pulse
                rounded-lg
              "
              style={{
                left:
                  (padding +
                    last.x +
                    last.w)
                  * CELL,

                top:
                  (padding + last.y)
                  * CELL,

                width:
                  CELL * 1.5,

                height:
                  CELL * 1.5,

                border:
                  '3px dashed #2ECC40',

                background:
                  'rgba(46,204,64,.15)',
              }}
            />
          )
        }

      </div>

    </div>
  );
}


export const Board = memo(BoardComponent);

Board.displayName = 'Board';