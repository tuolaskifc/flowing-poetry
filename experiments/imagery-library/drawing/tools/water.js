/* Extracted from the first local study; provenance is declared by source id. */
window.PoemDrawing.register({
"id":"water","name":"水","subtitle":"让线条形成水面，而非填满画面。","credit":"参考 NOC Wave · MIT","note":"水纹间距与风致起伏分开控制；尚未实现承载与岸线。","sources":["noc-wave", "project"],"reference":"ref-water",
capabilities:["wind-response", "density-spacing"],
create(ctx) {
 const {p,width:W,height:H,alpha}=ctx; const shared=ctx.settings;
 let state={},time=0,palette=ctx.palette;
 function reset() {
state.phase=p.random(p.TWO_PI);
 }
function water() {
        p.noFill();const rows=Math.round(15+shared.density*30);
        for(let j=0;j<rows;j++) {
          p.stroke(alpha(p,j%7===0?palette.accent:palette.ink,40+j/rows*65));p.strokeWeight(j%7===0?1.15:.7);
          p.beginShape();
          for(let x=-5;x<=W+5;x+=5) {
            const y=135+j*(230/rows)+Math.sin(x*.013+j*.24-time*.7+state.phase)*(2+shared.wind*6)+Math.sin(x*.027-j*.12+time*.28)*(1+shared.wind*2);
            p.vertex(x,y);
          }p.endShape();
        }
      }
return {reset,draw(){time=ctx.time;palette=ctx.palette;water();},inspect(){return {finite:true,geometryKey:ctx.fingerprint({phase:state.phase})};}};
}
});
