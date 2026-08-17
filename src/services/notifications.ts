const NOTIF_STORAGE_KEY = 'craig_notifications_enabled';
const LAST_NOTIF_TIME_KEY = 'craig_last_notif_time';

const NOTIFICATION_PHRASES = [
  'Персонажи сами себя не загадают ✨',
  'Камон, мне уже скучно!',
  '🐊🐊🐊🐊🐊🐊🐊🐊🐊',
  'Крегг ждет твою новую загадку!',
  'Думаешь, сможешь меня обыграть? Заходи!'
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
    new Notification('Крегг', {
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

// Фоновый таймер: отправка уведомлений каждые 3 часа
export function initNotificationScheduler(): void {
  if (typeof window === 'undefined') return;

  const checkAndNotify = () => {
    if (!isNotificationsEnabled()) return;
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    const lastTimeRaw = localStorage.getItem(LAST_NOTIF_TIME_KEY);
    const lastTime = lastTimeRaw ? parseInt(lastTimeRaw, 10) : 0;
    const threeHoursMs = 3 * 60 * 60 * 1000;

    // Если прошло 3 часа с последнего напоминания
    if (Date.now() - lastTime >= threeHoursMs) {
      sendCraigNotification();
    }
  };

  // Проверка каждую минуту
  setInterval(checkAndNotify, 60 * 1000);
}
