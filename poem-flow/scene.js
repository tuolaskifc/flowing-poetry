/* Drawing only: the interface talks to this module through a small controller.
 * Coordinates are normalized so the same composition can fit other screens.
 * This first scene is authored for one fixed sentence, not arbitrary text. */
(function () {
  'use strict';
  window.PoemScene = {
    mount(host, options = {}) {
      let instance;
      let canvas;
      let time = 0;
      let seed = options.seed >>> 0;
      let paused = Boolean(options.paused);
      let observer;
      let wind = [];
      let grains = [];
      let variation;
      let resetScene;
      const pointer = { x: 0.5, y: 0.5, strength: 0 };

      const sketch = (p) => {
        function reset(nextSeed) {
          seed = nextSeed >>> 0;
          p.randomSeed(seed);
          p.noiseSeed(seed);
          time = 0;
          variation = {
            focusX: p.random(0.46, 0.61), focusY: p.random(0.34, 0.43),
            bend: p.random(-0.13, 0.13),
            phase: p.random(0, Math.PI * 2), warmth: p.random(0, 1),
          };
          wind = Array.from({ length: 95 }, () => ({
            x: p.random(), y: p.random(0.12, 0.98), phase: p.random(0, 6.28),
            speed: p.random(0.005, 0.018), length: p.random(0.015, 0.055),
          }));
          grains = Array.from({ length: 170 }, () => ({
            x: p.random(), y: p.random(), r: p.random(0.00035, 0.0013),
            phase: p.random(0, 6.28), speed: p.random(0.002, 0.011),
          }));
        }
        resetScene = reset;

        function drawSky(ctx) {
          const gradient = ctx.createLinearGradient(0, 0, 0.25, 1);
          gradient.addColorStop(0, '#adc8ce');
          gradient.addColorStop(0.35, variation.warmth > 0.5 ? '#d4d9d3' : '#c9d9d8');
          gradient.addColorStop(0.65, '#efd8c5');
          gradient.addColorStop(1, '#8eabb0');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, 1, 1);
          const halo = ctx.createRadialGradient(variation.focusX, variation.focusY, 0, variation.focusX, variation.focusY, 0.36);
          halo.addColorStop(0, 'rgba(255,247,213,.92)');
          halo.addColorStop(0.18, 'rgba(255,226,195,.38)');
          halo.addColorStop(1, 'rgba(255,230,206,0)');
          ctx.fillStyle = halo;
          ctx.fillRect(0, 0, 1, 1);
        }

        function landY(x, layer) {
          const breath = time * 0.024;
          return 0.48 + layer * 0.066
            + (p.noise(x * 1.8 + layer * 1.3, breath) - 0.5) * (0.2 + layer * 0.02)
            + Math.sin(x * 5 + layer * 0.65 + variation.phase) * 0.024;
        }

        function drawLand(ctx) {
          const colors = ['#c5cbd1', '#b2c3c8', '#9db6ba', '#83a6ac', '#6e939d', '#557e8e'];
          colors.forEach((color, layer) => {
            ctx.beginPath();
            ctx.moveTo(-0.02, 1.1);
            for (let step = -2; step <= 102; step++) {
              const x = step / 100;
              ctx.lineTo(x, landY(x, layer));
            }
            ctx.lineTo(1.02, 1.1);
            ctx.closePath();
            const shade = ctx.createLinearGradient(0, 0.4, 0, 1);
            shade.addColorStop(0, color);
            shade.addColorStop(1, layer < 3 ? '#b4c8c9' : '#4f7889');
            ctx.fillStyle = shade;
            ctx.fill();
            ctx.beginPath();
            for (let step = 0; step <= 100; step++) {
              const x = step / 100;
              const y = landY(x, layer);
              if (step === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = `rgba(255,235,203,${0.34 - layer * 0.027})`;
            ctx.lineWidth = 0.0008;
            ctx.stroke();
          });
          // Fine contour lines connect the foreground into one continuous land.
          for (let line = 0; line < 18; line++) {
            ctx.beginPath();
            for (let step = 0; step <= 85; step++) {
              const x = step / 85;
              const y = landY(x, 5) + 0.012 + line * 0.013
                + Math.sin(x * 11 + line * 0.19 + time * 0.035) * 0.009;
              if (step === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
            }
            ctx.strokeStyle = `rgba(213,226,215,${0.13 - line * 0.004})`;
            ctx.lineWidth = 0.00065;
            ctx.stroke();
          }
        }

        function pathPoint(progress) {
          const y = 1.1 + (variation.focusY - 1.1) * progress;
          const x = 0.34 + (variation.focusX - 0.34) * progress
            + Math.sin(progress * 8 + variation.phase * 0.3) * (1 - progress) * 0.075
            + variation.bend * Math.sin(progress * Math.PI);
          return { x, y };
        }

        function drawJourney(ctx) {
          for (const [width, alpha] of [[0.014, 0.025], [0.006, 0.09], [0.0013, 0.7]]) {
            ctx.beginPath();
            for (let i = 0; i <= 170; i++) {
              const point = pathPoint(i / 170);
              if (i === 0) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y);
            }
            ctx.strokeStyle = `rgba(255,231,183,${alpha})`;
            ctx.lineWidth = width;
            ctx.stroke();
          }
          // A small light walks the path instead of lighting the whole path equally.
          const progress = 0.15 + ((time * 0.015) % 0.76);
          const walker = pathPoint(progress);
          const glow = ctx.createRadialGradient(walker.x, walker.y, 0, walker.x, walker.y, 0.025);
          glow.addColorStop(0, 'rgba(255,248,217,.9)');
          glow.addColorStop(1, 'rgba(255,231,183,0)');
          ctx.fillStyle = glow;
          ctx.fillRect(walker.x - 0.03, walker.y - 0.03, 0.06, 0.06);
          ctx.fillStyle = '#fff6d9';
          ctx.beginPath();
          ctx.ellipse(walker.x, walker.y, 0.0016, 0.003, 0, 0, Math.PI * 2);
          ctx.fill();
        }

        function drawEmbrace(ctx) {
          const fx = variation.focusX;
          const fy = variation.focusY;
          const breath = Math.sin(time * 0.32) * 0.007;
          // Paired open contours suggest palms and fingers without literal illustration.
          for (const side of [-1, 1]) {
            for (let finger = 0; finger < 4; finger++) {
              const gap = finger * 0.009;
              ctx.beginPath();
              ctx.moveTo(fx + side * (0.4 + gap), 1.08);
              ctx.bezierCurveTo(fx + side * (0.31 + gap), 0.72,
                fx + side * (0.31 + gap), fy + 0.26,
                fx + side * (0.17 + gap), fy + 0.15);
              ctx.bezierCurveTo(fx + side * (0.12 + gap), fy + 0.1,
                fx + side * (0.06 + gap), fy + 0.09 + breath,
                fx + side * (0.025 + gap * 0.6), fy + 0.045 + breath);
              ctx.strokeStyle = `rgba(255,223,187,${0.42 - finger * 0.075})`;
              ctx.lineWidth = finger === 0 ? 0.0017 : 0.0008;
              ctx.stroke();
            }
          }
          const radius = 0.018 + Math.sin(time * 0.65) * 0.0015;
          const glow = ctx.createRadialGradient(fx, fy, 0, fx, fy, radius * 4.8);
          glow.addColorStop(0, 'rgba(255,250,221,.95)');
          glow.addColorStop(0.23, 'rgba(255,229,179,.45)');
          glow.addColorStop(1, 'rgba(255,221,181,0)');
          ctx.fillStyle = glow;
          ctx.fillRect(fx - radius * 5, fy - radius * 5, radius * 10, radius * 10);
          ctx.fillStyle = '#fff8dc';
          ctx.beginPath();
          ctx.ellipse(fx, fy, radius * 0.24, radius * 0.5, -0.2, 0, Math.PI * 2);
          ctx.fill();
        }

        function drawWind(ctx) {
          wind.forEach((ribbon) => {
            const x = (ribbon.x + time * ribbon.speed) % 1.15 - 0.075;
            const sway = p.noise(ribbon.x * 3, time * 0.06) * 0.055;
            const y = ribbon.y + sway + Math.sin(time * 0.15 + ribbon.phase) * 0.012;
            const distance = Math.hypot(x - pointer.x, y - pointer.y);
            const lift = Math.max(0, 0.2 - distance) * pointer.strength * 0.25;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.quadraticCurveTo(x + ribbon.length * 0.5, y - lift - 0.01, x + ribbon.length, y - lift);
            ctx.strokeStyle = y > 0.6 ? 'rgba(236,240,218,.15)' : 'rgba(255,249,228,.28)';
            ctx.lineWidth = 0.00065;
            ctx.stroke();
          });
          grains.forEach((grain) => {
            const x = (grain.x + Math.sin(time * 0.09 + grain.phase) * 0.016 + 1) % 1;
            const y = (grain.y - time * grain.speed % 1 + 1) % 1;
            const opacity = 0.12 + (Math.sin(time * 0.55 + grain.phase) + 1) * 0.13;
            ctx.fillStyle = `rgba(255,246,214,${opacity})`;
            ctx.beginPath();
            ctx.arc(x, y, grain.r, 0, Math.PI * 2);
            ctx.fill();
          });
        }

        p.setup = () => {
          const bounds = host.getBoundingClientRect();
          canvas = p.createCanvas(Math.max(1, bounds.width), Math.max(1, bounds.height));
          canvas.parent(host);
          p.pixelDensity(Math.min(window.devicePixelRatio || 1, 1.5));
          p.frameRate(45);
          p.describe('层叠的大地在风中缓慢变化，一点光沿着蜿蜒路径前行，两侧掌形轮廓向远处的暖光收拢。');
          reset(seed);
          observer = new ResizeObserver(() => {
            const bounds = host.getBoundingClientRect();
            if (bounds.width > 0 && bounds.height > 0) {
              p.resizeCanvas(bounds.width, bounds.height);
              if (paused) p.redraw();
            }
          });
          observer.observe(host);
          if (paused) p.noLoop();
          requestAnimationFrame(() => options.onReady?.());
        };

        p.draw = () => {
          if (!variation) return;
          const ctx = p.drawingContext;
          ctx.save();
          ctx.scale(p.width, p.height);
          drawSky(ctx);
          drawLand(ctx);
          drawJourney(ctx);
          drawEmbrace(ctx);
          drawWind(ctx);
          ctx.restore();
          if (!paused) time += Math.min(p.deltaTime || 16.67, 50) / 1000;
          pointer.strength *= 0.98;
        };
      };

      instance = new p5(sketch);
      function movePointer(event) {
        const bounds = host.getBoundingClientRect();
        pointer.x = (event.clientX - bounds.left) / bounds.width;
        pointer.y = (event.clientY - bounds.top) / bounds.height;
        pointer.strength = 1;
      }
      host.addEventListener('pointermove', movePointer);
      return {
        regenerate(nextSeed) {
          resetScene(nextSeed);
          if (paused) instance.redraw();
        },
        setPaused(value) { paused = Boolean(value); if (paused) instance.noLoop(); else instance.loop(); },
        capture() { return canvas.elt.toDataURL('image/png'); },
        destroy() { observer?.disconnect(); host.removeEventListener('pointermove', movePointer); instance.remove(); },
      };
    },
  };
})();
