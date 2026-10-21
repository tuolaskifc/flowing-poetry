/* Project-authored low dwellings and temple hall, built with local ink brush.
 * Symbols for poetic settings, not historical architectural reconstructions.
 */
window.PoemDrawing.register({
  id:'dwelling',name:'房舍 · 寺院',subtitle:'一片屋檐，几笔墙影，让人知道那里可以停留。',sources:['project'],credit:'本项目 · 房舍与寺院墨意',reference:'drawing/README.md',
  note:'房舍与寺院的低层屋顶、疏窗和门洞；不添加人物，不区分具体朝代或真实建筑。',
  controls:[{id:'kind',label:'屋舍',default:'house',choices:[{value:'house',label:'房舍'},{value:'temple',label:'寺院'}]}],capabilities:['static','anchors','shape-selection'],
  create(ctx){
    const {p,alpha}=ctx,brush=window.PoemInkBrush.create(ctx);let state;
    function reset(){state={width:p.random(220,255),rise:p.random(48,61),tilt:p.random(-4,4),shift:p.random(-7,7),salt:p.random(0,8)};}
    function draw(){
      const temple=ctx.options.kind==='temple',w=state.width*(temple?1.12:1),base=307,top=208,x=320+state.shift,ink=ctx.palette.ink;
      brush.fill(ctx.palette.main,45,c=>{c.moveTo(x-w*.44,top);c.lineTo(x+w*.43,top+state.tilt);c.lineTo(x+w*.43,base);c.lineTo(x-w*.44,base-4);});
      brush.fill(ctx.palette.ink,18,c=>{c.moveTo(x-w*.44,top);c.lineTo(x-w*.18,top+2);c.lineTo(x-w*.2,base-2);c.lineTo(x-w*.44,base-4);});
      const roof=(cx,y,r,templeRoof)=>{
        const rise=state.rise*(templeRoof?1:.82);brush.fill(ctx.palette.main,110,c=>{c.moveTo(cx-r*.58,y+10);c.bezierCurveTo(cx-r*.35,y+8,cx-r*.08,y-rise,cx+5,y-rise);c.bezierCurveTo(cx+r*.23,y-rise*.36,cx+r*.38,y+8,cx+r*.59,y+5);c.bezierCurveTo(cx+r*.2,y+18,cx-r*.22,y+16,cx-r*.58,y+10);});
        brush.stroke([cx-r*.6,y+9,cx-r*.27,y+14,cx+r*.22,y+15,cx+r*.61,y+4],2.1,ink,175,state.salt,true);
        brush.stroke([cx-r*.49,y+5,cx-r*.22,y-12,cx-r*.03,y-rise,cx+5,y-rise],1.35,ink,125,state.salt+1,true);
        brush.stroke([cx+5,y-rise,cx+r*.16,y-rise*.4,cx+r*.3,y+2,cx+r*.51,y+1],1.1,ink,125,state.salt+2,true);
        if(templeRoof){brush.stroke([cx-r*.6,y+9,cx-r*.65,y+4,cx-r*.66,y-3,cx-r*.64,y-10],1.1,ink,150,2);brush.stroke([cx+r*.61,y+4,cx+r*.65,y-1,cx+r*.66,y-7,cx+r*.64,y-13],1.1,ink,150,3);}
      };
      roof(x,top,w,temple);
      if(temple){roof(x-w*.61,242,w*.43,false);roof(x+w*.61,240,w*.43,false);for(const s of [-1,1]){brush.stroke([x+s*w*.72,250,x+s*w*.72,270,x+s*w*.72,290,x+s*w*.72,base],1,ink,110,4,true);brush.stroke([x+s*w*.45,250,x+s*w*.45,270,x+s*w*.45,290,x+s*w*.45,base],1,ink,110,5,true);}}
      brush.stroke([x-w*.43,top+13,x-w*.43,240,x-w*.44,275,x-w*.44,base],1.35,ink,150,6,true);
      brush.stroke([x+w*.43,top+13,x+w*.43,245,x+w*.43,280,x+w*.43,base],.95,ink,110,7,true);
      brush.fill(ink,62,c=>{c.moveTo(x-17,base);c.lineTo(x-17,258);c.quadraticCurveTo(x,247,x+18,258);c.lineTo(x+18,base);});
      for(const side of [-1,1]){const wx=x+side*w*.27;brush.stroke([wx-15,250,wx-5,249,wx+5,250,wx+16,249],1,ink,120,8);brush.stroke([wx-15,270,wx-5,270,wx+5,269,wx+16,269],.8,ink,105,9);for(const k of [-1,0,1])brush.stroke([wx+k*11,251,wx+k*11,258,wx+k*11,264,wx+k*11,270],.65,ink,110,10);}
      brush.stroke([x-w*.55,base+3,x-w*.15,base+8,x+w*.2,base+6,x+w*.57,base+1],1.6,ink,90,11,true);
    }
    return {reset,draw,anchors:()=>[{id:'base',x:320,y:307}],inspect:()=>({dwellingCount:1,kind:ctx.options.kind,personCount:0,finite:Object.values(state).every(Number.isFinite),geometryKey:ctx.fingerprint(state)})};
  }
});
