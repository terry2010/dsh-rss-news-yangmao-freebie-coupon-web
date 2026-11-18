// Web Push service worker：接收推送 → 弹系统通知 → 点击打开链接
self.addEventListener("push", (e) => {
  let d = { title: "炊事班", body: "", link: "/" };
  try { if (e.data) d = { ...d, ...e.data.json() }; } catch { /* keep defaults */ }
  e.waitUntil(self.registration.showNotification(d.title, {
    body: d.body,
    icon: "/favicon.svg",
    data: { link: d.link || "/" },
  }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data?.link || "/"));
});
