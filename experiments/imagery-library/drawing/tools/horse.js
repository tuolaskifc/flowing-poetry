/* Project-authored horse gesture: pale barrel/neck washes and tapered legs.
 * Two static poses only, without rider, tack, grazing plants or gait physics.
 */
window.PoemDrawing.register({
  id:'horse',name:'马意',subtitle:'背线一弯，四足落定，鬃尾留势。',
  credit:'本项目试作 · 马形墨面、肢体与静态姿态',sources:['project'],reference:'drawing/README.md#兰马莲',
  note:'单匹马的静立／低首写意试画，不自动添加骑者、鞍辔、草地或行进动作；比例与姿态仍待审阅。',
  controls:[{id:'pose',label:'姿态',default:'stand',choices:[{value:'stand',label:'静立'},{value:'lower',label:'低首'}]},{id:'facing',label:'朝向',default:'right',choices:[{value:'right',label:'向右'},{value:'left',label:'向左'}]}],
  capabilities:['static','shape-selection','density-detail','anchors','fixed-count'],
  create(ctx){
    const {p}=ctx,brush=window.PoemInkBrush.create(ctx);let state;
    function reset(){state={scale:p.random(.95,1.02),phase:p.random(p.TWO_PI),tail:p.random(.96,1.06),back:p.random(-2,2)};}
    function leg(points,far=false){
      const [x,y,kx,ky,hx,hy]=points,ink=ctx.palette.ink;
      brush.stroke([x,y,x+(kx-x)*.35,y+19,kx,ky-13,kx,ky],far?3.2:4.7,ink,far?85:165,state.phase);
      brush.stroke([kx,ky,kx+(hx-kx)*.3,ky+22,hx,hy-13,hx,hy],far?1.6:2.2,ink,far?95:174,state.phase+1);
      brush.stroke([hx-2,hy,hx+2,hy+2,hx+9,hy+1,hx+12,hy+1],1.8,ink,far?95:178,state.phase+2);
    }
    function neck(lower){
      const ink=ctx.palette.ink,main=ctx.palette.main;
      if(lower){
        brush.fill(main,102,c=>{c.moveTo(37,-33);c.bezierCurveTo(69,-32,84,-9,95,27);c.bezierCurveTo(108,29,123,42,133,61);c.bezierCurveTo(140,71,131,79,120,74);c.lineTo(102,56);c.bezierCurveTo(85,45,78,28,72,18);c.bezierCurveTo(60,11,49,7,42,-4);});
        brush.stroke([42,-32,70,-31,77,1,93,27],3.5,ink,150,state.phase);
        brush.stroke([90,29,99,33,104,47,122,67],1.3,ink,158,state.phase+1,true);
        brush.stroke([94,29,94,19,99,19,101,31],1.8,ink,175,state.phase+2);
        brush.stroke([100,34,105,24,109,27,106,37],1.4,ink,135,state.phase+3);
      }else{
        brush.fill(main,115,c=>{c.moveTo(35,-29);c.bezierCurveTo(57,-51,61,-87,83,-105);c.bezierCurveTo(94,-116,110,-113,117,-100);c.bezierCurveTo(128,-88,142,-73,146,-61);c.bezierCurveTo(149,-52,140,-48,132,-52);c.lineTo(115,-60);c.bezierCurveTo(107,-59,104,-68,103,-75);c.bezierCurveTo(92,-51,80,-38,77,-18);c.lineTo(66,12);c.lineTo(43,11);});
        brush.stroke([40,-33,60,-54,63,-91,87,-107],4.1,ink,168,state.phase);
        brush.stroke([89,-108,95,-115,100,-112,105,-106],1.6,ink,145,state.phase+1);
        brush.stroke([99,-108,98,-126,104,-128,107,-108],2.1,ink,175,state.phase+2);
        brush.stroke([108,-105,113,-119,119,-117,115,-101],1.6,ink,135,state.phase+3);
        brush.stroke([116,-98,124,-87,138,-70,141,-59],1,ink,120,state.phase+4,true);
        if(ctx.settings.density>.55)brush.stroke([130,-58,134,-56,139,-55,143,-57],.6,ink,100,state.phase+5);
      }
    }
    function draw(){
      p.push();p.translate(298,173);p.scale(ctx.options.facing==='left'?-state.scale:state.scale,state.scale);
      const ink=ctx.palette.ink,main=ctx.palette.main;
      leg([-58,24,-43,73,-60,133],true);leg([38,22,51,78,38,134],true);
      brush.fill(main,106,c=>{c.moveTo(-89,-5);c.bezierCurveTo(-93,-32,-60,-47,-19,-39+state.back);c.bezierCurveTo(15,-45,52,-39,64,-24);c.bezierCurveTo(84,-2,70,25,43,35);c.bezierCurveTo(6,48,-45,44,-72,27);c.bezierCurveTo(-87,16,-92,2,-89,-5);});
      brush.wash([-78,-18,-53,-34,-8,-39,39,-32],11,main,94,state.phase);
      brush.stroke([-85,-11,-77,-32,-35,-42,4,-37],1.5,ink,145,state.phase,true);
      brush.stroke([-79,7,-74,17,-70,22,-66,29],1.2,ink,95,state.phase+1);
      neck(ctx.options.pose==='lower');leg([-76,21,-82,78,-86,138]);leg([60,18,66,79,70,138]);
      brush.wash([-88,-15,-116,7,-97,63,-132*state.tail,78],3.6,ink,132,state.phase+2);
      brush.stroke([-89,-13,-119,9,-103,64,-138*state.tail,82],1.1,ink,120,state.phase+3,true);
      p.pop();
    }
    return {reset,draw,anchors:()=>[{id:'feet',x:298,y:173+139*state.scale},{id:'back',x:298,y:173-38*state.scale}],inspect:()=>({horseCount:1,legCount:4,riderCount:0,pose:ctx.options.pose,facing:ctx.options.facing,gait:false,finite:Object.values(state).every(Number.isFinite),geometryKey:ctx.fingerprint(state)})};
  }
});
