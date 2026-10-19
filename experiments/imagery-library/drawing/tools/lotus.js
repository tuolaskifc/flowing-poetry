/* Project-authored side-view lotus gesture and round leaf, independent of the
 * earlier radial flower crown. Flower, leaf and manual pairing stay distinct.
 */
window.PoemDrawing.register({
  id:'lotus',name:'莲 · 荷叶',subtitle:'一茎挑花，一面叶影，分开也成景。',
  credit:'本项目试作 · 疏瓣莲意、花茎与荷叶',sources:['project'],reference:'drawing/README.md#兰马莲',
  note:'花茎、荷叶与显式花叶组合分开选择；开放／含苞是静态形态，不自动开花、补池水或添加其他生物。',
  controls:[{id:'form',label:'观看',default:'flower',choices:[{value:'flower',label:'花与茎'},{value:'composition',label:'花叶组合'},{value:'leaf',label:'荷叶'}]},{id:'state',label:'花态',default:'open',choices:[{value:'open',label:'开放'},{value:'bud',label:'含苞'}]}],
  capabilities:['wind-response','shape-selection','density-detail','anchors','fixed-count'],
  create(ctx){
    const {p}=ctx,brush=window.PoemInkBrush.create(ctx);let state;
    function reset(){state={phase:p.random(p.TWO_PI),petals:Array.from({length:7},()=>p.random(.93,1.07)),rim:Array.from({length:44},()=>p.random(.97,1.03))};}
    function angle(){return ctx.wind.offset(state.phase,.016,.55);}
    function blossom(){
      const bud=ctx.options.state==='bud',angles=bud?[-.12,.15,0]:[-.95,.93,-.6,.58,-.28,.3,0],ink=ctx.palette.ink,main=ctx.palette.main;
      for(const [i,a] of angles.entries()){
        p.push();p.rotate(a);const length=(bud?40:46)*state.petals[i],width=bud?8:12;
        brush.fill(main,68+i*5,c=>{c.moveTo(0,6);c.bezierCurveTo(-width,-length*.2,-width*.7,-length*.75,0,-length);c.bezierCurveTo(width*.75,-length*.75,width,-length*.15,0,6);});
        brush.stroke([0,6,-width*.6,-length*.2,-width*.6,-length*.65,0,-length],.48,ink,85,state.phase+i);
        if(ctx.settings.density>.65)brush.stroke([0,2,-1,-length*.3,1,-length*.6,0,-length*.85],.28,ink,42,state.phase+i+1);
        p.pop();
      }
      if(!bud)brush.wash([-8,1,-3,-4,5,-3,10,0],2.3,ctx.palette.accent,130,state.phase);
    }
    function leaf(cx,cy){
      p.push();p.translate(cx,cy);const points=state.rim.map((r,i)=>{const a=i*Math.PI*2/state.rim.length;return {x:Math.cos(a)*80*r,y:Math.sin(a)*35*r};});
      brush.fill(ctx.palette.main,94,c=>{points.forEach((q,i)=>i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y));});
      const c=p.drawingContext;c.strokeStyle=String(ctx.alpha(p,ctx.palette.ink,100));c.lineWidth=.65;
      for(const [a,b] of [[1,17],[22,37]]){c.beginPath();for(let i=a;i<=b;i++){const q=points[i];i===a?c.moveTo(q.x,q.y):c.lineTo(q.x,q.y);}c.stroke();}
      const n=5+Math.round(ctx.settings.density*4);for(let i=0;i<n;i++){const a=i*Math.PI*2/n;brush.stroke([0,1,Math.cos(a)*22,Math.sin(a)*9,Math.cos(a)*48,Math.sin(a)*21,Math.cos(a)*72,Math.sin(a)*30],.42,ctx.palette.ink,65,state.phase+i);}
      p.pop();
    }
    function draw(){
      p.push();p.translate(320,330);p.rotate(angle());p.translate(-320,-330);
      const form=ctx.options.form;
      if(form!=='flower'){
        const x=form==='leaf'?320:432,y=form==='leaf'?218:246;
        brush.stroke([320,330,330,299,x-4,y+34,x,y],1.3,ctx.palette.ink,137,state.phase,true);leaf(x,y);
      }
      if(form!=='leaf'){
        brush.stroke([320,330,308,270,333,222,328,174],1.2,ctx.palette.ink,146,state.phase+1,true);
        p.push();p.translate(328,169);p.rotate(-.07);blossom();p.pop();
      }
      p.pop();
    }
    return {reset,draw,anchors:()=>{
      const a=angle(),nodes=[{id:'root',x:320,y:330}];
      if(ctx.options.form!=='leaf')nodes.push({id:'flower',x:328,y:169});
      if(ctx.options.form!=='flower')nodes.push({id:'leaf',x:ctx.options.form==='leaf'?320:432,y:ctx.options.form==='leaf'?218:246});
      return nodes.map(q=>{const x=q.x-320,y=q.y-330;return {...q,x:320+x*Math.cos(a)-y*Math.sin(a),y:330+x*Math.sin(a)+y*Math.cos(a)};});
    },inspect:()=>({plantCount:1,flowerCount:ctx.options.form==='leaf'?0:1,leafCount:ctx.options.form==='flower'?0:1,petalCount:ctx.options.form==='leaf'?0:ctx.options.state==='bud'?3:7,waterCount:0,form:ctx.options.form,state:ctx.options.state,finite:state.petals.every(Number.isFinite)&&state.rim.every(Number.isFinite),geometryKey:ctx.fingerprint(state)})};
  }
});
