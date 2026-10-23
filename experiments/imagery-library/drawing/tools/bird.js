/* Project-authored generic bird gestures. Species names share this symbol;
 * the accepted oriole study is unchanged and remains separately available.
 */
window.PoemDrawing.register({
  id:'bird',name:'鸟意',subtitle:'几笔收拢，又向空中舒开。',sources:['project'],credit:'本项目 · 疏笔鸟形',reference:'drawing/README.md',
  note:'通用飞鸟、停鸟与水鸟的写意轮廓；不作物种辨识，不预置整群数量。',
  controls:[{id:'pose',label:'姿态',default:'flying',choices:[{value:'flying',label:'飞鸟'},{value:'resting',label:'停鸟'},{value:'waterbird',label:'水鸟'}]},{id:'tone',label:'墨色',default:'ink',choices:[{value:'ink',label:'墨鸟'},{value:'light',label:'浅鸟'}]},{id:'facing',label:'朝向',default:'right',choices:[{value:'right',label:'向右'},{value:'left',label:'向左'}]}],capabilities:['local-motion','anchors','shape-selection','fixed-count'],
  create(ctx){
    const {p,alpha}=ctx,brush=window.PoemInkBrush.create(ctx);let state;
    function reset(){state={span:p.random(.86,1.12),phase:p.random(p.TWO_PI),tilt:p.random(-.14,.14),tail:p.random(.9,1.15)};}
    function draw(){
      const flying=ctx.options.pose==='flying',aquatic=ctx.options.pose==='waterbird',light=ctx.options.tone==='light',ink=ctx.palette.ink,body=light?ctx.palette.bg:ctx.palette.ink;
      const flap=flying?Math.sin(ctx.time*2.2+state.phase)*7*(.6+ctx.settings.motion*.65):0;p.push();p.translate(320,190);p.scale(ctx.options.facing==='left'?-state.span:state.span,state.span);p.rotate(state.tilt);
      brush.wash([-13,5,-7,-1,9,-6,19,-1],flying?5:8,body,light?235:165,1);
      if(flying){
        brush.stroke([-2,0,-20,-13-flap,-36,-32-flap,-59,-26-flap],3.2,body,light?220:180,2);
        brush.stroke([2,0,17,-8+flap*.6,33,-22+flap,54,-15+flap],2.6,body,light?220:165,3);
        if(light){brush.stroke([-2,-2,-20,-14-flap,-35,-33-flap,-59,-27-flap],.55,ink,115,5);brush.stroke([2,-2,17,-10+flap*.6,33,-23+flap,54,-16+flap],.5,ink,100,6);}
      }else{
        brush.stroke([-14,2,-3,13,8,12,15,5],3.4,ink,light?95:140,3);
        if(!aquatic){brush.stroke([-6,12,-6,17,-9,22,-7,27],.7,ink,120,4);brush.stroke([5,11,7,16,5,21,6,27],.6,ink,110,5);}
      }
      brush.stroke([-10,7,-20,10,-25*state.tail,13,-34*state.tail,11],1.9,ink,140,6);
      brush.wash([13,-1,17,-5,20,-6,23,-3],3.5,body,light?235:170,7);
      brush.stroke([24,-3,26,-3,29,-2,33,-2],.7,ink,140,8);
      if(aquatic){p.noFill();p.stroke(alpha(p,ink,65));p.strokeWeight(.65);p.bezier(-32,19,-12,22,15,22,34,18);}
      p.pop();
    }
    return {reset,draw,anchors:()=>[{id:'body',x:320,y:190}],inspect:()=>({birdCount:1,pose:ctx.options.pose,tone:ctx.options.tone,finite:Object.values(state).every(Number.isFinite),geometryKey:ctx.fingerprint(state)})};
  }
});
