class TaskQueue {
  constructor() {
    this.queue = Promise.resolve(); // Start with a resolved promise
  }

  enqueue(taskFn) {
    const result = this.queue.then(() => taskFn());
    this.queue = result.catch(() => {}); // Avoid queue blockage on error
    return result;
  }
}

// Singleton instance
const globalQueue = new TaskQueue();
export default globalQueue;
