let schedulerTimer = null;
let executionInProgress = false;

export function shouldStartOrderScheduler(env = process.env) {
  return env.NODE_ENV !== 'test' && env.ENABLE_ORDER_SCHEDULER === 'true';
}

export function startOrderScheduler(run, env = process.env, setIntervalFn = setInterval, clearIntervalFn = clearInterval) {
  if (!shouldStartOrderScheduler(env) || schedulerTimer) return schedulerTimer;

  const cycle = async () => {
    if (executionInProgress) return;
    executionInProgress = true;
    try {
      await run();
    } catch (error) {
      console.error('Scheduler de expiracao falhou:', error?.message || 'erro');
    } finally {
      executionInProgress = false;
    }
  };

  const timer = setIntervalFn(cycle, 60000);
  schedulerTimer = {
    timer,
    stop() {
      clearIntervalFn(timer);
      schedulerTimer = null;
    },
  };
  return schedulerTimer;
}

export function resetOrderSchedulerForTests() {
  schedulerTimer = null;
  executionInProgress = false;
}

export function stopOrderScheduler() {
  schedulerTimer?.stop?.();
}
