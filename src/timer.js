/**
 * Timer Module for 3D Rubik's Cube Game
 * Starts when user makes first move after scramble
 */

export class CubeTimer {
  constructor() {
    this.startTime = null;
    this.elapsedTime = 0;
    this.timerInterval = null;
    this.isRunning = false;
    this.hasStarted = false;
    this.moveCount = 0;
  }

  /**
   * Initialize the timer (call this after scramble button is pressed)
   */
  initialize() {
    this.reset();
    this.hasStarted = false;
    console.log('Timer initialized - ready to start on first move');
  }

  /**
   * Start the timer (call this on first move after scramble)
   */
  start() {
    if (this.isRunning) return;
    
    this.startTime = Date.now() - this.elapsedTime;
    this.isRunning = true;
    this.hasStarted = true;
    
    this.timerInterval = setInterval(() => {
      this.elapsedTime = Date.now() - this.startTime;
      this.updateDisplay();
    }, 10); // Update every 10ms for smooth display
    
    console.log('Timer started!');
  }

  /**
   * Pause the timer
   */
  pause() {
    if (!this.isRunning) return;
    
    clearInterval(this.timerInterval);
    this.isRunning = false;
    console.log('Timer paused');
  }

  /**
   * Resume the timer
   */
  resume() {
    if (this.isRunning) return;
    this.start();
  }

  /**
   * Stop the timer completely
   */
  stop() {
    clearInterval(this.timerInterval);
    this.isRunning = false;
    console.log('Timer stopped at:', this.getFormattedTime());
  }

  /**
   * Reset the timer to zero
   */
  reset() {
    clearInterval(this.timerInterval);
    this.startTime = null;
    this.elapsedTime = 0;
    this.isRunning = false;
    this.hasStarted = false;
    this.moveCount = 0;
    this.updateDisplay();
    this.updateMoveDisplay()
    console.log('Timer reset');
  }

  /**
   * Increment move counter and start timer if first move
   */
  recordMove() {
    this.moveCount++;
    
    // Start timer on first move after scramble
    if (!this.hasStarted && !this.isRunning) {
      this.start();
    }
    
    this.updateMoveDisplay();
  }

  /**
   * Get elapsed time in milliseconds
   */
  getElapsedTime() {
    return this.elapsedTime;
  }

  /**
   * Get formatted time as MM:SS.mmm
   */
  getFormattedTime() {
    const totalSeconds = Math.floor(this.elapsedTime / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const milliseconds = Math.floor((this.elapsedTime % 1000) / 10);

    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(2, '0')}`;
  }

  /**
   * Update the timer display in the DOM
   */
  updateDisplay() {
    const timerElement = document.getElementById('timer-display');
    if (timerElement) {
      timerElement.textContent = this.getFormattedTime();
    }
  }

  /**
   * Update the move counter display in the DOM
   */
  updateMoveDisplay() {
    const moveElement = document.getElementById('move-counter');
    if (moveElement) {
      moveElement.textContent = `Moves: ${this.moveCount}`;
    }
  }

  /**
   * Get current move count
   */
  getMoveCount() {
    return this.moveCount;
  }

  /**
   * Check if timer is currently running
   */
  isTimerRunning() {
    return this.isRunning;
  }
}
