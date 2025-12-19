import { User, LogOut, CreditCard, ChevronRight, Trash2, Cloud } from "lucide-react";
import { TopBar } from "../TopBar";
import { InputField } from "../InputField";
import { SelectField } from "../SelectField";
import { useState } from "react";
import { Theme, BrandVariant, useTheme } from "../../utils/useTheme";

interface SettingsProps {
  onBack?: () => void;
  onPaymentMethods: () => void;
  onCrustStorage?: () => void;
  onLogout: () => void;
  onDeleteAccount: () => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export function Settings({ onBack, onPaymentMethods, onCrustStorage, onLogout, onDeleteAccount, theme, onThemeChange }: SettingsProps) {
  const { brandVariant, setBrandVariant } = useTheme();
  const [name, setName] = useState("You");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("you@example.com");
  const [notifications, setNotifications] = useState(true);
  const [currency, setCurrency] = useState("USD");
  const [language, setLanguage] = useState("English");
  const [hasChanges, setHasChanges] = useState(false);

  const handleSave = () => {
    setHasChanges(false);
  };

  const markChanged = () => {
    if (!hasChanges) setHasChanges(true);
  };

  return (
    <div className="flex flex-col h-full pb-[68px]">
      <TopBar title="Settings" onBack={onBack} />

      <div className="flex-1 overflow-auto">
        <div className="p-4 space-y-6">
          {/* Profile Section */}
          <div className="space-y-3">
            <h2 className="text-label text-secondary px-1">Profile</h2>

            {/* Profile Image */}
            <div className="p-3 card rounded-xl transition-shadow duration-200">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                  <User className="w-6 h-6 text-secondary" />
                </div>
                <button 
                  className="text-label text-primary hover:opacity-70 transition-opacity"
                  onClick={markChanged}
                >
                  Change photo
                </button>
              </div>
            </div>

            <InputField
              label="Name"
              value={name}
              onChange={(value) => {
                setName(value);
                markChanged();
              }}
              placeholder="Your name"
            />

            <InputField
              label="Nickname"
              value={nickname}
              onChange={(value) => {
                setNickname(value);
                markChanged();
              }}
              placeholder="Optional"
            />

            <InputField
              label="Email"
              type="email"
              value={email}
              onChange={(value) => {
                setEmail(value);
                markChanged();
              }}
              placeholder="your@email.com"
            />
          </div>

          {/* Preferences Section */}
          <div className="space-y-3">
            <h2 className="text-label text-secondary px-1">Preferences</h2>

            {/* Notifications Toggle */}
            <div className="p-3 card rounded-xl transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <span className="text-body">Notifications</span>
                <button
                  onClick={() => {
                    setNotifications(!notifications);
                    markChanged();
                  }}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    notifications ? "bg-primary" : "bg-switch-background"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      notifications ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            <SelectField
              label="Currency"
              value={currency}
              onChange={(value) => {
                setCurrency(value);
                markChanged();
              }}
              options={[
                { value: "USD", label: "USD ($)" },
                { value: "EUR", label: "EUR (€)" },
                { value: "GBP", label: "GBP (£)" },
                { value: "JPY", label: "JPY (¥)" },
              ]}
            />

            <SelectField
              label="Language"
              value={language}
              onChange={(value) => {
                setLanguage(value);
                markChanged();
              }}
              options={[
                { value: "English", label: "English" },
                { value: "Spanish", label: "Spanish" },
                { value: "French", label: "French" },
                { value: "German", label: "German" },
              ]}
            />

            {/* Appearance Segmented Control */}
            <div className="space-y-2">
              <label className="text-label text-secondary px-1">
                Appearance
              </label>
              <div className="p-1 bg-secondary/50 dark:bg-secondary/30 rounded-xl flex gap-1">
                <button
                  onClick={() => {
                    onThemeChange("light");
                    markChanged();
                  }}
                  className={`flex-1 py-2 px-3 text-label rounded-lg transition-all duration-200 ${
                    theme === "light"
                      ? "bg-card shadow-sm text-foreground"
                      : "text-secondary hover:text-foreground"
                  }`}
                >
                  Light
                </button>
                <button
                  onClick={() => {
                    onThemeChange("dark");
                    markChanged();
                  }}
                  className={`flex-1 py-2 px-3 text-label rounded-lg transition-all duration-200 ${
                    theme === "dark"
                      ? "bg-card shadow-sm text-foreground"
                      : "text-secondary hover:text-foreground"
                  }`}
                >
                  Dark
                </button>
                <button
                  onClick={() => {
                    onThemeChange("system");
                    markChanged();
                  }}
                  className={`flex-1 py-2 px-3 text-label rounded-lg transition-all duration-200 ${
                    theme === "system"
                      ? "bg-card shadow-sm text-foreground"
                      : "text-secondary hover:text-foreground"
                  }`}
                >
                  Auto
                </button>
              </div>
              {theme === "system" && (
                <p className="text-micro text-secondary px-1">
                  Follows your device theme
                </p>
              )}
            </div>

            {/* Brand Variant Toggle */}
            <div className="space-y-2">
              <label className="text-label text-secondary px-1">
                Style Variant
              </label>
              <div className="p-1 bg-secondary/50 dark:bg-secondary/30 rounded-xl flex gap-1">
                <button
                  onClick={() => {
                    setBrandVariant("default");
                    markChanged();
                  }}
                  className={`flex-1 py-2 px-3 text-label rounded-lg transition-all duration-200 ${
                    brandVariant === "default"
                      ? "bg-card shadow-sm text-foreground"
                      : "text-secondary hover:text-foreground"
                  }`}
                >
                  Default
                </button>
                <button
                  onClick={() => {
                    setBrandVariant("polkadot-second-age");
                    markChanged();
                  }}
                  className={`flex-1 py-2 px-3 text-label rounded-lg transition-all duration-200 ${
                    brandVariant === "polkadot-second-age"
                      ? "bg-card shadow-sm text-foreground"
                      : "text-secondary hover:text-foreground"
                  }`}
                >
                  PSA Glass
                </button>
              </div>
              {brandVariant === "polkadot-second-age" && (
                <p className="text-micro text-secondary px-1">
                  Polkadot Second Age glassmorphism style
                </p>
              )}
            </div>
          </div>

          {/* Save Changes Button */}
          {hasChanges && (
            <button
              onClick={handleSave}
              className="w-full py-3.5 card flex items-center justify-center text-body font-medium text-foreground hover:text-foreground/70 transition-all duration-200 active:scale-[0.98]"
            >
              Save changes
            </button>
          )}

          {/* Account Management */}
          <div className="space-y-3">
            <h2 className="text-label text-secondary px-1">Account</h2>

            {/* Payment Methods */}
            <button
              onClick={onPaymentMethods}
              className="w-full p-4 card rounded-xl flex items-center justify-between hover:shadow-[var(--shadow-fab)] transition-all duration-200 active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-foreground" />
                <span className="text-body text-foreground">Payment methods</span>
              </div>
              <ChevronRight className="w-5 h-5 text-secondary" />
            </button>

            {/* Crust Storage */}
            {onCrustStorage && (
              <button
                onClick={onCrustStorage}
                className="w-full p-4 card rounded-xl flex items-center justify-between hover:shadow-[var(--shadow-fab)] transition-all duration-200 active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <Cloud className="w-5 h-5 text-foreground" />
                  <span className="text-body text-foreground">Crust Storage (IPFS)</span>
                </div>
                <ChevronRight className="w-5 h-5 text-secondary" />
              </button>
            )}

            {/* Sign Out */}
            <button
              onClick={onLogout}
              className="w-full p-4 card rounded-xl flex items-center gap-3 hover:shadow-[var(--shadow-fab)] transition-all duration-200 active:scale-[0.98]"
            >
              <LogOut className="w-5 h-5 text-foreground" />
              <span className="text-body text-foreground">Sign out</span>
            </button>
          </div>

          {/* Danger Zone */}
          <div className="space-y-3 pt-2">
            <h2 className="text-label text-secondary px-1">Danger zone</h2>
            <button
              onClick={onDeleteAccount}
              className="w-full p-4 card rounded-xl flex items-center justify-between hover:shadow-[var(--shadow-fab)] transition-all duration-200 active:scale-[0.98] group"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-5 h-5 text-destructive" />
                <span className="text-body text-destructive">Delete account</span>
              </div>
              <ChevronRight className="w-5 h-5 text-destructive opacity-50 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>

          <p className="text-micro text-secondary text-center pt-4 pb-2">
            ChopDot v1.0.0
          </p>
        </div>
      </div>
    </div>
  );
}