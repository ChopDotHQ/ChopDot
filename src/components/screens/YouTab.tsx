import { QrCode, Scan, CreditCard, TrendingUp, User as UserIcon, Bell, ChevronRight, ChevronDown, Globe, Languages, Palette, Shield, Lock, Database, Code, LogOut, Trash2, Download, Eye, EyeOff, Wallet, HelpCircle } from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { triggerHaptic } from "../../utils/haptics";
import { HelpSheet } from "../HelpSheet";
import { Theme } from "../../utils/useTheme";

interface YouTabProps {
  onShowQR: () => void;
  onScanQR: () => void;
  onPaymentMethods: () => void;
  onViewInsights: () => void;
  onSettings: () => void;
  onNotificationClick: () => void;
  onWalletClick: () => void;
  walletConnected?: boolean;
  notificationCount: number;
  insights: {
    monthlySpending: number;
    topCategory: string;
    topCategoryAmount: number;
    activePots: number;
    totalSettled: number;
    expensesConfirmed: number;
    expensesNeedingConfirmation: number;
    confirmationRate: number;
    settlementsCompleted: number;
    activeGroups: number;
  };
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  userName?: string;
  isGuest?: boolean;
}

export function YouTab({
  onShowQR,
  onScanQR,
  onPaymentMethods,
  onViewInsights,
  onSettings,
  onNotificationClick,
  onWalletClick,
  walletConnected = false,
  notificationCount,
  insights,
  theme,
  onThemeChange,
  onLogout,
  onDeleteAccount,
  userName = "You",
  isGuest = false,
}: YouTabProps) {
  // Collapsible states
  const [openGeneral, setOpenGeneral] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [openNotifications, setOpenNotifications] = useState(false);
  const [openSecurity, setOpenSecurity] = useState(false);
  const [openAdvanced, setOpenAdvanced] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // Settings states
  const [currency, setCurrency] = useState("USD");
  const [language, setLanguage] = useState("English");
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [settlementReminders, setSettlementReminders] = useState(true);

  return (
    <div className="h-full overflow-auto pb-[88px] bg-background">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <h1 className="text-screen-title">You</h1>
        <div className="flex items-center gap-2">
          {/* Wallet icon */}
          <button
            onClick={onWalletClick}
            className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/50 transition-all duration-200 active:scale-95"
          >
            <Wallet className="w-5 h-5" />
            {walletConnected && (
              <div className="absolute bottom-1 right-1 w-2.5 h-2.5 rounded-full" style={{ background: 'var(--success)' }} />
            )}
          </button>
          
          {/* Notification bell */}
          <button
            onClick={onNotificationClick}
            className="relative w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted/50 transition-all duration-200 active:scale-95"
          >
            <Bell className="w-5 h-5" />
            {notificationCount > 0 && (
              <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center text-micro" style={{ 
                background: 'var(--accent-pink)',
                color: 'var(--card)',
              }}>
                {notificationCount > 9 ? '9+' : notificationCount}
              </div>
            )}
          </button>
        </div>
      </div>

      <div className="px-4 space-y-3">
        {/* Profile Section */}
        <div className="card p-4">
          <div className="flex flex-col items-center mb-4">
            <div className="w-16 h-16 rounded-full bg-muted/20 flex items-center justify-center mb-3">
              <UserIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <p className="text-sm" style={{ fontWeight: 600 }}>{userName}</p>
                {isGuest && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-muted/20 text-secondary">
                    Guest
                  </span>
                )}
              </div>
              <p className="text-xs text-secondary">
                {isGuest ? 'Preview mode • No data saved' : '@your_handle'}
              </p>
            </div>
          </div>
          
          {/* QR Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onShowQR}
              className="p-3 bg-muted/10 hover:bg-muted/20 rounded-xl transition-all duration-200 active:scale-95"
            >
              <QrCode className="w-5 h-5 mx-auto mb-1" />
              <p className="text-xs text-center">My QR</p>
            </button>
            <button
              onClick={onScanQR}
              className="p-3 bg-muted/10 hover:bg-muted/20 rounded-xl transition-all duration-200 active:scale-95"
            >
              <Scan className="w-5 h-5 mx-auto mb-1" />
              <p className="text-xs text-center">Scan</p>
            </button>
          </div>
        </div>

        {/* Quick Insights - Interactive card */}
        <button
          onClick={onViewInsights}
          className="card p-4 w-full text-left transition-all duration-200 active:scale-[0.98] hover:shadow-fab"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm" style={{ fontWeight: 600 }}>Quick insights</h3>
            <TrendingUp className="w-4 h-4 text-secondary" />
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-secondary">Monthly spending</span>
              <span className="text-sm tabular-nums" style={{ fontWeight: 600 }}>${insights.monthlySpending.toFixed(0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-secondary">Active pots</span>
              <span className="text-sm tabular-nums" style={{ fontWeight: 600 }}>{insights.activePots}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-secondary">Total settled</span>
              <span className="text-sm tabular-nums" style={{ fontWeight: 600 }}>${insights.totalSettled.toFixed(0)}</span>
            </div>
          </div>
        </button>

        {/* Settings Sections */}
        <div className="space-y-2">
          {/* General Section */}
          <Collapsible open={openGeneral} onOpenChange={setOpenGeneral}>
            <CollapsibleTrigger asChild>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setOpenGeneral(!openGeneral);
                }}
                className="w-full card rounded-xl p-4 flex items-start justify-between hover:bg-muted/10 transition-all duration-200 active:scale-[0.98]"
              >
                <div className="flex-1 text-left">
                  <p className="text-sm" style={{ fontWeight: 600 }}>General</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Currency, language and appearance
                  </p>
                </div>
                {openGeneral ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-2" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-2" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 card rounded-xl p-4 space-y-3">
              {/* Currency */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs">Currency</span>
                </div>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="text-xs bg-transparent text-muted-foreground"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="DOT">DOT</option>
                </select>
              </div>

              {/* Language */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Languages className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs">Language</span>
                </div>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="text-xs bg-transparent text-muted-foreground"
                >
                  <option value="English">English</option>
                  <option value="Spanish">Spanish</option>
                  <option value="French">French</option>
                  <option value="German">German</option>
                </select>
              </div>

              {/* Appearance */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center gap-3">
                  <Palette className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs">Appearance</span>
                </div>
                <div className="p-1 bg-secondary/50 dark:bg-secondary/30 rounded-lg flex gap-1">
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      onThemeChange("light");
                    }}
                    className={`flex-1 py-1.5 px-2 text-[11px] rounded-md transition-all duration-200 ${
                      theme === "light"
                        ? "bg-card shadow-sm text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    Light
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      onThemeChange("dark");
                    }}
                    className={`flex-1 py-1.5 px-2 text-[11px] rounded-md transition-all duration-200 ${
                      theme === "dark"
                        ? "bg-card shadow-sm text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    Dark
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      onThemeChange("system");
                    }}
                    className={`flex-1 py-1.5 px-2 text-[11px] rounded-md transition-all duration-200 ${
                      theme === "system"
                        ? "bg-card shadow-sm text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    Auto
                  </button>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Payment Methods - Direct Link (No Collapse) */}
          <button
            onClick={() => {
              triggerHaptic('light');
              onPaymentMethods();
            }}
            className="w-full card rounded-xl p-4 flex items-start justify-between hover:bg-muted/10 transition-all duration-200 active:scale-[0.98]"
          >
            <div className="flex-1 text-left">
              <p className="text-sm" style={{ fontWeight: 600 }}>Payment methods</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Manage bank accounts and crypto wallets
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-2" />
          </button>

          {/* Notifications Section */}
          <Collapsible open={openNotifications} onOpenChange={setOpenNotifications}>
            <CollapsibleTrigger asChild>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setOpenNotifications(!openNotifications);
                }}
                className="w-full card rounded-xl p-4 flex items-start justify-between hover:bg-muted/10 transition-all duration-200 active:scale-[0.98]"
              >
                <div className="flex-1 text-left">
                  <p className="text-sm" style={{ fontWeight: 600 }}>Notifications</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Manage your notification preferences
                  </p>
                </div>
                {openNotifications ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-2" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-2" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 card rounded-xl p-4 space-y-3">
              {/* Push Notifications */}
              <div className="flex items-center justify-between">
                <span className="text-xs">Push notifications</span>
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setPushNotifications(!pushNotifications);
                  }}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    pushNotifications ? "bg-primary" : "bg-switch-background"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      pushNotifications ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {/* Email Notifications */}
              <div className="flex items-center justify-between">
                <span className="text-xs">Email notifications</span>
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setEmailNotifications(!emailNotifications);
                  }}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    emailNotifications ? "bg-primary" : "bg-switch-background"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      emailNotifications ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              {/* Settlement Reminders */}
              <div className="flex items-center justify-between">
                <span className="text-xs">Settlement reminders</span>
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setSettlementReminders(!settlementReminders);
                  }}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                    settlementReminders ? "bg-primary" : "bg-switch-background"
                  }`}
                >
                  <span
                    className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                      settlementReminders ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Security & Privacy Section */}
          <Collapsible open={openSecurity} onOpenChange={setOpenSecurity}>
            <CollapsibleTrigger asChild>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setOpenSecurity(!openSecurity);
                }}
                className="w-full card rounded-xl p-4 flex items-start justify-between hover:bg-muted/10 transition-all duration-200 active:scale-[0.98]"
              >
                <div className="flex-1 text-left">
                  <p className="text-sm" style={{ fontWeight: 600 }}>Security & Privacy</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Privacy settings, backup and data export
                  </p>
                </div>
                {openSecurity ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-2" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-2" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 card rounded-xl p-4 space-y-2">
              <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10 transition-all duration-200 active:scale-[0.98] text-left">
                <Download className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs">Export data</span>
              </button>
              <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10 transition-all duration-200 active:scale-[0.98] text-left">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs">Privacy settings</span>
              </button>
              <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10 transition-all duration-200 active:scale-[0.98] text-left">
                <Lock className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs">Backup wallet</span>
              </button>
            </CollapsibleContent>
          </Collapsible>

          {/* Advanced Section */}
          <Collapsible open={openAdvanced} onOpenChange={setOpenAdvanced}>
            <CollapsibleTrigger asChild>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setOpenAdvanced(!openAdvanced);
                }}
                className="w-full card rounded-xl p-4 flex items-start justify-between hover:bg-muted/10 transition-all duration-200 active:scale-[0.98]"
              >
                <div className="flex-1 text-left">
                  <p className="text-sm" style={{ fontWeight: 600 }}>Advanced</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Developer features and app information
                  </p>
                </div>
                {openAdvanced ? (
                  <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-2" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-2" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 card rounded-xl p-4 space-y-2">
              <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10 transition-all duration-200 active:scale-[0.98] text-left">
                <Code className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs">Developer mode</span>
              </button>
              <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10 transition-all duration-200 active:scale-[0.98] text-left">
                <Database className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs">Clear cache</span>
              </button>
              <div className="flex items-center justify-between p-2">
                <span className="text-xs text-muted-foreground">App version</span>
                <span className="text-xs text-muted-foreground">1.0.0</span>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Help & Support - Direct Link (No Collapse) */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setShowHelp(true);
            }}
            className="w-full card rounded-xl p-4 flex items-start justify-between hover:bg-muted/10 transition-all duration-200 active:scale-[0.98]"
          >
            <div className="flex items-center gap-3 flex-1 text-left">
              <div className="w-8 h-8 rounded-full bg-accent-pink-soft flex items-center justify-center">
                <HelpCircle className="w-4 h-4 text-accent-pink" />
              </div>
              <div>
                <p className="text-sm" style={{ fontWeight: 600 }}>Help & Support</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Learn how to use ChopDot
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground flex-shrink-0 ml-2" />
          </button>

          {/* Account Actions */}
          <div className="space-y-2 pt-2">
            <button
              onClick={() => {
                triggerHaptic('medium');
                onLogout();
              }}
              className="w-full card rounded-xl p-4 flex items-center gap-3 hover:bg-muted/10 transition-all duration-200 active:scale-[0.98]"
            >
              <LogOut className="w-5 h-5 text-foreground" />
              <span className="text-sm">Sign out</span>
            </button>

            <button
              onClick={() => {
                triggerHaptic('medium');
                onDeleteAccount();
              }}
              className="w-full card rounded-xl p-4 flex items-center gap-3 hover:bg-destructive/10 transition-all duration-200 active:scale-[0.98]"
            >
              <Trash2 className="w-5 h-5 text-destructive" />
              <span className="text-sm text-destructive">Delete account</span>
            </button>
          </div>
        </div>
      </div>

      {/* Help Sheet */}
      {showHelp && <HelpSheet onClose={() => setShowHelp(false)} />}
    </div>
  );
}
