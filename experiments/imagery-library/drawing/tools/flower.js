/* Stem/layout from the local study; petals now use the adapted sxywu helper.
 * Source, original MIT designation and modifications: ../sources.js.
 */
window.PoemDrawing.register({
"id":"flower","name":"花","subtitle":"花瓣有形，风从茎上经过。","credit":"改编 sxywu 花瓣算法 · MIT；茎叶与运动为本项目试作","note":"不规则曲线花瓣与固定七株花；尚未区分梅、桃、菊等花种。","sources":["sxywu-petals", "project"],"reference":"ref-flower",
capabilities:["wind-response", "density-detail", "fixed-count"],
create(ctx) {
 const {p,width:W,height:H,alpha}=ctx; const shared=ctx.settings;
 let state={},time=0,palette=ctx.palette;
 function reset() {
 state.flowers=Array.from({length:7},(_,i)=>{
   const size=p.random(30,46),petals=p.random([5,6,8]);
   return {x:70+i*82+p.random(-15,15),y:142+p.random(-34,56),size,phase:p.random(p.TWO_PI),petals,lean:p.random(-25,25),petalGeometry:Array.from({length:petals},()=>window.PoemPetalGeometry(p,size))};
 });
 }
function flower() {
        for(const f of state.flowers) {
          const sway=ctx.wind.offset(f.phase,20);
          const x=f.x+sway,y=f.y+Math.cos(time*.6+f.phase)*shared.wind*2;
          p.noFill();p.stroke(alpha(p,palette.ink,155));p.strokeWeight(1.1);
          p.bezier(f.x,H+6,f.x+f.lean,H*.68,x-f.lean,y+70,x,y);
          p.push();p.translate(f.x+f.lean*.45,H*.7);p.rotate(-.65);
          p.fill(alpha(p,palette.main,95));p.noStroke();p.ellipse(0,0,40,10);p.pop();
          for(let k=0;k<f.petals;k++) {
            p.push();p.translate(x,y);p.rotate(k*p.TWO_PI/f.petals+f.phase*.13);
            p.fill(alpha(p,palette.main,52));p.stroke(alpha(p,palette.ink,65));p.strokeWeight(.65);
            const ctx=p.drawingContext;ctx.beginPath();ctx.moveTo(0,0);for(const curve of f.petalGeometry[k].curves)ctx.bezierCurveTo(...curve);ctx.closePath();ctx.fill();ctx.stroke();
            p.noFill();p.stroke(alpha(p,palette.ink,32));
            const lines=Math.round(3+shared.density*7);
            for(let j=0;j<lines;j++) {const bend=(j/(lines-1)-.5)*f.size*.7;p.bezier(0,-2,bend,-f.size*.5,bend,-f.size,0,-f.size*1.48);}
            p.pop();
          }
          p.noStroke();p.fill(palette.accent);p.circle(x,y,7);p.fill(alpha(p,palette.ink,160));p.circle(x,y,2);
        }
      }
return {reset,draw(){time=ctx.time;palette=ctx.palette;flower();},inspect(){return {flowerCount:state.flowers.length,finite:state.flowers.every(f=>Number.isFinite(f.x+f.y)),geometryKey:ctx.fingerprint(state.flowers)};}};
}
});
