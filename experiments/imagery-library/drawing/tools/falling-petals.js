/* Petal outlines reuse the sxywu adaptation in ../petals.js (MIT).
 * Release positions, trajectories, landing and playback are project-authored.
 */
window.PoemDrawing.register({
  id:'falling-petals',name:'落花',subtitle:'从空中飘落，最后留在地上。',
  credit:'花瓣改编 sxywu · MIT；飘落与停留为本项目试作',sources:['sxywu-petals','project'],reference:'drawing/README.md#雨与落花',
  note:'固定 18 片花瓣；默认一次飘落后停留。可显式切换循环试画；尚未实现从具体花枝脱落，也不代替柳絮。',
  controls:[{id:'playback',label:'过程',default:'once',choices:[{value:'once',label:'落地停留'},{value:'loop',label:'循环试画'}]}],
  capabilities:['wind-response','density-detail','once-or-loop','fixed-count'],
  create(ctx){
    const {p,width:W,height:H,alpha}=ctx;let petals=[];
    function reset(){petals=Array.from({length:18},()=>({x:p.random(65,W-110),y:p.random(25,185),landY:H-p.random(25,55),duration:p.random(3,6),phase:p.random(p.TWO_PI),rotation:p.random(p.TWO_PI),spin:p.random(-2,2),geometry:window.PoemPetalGeometry(p,p.random(10,17))}));}
    function pose(d){
      const t=ctx.options.playback==='loop'?ctx.time%d.duration:Math.min(ctx.time,d.duration),q=t/d.duration;
      return {x:d.x+ctx.wind.strength*(q*55+Math.sin(t*.9+d.phase)*22),y:d.y+(d.landY-d.y)*q,rotation:d.rotation+d.spin*q,landed:q>=1};
    }
    function draw(){
      for(const d of petals){
        const s=pose(d);p.push();p.translate(s.x,s.y);p.rotate(s.rotation);if(s.landed)p.scale(1,.45);
        p.fill(alpha(p,ctx.palette.main,100));p.stroke(alpha(p,ctx.palette.ink,100));p.strokeWeight(.65);
        const c=p.drawingContext;c.beginPath();c.moveTo(0,0);for(const curve of d.geometry.curves)c.bezierCurveTo(...curve);c.closePath();c.fill();c.stroke();
        if(ctx.settings.density>.3){p.stroke(alpha(p,ctx.palette.ink,50));p.line(0,0,0,d.geometry.curves[0][5]*.8);}
        p.pop();
      }
    }
    return {reset,draw,inspect:()=>({petalCount:petals.length,landedCount:petals.filter(d=>pose(d).landed).length,poseKey:ctx.fingerprint(petals.map(pose)),finite:petals.every(d=>Number.isFinite(pose(d).x+pose(d).y)),geometryKey:ctx.fingerprint(petals)})};
  }
});
