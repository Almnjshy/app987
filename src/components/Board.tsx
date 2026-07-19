import { memo, useMemo, useRef, useState, useEffect } from 'react';
import type { ChainTile, EndSide } from '@/types/game';
import { layoutChain } from '@/lib/snakeLayout';
import { DominoTile } from './DominoTile';

interface BoardProps {
  chain: ChainTile[];
  className?: string;

  /** الأطراف التي يمكن اللعب عليها */
  highlightEnds?: EndSide[];

  /** عند اختيار طرف */
  onSelectSide?: (side: EndSide) => void;

  /** مناطق الإسقاط للسحب */
  dropSideRefs?: React.MutableRefObject<{
    left: HTMLDivElement | null;
    right: HTMLDivElement | null;
  }>;
}

const CELL = 32;

function BoardComponent({
  chain,
  className = '',
  highlightEnds = [],
  onSelectSide,
  dropSideRefs,
}: BoardProps) {

  const containerRef = useRef<HTMLDivElement>(null);

  const [containerSize, setContainerSize] = useState({
    w: 600,
    h: 400,
  });


  useEffect(() => {

    const el = containerRef.current;

    if (!el) return;


    const observer = new ResizeObserver(() => {

      setContainerSize({
        w: el.clientWidth,
        h: el.clientHeight,
      });

    });


    observer.observe(el);


    setContainerSize({
      w: el.clientWidth,
      h: el.clientHeight,
    });


    return () => observer.disconnect();

  }, []);



  const layout = useMemo(
    () => layoutChain(chain),
    [chain]
  );



  if (chain.length === 0) {

    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{
          background:
            'rgba(13,122,58,.15)',
          borderRadius:16,
          border:
            '2px dashed rgba(201,168,76,.25)',
        }}
      >

        <span className="text-[#B8A080] font-arabic">
          ابدأ اللعب
        </span>

      </div>
    );

  }



  const padding = 2;


  const fullWidth =
    (layout.width + padding * 2) * CELL;


  const fullHeight =
    (layout.height + padding * 2) * CELL;



  const scale = Math.min(
    containerSize.w / fullWidth,
    containerSize.h / fullHeight,
    1
  );



  const first =
    layout.tiles[0];

  const last =
    layout.tiles[layout.tiles.length - 1];



  return (

    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        background:
          'rgba(13,122,58,.10)',
        borderRadius:16,
        border:
          '1px solid rgba(201,168,76,.15)',
      }}
    >


      <div
        className="absolute"
        style={{
          width:fullWidth,
          height:fullHeight,

          left:'50%',
          top:'50%',

          transform:
            `translate(-50%,-50%) scale(${scale})`,

          transformOrigin:
            'center center',
        }}
      >



        {
          layout.tiles.map((item)=>{

            const x =
              (padding + item.x + item.w / 2)
              * CELL;


            const y =
              (padding + item.y + item.h / 2)
              * CELL;



            return (

              <div
                key={item.tile.id}

                className="absolute"

                style={{

                  left:x,
                  top:y,

                  transform:
                    `translate(-50%,-50%)
                     rotate(${item.rotation}deg)`,

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

          })
        }




        {/* الطرف الأيسر */}

        {
          first &&
          highlightEnds.includes('left') && (

            <div

              ref={(el)=>{

                if(dropSideRefs){
                  dropSideRefs.current.left = el;
                }

              }}


              onClick={() =>
                onSelectSide?.('left')
              }


              className="
                absolute
                cursor-pointer
                rounded-lg
                animate-pulse
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
                  '2px dashed #2ECC40',


                background:
                  'rgba(46,204,64,.15)',
              }}

            />

          )
        }





        {/* الطرف الأيمن */}

        {
          last &&
          highlightEnds.includes('right') && (

            <div


              ref={(el)=>{

                if(dropSideRefs){
                  dropSideRefs.current.right = el;
                }

              }}



              onClick={() =>
                onSelectSide?.('right')
              }



              className="
                absolute
                cursor-pointer
                rounded-lg
                animate-pulse
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
                  '2px dashed #2ECC40',


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