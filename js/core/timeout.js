/** Rejette si `promise` ne s'est pas réglée au bout de `ms` millisecondes. */
export function withTimeout(promise, ms, message = 'délai dépassé') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
