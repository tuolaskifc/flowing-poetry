/* Project-authored single fish: spindle body, forked tail, fins and eye. */
window.PoemDrawing.register({
  id:'fish',name:'鱼',subtitle:'身体与尾鳍各有自己的动势。',
  credit:'本项目试作 · 鱼体与摆尾',sources:['project'],reference:'drawing/README.md#本轮植物与天气',
  note:'固定一尾鱼，鱼体、尾鳍与鳍片独立绘制。默认静止，可选择摆尾；没有自动加水面、鱼群或水花。',
  controls:[{id:'motion',label:'动作',default:'still',choices:[{value:'still',label:'静止'},{value:'tail',label:'摆尾试画'}]}],
  capabilities:['motion-selection','density-detail','anchors','fixed-count'],
  create(ctx){
    const {p,width:W,alpha}=ctx;let state;
    function reset(){state={length:p.random(175,200),height:p.random(56,68),phase:p.random(p.TWO_PI)};}
    function draw(){
      const l=state.length,h=state.height,beat=ctx.options.motion==='tail'?Math.sin(ctx.time*3+state.phase)*.2:0;
      p.push();p.translate(W/2,195);p.stroke(alpha(p,ctx.palette.ink,175));p.strokeWeight(.9);p.fill(alpha(p,ctx.palette.main,95));
      p.push();p.translate(-l*.44,0);p.rotate(beat);p.beginShape();p.vertex(0,0);p.vertex(-l*.25,-h*.55);p.vertex(-l*.19,0);p.vertex(-l*.25,h*.55);p.endShape(p.CLOSE);p.pop();
      p.beginShape();p.vertex(-l*.05,-h*.38);p.vertex(-l*.2,-h*.82);p.vertex(l*.17,-h*.43);p.endShape(p.CLOSE);
      const c=p.drawingContext;c.beginPath();c.moveTo(l*.5,0);c.bezierCurveTo(l*.24,-h*.7,-l*.15,-h*.65,-l*.47,0);c.bezierCurveTo(-l*.15,h*.65,l*.24,h*.7,l*.5,0);c.closePath();c.fill();c.stroke();
      p.noFill();p.bezier(l*.28,-h*.28,l*.18,-h*.12,l*.18,h*.12,l*.28,h*.28);
      p.fill(alpha(p,ctx.palette.ink,220));p.circle(l*.34,-h*.1,3.2);
      p.noFill();p.stroke(alpha(p,ctx.palette.ink,70));p.bezier(0,4,-l*.07,h*.4,l*.08,h*.46,l*.1,9);
      const n=3+Math.round(ctx.settings.density*7);for(let i=0;i<n;i++){const x=-l*.23+i*l*.36/n;p.arc(x,0,12,h*.45,-.8,.8);}p.pop();
    }
    return {reset,draw,anchors:()=>[{id:'center',x:W/2,y:195}],inspect:()=>({fishCount:1,motion:ctx.options.motion,finite:Number.isFinite(state.length+state.height),geometryKey:ctx.fingerprint(state)})};
  }
});
