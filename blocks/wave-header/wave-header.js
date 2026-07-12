import { readBlockConfig, toClassName } from '../../scripts/aem.js';
import { buildWave } from '../../scripts/wave/wave.js';

export default async function decorate(block) {
  const config = readBlockConfig(block);
  const rows = [...block.querySelectorAll(':scope > div')];

  // Grab an authored illustration (optimized <picture>) from a given row
  const pickImage = (slug) => {
    const row = rows.find((r) => toClassName(r.children[0]?.textContent || '') === slug);
    const el = row?.children[1]?.querySelector('picture, img');
    return el ? (el.closest('picture') || el) : null;
  };

  // Motion is off by default; author sets Animate to "on" to enable it per side
  const ON = ['on', 'yes', 'true', '1'];
  const animates = (value) => ON.includes(String(value || '').trim().toLowerCase());

  const wave = buildWave({
    position: config.position,
    shape: config.shape,
    curve: config.curve,
    color: config.color,
    opacity: config.opacity,
    illustrations: [
      {
        el: pickImage('illustration-left'),
        alt: config['left-alt'] || '',
        side: 'left',
        animate: animates(config['left-animate']),
      },
      {
        el: pickImage('illustration-right'),
        alt: config['right-alt'] || '',
        side: 'right',
        animate: animates(config['right-animate']),
      },
    ],
  });

  block.textContent = '';
  block.append(wave);
}
