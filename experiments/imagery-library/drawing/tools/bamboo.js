/* Project-authored segmented culms, leaf clusters and local wind. */
window.PoemDrawing.register({
  id:'bamboo',name:'竹',subtitle:'竿有节，叶从节旁舒展开。',
  credit:'本项目试作 · 竹节、侧枝与窄叶',sources:['project'],reference:'drawing/README.md#本轮植物与天气',
  note:'固定 3 根竹竿，按节布置侧枝与窄叶；风改变叶簇摆动，不把通用树改名为竹。尚未区分竹种。',
  capabilities:['wind-response','density-detail','anchors','fixed-count'],
  create(ctx){
    const {p,width:W,alpha}=ctx;let culms=[];
    function reset(){culms=Array.from({length:3},(_,i)=>({x:W/2+(i-1)*85+p.random(-12,12),height:p.random(230,280),lean:p.random(-.07,.07),width:p.random(5,8),nodes:Array.from({length:6},(_,j)=>({side:(j+i)%2?1:-1,length:p.random(30,52),phase:p.random(p.TWO_PI),leaves:Array.from({length:5},(_,k)=>({t:.2+k*.16,angle:p.random(.3,.8)*(k%2?1:-1),length:p.random(23,36)}))}))}));}
    function draw(){
      for(const stalk of culms){p.push();p.translate(stalk.x,335);p.rotate(stalk.lean);
        p.stroke(alpha(p,ctx.palette.ink,190));p.strokeWeight(.9);p.fill(alpha(p,ctx.palette.main,125));p.rect(-stalk.width/2,-stalk.height,stalk.width,stalk.height,2);
        for(let j=0;j<6;j++){
          const n=stalk.nodes[j],y=-stalk.height*(j+1)/7;p.stroke(alpha(p,ctx.palette.ink,210));p.strokeWeight(1.4);p.line(-stalk.width/2-1,y,stalk.width/2+1,y);
          p.push();p.translate(0,y);p.rotate(n.side*.18+ctx.wind.offset(n.phase,.1));p.scale(n.side,1);
          p.strokeWeight(.8);p.line(0,0,n.length,-15);
          for(const leaf of n.leaves){p.push();p.translate(n.length*leaf.t,-15*leaf.t);p.rotate(leaf.angle);p.fill(alpha(p,ctx.palette.main,185));p.stroke(alpha(p,ctx.palette.ink,90));
            const c=p.drawingContext;c.beginPath();c.moveTo(0,0);c.quadraticCurveTo(leaf.length*.5,-5,leaf.length,0);c.quadraticCurveTo(leaf.length*.5,3,0,0);c.closePath();c.fill();c.stroke();
            if(ctx.settings.density>.5){p.stroke(alpha(p,ctx.palette.ink,70));p.line(0,0,leaf.length,0);}p.pop();
          }p.pop();
        }p.pop();
      }
    }
    return {reset,draw,anchors:()=>culms.map((s,i)=>({id:'root-'+i,x:s.x,y:335})),inspect:()=>({culmCount:3,nodeCount:18,leafCount:90,finite:culms.every(s=>Number.isFinite(s.x+s.height+s.lean)),geometryKey:ctx.fingerprint(culms)})};
  }
});
