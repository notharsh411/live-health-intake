/**
 * Screen Wake Lock + visibility helpers for long live sessions.
 * Phones often suspend audio/WebSocket when the display sleeps.
 */

export type WakeLockSentinelLike = {
  released: boolean;
  release: () => Promise<void>;
  addEventListener?: (type: "release", listener: () => void) => void;
};

export async function requestScreenWakeLock(): Promise<WakeLockSentinelLike | null> {
  if (typeof navigator === "undefined") return null;
  const wakeLock = (
    navigator as Navigator & {
      wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinelLike> };
    }
  ).wakeLock;
  if (!wakeLock?.request) return null;
  try {
    return await wakeLock.request("screen");
  } catch {
    return null;
  }
}

export async function releaseScreenWakeLock(
  sentinel: WakeLockSentinelLike | null | undefined
): Promise<void> {
  if (!sentinel || sentinel.released) return;
  try {
    await sentinel.release();
  } catch {
    // already released
  }
}

export async function resumeAudioContext(
  context: AudioContext | undefined
): Promise<void> {
  if (!context) return;
  if (context.state === "suspended") {
    try {
      await context.resume();
    } catch {
      // autoplay policies may block until a gesture
    }
  }
}
