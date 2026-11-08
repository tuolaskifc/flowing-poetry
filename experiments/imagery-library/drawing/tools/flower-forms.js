/* Project-authored stylized flower crowns. No downloaded flower outlines used.
 * These distinct structural studies have not passed botanical identification.
 */
window.PoemDrawing.register({
  id:'flower-forms',name:'花冠 · 菊丛',subtitle:'从瓣形与层次区别花形，不只换颜色。',
  credit:'本项目试作 · 三类花冠结构',sources:['project'],reference:'drawing/README.md#花形变体',
  note:'圆瓣五出、细长多瓣与尖瓣层叠三种花冠示意；菊形新增带茎叶的成丛株式；单冠仍可选，未做植物学辨识验收。',
  controls:[{id:'kind',label:'花冠',default:'plum',choices:[{value:'plum',label:'梅形'},{value:'chrysanthemum',label:'菊形'},{value:'lotus',label:'莲形'}]},{id:'form',label:'株式',default:'crown',choices:[{value:'crown',label:'单花冠'},{value:'clump',label:'带叶菊丛'}]}],
  capabilities:['shape-selection','density-detail','anchors','fixed-count'],
  create(ctx){
    const {p,width:W,alpha}=ctx;let state;
    function reset(){state={phase:p.random(-.12,.12),jitter:Array.from({length:84},()=>p.random(.94,1.06)),stamens:Array.from({length:24},()=>({angle:p.random(p.TWO_PI),r:p.random(9,22)}))};}
    function crown(x=W/2,y=188,scale=1){
      p.push();p.translate(x,y);p.scale(scale);p.rotate(state.phase);p.strokeWeight(.8);
      const kind=ctx.options.kind,c=p.drawingContext;
      if(kind==='plum'){
        for(let i=0;i<5;i++){p.push();p.rotate(i*p.TWO_PI/5);p.fill(alpha(p,ctx.palette.main,100));p.stroke(alpha(p,ctx.palette.ink,140));p.ellipse(0,-34*state.jitter[i],52,66);p.pop();}
      }else{
        const rings=kind==='chrysanthemum'?[{n:28,l:91,w:7},{n:24,l:72,w:7},{n:20,l:51,w:6}]:[{n:12,l:101,w:23},{n:10,l:80,w:21},{n:8,l:59,w:18}];
        let index=0;
        for(const [layer,ring] of rings.entries())for(let i=0;i<ring.n;i++){
          const length=ring.l*state.jitter[index++];p.push();p.rotate(i*p.TWO_PI/ring.n+layer*.16);
          p.fill(alpha(p,layer===2?ctx.palette.accent:ctx.palette.main,105+layer*15));p.stroke(alpha(p,ctx.palette.ink,125));
          c.beginPath();c.moveTo(0,0);
          if(kind==='chrysanthemum'){c.bezierCurveTo(-ring.w,-length*.4,-ring.w,-length*.9,3,-length);c.bezierCurveTo(ring.w,-length*.9,ring.w,-length*.4,0,0);}
          else{c.bezierCurveTo(-ring.w,-length*.35,-ring.w*.8,-length*.7,0,-length);c.bezierCurveTo(ring.w*.8,-length*.7,ring.w,-length*.35,0,0);}
          c.closePath();c.fill();c.stroke();
          if(ctx.settings.density>.4){p.stroke(alpha(p,ctx.palette.ink,45));p.line(0,-5,0,-length*.8);}p.pop();
        }
      }
      p.noStroke();p.fill(alpha(p,ctx.palette.accent,210));p.circle(0,0,kind==='plum'?19:26);
      p.stroke(alpha(p,ctx.palette.ink,140));p.strokeWeight(.65);
      const n=10+Math.round(ctx.settings.density*14);for(const s of state.stamens.slice(0,n)){const x=Math.cos(s.angle)*s.r,y=Math.sin(s.angle)*s.r;p.line(0,0,x,y);p.fill(alpha(p,ctx.palette.ink,165));p.circle(x,y,1.7);}
      p.pop();
    }
    const clump=()=>ctx.options.kind==='chrysanthemum'&&ctx.options.form==='clump';
    function draw(){
      if(!clump()){crown();return;}
      const heads=[[245,220,.35],[289,165,.43],[331,207,.4],[367,177,.36],[399,239,.3]];
      for(const [i,[x,y]]of heads.entries()){
        p.noFill();p.stroke(alpha(p,ctx.palette.ink,135));p.strokeWeight(1.5);p.bezier(320+(i-2)*9,330,x+17,280,x-12,y+45,x,y);
        for(let j=0;j<3;j++){const t=.35+j*.18,lx=320+(x-320)*t,ly=330+(y-330)*t,side=(i+j)%2?1:-1;p.fill(alpha(p,ctx.palette.main,130));p.beginShape();p.vertex(lx,ly);p.vertex(lx+side*19,ly-18);p.vertex(lx+side*28,ly-12);p.vertex(lx+side*18,ly-5);p.vertex(lx+side*23,ly+2);p.vertex(lx,ly+5);p.endShape(p.CLOSE);}
      }
      for(const [x,y,s]of heads)crown(x,y,s);
    }
    return {reset,draw,anchors:()=>[{id:clump()?'root':'center',x:W/2,y:clump()?330:188}],inspect:()=>({flowerCount:clump()?5:1,plantCount:clump()?1:0,kind:ctx.options.kind,petalCount:{plum:5,chrysanthemum:72,lotus:30}[ctx.options.kind],finite:state.jitter.every(Number.isFinite),geometryKey:ctx.fingerprint(state)})};
  }
});
