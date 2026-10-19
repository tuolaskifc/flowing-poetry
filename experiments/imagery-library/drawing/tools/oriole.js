/* Project-authored stylized "ying" bird study; no downloaded bird outline.
 * Yellow body/dark wing is a visual convention here, not a taxonomic claim
 * about every historical use of the word 莺. Identification awaits review.
 */
window.PoemDrawing.register({
  id:'oriole',name:'莺形',subtitle:'一团淡黄，几笔深翼，先画清一只。',
  credit:'本项目试作 · 单只莺形、收翅与展翅',sources:['project'],reference:'drawing/README.md#莺形',
  note:'黄身深翼的写意试作，保留单只鸟的喙、眼、翼、尾和足；不是全部古诗莺的物种鉴定。收翅／展翅可选，不自动添树枝、同伴或鸣声。',
  controls:[
    {id:'pose',label:'翼姿',default:'folded',choices:[{value:'folded',label:'收翅'},{value:'spread',label:'展翅'}]},
    {id:'facing',label:'朝向',default:'right',choices:[{value:'right',label:'向右'},{value:'left',label:'向左'}]},
    {id:'motion',label:'微动',default:'still',choices:[{value:'still',label:'静止'},{value:'flap',label:'展翅微动'}]}
  ],
  capabilities:['shape-selection','imagery-accent','local-motion','density-detail','anchors','fixed-count'],
  create(ctx){
    const {p,width:W,alpha}=ctx;let state;
    function reset(){state={body:p.random(.96,1.04),tail:p.random(.93,1.08),head:p.random(-1.7,1.7),phase:p.random(p.TWO_PI)};}
    function path(color,opacity,draw){const c=p.drawingContext;c.beginPath();draw(c);c.closePath();c.fillStyle=String(alpha(p,color,opacity));c.fill();c.strokeStyle=String(alpha(p,ctx.palette.ink,140));c.lineWidth=.7;c.stroke();}
    function wing(flap){
      p.push();p.translate(-11,-7);p.rotate(-flap);
      path(ctx.palette.ink,220,c=>{c.moveTo(19,8);c.bezierCurveTo(-11,-41,-53,-95,-105,-92);c.bezierCurveTo(-80,-63,-52,-19,-29,13);c.bezierCurveTo(-8,19,8,17,19,8);});
      p.stroke(alpha(p,ctx.palette.main,150));p.strokeWeight(.8);const n=4+Math.round(ctx.settings.density*4);
      for(let i=0;i<n;i++)p.bezier(-16-i*7,1-i*2,-39-i*5,-17-i*2,-63-i*4,-43-i*3,-86-i*2,-70-i*3);
      p.pop();
    }
    function draw(){
      p.push();p.translate(W/2,200);p.scale(ctx.options.facing==='left'?-state.body:state.body,state.body);
      const gold=ctx.settings.palette==='tender'?'#C8AB68':'#BBA74E';
      const moving=ctx.options.pose==='spread'&&ctx.options.motion==='flap',flap=moving?Math.sin(ctx.time*4+state.phase)*.22:0;
      path(ctx.palette.ink,215,c=>{c.moveTo(-36,7);c.lineTo(-108*state.tail,42);c.lineTo(-102*state.tail,53);c.lineTo(-29,25);});
      path(ctx.palette.ink,175,c=>{c.moveTo(-36,13);c.lineTo(-94*state.tail,55);c.lineTo(-84*state.tail,58);c.lineTo(-20,26);});
      if(ctx.options.pose==='spread'){p.push();p.scale(.78,.8);p.translate(23,-9);wing(-.2-flap*.5);p.pop();}
      path(gold,205,c=>{c.moveTo(-49,-8);c.bezierCurveTo(-29,-32,17,-40,41,-19);c.bezierCurveTo(59,2,24,34,-10,33);c.bezierCurveTo(-38,31,-52,14,-49,-8);});
      path(gold,230,c=>{c.moveTo(15,-14);c.bezierCurveTo(5,-36,18,-58,43,-56+state.head);c.bezierCurveTo(68,-52,72,-27,56,-15);c.bezierCurveTo(40,-7,25,-6,15,-14);});
      if(ctx.options.pose==='spread')wing(flap);
      else{
        path(ctx.palette.ink,208,c=>{c.moveTo(20,-12);c.bezierCurveTo(-7,-30,-43,-16,-39,7);c.bezierCurveTo(-28,25,-4,21,26,11);c.bezierCurveTo(7,6,9,-4,20,-12);});
        p.stroke(alpha(p,ctx.palette.main,160));p.strokeWeight(.8);const n=3+Math.round(ctx.settings.density*4);for(let i=0;i<n;i++)p.bezier(-33+i*5,3,-18+i*4,12,3+i*2,12,17+i,9);
      }
      // Eye, small beak and feet remain readable without adding a perch.
      p.stroke(alpha(p,ctx.palette.ink,180));p.strokeWeight(3);p.line(37,-34,57,-36);
      p.noStroke();p.fill(alpha(p,ctx.palette.ink,250));p.circle(51,-35,5);p.fill(alpha(p,ctx.palette.bg,245));p.circle(51.6,-35.9,1.4);
      path(ctx.palette.accent,245,c=>{c.moveTo(63,-37);c.lineTo(87,-31);c.lineTo(64,-26);});
      p.stroke(alpha(p,ctx.palette.ink,195));p.strokeWeight(.9);
      if(ctx.options.pose==='folded')for(const x of [-7,14]){p.line(x,30,x-4,48);p.line(x-4,48,x+8,48);p.line(x-4,48,x-12,51);}
      else{p.line(7,28,16,37);p.line(16,37,25,35);}
      p.pop();
    }
    return {reset,draw,anchors:()=>[{id:'center',x:W/2,y:200},{id:'feet',x:W/2,y:248}],inspect:()=>({birdCount:1,perchCount:0,pose:ctx.options.pose,facing:ctx.options.facing,flapping:ctx.options.pose==='spread'&&ctx.options.motion==='flap',finite:Object.values(state).every(Number.isFinite),geometryKey:ctx.fingerprint(state)})};
  }
});
