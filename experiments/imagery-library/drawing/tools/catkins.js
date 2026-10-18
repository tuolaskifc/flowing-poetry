/* Project-authored fibrous tufts and bounded one-pass drift. */
window.PoemDrawing.register({
  id:'catkins',name:'柳絮',subtitle:'轻絮展开细丝，与花瓣分开。',
  credit:'本项目试作 · 细絮轮廓与风中漂移',sources:['project'],reference:'drawing/README.md#本轮植物与天气',
  note:'固定 18 团细絮，不复用花瓣轮廓。默认一次漂移后停留；循环为显式试画选项。杨花仍需先判断语境。',
  controls:[{id:'playback',label:'过程',default:'once',choices:[{value:'once',label:'一次漂移'},{value:'loop',label:'循环试画'}]}],
  capabilities:['wind-response','density-detail','once-or-loop','fixed-count'],
  create(ctx){
    const {p,width:W,alpha}=ctx;let tufts=[];
    function reset(){tufts=Array.from({length:18},()=>({x:p.random(50,W-130),y:p.random(55,250),duration:p.random(8,12),phase:p.random(p.TWO_PI),size:p.random(5,9),fibers:Array.from({length:9},()=>({angle:p.random(p.TWO_PI),length:p.random(.7,1.3)}))}));}
    function pose(t){const time=ctx.options.playback==='loop'?ctx.time%t.duration:Math.min(ctx.time,t.duration),q=time/t.duration;return {x:t.x+q*65*ctx.wind.strength+Math.sin(time*.6+t.phase)*ctx.wind.strength*16,y:t.y+q*55};}
    function draw(){
      for(const t of tufts){const at=pose(t);p.push();p.translate(at.x,at.y);p.noFill();p.stroke(alpha(p,ctx.palette.ink,75));p.strokeWeight(.5);
        for(const f of t.fibers){const x=Math.cos(f.angle)*t.size*f.length,y=Math.sin(f.angle)*t.size*f.length;p.bezier(0,0,x*.2,y*.7,x*.7,y*.9,x,y);if(ctx.settings.density>.5){p.line(x*.6,y*.6,x*.8-1,y*.8+1);}}
        p.noStroke();p.fill(alpha(p,ctx.palette.main,160));p.ellipse(0,1,2,3);p.pop();
      }
    }
    return {reset,draw,inspect:()=>({tuftCount:18,poseKey:ctx.fingerprint(tufts.map(pose)),finite:tufts.every(t=>Number.isFinite(pose(t).x+pose(t).y)),geometryKey:ctx.fingerprint(tufts)})};
  }
});
