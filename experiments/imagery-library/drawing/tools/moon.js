/* Project-authored circle/halo study. No external imagery code used. */
window.PoemDrawing.register({
  id:'moon',name:'月',subtitle:'留一轮月体，让周围保持安静。',
  credit:'本项目试作 · 月体与局部光感',sources:['project'],reference:'drawing/README.md#月',
  note:'这一张试圆月轮廓，保持静止；不把圆月、光晕或夜景作为所有“月”字的默认解释。',
  capabilities:["static", "density-detail", "anchors", "fixed-count"],
create(ctx){
    const {p,width:W,alpha}=ctx;let state;
    function reset(){state={x:W/2,y:175,radius:p.random(48,65)};}
    function draw(){
      const palette=ctx.palette,c=p.drawingContext,light=p.color(palette.accent);
      c.save();
      const halo=c.createRadialGradient(state.x,state.y,state.radius*.85,state.x,state.y,state.radius*1.8);
      halo.addColorStop(0,`rgba(${p.red(light)},${p.green(light)},${p.blue(light)},.12)`);halo.addColorStop(1,`rgba(${p.red(light)},${p.green(light)},${p.blue(light)},0)`);
      c.fillStyle=halo;c.fillRect(state.x-state.radius*2,state.y-state.radius*2,state.radius*4,state.radius*4);c.restore();
      p.fill(alpha(p,palette.accent,50));p.stroke(alpha(p,palette.ink,125));p.strokeWeight(.7);p.circle(state.x,state.y,state.radius*2);
      // Sparse contour detail, not craters or an inferred phase.
      p.noFill();p.stroke(alpha(p,palette.main,60));
      const rings=Math.round(1+ctx.settings.density*3);
      for(let i=0;i<rings;i++)p.circle(state.x,state.y,state.radius*2-2-i*1.3);
    }
    return {reset,draw,anchors:()=>[{id:'center',x:state.x,y:state.y}],inspect:()=>({moonCount:1,finite:Number.isFinite(state.radius),geometryKey:ctx.fingerprint(state)})};
  }
});
