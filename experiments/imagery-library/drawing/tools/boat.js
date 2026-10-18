/* Hull geometry adapted from Arch.boat01, Shan, Shui, Lingdong Huang, MIT.
 * Original and full license: code-research/shan-index.html, shan-LICENSE.txt.
 * Only the sqrt(sin(pi*t)) hull profiles are retained. The original Man.man
 * composition is not used. Styling, draft proportions, anchors and motion below
 * are project additions. This module never adds a boatman, sail or oar.
 */
window.PoemDrawing.register({
  id:'boat',name:'舟',subtitle:'先画一叶舟，留出承载的位置。',
  credit:'船体曲线改编自 Lingdong Huang / Shan, Shui · MIT',sources:['shan-boat','project'],
  reference:'drawing/README.md#舟',
  note:'单独的船体单元，固定一条舟；不自动添加船夫、帆或桨。轻微起伏只是观看小样。',
  capabilities:["wind-response", "anchors", "fixed-count"],
create(ctx){
    const {p,width:W,alpha}=ctx;let state;
    function reset(){
      const length=p.random(260,300),draft=p.random(29,37);
      const points=Array.from({length:65},(_,i)=>{const t=i/64,profile=Math.sqrt(Math.max(0,Math.sin(t*Math.PI)));return {x:t*length-length/2,top:profile*draft*.22,bottom:profile*draft};});
      state={length,draft,phase:p.random(p.TWO_PI),points};
    }
    const origin=()=>({x:W/2,y:220+ctx.wind.offset(state.phase,3,.6)});
    function draw(){
      const {x,y}=origin(),palette=ctx.palette,c=p.drawingContext;
      p.push();p.translate(x,y);p.fill(alpha(p,palette.main,135));p.stroke(alpha(p,palette.ink,200));p.strokeWeight(1.2);
      c.beginPath();c.moveTo(state.points[0].x,state.points[0].top);
      for(const q of state.points)c.lineTo(q.x,q.top);
      for(const q of [...state.points].reverse())c.lineTo(q.x,q.bottom);
      c.closePath();c.fill();c.stroke();
      p.noFill();p.stroke(alpha(p,palette.accent,180));p.strokeWeight(.8);
      p.beginShape();for(const q of state.points.slice(4,-4))p.vertex(q.x,q.top+state.draft*.12);p.endShape();p.pop();
    }
    return {reset,draw,
      anchors(){const o=origin();return [{id:'deck',x:o.x,y:o.y+state.draft*.22},{id:'bow',x:o.x+state.length/2,y:o.y},{id:'stern',x:o.x-state.length/2,y:o.y}];},
      inspect(){return {boatCount:1,personCount:0,finite:state.points.every(q=>[q.x,q.top,q.bottom].every(Number.isFinite)),geometryKey:ctx.fingerprint(state)};}
    };
  }
});
