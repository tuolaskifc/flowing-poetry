/* Project-authored rain-line motion; no external rain code used. */
window.PoemDrawing.register({
  id:'rain',name:'雨',subtitle:'雨线斜落，风让方向可见。',
  credit:'本项目试作 · 固定雨线与风偏移',sources:['project'],reference:'drawing/README.md#雨与落花',
  note:'固定 64 条雨线，风改变倾斜与漂移，疏密改变笔触浓淡；尚未加入积水、涟漪或雪。',
  capabilities:['wind-response','density-detail','fixed-count'],
  create(ctx){
    const {p,width:W,height:H,alpha}=ctx;let drops=[];
    function reset(){drops=Array.from({length:64},()=>({x:p.random(W),y:p.random(H),speed:p.random(100,190),length:p.random(10,24),opacity:p.random(45,105)}));}
    function draw(){
      p.noFill();p.strokeWeight(.65+ctx.settings.density*.5);
      for(const d of drops){
        const y=(d.y+ctx.time*d.speed)%(H+40)-20;
        const x=((d.x+ctx.time*d.speed*ctx.wind.strength*.3)%(W+40)+W+40)%(W+40)-20;
        p.stroke(alpha(p,ctx.palette.ink,d.opacity*(.5+ctx.settings.density*.7)));
        p.line(x,y,x+ctx.wind.strength*d.length*.5,y+d.length);
      }
    }
    return {reset,draw,inspect:()=>({dropCount:drops.length,finite:drops.every(d=>Number.isFinite(d.x+d.y+d.speed)),geometryKey:ctx.fingerprint(drops)})};
  }
});
