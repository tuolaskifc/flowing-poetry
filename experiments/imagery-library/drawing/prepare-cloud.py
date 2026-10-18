"""Rebuild the local Apache-2.0 cloud outline adapter from the saved original.
The upstream file remains unchanged. No downloads or generated code execution.
"""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=(root/'code-research/fresco/demos/theatre/cloudGen.js').read_text(encoding='utf-8')
body=source[source.index('function createCloud('):source.index('    // Create cloud shape')]
body=body.replace('return createCloud(angularPosition);','return null;')
helpers=source[source.index('  function randomDirection()'):]
header='''/* Adapted from demos/theatre/cloudGen.js, Niels Pichon / p5.Fresco.
 * Apache-2.0; full license: code-research/fresco/LICENSE. Original retained.
 * Changes: per-instance p5 bindings, bounded retries instead of recursion,
 * numeric points instead of Fresco.Shape; removed random color and frame placement.
 * Rebuild with drawing/prepare-cloud.py. No Fresco runtime is required.
 */
window.PoemCloudOutline = function(p,requestedWidth=190){
  const cloudLevels=3,cloudLevelHeight=100,cloudMinHorizontal=50,
    cloudMaxHorizontal=160,cloudMargin=180,cloudWidth=requestedWidth,cloudResolution=12;
  let forbidSquareClouds=true;
  const random=(...args)=>p.random(...args);
  const createPoint=(x,y)=>p.createVector(x,y),createVector=createPoint;
'''
footer='''
  for(let attempt=0;attempt<13;attempt++){
    if(attempt===12)forbidSquareClouds=false;
    const vertices=createCloud(0);
    if(vertices&&vertices.every(v=>Number.isFinite(v.x+v.y))){
      const minY=Math.min(...vertices.map(v=>v.y)),maxY=Math.max(...vertices.map(v=>v.y));
      const ratio=Math.min(1,100/Math.max(1,maxY-minY));
      return vertices.map(v=>({x:v.x*ratio,y:v.y*ratio}));
    }
  }
  throw new Error('Cloud outline generation failed after bounded retries');
};
'''
adapted=header+body+'    return vertices;\n  }\n'+helpers+footer
(root/'drawing/cloud-outline.js').write_text('\n'.join(line.rstrip() for line in adapted.splitlines())+'\n',encoding='utf-8')
