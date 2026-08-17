const NOTIF_STORAGE_KEY = 'craig_notifications_enabled';
const LAST_NOTIF_TIME_KEY = 'craig_last_notif_time';
const LAST_DAILY_1625_KEY = 'craig_last_daily_1625';

const NOTIFICATION_PHRASES = [
  'Персонажи сами себя не загадают ✨',
  'Камон, мне уже скучно!',
  '🐊🐊🐊🐊🐊🐊🐊🐊🐊',
  'Эй, друг, ты про меня совсем забыл!',
  'Цыпа-цыпа, заходи поиграть, давай же!'
];

export function isNotificationsEnabled(): boolean {
  const saved = localStorage.getItem(NOTIF_STORAGE_KEY);
  return saved === null ? true : saved === 'true';
}

export async function setNotificationsEnabled(enabled: boolean): Promise<boolean> {
  localStorage.setItem(NOTIF_STORAGE_KEY, String(enabled));
  
  if (enabled && typeof window !== 'undefined' && 'Notification' in window) {
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }
  return false;
}

export function sendCraigNotification(customBody?: string): void {
  if (!isNotificationsEnabled()) return;
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;

  const phrase = customBody || NOTIFICATION_PHRASES[Math.floor(Math.random() * NOTIFICATION_PHRASES.length)];

  try {
    new Notification('Craig', {
      body: phrase,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'craig-reminder'
    });
    localStorage.setItem(LAST_NOTIF_TIME_KEY, String(Date.now()));
  } catch (err) {
    console.warn('Не удалось отправить уведомление:', err);
  }
}

// Фоновый таймер: проверка каждые 3 часа и в 16:25 каждый день
export function initNotificationScheduler(): void {
  if (typeof window === 'undefined') return;

  const checkAndNotify = () => {
    if (!isNotificationsEnabled()) return;
    if (Notification.permission !== 'granted') return;

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const todayStr = now.toDateString();

    // 1. Проверка фиксированного времени 16:25
    const lastDaily = localStorage.getItem(LAST_DAILY_1625_KEY);
    if (hours === 16 && minutes === 25 && lastDaily !== todayStr) {
      localStorage.setItem(LAST_DAILY_1625_KEY, todayStr);
      sendCraigNotification();
      return;
    }

    // 2. Проверка интервала в 3 часа (10800000 мс)
    const lastTimeRaw = localStorage.getItem(LAST_NOTIF_TIME_KEY);
    const lastTime = lastTimeRaw ? parseInt(lastTimeRaw, 10) : 0;
    const threeHoursMs = 3 * 60 * 60 * 1000;

    if (Date.now() - lastTime >= threeHoursMs) {
      sendCraigNotification();
    }
  };

  // Проверка каждую минуту
  setInterval(checkAndNotify, 60 * 1000);
}
