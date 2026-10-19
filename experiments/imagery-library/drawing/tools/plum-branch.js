/* Project-authored curved branches, five-petal flowers and buds.
 * Shares the structural flower idea with the local flower-forms study;
 * no new downloaded botanical outline or source code is used.
 */
window.PoemDrawing.register({
  id:'plum-branch',name:'梅枝',subtitle:'花有着落，枝上也留着未开的苞。',
  credit:'本项目试作 · 曲枝、五瓣花与花苞组合',sources:['project'],reference:'drawing/README.md#梅枝',
  note:'风格化梅枝，横枝／短枝可选，花与花苞附在枝上；尚无整树、具体品种或离枝落花，辨识待审阅。',
  controls:[{id:'form',label:'枝形',default:'branch',choices:[{value:'branch',label:'横枝'},{value:'sprig',label:'短枝'}]}],
  capabilities:['wind-response','shape-selection','density-detail','anchors','fixed-count'],
  create(ctx){
    const {p,alpha}=ctx;let state;
    function point(branch,t){return {x:p.bezierPoint(branch[0],branch[2],branch[4],branch[6],t),y:p.bezierPoint(branch[1],branch[3],branch[5],branch[7],t)};}
    function reset(){
      const dy=p.random(-9,9);
      const branches=[[120,302,235,282,326,172+dy,506,113],[252,246,257,204,266,167,301,123+dy],[359,177,403,183,443,201,490,178],[174,287,180,253,194,222,221,211]];
      const positions=[[0,.40],[0,.62],[0,.82],[0,.95],[1,.42],[1,.80],[2,.58],[2,.90],[3,.75]];
      state={branches,flowers:positions.map(([branch,t])=>({...point(branches[branch],t),branch,r:p.random(11,15),angle:p.random(p.TWO_PI),jitter:Array.from({length:5},()=>p.random(.93,1.07))})),buds:[[1,.98],[2,.32],[3,.97],[0,.72]].map(([branch,t])=>({...point(branches[branch],t),branch,angle:p.random(-.7,.7)}))};
    }
    function flower(node){
      p.push();p.translate(node.x,node.y);p.rotate(node.angle);p.strokeWeight(.7);
      for(let i=0;i<5;i++){
        p.push();p.rotate(i*p.TWO_PI/5);p.fill(alpha(p,ctx.palette.main,160));p.stroke(alpha(p,ctx.palette.ink,175));p.ellipse(0,-node.r*.62,node.r*1.03,node.r*1.22*node.jitter[i]);p.pop();
      }
      p.fill(alpha(p,ctx.palette.accent,230));p.noStroke();p.circle(0,0,node.r*.46);
      p.stroke(alpha(p,ctx.palette.ink,160));p.strokeWeight(.5);
      const n=7+Math.round(ctx.settings.density*6);for(let i=0;i<n;i++){const a=i*p.TWO_PI/n,x=Math.cos(a)*node.r*.47,y=Math.sin(a)*node.r*.47;p.line(0,0,x,y);p.circle(x,y,1.5);}
      p.pop();
    }
    function pose(){return ctx.wind.offset(.4,.016,.62);}
    function draw(){
      p.push();p.translate(120,302);p.rotate(pose());if(ctx.options.form==='sprig')p.scale(.74);p.translate(-120,-302);
      for(const [i,b] of state.branches.entries()){
        // Tapered strokes follow a precomputed curve. No random calls during draw.
        p.noFill();p.stroke(alpha(p,ctx.palette.ink,205));
        for(let j=0;j<30;j++){const a=point(b,j/30),z=point(b,(j+1)/30);p.strokeWeight((i===0?6:3.4)*(1-j/36));p.line(a.x,a.y,z.x,z.y);}
        if(ctx.settings.density>.35){p.strokeWeight(.5);p.stroke(alpha(p,ctx.palette.main,170));for(let j=3;j<27;j+=3){const a=point(b,j/30);p.line(a.x-2,a.y-1,a.x+3,a.y-4);}}
      }
      for(const bud of state.buds){p.push();p.translate(bud.x,bud.y);p.rotate(bud.angle);p.fill(alpha(p,ctx.palette.accent,185));p.stroke(alpha(p,ctx.palette.ink,165));p.strokeWeight(.7);p.ellipse(0,-4,6,9);p.pop();}
      state.flowers.forEach(flower);p.pop();
    }
    return {reset,draw,anchors:()=>{
      const scale=ctx.options.form==='sprig'?.74:1,a=pose();
      return [{id:'root',x:120,y:302},...state.flowers.map((f,i)=>{const x=(f.x-120)*scale,y=(f.y-302)*scale;return {id:'flower-'+i,x:120+x*Math.cos(a)-y*Math.sin(a),y:302+x*Math.sin(a)+y*Math.cos(a)};})];
    },inspect:()=>({branchCount:4,flowerCount:9,budCount:4,form:ctx.options.form,finite:state.flowers.every(f=>Number.isFinite(f.x+f.y+f.r)),geometryKey:ctx.fingerprint(state)})};
  }
});
