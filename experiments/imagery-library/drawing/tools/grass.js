/* Project-authored grass blades and surface marks. No external shape code. */
window.PoemDrawing.register({
  id:'grass',name:'草 · 露 · 霜',subtitle:'风经过草尖，露与霜留在叶上。',
  credit:'本项目试作 · 草叶曲线与附着层',sources:['project'],reference:'drawing/README.md#本轮植物与天气',
  note:'默认 9 簇、每簇 6 片草叶；新增项目原生长茎芦穗变体。露珠和霜线附于草叶，不在空中降落。',
  controls:[{id:'surface',label:'叶面',default:'plain',choices:[{value:'plain',label:'草叶'},{value:'dew',label:'带露'},{value:'frost',label:'覆霜'}]},{id:'form',label:'形态',default:'meadow',choices:[{value:'meadow',label:'草叶簇'},{value:'reed',label:'芦穗'}]}],
  capabilities:['wind-response','surface-attachment','density-detail','anchors','fixed-count'],
  create(ctx){
    const {p,width:W,alpha}=ctx;let tufts=[];
    function reset(){tufts=Array.from({length:ctx.singleUnit?1:9},(_,i)=>({x:ctx.singleUnit?W/2:62+i*64+p.random(-9,9),y:ctx.singleUnit?310:p.random(290,325),blades:Array.from({length:6},()=>({length:p.random(60,135),lean:p.random(-43,43),width:p.random(2.5,5),phase:p.random(p.TWO_PI),dewAt:p.random(.6,.9)}))}));}
    function tip(t,b){return {x:t.x+b.lean+ctx.wind.offset(b.phase,18),y:t.y-b.length};}
    function curve(t,b,q){const end=tip(t,b);return {x:t.x+(end.x-t.x)*q*q,y:t.y-b.length*(1.05*q-.05*q*q)};}
    function draw(){
      for(const t of tufts)for(const b of t.blades){
        const end=tip(t,b);p.fill(alpha(p,ctx.palette.main,145));p.stroke(alpha(p,ctx.palette.ink,105));p.strokeWeight(.6);
        if(ctx.options.form==='reed'){
          p.noFill();p.stroke(alpha(p,ctx.palette.ink,145));p.bezier(t.x,t.y,t.x,t.y-b.length*.45,end.x,end.y+20,end.x,end.y);
          for(let j=0;j<12;j++){const y=end.y-j*2.4,x=end.x+Math.sin(j*.6+b.phase)*2;p.stroke(alpha(p,ctx.palette.ink,45));p.line(x,y,x+(j%2?1:-1)*(5+j*.35),y+8);p.stroke(alpha(p,ctx.palette.bg,210));p.strokeWeight(1.7);p.line(x,y,x+(j%2?1:-1)*(3+j*.27),y+6);}continue;
        }
        const c=p.drawingContext;c.beginPath();c.moveTo(t.x-b.width/2,t.y);c.quadraticCurveTo(t.x-b.width,t.y-b.length*.55,end.x,end.y);c.quadraticCurveTo(t.x+b.width,t.y-b.length*.5,t.x+b.width/2,t.y);c.closePath();c.fill();c.stroke();
        if(ctx.settings.density>.3){p.noFill();p.stroke(alpha(p,ctx.palette.ink,55));p.bezier(t.x,t.y,t.x,t.y-b.length*.4,t.x+(end.x-t.x)*.5,end.y+b.length*.25,end.x,end.y);}
        if(ctx.options.surface==='dew'){
          window.PoemSurfaceMarks.dew(ctx,[{...curve(t,b,b.dewAt),r:2.75}]);
        }else if(ctx.options.surface==='frost'){
          window.PoemSurfaceMarks.frost(ctx,[Array.from({length:6},(_,i)=>curve(t,b,(i+5)/10))],Array.from({length:4},(_,i)=>({...curve(t,b,(i+6)/10),r:2})));
        }
      }
    }
    return {reset,draw,anchors:()=>tufts.map((t,i)=>({id:'root-'+i,x:t.x,y:t.y})),inspect:()=>({tuftCount:tufts.length,bladeCount:tufts.length*6,surface:ctx.options.surface,dewCount:ctx.options.surface==='dew'?tufts.length*6:0,frostBladeCount:ctx.options.surface==='frost'?tufts.length*6:0,finite:tufts.every(t=>t.blades.every(b=>Number.isFinite(tip(t,b).x+tip(t,b).y))),geometryKey:ctx.fingerprint(tufts)})};
  }
});
