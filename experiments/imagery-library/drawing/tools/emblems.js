/* Project-authored small ink symbols. No downloaded code or historical reconstruction. */
(()=>{
 const register=(id,name,controls,create)=>window.PoemDrawing.register({id,name,subtitle:'几笔墨形，点到为止。',sources:['project'],credit:'本项目 · 写意旗幡与兵器',reference:'drawing/README.md#旗幡与兵器',note:'原生简笔形体，不作器制、服饰或军事场面复原。',capabilities:['anchors','fixed-count'],controls,create});
 register('flag','旗幡',[],ctx=>{const{p,alpha}=ctx;let phase=0;return{
  reset(){phase=p.random(0,6);},draw(){const b=window.PoemInkBrush.create(ctx),ink=ctx.palette.ink,main=ctx.palette.main,s=ctx.wind.offset(phase,9,.8);
   b.stroke([310,310,309,269,312,219,310,173],2,ink,205,phase,true);
   b.fill(main,150,c=>{c.moveTo(311,182);c.bezierCurveTo(350,168,387,200+s,435,182+s);c.lineTo(435,238+s);c.bezierCurveTo(390,254+s,350,224,312,238);});
   b.stroke([312,185,348,175,390,201+s,434,185+s],1.2,ink,180,phase+1,true);
   b.stroke([312,238,352,224,391,253+s,434,238+s],1,ink,155,phase+2,true);
   b.stroke([342,194,346,205,342,218,346,229],2.8,ink,155,phase+3,true);
   b.stroke([368,201,373,211,368,220,376,235],2.3,ink,130,phase+4,true);
  },anchors:()=>[{id:'base',x:310,y:310}],inspect:()=>({finite:Number.isFinite(phase),flagCount:1,geometryKey:ctx.fingerprint({phase})})};});
 register('weapon','兵器',[{id:'kind',label:'借形',default:'spear',choices:[{value:'sword',label:'剑意'},{value:'spear',label:'戈矛意'}]}],ctx=>{const{p,alpha}=ctx;let lean=0;return{
  reset(){lean=p.random(-.13,.13);},draw(){const b=window.PoemInkBrush.create(ctx),ink=ctx.palette.ink,main=ctx.palette.main;
   p.push();p.translate(320,310);p.rotate(lean);p.translate(-320,-310);
   if(ctx.options.kind==='sword'){
    b.fill(main,175,c=>{c.moveTo(314,272);c.lineTo(317,139);c.lineTo(324,120);c.lineTo(328,140);c.lineTo(326,272);});
    b.stroke([321,267,320,221,322,173,324,125],1.4,ink,220,1,true);
    b.stroke([299,275,312,270,326,274,340,272],2.6,ink,220,2,true);
    b.stroke([319,280,318,289,321,300,320,310],4.2,ink,230,3,true);
   }else{
    b.stroke([319,310,322,251,319,192,321,141],2.7,ink,215,1,true);
    b.fill(main,185,c=>{c.moveTo(316,153);c.lineTo(321,111);c.lineTo(328,150);c.lineTo(322,167);});
    b.stroke([322,149,336,144,343,151,349,169],2.4,ink,200,2,true);
   }p.pop();
  },anchors:()=>[{id:'base',x:320,y:310},{id:'grip',x:320,y:286}],inspect:()=>({finite:Number.isFinite(lean),weaponCount:1,kind:ctx.options.kind,geometryKey:ctx.fingerprint({lean,kind:ctx.options.kind})})};});
})();
