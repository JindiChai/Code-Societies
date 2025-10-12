//key value pair for check combos
const COMBOS = {
    // fist level combos
    'air+earth': 'dust',
    'air+fire': 'smoke',
    'air+plant': 'pollen',
    'air+water': 'cloud',
    'earth+fire': 'lava',
    'earth+plant': 'grass',
    'earth+water': 'mud',
    'fire+plant': 'ash',
    'fire+water': 'steam',
    'plant+water': 'algae',
  
    // other combos
    'air+dust': 'smoke',
    'air+grass': 'pollen',
    'air+lava': 'stone',
    'air+smoke': 'fog',
    'air+steam': 'cloud',
  
    'dust+earth': 'sand',
    'dust+fire': 'gunpowder',
    'dust+plant': 'spore',
    'dust+water': 'mud',
  
    'earth+grass': 'plant',
    'earth+lava': 'stone',
    'earth+smoke': 'soot',
    'earth+steam': 'hot-spring',
    'earth+swamp': 'bacteria', 
  
    'fire+grass': 'hay',
    'fire+lava': 'lava',
    'fire+smoke': 'ash',
    'fire+steam': 'steam',
    'fire+swamp': 'bacteria',
  
    'grass+plant': 'forest',
    'grass+water': 'plant',
  
    'lava+plant': 'basalt',
    'lava+water': 'stone',
  
    'mud+plant': 'swamp',
    'mud+water': 'fish',
  
    'steam+earth': 'hot-spring',
    'steam+water': 'geyser',
  };
  
window.onload = function(){
  
  const sidebar = document.getElementById('sidebar');
  const stage   = document.getElementById('stage');
  
//dragging
  let dragging = null; // {el, offsetX, offsetY}
  
  function startDragging(chip, e) {
    const rect = chip.getBoundingClientRect();
    dragging = {
      el: chip,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top
    };
  }

  //create new chip
  function newChip(word){
    const chip = document.createElement('div');
    chip.className = 'chip placed';
    chip.textContent = word;
    chip.dataset.word = word;
    stage.appendChild(chip);
    return chip;
  };
  //new chip from sidebar
  sidebar.addEventListener('mousedown', (e)=>{
    const srcChip = e.target.closest('.chip');
    if(!srcChip) return;
  
    const text = srcChip.dataset.word;
    const chip = newChip(text);
    // init location
    const r = stage.getBoundingClientRect();
    chip.style.left = (e.clientX - r.left - chip.offsetWidth / 2) + 'px';
    chip.style.top  = (e.clientY - r.top  - chip.offsetHeight / 2) + 'px';
  
    startDragging(chip, e);
  });

  // check drag
  stage.addEventListener('mousedown', (e)=>{
    const chip = e.target.closest('.chip.placed');
    if(!chip) return;
    startDragging(chip, e);
  });
  

  function tryMerge(activeChip) {
    const allChips = Array.from(stage.querySelectorAll('.chip.placed'));
    let other = null;

    for (let c of allChips) {
      if (c === activeChip) continue; // skip self
      if (rectsOverlap(activeChip, c)) {
        other = c;
        break; // found overlapping chip
      }
    }
    if (!other) return;
  
    const merged = COMBOS[[activeChip.dataset.word, other.dataset.word].sort().join('+')];
    if (!merged) return;
  
    activeChip.dataset.word = activeChip.textContent = merged;
    other.remove();
  }

  //check overlap
  function rectsOverlap(a, b){
    const r1 = a.getBoundingClientRect();
    const r2 = b.getBoundingClientRect();
    return !(r1.right < r2.left || r1.left > r2.right ||
             r1.bottom < r2.top || r1.top > r2.bottom);
  }

  window.addEventListener('mousemove', (e) => {
    if (!dragging) return; //no dragging - return
    dragging.el.style.left = e.pageX - dragging.offsetX - 200 + 'px';
    dragging.el.style.top  = e.pageY - dragging.offsetY + 'px';
  });
  window.addEventListener('mouseup', () => {
    if (!dragging) return;
    tryMerge(dragging.el);
    dragging = null; // clear state
  });
};
  


  
  
  