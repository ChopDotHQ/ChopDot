import { X, Clock, Check, DollarSign, UserPlus } from "lucide-react";
import { EmptyState } from "../EmptyState";
import { triggerHaptic } from "../../utils/haptics";

interface Notification {
  id: string;
  type: "attestation" | "settlement" | "reminder" | "invite";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  actionLabel?: string;
  onAction?: () => void;
}

interface NotificationCenterProps {
  notifications: Notification[];
  onClose: () => void;
  onMarkAllRead: () => void;
  onNotificationClick: (notification: Notification) => void;
}

export function NotificationCenter({
  notifications,
  onClose,
  onMarkAllRead,
  onNotificationClick,
}: NotificationCenterProps) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  const formatTimestamp = (ts: string) => {
    const d = new Date(ts);
    if (isNaN(d.getTime())) return ts;
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "attestation":
        return <Check className="w-5 h-5 text-white" />;
      case "settlement":
        return <DollarSign className="w-5 h-5 text-white" />;
      case "reminder":
        return <Clock className="w-5 h-5 text-white" />;
      case "invite":
        return <UserPlus className="w-5 h-5 text-white" />;
    }
  };

  const getTypeStyles = (type: Notification["type"]) => {
    // Centralise visual differentiation per type using design tokens
    switch (type) {
      case "attestation":
        return {
          iconBg: 'var(--accent)',
          tagBg: 'var(--accent-pink-soft)',
          tagText: 'var(--accent)',
          borderColor: 'var(--accent)'
        } as const;
      case "settlement":
        return {
          iconBg: 'var(--money)',
          tagBg: 'color-mix(in oklab, var(--money) 15%, transparent)',
          tagText: 'var(--money)',
          borderColor: 'var(--money)'
        } as const;
      case "reminder":
        return {
          iconBg: 'var(--foreground)',
          tagBg: 'color-mix(in oklab, var(--foreground) 12%, transparent)',
          tagText: 'var(--foreground)',
          borderColor: 'var(--foreground)'
        } as const;
      case "invite":
        return {
          iconBg: 'var(--muted)',
          tagBg: 'color-mix(in oklab, var(--muted) 15%, transparent)',
          tagText: 'var(--muted)',
          borderColor: 'var(--muted)'
        } as const;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="absolute inset-0" 
        onClick={() => {
          triggerHaptic('light');
          onClose();
        }} 
      />
      
      {/* Modal Card - matches ChoosePot style */}
      <div className="absolute inset-x-0 top-20 bottom-20 card flex flex-col animate-slideUp mx-4 w-[390px] left-1/2 -translate-x-1/2">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <h2 className="text-[17px]">Notifications</h2>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 bg-destructive text-primary-foreground rounded-full text-[11px]">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={() => {
                  triggerHaptic('light');
                  onMarkAllRead();
                }}
                className="text-[13px] text-primary hover:opacity-70 transition-opacity"
              >
                Mark all read
              </button>
            )}
            <button
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="p-1 hover:bg-muted/50 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {notifications.length === 0 ? (
            <div className="p-8">
              <EmptyState icon={UserPlus} message="No notifications yet" />
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => {
                const t = getTypeStyles(notification.type);
                return (
                <button
                  key={notification.id}
                  onClick={() => {
                    triggerHaptic('light');
                    onNotificationClick(notification);
                  }}
                  className={`w-full bg-card/60 rounded-xl p-3 flex items-start gap-3 hover:bg-card/80 transition-all duration-200 active:scale-[0.98] border`}
                  style={{ borderLeft: `3px solid ${t.borderColor}` }}
                >
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: t.iconBg }}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[15px] text-foreground">{notification.title}</p>
                        <span className="px-1.5 py-0.5 rounded text-[10px]" style={{ background: t.tagBg, color: t.tagText }}>
                          {notification.type === 'settlement' ? 'Payment' : notification.type === 'attestation' ? 'Confirm' : notification.type === 'invite' ? 'Invite' : 'Reminder'}
                        </span>
                      </div>
                      <span className="text-[11px] text-muted-foreground flex-shrink-0">
                        {formatTimestamp(notification.timestamp)}
                      </span>
                    </div>
                    <p className="text-[13px] text-muted-foreground mb-2">
                      {notification.message}
                    </p>
                    {notification.actionLabel && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic('medium');
                          notification.onAction?.();
                        }}
                        className="text-[13px] text-primary hover:opacity-70 transition-all duration-200 active:scale-95"
                      >
                        {notification.actionLabel}
                      </button>
                    )}
                  </div>
                  {!notification.read && (
                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-2" />
                  )}
                </button>
              )})}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}