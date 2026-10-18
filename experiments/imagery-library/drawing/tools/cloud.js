/* Numeric outline adapter and Apache-2.0 provenance: ../cloud-outline.js. */
window.PoemDrawing.register({
  id:'cloud',name:'云',subtitle:'云有自己的轮廓，与薄雾分别看。',
  credit:'云形改编 Niels Pichon / p5.Fresco · Apache-2.0',sources:['fresco-cloud','project'],reference:'drawing/README.md#结构化云形',
  note:'固定 3 团云，圆弧与横向路径构成轮廓；不把云团直接当作烟雾，不自动加雨或雷电。',
  capabilities:['wind-response','density-detail','fixed-count'],
  create(ctx){
    const {p,alpha}=ctx;let clouds=[];
    function reset(){clouds=Array.from({length:3},(_,i)=>({x:125+i*195,y:145+(i%2)*65,phase:p.random(p.TWO_PI),points:window.PoemCloudOutline(p,p.random(165,190))}));}
    function draw(){
      for(const cloud of clouds){p.push();p.translate(cloud.x+ctx.wind.offset(cloud.phase,18,.2),cloud.y);
        p.fill(alpha(p,ctx.palette.main,55));p.stroke(alpha(p,ctx.palette.ink,120));p.strokeWeight(.85);
        p.beginShape();for(const q of cloud.points)p.vertex(q.x,q.y);p.endShape(p.CLOSE);
        p.noFill();p.stroke(alpha(p,ctx.palette.main,65));p.strokeWeight(.5);
        const lines=Math.round(ctx.settings.density*3);for(let i=1;i<=lines;i++){p.beginShape();for(const q of cloud.points)p.vertex(q.x*(1-i*.035),q.y*(1-i*.08));p.endShape(p.CLOSE);}p.pop();
      }
    }
    return {reset,draw,inspect:()=>({cloudCount:3,finite:clouds.every(c=>c.points.every(q=>Number.isFinite(q.x+q.y))),geometryKey:ctx.fingerprint(clouds)})};
  }
});
