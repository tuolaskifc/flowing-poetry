/* Extracted from the first local study; provenance is declared by source id. */
window.PoemDrawing.register({
"id":"water","name":"水","subtitle":"让线条形成水面，而非填满画面。","credit":"参考 NOC Wave · MIT","note":"水纹间距与风致起伏分开控制；尚未实现承载与岸线。","sources":["noc-wave", "project"],"reference":"ref-water",
capabilities:["wind-response", "density-spacing"],
controls:[{id:'form',label:'水纹',default:'waves',choices:[{value:'waves',label:'连续波纹'},{value:'plane',label:'疏密水面'}]}],
create(ctx) {
 const {p,width:W,height:H,alpha}=ctx; const shared=ctx.settings;
 let state={},time=0,palette=ctx.palette;
 function reset() {
state.phase=p.random(p.TWO_PI);state.ripples=Array.from({length:150},(_,i)=>{const t=p.random();return {x:p.random(-20,640),y:135+Math.pow(t,1.7)*230,length:p.random(12,68)*(.4+t),depth:t,phase:p.random(p.TWO_PI)};});
 }
function water() {
        if(ctx.options.form==='plane'){
          p.noFill();for(const r of state.ripples){p.stroke(alpha(p,palette.ink,18+r.depth*65));p.strokeWeight(.4+r.depth*.65);p.beginShape();for(let x=0;x<=r.length;x+=3)p.vertex(r.x+x,r.y+Math.sin(x*.035+r.phase-time*.6)*(1+shared.wind*2));p.endShape();}return;
        }
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
return {reset,draw(){time=ctx.time;palette=ctx.palette;water();},inspect(){return {finite:true,form:ctx.options.form,geometryKey:ctx.fingerprint(ctx.options.form==='plane'?state.ripples:{phase:state.phase})};}};
}
});
