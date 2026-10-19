/* Layered facades and balcony geometry authored in this project.
 * Tiled roofs reuse the attributed Shan, Shui-derived architecture helper.
 */
window.PoemDrawing.register({
  id:'building',name:'楼',subtitle:'层层檐下，有窗，也有留白。',
  credit:'折檐沿用 Lingdong Huang / Shan, Shui · MIT；楼层、门窗与栏杆为本项目编写',
  sources:['shan-pavilion','project'],reference:'drawing/README.md#楼与共用屋顶',
  note:'独立的二层／三层楼体，门窗与栏杆可见；不自动添人，不代表某座历史建筑或地名。',
  controls:[{id:'levels',label:'层数',default:'two',choices:[{value:'two',label:'二层'},{value:'three',label:'三层'}]},{id:'windows',label:'窗格',default:'lattice',choices:[{value:'lattice',label:'格窗'},{value:'open',label:'留空'}]}],
  capabilities:['static','shape-selection','density-detail','anchors','fixed-count'],
  create(ctx){
    const {p,width:W,alpha}=ctx;let state;
    function reset(){state={width:p.random(220,240),step:p.random(70,74),rise:p.random(33,39)};}
    function levels(){return ctx.options.levels==='three'?3:2;}
    function draw(){
      p.push();p.translate(W/2,0);const count=levels(),base=320;
      p.stroke(alpha(p,ctx.palette.ink,150));p.strokeWeight(1);p.fill(alpha(p,ctx.palette.main,65));
      p.quad(-state.width*.55,base,state.width*.55,base,state.width*.62,base+10,-state.width*.6,base+10);
      for(let floor=0;floor<count;floor++){
        const w=state.width*(1-floor*.07),top=base-(floor+1)*state.step,bottom=base-floor*state.step;
        p.fill(alpha(p,ctx.palette.main,60));p.stroke(alpha(p,ctx.palette.ink,165));p.strokeWeight(1);
        p.rect(-w*.43,top,w*.86,state.step);
        // Separate windows give the building enclosed floors, unlike an open pavilion.
        const winW=w*.16,winY=top+17;
        for(let column=0;column<3;column++){
          const winH=floor===0&&column===1?state.step-17:30;
          const x=(column-1)*w*.25-winW/2;p.fill(alpha(p,ctx.palette.ink,12));p.stroke(alpha(p,ctx.palette.ink,125));p.strokeWeight(.8);p.rect(x,winY,winW,winH);
          if(ctx.options.windows==='lattice'){
            p.line(x+winW/2,winY,x+winW/2,winY+winH);p.line(x,winY+winH*.5,x+winW,winY+winH*.5);
            if(ctx.settings.density>.55){p.line(x+winW*.25,winY,x+winW*.25,winY+winH);p.line(x+winW*.75,winY,x+winW*.75,winY+winH);}
          }
        }
        p.strokeWeight(1.5);for(const x of [-w*.43,w*.43])p.line(x,top+4,x,bottom);
        if(floor>0){
          p.strokeWeight(.8);p.line(-w*.51,bottom-5,w*.51,bottom-5);p.line(-w*.51,bottom-17,w*.51,bottom-17);
          for(let i=0;i<=10;i++){const x=-w*.51+w*1.02*i/10;p.line(x,bottom-17,x,bottom-5);}
        }
        window.PoemArchitecture.tiledRoof(ctx,w*1.12,state.rise,top);
      }
      p.pop();
    }
    return {reset,draw,anchors:()=>[{id:'base',x:W/2,y:320},{id:'roof',x:W/2,y:320-levels()*state.step-state.rise}],inspect:()=>({buildingCount:1,levelCount:levels(),windowCount:levels()*3-1,doorCount:1,personCount:0,finite:Object.values(state).every(Number.isFinite),geometryKey:ctx.fingerprint(state)})};
  }
});
