/* Shared tiled-roof geometry extracted from the local pavilion adaptation.
 * Ridge/eave construction: Lingdong Huang / Shan, Shui, MIT.
 * Original: code-research/shan-index.html; license: shan-LICENSE.txt.
 * Canvas rendering, palette and seeded building layouts are local additions.
 */
window.PoemArchitecture = Object.freeze({
  tiledRoof(ctx, width, rise, eave) {
    const {p,alpha}=ctx,w=width,mid=w*.18,quat=-w*.16;
    const ridgeL=[-w*.5+quat,eave-rise-3],ridgeR=[mid+quat,eave-rise];
    const path=(points,closed=false)=>{p.beginShape();for(const [x,y] of points)p.vertex(x,y);p.endShape(closed?p.CLOSE:undefined);};
    p.fill(alpha(p,ctx.palette.main,100));p.stroke(alpha(p,ctx.palette.ink,195));p.strokeWeight(1.05);
    path([[-w*.5-5,eave],ridgeL,ridgeR,[w*.5+5,eave],[mid+5,eave+8]],true);
    path([ridgeR,[mid+quat/2,eave-rise/2+3],[mid+5,eave+8]]);
    p.stroke(alpha(p,ctx.palette.ink,55));p.strokeWeight(.6);
    const n=7+Math.round(ctx.settings.density*14);
    for(let i=0;i<=n;i++){const t=i/n;p.line(ridgeL[0]+(ridgeR[0]-ridgeL[0])*t,ridgeL[1]+(ridgeR[1]-ridgeL[1])*t,-w*.5+(mid+w*.5)*t,eave+8*t);}
  }
});
