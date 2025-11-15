import { QrCode, Scan, TrendingUp, User as UserIcon, Bell, ChevronRight, ChevronDown, Globe, Languages, Palette, Shield, Lock, Database, Code, LogOut, Trash2, Download, HelpCircle, Cloud, Mail, KeyRound } from "lucide-react";
import { useEffect, useState, FormEvent } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../ui/collapsible";
import { triggerHaptic } from "../../utils/haptics";
import { HelpSheet } from "../HelpSheet";
import { Theme } from "../../utils/useTheme";
import { AccountMenu } from "../AccountMenu";
import { getSupabase } from "../../utils/supabase-client";

interface YouTabProps {
  onShowQR: () => void;
  onScanQR: () => void;
  onPaymentMethods: () => void;
  onViewInsights: () => void;
  onSettings: () => void;
  onCrustStorage: () => void;
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
  userEmail?: string;
  isGuest?: boolean;
}

export function YouTab({
  onShowQR,
  onScanQR,
  onPaymentMethods,
  onViewInsights,
  onSettings: _onSettings,
  onCrustStorage,
  onNotificationClick,
  notificationCount,
  insights,
  theme,
  onThemeChange,
  onLogout,
  onDeleteAccount,
  userName = "You",
  userEmail,
  isGuest = false,
}: YouTabProps) {
  // Collapsible states
  const [openGeneral, setOpenGeneral] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  void openProfile; void setOpenProfile;
  const [openNotifications, setOpenNotifications] = useState(false);
  const [openSecurity, setOpenSecurity] = useState(false);
  const [openAdvanced, setOpenAdvanced] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [emailUpdate, setEmailUpdate] = useState({
    value: userEmail ?? "",
    status: "idle" as "idle" | "loading" | "success" | "error",
    message: "",
  });
  const [passwordUpdate, setPasswordUpdate] = useState({
    newPassword: "",
    confirmPassword: "",
    status: "idle" as "idle" | "loading" | "success" | "error",
    message: "",
  });

  // Settings states
  const [currency, setCurrency] = useState("USD");
  const [language, setLanguage] = useState("English");
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [settlementReminders, setSettlementReminders] = useState(true);

  useEffect(() => {
    setEmailUpdate((prev) => ({ ...prev, value: userEmail ?? "" }));
  }, [userEmail]);

  const handleEmailUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    triggerHaptic("light");
    if (!emailUpdate.value.trim()) {
      setEmailUpdate((prev) => ({ ...prev, status: "error", message: "Enter a valid email address." }));
      triggerHaptic("error");
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      setEmailUpdate((prev) => ({ ...prev, status: "error", message: "Email auth is not configured." }));
      triggerHaptic("error");
      return;
    }
    try {
      setEmailUpdate((prev) => ({ ...prev, status: "loading", message: "" }));
      const { error } = await supabase.auth.updateUser({ email: emailUpdate.value.trim() });
      if (error) throw error;
      setEmailUpdate((prev) => ({
        ...prev,
        status: "success",
        message: "Check your inbox to confirm the new email.",
      }));
      triggerHaptic("medium");
    } catch (error: any) {
      console.error("[YouTab] Email update failed:", error);
      setEmailUpdate((prev) => ({
        ...prev,
        status: "error",
        message: error?.message || "Unable to update email right now.",
      }));
      triggerHaptic("error");
    }
  };

  const handlePasswordUpdate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    triggerHaptic("light");
    if (passwordUpdate.newPassword.length < 8) {
      setPasswordUpdate((prev) => ({
        ...prev,
        status: "error",
        message: "Password must be at least 8 characters long.",
      }));
      triggerHaptic("error");
      return;
    }
    if (passwordUpdate.newPassword !== passwordUpdate.confirmPassword) {
      setPasswordUpdate((prev) => ({
        ...prev,
        status: "error",
        message: "Passwords do not match.",
      }));
      triggerHaptic("error");
      return;
    }
    const supabase = getSupabase();
    if (!supabase) {
      setPasswordUpdate((prev) => ({
        ...prev,
        status: "error",
        message: "Password auth is not configured.",
      }));
      triggerHaptic("error");
      return;
    }
    try {
      setPasswordUpdate((prev) => ({ ...prev, status: "loading", message: "" }));
      const { error } = await supabase.auth.updateUser({ password: passwordUpdate.newPassword });
      if (error) throw error;
      setPasswordUpdate({
        newPassword: "",
        confirmPassword: "",
        status: "success",
        message: "Password updated.",
      });
      triggerHaptic("medium");
    } catch (error: any) {
      console.error("[YouTab] Password update failed:", error);
      setPasswordUpdate((prev) => ({
        ...prev,
        status: "error",
        message: error?.message || "Unable to update password right now.",
      }));
      triggerHaptic("error");
    }
  };

  return (
    <div className="h-full overflow-auto pb-[88px] bg-background">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <h1 className="text-screen-title">You</h1>
        <div className="flex items-center gap-2">
          {/* Account Menu - unified wallet connection */}
          <AccountMenu />
          
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
              <UserIcon className="w-8 h-8 text-secondary" />
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <p className="text-label" style={{ fontWeight: 600 }}>{userName}</p>
                {isGuest && (
                  <span className="px-2 py-0.5 rounded-full text-micro bg-muted/20 text-secondary">
                    Guest
                  </span>
                )}
              </div>
              <p className="text-micro text-secondary">
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
              <p className="text-micro text-center">My QR</p>
            </button>
            <button
              onClick={onScanQR}
              className="p-3 bg-muted/10 hover:bg-muted/20 rounded-xl transition-all duration-200 active:scale-95"
            >
              <Scan className="w-5 h-5 mx-auto mb-1" />
              <p className="text-micro text-center">Scan</p>
            </button>
          </div>
        </div>

        {/* Quick Insights - Interactive card */}
        <button
          onClick={onViewInsights}
          className="card p-4 w-full text-left transition-all duration-200 active:scale-[0.98] hover:shadow-fab"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-label" style={{ fontWeight: 600 }}>Quick insights</h3>
            <TrendingUp className="w-4 h-4 text-secondary" />
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-micro text-secondary">Monthly spending</span>
              <span className="text-[18px] tabular-nums" style={{ fontWeight: 700 }}>${insights.monthlySpending.toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-micro text-secondary">Active pots</span>
              <span className="text-[18px] tabular-nums" style={{ fontWeight: 700 }}>{insights.activePots}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-micro text-secondary">Total settled</span>
              <span className="text-[18px] tabular-nums" style={{ fontWeight: 700 }}>${insights.totalSettled.toFixed(2)}</span>
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
                  <p className="text-label" style={{ fontWeight: 600 }}>General</p>
                  <p className="text-micro text-secondary mt-0.5">
                    Currency, language and appearance
                  </p>
                </div>
                {openGeneral ? (
                  <ChevronDown className="w-5 h-5 text-secondary flex-shrink-0 ml-2" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-secondary flex-shrink-0 ml-2" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 card rounded-xl p-4 space-y-3">
              {/* Currency */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe className="w-4 h-4 text-secondary" />
                  <span className="text-micro">Currency</span>
                </div>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="text-micro bg-transparent text-secondary"
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
                  <Languages className="w-4 h-4 text-secondary" />
                  <span className="text-micro">Language</span>
                </div>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="text-micro bg-transparent text-secondary"
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
                  <Palette className="w-4 h-4 text-secondary" />
                  <span className="text-micro">Appearance</span>
                </div>
                <div className="p-1 bg-secondary/50 dark:bg-secondary/30 rounded-lg flex gap-1">
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      onThemeChange("light");
                    }}
                    className={`flex-1 py-1.5 px-2 text-micro rounded-md transition-all duration-200 ${
                      theme === "light"
                        ? "bg-card shadow-sm text-foreground"
                        : "text-secondary"
                    }`}
                  >
                    Light
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      onThemeChange("dark");
                    }}
                    className={`flex-1 py-1.5 px-2 text-micro rounded-md transition-all duration-200 ${
                      theme === "dark"
                        ? "bg-card shadow-sm text-foreground"
                        : "text-secondary"
                    }`}
                  >
                    Dark
                  </button>
                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      onThemeChange("system");
                    }}
                    className={`flex-1 py-1.5 px-2 text-micro rounded-md transition-all duration-200 ${
                      theme === "system"
                        ? "bg-card shadow-sm text-foreground"
                        : "text-secondary"
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
              <p className="text-label" style={{ fontWeight: 600 }}>Payment methods</p>
              <p className="text-micro text-secondary mt-0.5">
                Manage bank accounts and crypto wallets
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-secondary flex-shrink-0 ml-2" />
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
                  <p className="text-label" style={{ fontWeight: 600 }}>Notifications</p>
                  <p className="text-micro text-secondary mt-0.5">
                    Manage your notification preferences
                  </p>
                </div>
                {openNotifications ? (
                  <ChevronDown className="w-5 h-5 text-secondary flex-shrink-0 ml-2" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-secondary flex-shrink-0 ml-2" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 card rounded-xl p-4 space-y-3">
              {/* Push Notifications */}
              <div className="flex items-center justify-between">
                <span className="text-micro">Push notifications</span>
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
                <span className="text-micro">Email notifications</span>
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
                <span className="text-micro">Settlement reminders</span>
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
                  <p className="text-label" style={{ fontWeight: 600 }}>Security & Privacy</p>
                  <p className="text-micro text-secondary mt-0.5">
                    Privacy settings, backup and data export
                  </p>
                </div>
                {openSecurity ? (
                  <ChevronDown className="w-5 h-5 text-secondary flex-shrink-0 ml-2" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-secondary flex-shrink-0 ml-2" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 card rounded-xl p-4 space-y-3">
              {!isGuest && (
                <div className="space-y-4 rounded-xl border border-border/60 p-4">
                  <h3 className="text-label font-semibold">Account security</h3>
                  <form onSubmit={handleEmailUpdate} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-secondary" />
                      <span className="text-micro text-secondary">Email address</span>
                    </div>
                    <input
                      type="email"
                      value={emailUpdate.value}
                      onChange={(event) =>
                        setEmailUpdate((prev) => ({ ...prev, value: event.target.value, status: "idle", message: "" }))
                      }
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                      placeholder="name@domain.com"
                      required
                    />
                    <button
                      type="submit"
                      className="w-full rounded-xl bg-[var(--accent)] py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-60"
                      disabled={emailUpdate.status === "loading"}
                    >
                      {emailUpdate.status === "loading" ? "Updating…" : "Update email"}
                    </button>
                    {emailUpdate.message && (
                      <p
                        className={`text-xs ${
                          emailUpdate.status === "error" ? "text-destructive" : "text-secondary"
                        }`}
                      >
                        {emailUpdate.message}
                      </p>
                    )}
                  </form>

                  <form onSubmit={handlePasswordUpdate} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-secondary" />
                      <span className="text-micro text-secondary">Password</span>
                    </div>
                    <input
                      type="password"
                      value={passwordUpdate.newPassword}
                      onChange={(event) =>
                        setPasswordUpdate((prev) => ({
                          ...prev,
                          newPassword: event.target.value,
                          status: "idle",
                          message: "",
                        }))
                      }
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                      placeholder="New password"
                      minLength={8}
                      required
                    />
                    <input
                      type="password"
                      value={passwordUpdate.confirmPassword}
                      onChange={(event) =>
                        setPasswordUpdate((prev) => ({
                          ...prev,
                          confirmPassword: event.target.value,
                          status: "idle",
                          message: "",
                        }))
                      }
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30"
                      placeholder="Confirm password"
                      minLength={8}
                      required
                    />
                    <button
                      type="submit"
                      className="w-full rounded-xl border border-border py-2 text-sm font-semibold text-foreground hover:bg-muted/20 transition-colors disabled:opacity-60"
                      disabled={passwordUpdate.status === "loading"}
                    >
                      {passwordUpdate.status === "loading" ? "Updating…" : "Update password"}
                    </button>
                    {passwordUpdate.message && (
                      <p
                        className={`text-xs ${
                          passwordUpdate.status === "error" ? "text-destructive" : "text-secondary"
                        }`}
                      >
                        {passwordUpdate.message}
                      </p>
                    )}
                  </form>
                </div>
              )}

              <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10 transition-all duration-200 active:scale-[0.98] text-left">
                <Download className="w-4 h-4 text-secondary" />
                <span className="text-micro">Export data</span>
              </button>
              <button 
                onClick={() => {
                  triggerHaptic('light');
                  onCrustStorage();
                }}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10 transition-all duration-200 active:scale-[0.98] text-left"
              >
                <Cloud className="w-4 h-4 text-secondary" />
                <span className="text-micro">Crust Storage (IPFS)</span>
              </button>
              <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10 transition-all duration-200 active:scale-[0.98] text-left">
                <Shield className="w-4 h-4 text-secondary" />
                <span className="text-micro">Privacy settings</span>
              </button>
              <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10 transition-all duration-200 active:scale-[0.98] text-left">
                <Lock className="w-4 h-4 text-secondary" />
                <span className="text-micro">Backup wallet</span>
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
                  <p className="text-label" style={{ fontWeight: 600 }}>Advanced</p>
                  <p className="text-micro text-secondary mt-0.5">
                    Developer features and app information
                  </p>
                </div>
                {openAdvanced ? (
                  <ChevronDown className="w-5 h-5 text-secondary flex-shrink-0 ml-2" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-secondary flex-shrink-0 ml-2" />
                )}
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 card rounded-xl p-4 space-y-2">
              <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10 transition-all duration-200 active:scale-[0.98] text-left">
                <Code className="w-4 h-4 text-secondary" />
                <span className="text-micro">Developer mode</span>
              </button>
              <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/10 transition-all duration-200 active:scale-[0.98] text-left">
                <Database className="w-4 h-4 text-secondary" />
                <span className="text-micro">Clear cache</span>
              </button>
              <div className="flex items-center justify-between p-2">
                <span className="text-micro text-secondary">App version</span>
                <span className="text-micro text-secondary">1.0.0</span>
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
                <p className="text-label" style={{ fontWeight: 600 }}>Help & Support</p>
                <p className="text-micro text-secondary mt-0.5">
                  Learn how to use ChopDot
                </p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-secondary flex-shrink-0 ml-2" />
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
              <span className="text-label">Sign out</span>
            </button>

            <button
              onClick={() => {
                triggerHaptic('medium');
                onDeleteAccount();
              }}
              className="w-full card rounded-xl p-4 flex items-center gap-3 hover:bg-destructive/10 transition-all duration-200 active:scale-[0.98]"
            >
              <Trash2 className="w-5 h-5 text-destructive" />
              <span className="text-label text-destructive">Delete account</span>
            </button>
          </div>
        </div>
      </div>

      {/* Help Sheet */}
      {showHelp && <HelpSheet onClose={() => setShowHelp(false)} />}
    </div>
  );
}
