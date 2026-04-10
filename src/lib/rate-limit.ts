import { redis } from "@/lib/redis";

/**
 * Rate limit progressivo de login via Redis.
 *
 * Três níveis de lockout (cumulativos por chave email+IP):
 *  - 5 tentativas  em 5 min   → bloqueia 5 min
 *  - 10 tentativas em 15 min  → bloqueia 15 min
 *  - 20 tentativas            → bloqueia 1 hora
 *
 * Chave: login:attempts:<email>:<ip>  (contador)
 *        login:lockout:<email>:<ip>   (lockout ativo)
 */

interface LockoutTier {
  maxAttempts: number;
  windowSeconds: number;
  lockoutSeconds: number;
}

const LOCKOUT_TIERS: LockoutTier[] = [
  { maxAttempts: 5, windowSeconds: 5 * 60, lockoutSeconds: 5 * 60 }, // 5 tent / 5min → 5min
  { maxAttempts: 10, windowSeconds: 15 * 60, lockoutSeconds: 15 * 60 }, // 10 tent / 15min → 15min
  { maxAttempts: 20, windowSeconds: 60 * 60, lockoutSeconds: 60 * 60 }, // 20 tent → 1h
];

// Janela máxima para expirar o contador — usamos a maior das janelas.
const MAX_WINDOW_SECONDS = Math.max(
  ...LOCKOUT_TIERS.map((t) => t.windowSeconds)
);

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

function buildKeys(email: string, ip: string) {
  const normalized = email.toLowerCase().trim();
  const suffix = `${normalized}:${ip}`;
  return {
    attempts: `login:attempts:${suffix}`,
    lockout: `login:lockout:${suffix}`,
  };
}

/**
 * Verifica e incrementa o rate limit de login para o par email+IP.
 * Retorna { allowed, remaining, resetAt }.
 */
export async function checkLoginRateLimit(
  email: string,
  ip: string
): Promise<RateLimitResult> {
  const keys = buildKeys(email, ip);
  const now = Date.now();

  // 1. Lockout ativo?
  const lockoutTtl = await redis.ttl(keys.lockout);
  if (lockoutTtl > 0) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(now + lockoutTtl * 1000),
    };
  }

  // 2. Incrementa contador (expira na maior janela dos tiers)
  const multi = redis.multi();
  multi.incr(keys.attempts);
  multi.expire(keys.attempts, MAX_WINDOW_SECONDS);
  const results = await multi.exec();

  const attempts = ((results as any)?.[0]?.[1] as number) ?? 1;

  // 3. Determina tier atingido (do maior para o menor)
  //    Se cruzar um threshold, cria lockout correspondente.
  let triggered: LockoutTier | null = null;
  for (let i = LOCKOUT_TIERS.length - 1; i >= 0; i--) {
    if (attempts >= LOCKOUT_TIERS[i].maxAttempts) {
      triggered = LOCKOUT_TIERS[i];
      break;
    }
  }

  if (triggered) {
    await redis.set(keys.lockout, "1", "EX", triggered.lockoutSeconds);
    return {
      allowed: false,
      remaining: 0,
      resetAt: new Date(now + triggered.lockoutSeconds * 1000),
    };
  }

  // 4. Calcula remaining até o próximo threshold
  const nextTier = LOCKOUT_TIERS.find((t) => attempts < t.maxAttempts);
  const remaining = nextTier
    ? Math.max(0, nextTier.maxAttempts - attempts)
    : 0;

  const ttl = await redis.ttl(keys.attempts);
  const resetAt = new Date(
    now + (ttl > 0 ? ttl : MAX_WINDOW_SECONDS) * 1000
  );

  return {
    allowed: true,
    remaining,
    resetAt,
  };
}

/**
 * Limpa contador e lockout para o par email+IP (após login bem-sucedido).
 */
export async function clearLoginRateLimit(
  email: string,
  ip: string
): Promise<void> {
  const keys = buildKeys(email, ip);
  await redis.del(keys.attempts, keys.lockout);
}
