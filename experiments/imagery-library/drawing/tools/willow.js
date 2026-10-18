/* Project-authored hanging branches and narrow alternating leaves. */
window.PoemDrawing.register({
  id:'willow',name:'柳',subtitle:'枝条垂下，细叶顺着风轻摆。',
  credit:'本项目试作 · 下垂枝条与细叶',sources:['project'],reference:'drawing/README.md#本轮植物与天气',
  note:'固定一株柳形试画，以弯干、下垂长枝和细叶区别于通用树；尚未做植物学辨识验收。',
  capabilities:['wind-response','density-detail','anchors','fixed-count'],
  create(ctx){
    const {p,width:W,alpha}=ctx;let state;
    function reset(){state={branches:Array.from({length:17},(_,i)=>({x:W/2-142+i*17+p.random(-5,5),y:p.random(88,145),length:p.random(115,200),phase:p.random(p.TWO_PI),leaves:Array.from({length:13},(_,j)=>({q:.12+j*.065,length:p.random(11,19),side:j%2?1:-1}))}))};}
    function point(b,q){return {x:b.x+Math.sin(q*Math.PI*.6)*ctx.wind.offset(b.phase,23)*q,y:b.y+b.length*q};}
    function draw(){
      p.noFill();p.stroke(alpha(p,ctx.palette.ink,185));p.strokeWeight(5);p.bezier(W/2,340,W/2+28,250,W/2-18,178,W/2,122);
      for(const b of state.branches){p.strokeWeight(.8);p.stroke(alpha(p,ctx.palette.ink,135));p.bezier(W/2,151,W/2,111,b.x,66,b.x,b.y);
        p.beginShape();for(let i=0;i<=24;i++){const q=point(b,i/24);p.vertex(q.x,q.y);}p.endShape();
        for(const leaf of b.leaves){const q=point(b,leaf.q);p.push();p.translate(q.x,q.y);p.rotate(leaf.side*.36+ctx.wind.offset(b.phase+leaf.q,.12));
          p.noStroke();p.fill(alpha(p,ctx.palette.main,145));p.ellipse(leaf.side*3,leaf.length*.3,3.2,leaf.length);
          if(ctx.settings.density>.45){p.stroke(alpha(p,ctx.palette.ink,55));p.strokeWeight(.4);p.line(0,0,leaf.side*4,leaf.length*.75);}p.pop();
        }
      }
    }
    return {reset,draw,anchors:()=>[{id:'root',x:W/2,y:340}],inspect:()=>({treeCount:1,hangingBranchCount:17,leafCount:221,finite:state.branches.every(b=>Number.isFinite(point(b,1).x+point(b,1).y)),geometryKey:ctx.fingerprint(state)})};
  }
});
