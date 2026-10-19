/* Project-authored attachment renderer. Coordinates belong to the carrier's
 * local surface; callers transform carrier and marks together. No particles,
 * random draws, timers or implicit plants/ground are created here.
 */
window.PoemSurfaceMarks=Object.freeze({
  dew(ctx,drops){
    const {p,alpha}=ctx;
    for(const {x,y,r=3} of drops){
      p.fill(alpha(p,ctx.palette.bg,235));p.stroke(alpha(p,ctx.palette.ink,130));p.strokeWeight(.6);p.ellipse(x,y,r*2,r*1.7);
      p.noStroke();p.fill(alpha(p,ctx.palette.accent,215));p.ellipse(x-r*.3,y-r*.28,r*.65,r*.45);
    }
  },
  frost(ctx,paths,crystals=[]){
    const {p,alpha}=ctx;
    for(const points of paths){
      p.noFill();p.stroke(alpha(p,ctx.palette.bg,250));p.strokeWeight(1.7);p.beginShape();for(const q of points)p.vertex(q.x,q.y);p.endShape();
      p.stroke(alpha(p,ctx.palette.ink,47));p.strokeWeight(.4);p.beginShape();for(const q of points)p.vertex(q.x+.6,q.y+.3);p.endShape();
    }
    for(const {x,y,r=3,angle=0} of crystals){
      p.push();p.translate(x,y);p.rotate(angle);p.stroke(alpha(p,ctx.palette.bg,250));p.strokeWeight(1);
      p.line(-r,0,r,0);p.line(0,-r*.6,0,r*.6);p.line(-r*.7,-r*.5,r*.7,r*.5);
      p.stroke(alpha(p,ctx.palette.ink,60));p.strokeWeight(.35);p.line(-r,1,r,1);p.pop();
    }
  }
});
