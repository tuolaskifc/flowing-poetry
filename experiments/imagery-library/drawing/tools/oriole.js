/* Project-authored ink suggestion of 莺: blended body/head wash, a few wing
 * and tail strokes, no outlined anatomy or engraved feather/eye/foot detail.
 * Pigment and gesture are local artistic choices, not species identification.
 */
window.PoemDrawing.register({
  id:'oriole',name:'莺形',subtitle:'淡黄一点，墨翼几笔，留住掠过的姿态。',
  credit:'本项目试作 · 淡墨莺意与收展翼姿',sources:['project'],reference:'drawing/README.md#莺形',
  note:'以淡黄墨面和几笔深翼、尾喙提示单只莺意，不刻画眼、足或逐根羽毛。收翅／展翅可选，不自动添树枝、同伴或鸣声。',
  controls:[
    {id:'pose',label:'翼姿',default:'folded',choices:[{value:'folded',label:'收翅'},{value:'spread',label:'展翅'}]},
    {id:'facing',label:'朝向',default:'right',choices:[{value:'right',label:'向右'},{value:'left',label:'向左'}]},
    {id:'motion',label:'微动',default:'still',choices:[{value:'still',label:'静止'},{value:'flap',label:'展翅微动'}]}
  ],
  capabilities:['shape-selection','imagery-accent','local-motion','density-detail','anchors','fixed-count'],
  create(ctx){
    const {p,width:W,alpha}=ctx;let state;
    function reset(){state={scale:p.random(.96,1.04),tail:p.random(.94,1.07),gesture:p.random(-.06,.06),phase:p.random(p.TWO_PI)};}
    const point=(v,t)=>{const s=1-t;return {x:s*s*s*v[0]+3*s*s*t*v[2]+3*s*t*t*v[4]+t*t*t*v[6],y:s*s*s*v[1]+3*s*s*t*v[3]+3*s*t*t*v[5]+t*t*t*v[7]};};
    function stroke(v,weight,color,opacity,salt=0,dry=false){
      const c=p.drawingContext,runs=[];let run=[];
      for(let i=0;i<=40;i++){
        const t=i/40,q=point(v,t),a=point(v,Math.max(0,t-.008)),b=point(v,Math.min(1,t+.008));
        const dx=b.x-a.x,dy=b.y-a.y,l=Math.hypot(dx,dy)||1;
        if(dry&&(i+Math.floor(salt*3))%23===15){if(run.length>1)runs.push(run);run=[];continue;}
        const w=weight*(.08+.92*Math.pow(Math.sin(Math.PI*t),.7))*(.96+.03*Math.sin(i*.34+salt)+.02*Math.cos(i*.19+salt*1.7));
        run.push({x:q.x,y:q.y,nx:-dy/l*w,ny:dx/l*w});
      }
      if(run.length>1)runs.push(run);c.fillStyle=String(alpha(p,color,opacity));
      for(const points of runs){c.beginPath();points.forEach((q,i)=>i?c.lineTo(q.x+q.nx,q.y+q.ny):c.moveTo(q.x+q.nx,q.y+q.ny));for(const q of [...points].reverse())c.lineTo(q.x-q.nx,q.y-q.ny);c.closePath();c.fill();}
    }
    function wash(v,width,color,opacity,salt){
      stroke(v,width*1.24,color,opacity*.12,salt);
      stroke(v,width*1.1,color,opacity*.2,salt+.3);
      stroke(v,width,color,opacity*.62,salt+.6);
    }
    function wing(flap,far=false){
      // Both wings sweep back from fixed shoulders. Rotate at the attachment,
      // rather than swinging two long strokes around the body's center.
      p.push();p.translate(far?8:1,far?-13:-8);p.rotate(flap);
      if(far)wash([0,0,-3,-26,-23,-49,-44,-48],3.6,ctx.palette.ink,62,state.phase);
      else{
        wash([0,0,-16,-33,-46,-55,-81,-60],6.2,ctx.palette.ink,133,state.phase+1);
        stroke([-1,-2,-19,-32,-49,-53,-82,-60],.65,ctx.palette.ink,70,state.phase+2,true);
      }
      p.pop();
    }
    function draw(){
      p.push();p.translate(W/2,200);p.scale(ctx.options.facing==='left'?-state.scale:state.scale,state.scale);p.rotate(state.gesture);
      const gold=ctx.settings.palette==='tender'?'#C4AB83':'#BDAE6B',ink=ctx.palette.ink;
      const moving=ctx.options.pose==='spread'&&ctx.options.motion==='flap',flap=moving?Math.sin(ctx.time*4+state.phase)*.12:0;
      // Tail tapers into paper rather than ending in two outlined rectangles.
      stroke([-26,4,-45,15,-66*state.tail,24,-86*state.tail,32],2.2,ink,115,state.phase,true);
      stroke([-27,9,-46,20,-65*state.tail,30,-79*state.tail,35],.9,ink,75,state.phase+1,true);
      if(ctx.options.pose==='spread')wing(-flap*.6,true);
      // Head is implied by the rising end of the same wash, without a circle.
      wash([-35,7,-14,-4,17,-18,35,-16],11.5,gold,96,state.phase);
      wash([-22,9,-3,13,20,1,34,-14],5.5,gold,32,state.phase+1);
      wash([23,-17,32,-28,40,-29,44,-21],5.5,gold,86,state.phase+2);
      if(ctx.options.pose==='spread')wing(flap);
      else{
        wash([8,-10,-3,-13,-22,-2,-36,4],4.5,ink,128,state.phase+2);
        stroke([5,-10,-7,-9,-24,0,-35,5],.9,ink,90,state.phase+3,true);
        if(ctx.settings.density>.65)stroke([3,-10,-10,-8,-24,1,-34,4],.45,ink,45,state.phase+4,true);
      }
      stroke([43,-23,49,-24,54,-25,61,-25],1.1,ink,163,state.phase+3);
      p.pop();
    }
    return {reset,draw,anchors:()=>[{id:'center',x:W/2,y:200},{id:'lower',x:W/2,y:230}],inspect:()=>({birdCount:1,perchCount:0,pose:ctx.options.pose,facing:ctx.options.facing,flapping:ctx.options.pose==='spread'&&ctx.options.motion==='flap',style:'suggested-ink',eyeDetailCount:0,footDetailCount:0,featherDetailCount:0,finite:Object.values(state).every(Number.isFinite),geometryKey:ctx.fingerprint(state)})};
  }
});
