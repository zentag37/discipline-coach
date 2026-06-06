// Tiny pub-sub for in-app notifications fed into NotificationsBell.
export type AppNotification = {
  id: number;
  type: "warning" | "info" | "success";
  title: string;
  body: string;
  time: string;
  read: boolean;
};

type Listener = (n: AppNotification) => void;
const listeners = new Set<Listener>();

export function pushNotification(n: Omit<AppNotification, "id" | "read" | "time"> & { time?: string }) {
  const full: AppNotification = {
    id: Date.now() + Math.floor(Math.random() * 1000),
    read: false,
    time: n.time ?? "just now",
    type: n.type,
    title: n.title,
    body: n.body,
  };
  listeners.forEach((l) => l(full));
}

export function subscribeNotifications(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
