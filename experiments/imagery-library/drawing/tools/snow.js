/* Project-authored snow particles and separate resting surface study. */
window.PoemDrawing.register({
  id:'snow',name:'雪',subtitle:'飘雪与积雪，是两种不同的状态。',
  credit:'本项目试作 · 雪点漂移与地表覆雪',sources:['project'],reference:'drawing/README.md#本轮植物与天气',
  note:'飘落模式为固定 60 点的循环试画；积雪模式为静止地表覆层。两者单独选择，不自动把“雪”解释成正在下雪。',
  controls:[{id:'state',label:'状态',default:'fall',choices:[{value:'fall',label:'飘雪'},{value:'settled',label:'积雪'}]}],
  capabilities:['wind-response','state-selection','density-detail','fixed-count'],
  create(ctx){
    const {p,width:W,height:H,alpha}=ctx;let flakes=[],ground=[];
    function reset(){flakes=Array.from({length:60},()=>({x:p.random(W),y:p.random(H),speed:p.random(16,38),radius:p.random(1.5,3),phase:p.random(p.TWO_PI)}));ground=Array.from({length:65},(_,i)=>({x:i*W/64,y:300+p.noise(i*.12)*20}));}
    function draw(){
      if(ctx.options.state==='settled'){
        // A visible substrate and a lighter snow material keep the resting layer
        // legible on a pale palette; it is not merely a line on the background.
        p.noStroke();p.fill(alpha(p,ctx.palette.main,150));p.rect(0,320,W,H-320);
        p.fill(p.lerpColor(p.color(ctx.palette.bg),p.color('#ffffff'),.72));p.stroke(alpha(p,ctx.palette.ink,110));p.strokeWeight(.8);p.beginShape();p.vertex(0,H-14);for(const q of ground)p.vertex(q.x,q.y);p.vertex(W,H-14);p.endShape(p.CLOSE);
        p.stroke(alpha(p,ctx.palette.main,125));const n=6+Math.round(ctx.settings.density*12);for(let i=0;i<n;i++){const q=ground[2+i*3];p.line(q.x,q.y+12,q.x+20,q.y+10);}return;
      }
      for(const f of flakes){
        const y=(f.y+ctx.time*f.speed)%(H+12)-6,x=((f.x+ctx.time*ctx.wind.strength*20+Math.sin(ctx.time*.5+f.phase)*ctx.wind.strength*14)%(W+16)+W+16)%(W+16)-8;
        p.stroke(alpha(p,ctx.palette.ink,85));p.strokeWeight(.5);p.fill(alpha(p,ctx.palette.light||ctx.palette.bg,255));p.circle(x,y,f.radius*2);
        if(ctx.settings.density>.5){p.stroke(alpha(p,ctx.palette.main,160));p.line(x-f.radius,y,x+f.radius,y);p.line(x,y-f.radius,x,y+f.radius);}
      }
    }
    return {reset,draw,inspect:()=>({snowParticleCount:ctx.options.state==='fall'?60:0,state:ctx.options.state,finite:flakes.every(f=>Number.isFinite(f.x+f.y+f.speed)),geometryKey:ctx.fingerprint({flakes,ground})})};
  }
});
