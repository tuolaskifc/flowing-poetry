/* Extracted from the first local study; provenance is declared by source id. */
window.PoemDrawing.register({
"id":"tree","name":"树","subtitle":"一根枝条，长出许多不同的树。","credit":"参考 NOC Recursive Tree · MIT","note":"固定骨架、局部枝叶与风响应；尚未区分具体树种。","sources":["noc-tree", "project"],"reference":"ref-tree",
capabilities:["wind-response", "density-detail"],
controls:[{id:'form',label:'树形',default:'broadleaf',choices:[{value:'broadleaf',label:'疏叶树'},{value:'pine',label:'松意'},{value:'blossom',label:'疏花树'}]},{id:'branches',label:'主花枝',default:'7',choices:Array.from({length:7},(_,i)=>({value:String(i+1),label:String(i+1)}))},{id:'crown',label:'树冠',default:'lines',choices:[{value:'lines',label:'疏叶'},{value:'wash',label:'叠墨'}]}],
create(ctx) {
 const {p,width:W,height:H,alpha}=ctx; const shared=ctx.settings;
 let state={},time=0,palette=ctx.palette,pine=[];
 function reset() {
function branch(len,depth) {
            return {len,angle:p.random(-.12,.12),phase:p.random(p.TWO_PI),leaves:Array.from({length:5},()=>({angle:p.random(-1.4,1.4),r:p.random(4,10),chance:p.random()})),children:depth>0?[branch(len*p.random(.62,.74),depth-1),branch(len*p.random(.61,.73),depth-1)]:[]};
          }
          state.root=branch(86,6);
          pine=Array.from({length:7},(_,i)=>({y:100+i*36+p.random(-10,10),x:p.random(-26,26),spread:(30+i*11)*p.random(.75,1.2),phase:p.random(p.TWO_PI),needles:Array.from({length:48},()=>({x:p.random(-1,1),y:p.random(-18,11),length:p.random(5,12)}))}));
 }
function tree() {
        function drawBranch(node,depth,side) {
          p.push();p.rotate(node.angle+side*.43+ctx.wind.offset(node.phase,.055,.65)*(7-depth)/5);
          p.stroke(alpha(p,palette.ink,190-depth*10));p.strokeWeight(Math.max(.6,depth*.52));p.noFill();
          p.bezier(0,0,node.len*.05,-node.len*.3,-node.len*.06,-node.len*.7,0,-node.len);
          p.translate(0,-node.len);
          if(depth===2&&ctx.options.crown==='wash'){p.noStroke();p.fill(alpha(p,palette.main,45));p.ellipse(0,-node.len*.55,node.len*2.4,node.len*1.15);}
          if(depth<3) for(const leaf of node.leaves) if(leaf.chance<.24+shared.density*.76) {
            p.push();p.rotate(leaf.angle+Math.sin(time+node.phase)*shared.wind*.1);p.noStroke();p.fill(alpha(p,palette.main,110));p.ellipse(leaf.r*.5,-leaf.r*.5,leaf.r,leaf.r*.35);p.pop();
          }
          node.children.forEach((c,i)=>drawBranch(c,depth-1,i===0?-1:1));p.pop();
        }
        p.push();p.translate(W*.5,H+3);drawBranch(state.root,6,0);p.pop();
      }
function pineTree(){
 const brush=window.PoemInkBrush.create(ctx);brush.stroke([320,388,310,280,335,180,320,75],3.5,palette.ink,190,2,true);
 for(const [i,b] of pine.entries()){
  const shift=ctx.wind.offset(b.phase,2,.5),x=320+b.x+shift,y=b.y;
  brush.stroke([320,y+12,x-b.spread*.2,y+5,x-b.spread*.7,y-3,x-b.spread,y+3],1.8,palette.ink,150,i,true);
  brush.stroke([320,y+12,x+b.spread*.25,y+2,x+b.spread*.7,y+6,x+b.spread,y-4],1.5,palette.ink,150,i+1,true);
  for(const n of b.needles){const nx=x+n.x*b.spread,ny=y+n.y+Math.abs(n.x)*7;p.noStroke();p.fill(alpha(p,palette.main,70));p.triangle(nx-n.length*.8,ny+3,nx+n.length,ny+1,nx+n.length*.2,ny-n.length*.65);p.stroke(alpha(p,palette.ink,155));p.strokeWeight(.65);p.line(nx,ny,nx+n.length*.5,ny-n.length);p.line(nx,ny,nx-n.length*.4,ny-n.length*.7);}
 }
}
function blossomTree(){
 const b=window.PoemInkBrush.create(ctx),n=Number(ctx.options.branches||7);
 b.stroke([320,388,296,325,343,250,317,167],2.8,palette.ink,170,8,false);
 for(let i=0;i<n;i++){
  const branch=pine[i],side=i%2?-1:1,rootY=306-i*19,endX=320+side*(82+(i%3)*37),endY=109+(i%4)*29;
  b.stroke([320,rootY,320+side*20,rootY-55,endX-side*22,endY+10,endX,endY],1.1,palette.ink,155,i,false);
  for(let j=0;j<21;j++){const t=.25+(j/21)*.75,note=branch.needles[j],x=320+(endX-320)*t+note.x*24+ctx.wind.offset(branch.phase,1,.6),y=rootY+(endY-rootY)*t+note.y*.9;
   p.noStroke();p.fill(alpha(p,'#CA9492',25));p.ellipse(x,y,11,8);
   for(let k=0;k<5;k++){const a=k*p.TWO_PI/5;p.fill(alpha(p,j%3?'#C79198':palette.bg,155));p.ellipse(x+Math.cos(a)*3,y+Math.sin(a)*3,5,4);}p.fill(alpha(p,palette.ink,95));p.circle(x,y,1.8);
  }
 }
}
return {reset,draw(){time=ctx.time;palette=ctx.palette;ctx.options.form==='pine'?pineTree():ctx.options.form==='blossom'?blossomTree():tree();},inspect(){return {finite:true,treeCount:1,form:ctx.options.form,blossomBranches:ctx.options.form==='blossom'?Number(ctx.options.branches):null,geometryKey:ctx.fingerprint(ctx.options.form==='pine'||ctx.options.form==='blossom'?pine:state.root)};}};
}
});
