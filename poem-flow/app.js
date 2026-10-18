(function () {
  'use strict';
  const byId = (id) => document.getElementById(id);
  const buttons = ['regenerate', 'pause', 'save', 'immersive'].map(byId);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let paused = reducedMotion;
  let immersive = false;
  let scene;
  function newSeed() { return crypto.getRandomValues(new Uint32Array(1))[0]; }
  const requestedSeed = new URLSearchParams(location.search).get('seed');
  let seed = requestedSeed !== null && /^\d{1,10}$/.test(requestedSeed) ? Number(requestedSeed) >>> 0 : newSeed();

  function announce(message) { byId('announcements').textContent = message; }
  function updatePause() {
    byId('pause').textContent = paused ? '继续' : '暂停';
    byId('pause').setAttribute('aria-pressed', String(paused));
    byId('scene-state').textContent = paused ? '在这一刻停留' : '风正在经过';
    byId('live-dot').classList.toggle('paused', paused);
  }
  function setImmersive(value) {
    immersive = value;
    document.body.classList.toggle('immersive', immersive);
    byId('immersive').setAttribute('aria-pressed', String(immersive));
    byId('immersive').innerHTML = immersive ? '回到诗句 <span aria-hidden="true">⤡</span>' : '沉浸观看 <span aria-hidden="true">⤢</span>';
  }

  try {
    if (!window.p5 || !window.PoemScene) throw new Error('绘图库未能加载');
    scene = window.PoemScene.mount(byId('canvas-mount'), {
      seed, paused,
      onReady() {
        byId('loading').hidden = true;
        buttons.forEach((button) => { button.disabled = false; });
        updatePause();
      },
    });
  } catch (error) {
    byId('loading').textContent = '画面暂未展开，请刷新页面重试。';
    console.error(error);
  }

  byId('regenerate').addEventListener('click', () => {
    seed = newSeed();
    scene.regenerate(seed);
    announce('新的风景已经展开。');
  });
  byId('pause').addEventListener('click', () => {
    paused = !paused;
    scene.setPaused(paused);
    updatePause();
  });
  byId('save').addEventListener('click', () => {
    try {
      const link = document.createElement('a');
      link.href = scene.capture();
      link.download = `句间-越过漫长-${seed}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      announce('这一刻已导出为图片。');
    } catch (error) { announce('图片未能保存，请稍后重试。'); console.error(error); }
  });
  byId('immersive').addEventListener('click', () => setImmersive(!immersive));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && immersive) setImmersive(false);
  });
  document.addEventListener('visibilitychange', () => {
    if (scene) scene.setPaused(document.hidden || paused);
  });
})();
