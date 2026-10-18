from pathlib import Path
root=Path('experiments/imagery-library')
s=(root/'sources/noc-boid.js').read_text(encoding='utf-8')
s=s.replace('class Boid {','const BaseBoid = class Boid {',1)
s=s.replace('let desiredseparation = 25.0;', 'let desiredseparation = 38 - 22 * p.poemDensity; // local spatial control')
prefix='''/* Adapted from Daniel Shiffman / The Nature of Code, MIT.
 * Original kept at sources/noc-boid.js; full license at sources/NOC-LICENSE.txt.
 * Changes: p5 instance bindings, density-dependent separation, simultaneous
 * updates in studies.js, bird silhouette and bounds supplied by the local study.
 */
window.createPoemBoidClass = function (p) {
  const createVector = (...args) => p.createVector(...args);
  const random = (...args) => p.random(...args);
'''
(root/'boid-adapter.js').write_text(prefix+s+'\nreturn BaseBoid;\n};\n',encoding='utf-8')
