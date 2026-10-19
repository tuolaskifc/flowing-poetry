/* Project-authored carrier studies plus the shared dew/frost attachment layer.
 * Explicit carrier selection is a viewing choice, not inferred poem semantics.
 */
window.PoemDrawing.register({
  id:'surface-weather',name:'露 · 霜附着',subtitle:'露聚成点，霜铺成纹，跟着载体一起动。',
  credit:'本项目试作 · 共用露霜附着层与三类载体',sources:['project'],reference:'drawing/README.md#露霜附着层',
  note:'可看叶面、枝条、石面的露霜，或只看局部笔触。附着不等于飘落；载体须明确选择，诗句只有露霜时不自动补物体。',
  controls:[
    {id:'surface',label:'附着',default:'dew',choices:[{value:'dew',label:'露珠'},{value:'frost',label:'霜纹'}]},
    {id:'carrier',label:'载体',default:'leaf',choices:[{value:'leaf',label:'叶面'},{value:'branch',label:'枝条'},{value:'stone',label:'石面'},{value:'detail',label:'局部笔触（不补载体）'}]}
  ],
  capabilities:['surface-attachment','wind-response','shape-selection','density-detail','anchors','fixed-count'],
  create(ctx){
    const {p,width:W,alpha}=ctx;let state;
    const curve=(v,t)=>{const s=1-t;return {x:s*s*s*v[0]+3*s*s*t*v[2]+3*s*t*t*v[4]+t*t*t*v[6],y:s*s*s*v[1]+3*s*s*t*v[3]+3*s*t*t*v[5]+t*t*t*v[7]};};
    function reset(){state={length:p.random(190,218),width:p.random(53,63),phase:p.random(p.TWO_PI),samples:Array.from({length:18},()=>({t:p.random(.12,.9),side:p.random(-.55,.55),r:p.random(2.6,4)}))};}
    function pose(){return ['leaf','branch'].includes(ctx.options.carrier)?ctx.wind.offset(state.phase,.035,.65):0;}
    function marks(){
      const mode=ctx.options.carrier,drops=[],paths=[],crystals=[];
      if(mode==='leaf'){
        for(const s of state.samples){const t=s.t,d=state.width*Math.sin(t*Math.PI)*s.side;drops.push({x:(t-.5)*state.length,y:d,r:s.r});crystals.push({x:(t-.5)*state.length,y:d,r:3.4,angle:t*2});}
        for(const side of [-.6,-.25,.25,.6])paths.push(Array.from({length:12},(_,i)=>{const t=.1+i*.8/11;return {x:(t-.5)*state.length,y:Math.sin(t*Math.PI)*state.width*side};}));
      }else if(mode==='branch'){
        const b=[-150,45,-50,22,55,-18,145,-48],twig=[-15,5,1,-14,12,-40,39,-56];
        for(const [i,s] of state.samples.entries()){const q=curve(i<12?b:twig,s.t);drops.push({...q,y:q.y+3,r:s.r});crystals.push({...q,y:q.y-2,r:3.2,angle:-.3});}
        for(const branch of [b,twig])paths.push(Array.from({length:20},(_,i)=>{const q=curve(branch,i/19);return {...q,y:q.y-3};}));
      }else{
        for(const s of state.samples){const x=(s.t-.5)*254,y=s.side*50;drops.push({x,y,r:s.r});crystals.push({x,y,r:4.3,angle:s.t*3});}
        for(let lane=0;lane<5;lane++)paths.push(Array.from({length:17},(_,i)=>({x:-117+i*14,y:(lane-2)*11+Math.sin(i*.8+state.phase)*2})));
      }
      return {drops,paths,crystals};
    }
    function carrier(){
      const c=p.drawingContext,mode=ctx.options.carrier;
      p.fill(alpha(p,ctx.palette.main,130));p.stroke(alpha(p,ctx.palette.ink,140));p.strokeWeight(.85);
      if(mode==='leaf'){
        const l=state.length,w=state.width;c.beginPath();c.moveTo(-l/2,0);c.bezierCurveTo(-l*.2,-w,l*.25,-w,l/2,0);c.bezierCurveTo(l*.25,w,-l*.2,w,-l/2,0);c.closePath();c.fill();c.stroke();
        p.stroke(alpha(p,ctx.palette.ink,88));p.line(-l*.6,0,l*.47,0);const n=4+Math.round(ctx.settings.density*4);
        for(let i=1;i<n;i++){const t=i/n,x=(t-.5)*l,b=Math.sin(t*Math.PI)*w*.61;p.line(x-12,0,x,-b);p.line(x-12,0,x,b);}
      }else if(mode==='branch'){
        p.noFill();p.stroke(alpha(p,ctx.palette.ink,175));p.strokeWeight(5);p.bezier(-150,45,-50,22,55,-18,145,-48);p.strokeWeight(2.4);p.bezier(-15,5,1,-14,12,-40,39,-56);
      }else if(mode==='stone'){
        p.fill(alpha(p,ctx.palette.main,105));p.beginShape();for(const q of [[-145,2],[-126,-32],[-29,-45],[89,-34],[143,-7],[121,38],[-72,43]])p.vertex(...q);p.endShape(p.CLOSE);
        p.stroke(alpha(p,ctx.palette.ink,40));p.line(-121,22,97,28);p.line(-73,36,119,16);
      }
    }
    function draw(){
      p.push();p.translate(W/2,206);p.rotate(pose());if(ctx.options.carrier==='leaf')p.rotate(-.3);
      carrier();const m=marks();
      if(ctx.options.surface==='dew')window.PoemSurfaceMarks.dew(ctx,m.drops);
      else window.PoemSurfaceMarks.frost(ctx,m.paths,m.crystals.slice(0,6+Math.round(ctx.settings.density*12)));
      p.pop();
    }
    return {reset,draw,anchors:()=>{
      const a=pose()+(ctx.options.carrier==='leaf'?-.3:0);
      return marks().drops.map((q,i)=>({id:'attachment-'+i,x:W/2+q.x*Math.cos(a)-q.y*Math.sin(a),y:206+q.x*Math.sin(a)+q.y*Math.cos(a)}));
    },inspect:()=>({carrier:ctx.options.carrier,surface:ctx.options.surface,carrierCount:ctx.options.carrier==='detail'?0:1,dewCount:ctx.options.surface==='dew'?18:0,frostPathCount:ctx.options.surface==='frost'?marks().paths.length:0,airborneCount:0,finite:marks().drops.every(q=>Number.isFinite(q.x+q.y+q.r)),geometryKey:ctx.fingerprint(state)})};
  }
});
