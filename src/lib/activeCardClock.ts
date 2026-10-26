/** Visible, focused card exposure in milliseconds. Not speech or engagement. */
export class ActiveCardClock {
  private accumulated = 0;
  private started: number | null = null;
  resume(now: number) { if (this.started === null) this.started = now; }
  pause(now: number) {
    if (this.started !== null) this.accumulated += Math.max(0, now - this.started);
    this.started = null;
  }
  read(now: number) { return Math.round(this.accumulated + (this.started === null ? 0 : Math.max(0, now - this.started))); }
}
