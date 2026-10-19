/* Project-authored long-leaf orchid-like ink study, not a botanical claim
 * that every historical 兰 denotes this modern plant form.
 */
window.PoemDrawing.register({
  id:'orchid',name:'兰意',subtitle:'叶线舒展开，花只留几笔。',
  credit:'本项目试作 · 兰叶长线、花茎与疏花',sources:['project'],reference:'drawing/README.md#兰马莲',
  note:'长叶与疏花的兰意试画，可看整株或花部；不画花盆、土石或其他伴生物，不作古诗所指植物的鉴定。',
  controls:[{id:'form',label:'观看',default:'plant',choices:[{value:'plant',label:'长叶疏花'},{value:'flower',label:'花部'}]}],
  capabilities:['wind-response','shape-selection','density-detail','anchors','fixed-count'],
  create(ctx){
    const {p}=ctx,brush=window.PoemInkBrush.create(ctx);let state;
    const root={x:272,y:331},stem=[272,331,288,264,301,208,343,148];
    function reset(){state={phase:p.random(p.TWO_PI),leaves:[[-172,-51],[-128,-137],[-63,-194],[-13,-218],[45,-180],[128,-111],[170,-43]].map(([x,y])=>({curve:[0,0,x*.16,y*.72,x*.66,y*1.22,x+p.random(-8,8),y+p.random(-7,7)],width:p.random(2.4,4.1)})),angles:[p.random(-.2,.2),p.random(-.2,.2)]};}
    function angle(){return ctx.wind.offset(state.phase,.018,.65);}
    function flower(index){
      p.push();p.rotate(state.angles[index]);
      const main=ctx.palette.main,ink=ctx.palette.ink,accent=ctx.palette.accent;
      for(const [i,v] of [[0,[0,1,-4,-7,-3,-17,0,-23]],[1,[-1,-3,-10,-12,-19,-10,-24,-14]],[2,[1,-4,10,-13,20,-17,26,-13]],[3,[-1,0,-5,2,-11,8,-13,12]],[4,[1,0,5,3,10,8,12,10]]])brush.wash(v,i===0?2.6:2.2,main,145,index+i);
      brush.wash([0,-2,-3,3,0,9,4,7],3.2,accent,145,index+3);
      brush.stroke([-1,-2,-2,0,1,3,3,3],.65,ink,135,index);
      if(ctx.settings.density>.55){brush.stroke([-21,-13,-14,-9,-7,-7,-1,-3],.35,ink,65,index+1);brush.stroke([2,-4,8,-8,16,-13,22,-13],.35,ink,65,index+2);}
      p.pop();
    }
    function draw(){
      p.push();
      if(ctx.options.form==='flower'){p.translate(320,192);p.rotate(angle());p.scale(2.25);flower(0);}
      else{
        p.translate(root.x,root.y);p.rotate(angle());
        for(const [i,leaf] of state.leaves.entries())brush.wash(leaf.curve,leaf.width,ctx.palette.ink,110+i%3*18,state.phase+i);
        p.translate(-root.x,-root.y);brush.stroke(stem,1.05,ctx.palette.ink,145,state.phase,true);
        for(const [i,t] of [.69,.94].entries()){const q=brush.point(stem,t);p.push();p.translate(q.x,q.y);p.rotate(i===0?-.12:.22);flower(i);p.pop();}
      }
      p.pop();
    }
    return {reset,draw,anchors:()=>{
      if(ctx.options.form==='flower')return [{id:'flower-center',x:320,y:192}];
      const a=angle();return [{id:'root',...root},...[.69,.94].map((t,i)=>{const q=brush.point(stem,t),x=q.x-root.x,y=q.y-root.y;return {id:'flower-'+i,x:root.x+x*Math.cos(a)-y*Math.sin(a),y:root.y+x*Math.sin(a)+y*Math.cos(a)};})];
    },inspect:()=>({plantCount:1,leafCount:ctx.options.form==='plant'?7:0,flowerCount:ctx.options.form==='plant'?2:1,potCount:0,form:ctx.options.form,finite:state.leaves.every(l=>l.curve.every(Number.isFinite)),geometryKey:ctx.fingerprint(state)})};
  }
});
