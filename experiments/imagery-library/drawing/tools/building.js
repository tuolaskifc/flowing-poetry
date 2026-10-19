/* Local ink-building study: curved washes, tapered broken strokes, sparse
 * openings, unequal bays and slightly offset floors. All geometry is seeded.
 * Ridge/eave organization continues the attributed Shan, Shui adaptation;
 * the former tiled pavilion renderer remains available to the pavilion.
 */
window.PoemDrawing.register({
  id:'building',name:'楼',subtitle:'檐角挑起，几笔窗影，留一面空墙。',
  credit:'屋脊与檐的组织参考 Lingdong Huang / Shan, Shui · MIT；曲面、断笔、楼体与窗影为本项目编写',
  sources:['shan-pavilion','project'],reference:'drawing/README.md#楼与共用屋顶',
  note:'二层／三层写意楼体，以曲檐、疏窗和淡墨留白表现；始终静止，不添人物，不对应具体历史建筑。',
  controls:[{id:'levels',label:'层数',default:'two',choices:[{value:'two',label:'二层'},{value:'three',label:'三层'}]},{id:'windows',label:'窗影',default:'lattice',choices:[{value:'lattice',label:'疏笔'},{value:'open',label:'留白'}]}],
  capabilities:['static','shape-selection','density-detail','anchors','fixed-count'],
  create(ctx){
    const {p,width:W,alpha}=ctx;let state;
    const cubic=(v,t)=>{const s=1-t;return {x:s*s*s*v[0]+3*s*s*t*v[2]+3*s*t*t*v[4]+t*t*t*v[6],y:s*s*s*v[1]+3*s*s*t*v[3]+3*s*t*t*v[5]+t*t*t*v[7]};};
    function reset(){
      state={width:p.random(245,268),step:p.random(72,77),rise:p.random(37,45),phase:p.random(0,6),floors:[]};
      for(let i=0;i<3;i++)state.floors.push({
        shift:p.random(-7,7),tilt:p.random(-3,3),peak:p.random(-.11,-.04),
        bays:[p.random(-.27,-.22),p.random(-.025,.025),p.random(.21,.26)],
        marks:Array.from({length:24},()=>({t:p.random(.08,.92),length:p.random(.1,.28),weight:p.random(.35,1.1),fade:p.random(.45,1)}))
      });
    }
    function levels(){return ctx.options.levels==='three'?3:2;}
    function fill(color,opacity,path){const c=p.drawingContext;c.beginPath();path(c);c.closePath();c.fillStyle=String(alpha(p,color,opacity));c.fill();}
    // Filled ribbons vary brush width without per-frame randomness.
    function brush(v,weight,opacity,salt=0,broken=false){
      const c=p.drawingContext,n=36,runs=[];let run=[];
      for(let i=0;i<=n;i++){
        const t=i/n,point=cubic(v,t),ahead=cubic(v,Math.min(1,t+.008)),behind=cubic(v,Math.max(0,t-.008));
        const dx=ahead.x-behind.x,dy=ahead.y-behind.y,l=Math.hypot(dx,dy)||1;
        const dry=broken&&((i+Math.floor(salt*5))%19===12||(i+Math.floor(salt*5))%19===13);
        if(dry){if(run.length>1)runs.push(run);run=[];continue;}
        const radius=weight*(.2+.68*Math.pow(Math.sin(Math.PI*t),.6))*(.82+.18*Math.sin(i*1.9+salt));
        run.push({x:point.x,y:point.y,nx:-dy/l*radius,ny:dx/l*radius});
      }
      if(run.length>1)runs.push(run);
      c.fillStyle=String(alpha(p,ctx.palette.ink,opacity));
      for(const points of runs){c.beginPath();points.forEach((q,i)=>i?c.lineTo(q.x+q.nx,q.y+q.ny):c.moveTo(q.x+q.nx,q.y+q.ny));for(const q of [...points].reverse())c.lineTo(q.x-q.nx,q.y-q.ny);c.closePath();c.fill();}
    }
    function roof(w,top,floor){
      const rise=state.rise,bend=floor.tilt,left=-w*.61,right=w*.61,ridge=w*floor.peak;
      const edge=[left,top-8,-w*.27,top+17,w*.26,top+18,right,top-5+bend];
      fill(ctx.palette.main,66,c=>{
        c.moveTo(left,top-8);c.bezierCurveTo(-w*.37,top+1,ridge-w*.13,top-rise+5,ridge-w*.1,top-rise);
        c.bezierCurveTo(ridge,top-rise-3,ridge+w*.09,top-rise+3,ridge+w*.16,top-rise+1);
        c.bezierCurveTo(w*.23,top-rise+16,w*.43,top+2,right,top-5+bend);
        c.bezierCurveTo(w*.3,top+14,-w*.28,top+17,left,top-8);
      });
      fill(ctx.palette.ink,27,c=>{
        c.moveTo(left+7,top-5);c.bezierCurveTo(-w*.24,top+9,w*.27,top+11,right-7,top-2+bend);
        c.bezierCurveTo(w*.28,top+18,-w*.21,top+17,left+7,top-5);
      });
      brush(edge,2.3,180,state.phase,true);
      brush([left,top-8,-w*.37,top+1,ridge-w*.13,top-rise+5,ridge-w*.1,top-rise],1.1,105,state.phase+1);
      brush([ridge-w*.12,top-rise,ridge-w*.03,top-rise-2,ridge+w*.09,top-rise+3,ridge+w*.18,top-rise+1],1.45,168,state.phase+2);
      brush([ridge+w*.16,top-rise+1,w*.24,top-rise+17,w*.43,top+2,right,top-5+bend],.9,85,state.phase+3,true);
      const n=3+Math.round(ctx.settings.density*8);
      for(const m of floor.marks.slice(0,n)){
        const t=m.t,x=-w*.35+t*w*.66,y=top-state.rise*(.77-Math.abs(t-.38)*.8);
        brush([x,y,x+w*.025,y+4,x+w*.04,y+9,x+w*.045,y+state.rise*m.length],m.weight*.65,38*m.fade,m.t*12);
      }
    }
    function opening(x,top,height,w,door,salt){
      const y=top+20,ow=w*(door?.115:.13),h=door?height-20:height*.34;
      if(ctx.options.windows==='lattice'||door){
        fill(ctx.palette.ink,door?24:18,c=>{c.moveTo(x-ow*.43,y+2);c.lineTo(x+ow*.45,y);c.lineTo(x+ow*.5,y+h);c.lineTo(x-ow*.5,y+h-1);});
        brush([x-ow*.5,y+1,x-ow*.52,y+h*.3,x-ow*.46,y+h*.7,x-ow*.47,y+h],door?1:.7,124,salt,true);
        brush([x-ow*.5,y+1,x-ow*.1,y-1,x+ow*.2,y,x+ow*.5,y-1],.85,148,salt+1);
        if(!door){
          brush([x,y+2,x-1,y+h*.3,x+1,y+h*.75,x,y+h-1],.55,94,salt+2,true);
          brush([x-ow*.46,y+h*.56,x-ow*.2,y+h*.5,x+ow*.1,y+h*.6,x+ow*.4,y+h*.51],.48,83,salt+3);
        }
      }
    }
    function draw(){
      p.push();p.translate(W/2,0);const count=levels(),base=320;
      brush([-state.width*.55,base+3,-state.width*.2,base+7,state.width*.18,base+5,state.width*.53,base+1],1.25,65,state.phase,true);
      for(let i=0;i<count;i++){
        const floor=state.floors[i],w=state.width*Math.pow(.88,i),top=base-(i+1)*state.step,bottom=base-i*state.step;
        p.push();p.translate(floor.shift,0);
        fill(ctx.palette.main,27,c=>{c.moveTo(-w*.43,top+8);c.lineTo(w*.4,top+9+floor.tilt);c.lineTo(w*.39,bottom-2);c.bezierCurveTo(w*.12,bottom+1,-w*.12,bottom-1,-w*.43,bottom+1);});
        fill(ctx.palette.main,23,c=>{c.moveTo(-w*.43,top+10);c.lineTo(-w*.25,top+12);c.lineTo(-w*.28,bottom);c.lineTo(-w*.45,bottom+1);});
        brush([-w*.42,top+12,-w*.43,top+29,-w*.4,bottom-20,-w*.43,bottom],1.35,145,state.phase+i,true);
        brush([w*.39,top+13,w*.4,top+30,w*.38,bottom-21,w*.39,bottom-3],.75,65,state.phase+i+2,true);
        for(let column=0;column<3;column++)opening(w*floor.bays[column],top,state.step,w,i===0&&column===1,state.phase+column+i);
        if(i>0){
          brush([-w*.47,bottom-6,-w*.17,bottom-3,w*.15,bottom-6,w*.47,bottom-11],1.15,132,state.phase+i,true);
          brush([-w*.43,bottom-16,-w*.17,bottom-13,w*.15,bottom-16,w*.43,bottom-20],.6,100,state.phase+i+1,true);
          for(const t of [-.38,-.13,.17,.37]){const x=w*t;brush([x,bottom-16,x+.5,bottom-12,x-1,bottom-8,x,bottom-5],.6,90,state.phase+t);}
        }
        roof(w,top,floor);p.pop();
      }
      p.pop();
    }
    return {reset,draw,anchors:()=>[{id:'base',x:W/2,y:320},{id:'roof',x:W/2+state.floors[levels()-1].shift+state.width*Math.pow(.88,levels()-1)*state.floors[levels()-1].peak,y:320-levels()*state.step-state.rise}],inspect:()=>({buildingCount:1,levelCount:levels(),windowCount:levels()*3-1,doorCount:1,personCount:0,style:'loose-ink',finite:[state.width,state.step,state.rise,...state.floors.flatMap(f=>[f.shift,f.tilt,f.peak,...f.bays])].every(Number.isFinite),geometryKey:ctx.fingerprint(state)})};
  }
});
