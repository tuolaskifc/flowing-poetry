/* Extracted from the first local study; provenance is declared by source id. */
window.PoemDrawing.register({
"id":"mist","name":"薄雾","subtitle":"边缘散开，形体仍然相连。","credit":"本项目试作 · 柔边色层与平移","note":"柔边色层；尚未实现实体遮蔽、消散或显露关系。","sources":["project"],"reference":"ref-mist",
capabilities:["wind-response", "density-detail"],
create(ctx) {
 const {p,width:W,height:H,alpha}=ctx; const shared=ctx.settings;
 let state={},time=0,palette=ctx.palette;
 function reset() {
state.banks=Array.from({length:3},(_,i)=>({x:100+i*200,y:145+p.random(-35,60),phase:p.random(p.TWO_PI),puffs:Array.from({length:18},()=>({x:p.random(-130,130),y:p.random(-30,30),rx:p.random(55,120),ry:p.random(18,38)}))}));
 }
function mist() {
        const canvasContext=p.drawingContext;
        for(const b of state.banks) {
          const shift=ctx.wind.offset(b.phase,52,.17);
          const count=Math.round(9+shared.density*9);
          for(const q of b.puffs.slice(0,count)) {
            const x=b.x+q.x+shift,y=b.y+q.y+Math.sin(time*.23+b.phase)*4;
            const c=p.color(palette.ink);canvasContext.save();canvasContext.translate(x,y);canvasContext.scale(q.rx,q.ry);
            const grad=canvasContext.createRadialGradient(0,0,0,0,0,1);
            grad.addColorStop(0,`rgba(${p.red(c)},${p.green(c)},${p.blue(c)},0.075)`);grad.addColorStop(1,`rgba(${p.red(c)},${p.green(c)},${p.blue(c)},0)`);
            canvasContext.fillStyle=grad;canvasContext.fillRect(-1,-1,2,2);canvasContext.restore();
          }
        }
        p.stroke(alpha(p,palette.main,70));p.strokeWeight(.6);p.line(55,H-65,W-55,H-65);
      }
return {reset,draw(){time=ctx.time;palette=ctx.palette;mist();},inspect(){return {finite:true,geometryKey:ctx.fingerprint(state.banks)};}};
}
});
