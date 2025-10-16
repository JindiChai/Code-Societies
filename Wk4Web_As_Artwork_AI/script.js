window.onload = function(){
  
  const sidebar = document.getElementById('sidebar');
  const stage   = document.getElementById('stage');
  
  // Game target system
  let gameScore = 0;
  let currentTarget = 'forest';
  
  // All possible synthesis results (for generating random targets)
  const allPossibleWords = [
    'dust', 'smoke', 'pollen', 'cloud', 'lava', 'grass', 'mud', 'ash', 'steam', 'algae',
    'fog', 'seed', 'rain', 'stone', 'oxygen', 'sand', 'soot', 'clay', 'soil', 'hot-spring',
    'moss', 'gunpowder', 'lightning', 'pollen', 'brick', 'coal', 'biofuel', 'spore', 'basalt',
    //'forest', 'swamp', 'greenhouse', 'kelp', 'nectar', 'fish', 'geyser', 'pond', 'allergy',
    //'dew', 'acid-rain', 'mist', 'tree', 'glass', 'oil', 'honey', 'flower', 'sugar', 'food',
   //'caramel', 'syrup', 'herb', 'storm', 'ecosystem'
  ];
  
  // Update target word display
  function updateTargetDisplay() {
    document.getElementById('targetWord').textContent = currentTarget;
    document.getElementById('score').textContent = gameScore;
  }
  
  // Generate new random target word
  function generateNewTarget() {
    const availableTargets = allPossibleWords.filter(word => word !== currentTarget);
    currentTarget = availableTargets[Math.floor(Math.random() * availableTargets.length)];
    updateTargetDisplay();
  }
  
  // Show success message
  function showSuccessMessage(word) {
    const successMsg = document.createElement('div');
    successMsg.className = 'success-message';
    successMsg.textContent = `Success! Created: ${word}`;
    document.body.appendChild(successMsg);
    
    // Remove message after 1 second
    setTimeout(() => {
      document.body.removeChild(successMsg);
    }, 1000);
  }
  
  // Check if target is completed
  function checkTarget(word) {
    if (word === currentTarget) {
      gameScore++;
      
      // Add target word completion effect
      const targetElement = document.getElementById('targetWord');
      targetElement.classList.add('completed');
      setTimeout(() => {
        targetElement.classList.remove('completed');
      }, 800);
      
      // Show success message
      showSuccessMessage(word);
      
      // Generate new target
      setTimeout(() => {
        generateNewTarget();
      }, 1500);
    }
  }
  
  // Delete chip functionality
  function deleteChip(chip) {
    // Add delete animation effect
    chip.style.transform = 'scale(0)';
    chip.style.opacity = '0';
    chip.style.transition = 'all 0.3s ease-out';
    
    // Remove element after 0.3 seconds
    setTimeout(() => {
      chip.remove();
    }, 300);
  }
  
  // Show delete confirmation prompt
  function showDeleteConfirmation(chip) {
    const confirmMsg = document.createElement('div');
    confirmMsg.className = 'delete-confirmation';
    confirmMsg.innerHTML = `
      <div class="delete-message">
        <div class="delete-text">Delete "${chip.dataset.word}"?</div>
        <div class="delete-buttons">
          <button class="delete-btn delete-yes">Yes</button>
          <button class="delete-btn delete-no">No</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(confirmMsg);
    
    // Add button event listeners
    const yesBtn = confirmMsg.querySelector('.delete-yes');
    const noBtn = confirmMsg.querySelector('.delete-no');
    
    yesBtn.addEventListener('click', () => {
      deleteChip(chip);
      document.body.removeChild(confirmMsg);
    });
    
    noBtn.addEventListener('click', () => {
      document.body.removeChild(confirmMsg);
    });
    
    // Click background to cancel deletion
    confirmMsg.addEventListener('click', (e) => {
      if (e.target === confirmMsg) {
        document.body.removeChild(confirmMsg);
      }
    });
  }
  
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
    // Initialize location
    const r = stage.getBoundingClientRect();
    chip.style.left = (e.clientX - r.left - chip.offsetWidth / 2) + 'px';
    chip.style.top  = (e.clientY - r.top  - chip.offsetHeight / 2) + 'px';
  
    startDragging(chip, e);
  });

  // Check drag
  stage.addEventListener('mousedown', (e)=>{
    const chip = e.target.closest('.chip.placed');
    if(!chip) return;
    startDragging(chip, e);
  });
  
  // Add right-click delete functionality
  stage.addEventListener('contextmenu', (e)=>{
    e.preventDefault(); // Prevent default right-click menu
    const chip = e.target.closest('.chip.placed');
    if(!chip) return;
    showDeleteConfirmation(chip);
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
    
    // Check if target is completed
    checkTarget(merged);
  }

  // Check overlap
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
  
  // Initialize game target display
  updateTargetDisplay();
};
  


  
  
  