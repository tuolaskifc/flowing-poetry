/* Extracted from the first local study; provenance is declared by source id. */
window.PoemDrawing.register({
"id":"tree","name":"树","subtitle":"一根枝条，长出许多不同的树。","credit":"参考 NOC Recursive Tree · MIT","note":"固定骨架、局部枝叶与风响应；尚未区分具体树种。","sources":["noc-tree", "project"],"reference":"ref-tree",
capabilities:["wind-response", "density-detail"],
create(ctx) {
 const {p,width:W,height:H,alpha}=ctx; const shared=ctx.settings;
 let state={},time=0,palette=ctx.palette;
 function reset() {
function branch(len,depth) {
            return {len,angle:p.random(-.12,.12),phase:p.random(p.TWO_PI),leaves:Array.from({length:5},()=>({angle:p.random(-1.4,1.4),r:p.random(4,10),chance:p.random()})),children:depth>0?[branch(len*p.random(.62,.74),depth-1),branch(len*p.random(.61,.73),depth-1)]:[]};
          }
          state.root=branch(86,6);
 }
function tree() {
        function drawBranch(node,depth,side) {
          p.push();p.rotate(node.angle+side*.43+ctx.wind.offset(node.phase,.055,.65)*(7-depth)/5);
          p.stroke(alpha(p,palette.ink,190-depth*10));p.strokeWeight(Math.max(.6,depth*.52));p.noFill();
          p.bezier(0,0,node.len*.05,-node.len*.3,-node.len*.06,-node.len*.7,0,-node.len);
          p.translate(0,-node.len);
          if(depth<3) for(const leaf of node.leaves) if(leaf.chance<.24+shared.density*.76) {
            p.push();p.rotate(leaf.angle+Math.sin(time+node.phase)*shared.wind*.1);p.noStroke();p.fill(alpha(p,palette.main,110));p.ellipse(leaf.r*.5,-leaf.r*.5,leaf.r,leaf.r*.35);p.pop();
          }
          node.children.forEach((c,i)=>drawBranch(c,depth-1,i===0?-1:1));p.pop();
        }
        p.push();p.translate(W*.5,H+3);drawBranch(state.root,6,0);p.pop();
      }
return {reset,draw(){time=ctx.time;palette=ctx.palette;tree();},inspect(){return {finite:true,geometryKey:ctx.fingerprint(state.root)};}};
}
});
