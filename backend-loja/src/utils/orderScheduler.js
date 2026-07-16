let schedulerTimer = null;

export function shouldStartOrderScheduler(env = process.env) {
  return env.NODE_ENV !== 'test' && env.ENABLE_ORDER_SCHEDULER === 'true';
}

export function startOrderScheduler(run, env = process.env, setIntervalFn = setInterval) {
  if (!shouldStartOrderScheduler(env) || schedulerTimer) return schedulerTimer;

  schedulerTimer = setIntervalFn(run, 60000);
  return schedulerTimer;
}

export function resetOrderSchedulerForTests() {
  schedulerTimer = null;
}
