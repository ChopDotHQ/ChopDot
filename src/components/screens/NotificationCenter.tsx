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

  const getNotificationIcon = (type: Notification["type"]) => {
    switch (type) {
      case "attestation":
        return <Check className="w-5 h-5" />;
      case "settlement":
        return <DollarSign className="w-5 h-5" />;
      case "reminder":
        return <Clock className="w-5 h-5" />;
      case "invite":
        return <UserPlus className="w-5 h-5" />;
    }
  };

  const getNotificationColor = (type: Notification["type"]) => {
    switch (type) {
      case "attestation":
        return "text-yellow-600";
      case "settlement":
        return "text-green-600";
      case "reminder":
        return "text-blue-600";
      case "invite":
        return "text-purple-600";
    }
  };

  const getNotificationBg = (type: Notification["type"]) => {
    switch (type) {
      case "attestation":
        return "bg-yellow-500/10";
      case "settlement":
        return "bg-green-500/10";
      case "reminder":
        return "bg-blue-500/10";
      case "invite":
        return "bg-purple-500/10";
    }
  };

  return (
    <div className="fixed inset-0 z-50 animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" 
        onClick={() => {
          triggerHaptic('light');
          onClose();
        }} 
      />
      
      {/* Bottom Sheet */}
      <div className="absolute bottom-0 left-0 right-0 glass-sheet rounded-t-2xl animate-slideUp border-t-0 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50 flex-shrink-0">
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
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-8">
              <EmptyState icon={UserPlus} message="No notifications yet" />
            </div>
          ) : (
            <div className="p-4 space-y-2">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => {
                    triggerHaptic('light');
                    onNotificationClick(notification);
                  }}
                  className={`w-full bg-card/50 backdrop-blur-sm rounded-xl p-3 flex items-start gap-3 hover:bg-card/70 transition-all duration-200 active:scale-[0.98] border ${
                    notification.read ? "border-border/30" : "border-primary/20"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full ${getNotificationBg(notification.type)} flex items-center justify-center flex-shrink-0`}>
                    <div className={getNotificationColor(notification.type)}>
                      {getNotificationIcon(notification.type)}
                    </div>
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-[15px] text-foreground">{notification.title}</p>
                      <span className="text-[11px] text-muted-foreground flex-shrink-0">
                        {notification.timestamp}
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
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}