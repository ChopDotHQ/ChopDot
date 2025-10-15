import { useState, useEffect } from "react";
import { BottomSheet } from "../BottomSheet";
import { InputField } from "../InputField";
import { SelectField } from "../SelectField";
import { PrimaryButton } from "../PrimaryButton";
import { SecondaryButton } from "../SecondaryButton";
import { PaymentMethod } from "./PaymentMethods";
import { Checkbox } from "../ui/checkbox";
import { Label } from "../ui/label";

interface AddPaymentMethodProps {
  existingMethod?: PaymentMethod;
  onSave: (method: Omit<PaymentMethod, "id">, setAsPreferred: boolean) => void;
  onClose: () => void;
}

export function AddPaymentMethod({
  existingMethod,
  onSave,
  onClose,
}: AddPaymentMethodProps) {
  const [kind, setKind] = useState<PaymentMethod["kind"]>(
    existingMethod?.kind || "bank"
  );
  const [setAsPreferred, setSetAsPreferred] = useState(false);

  // Bank fields
  const [iban, setIban] = useState(existingMethod?.iban || "");
  const [holder, setHolder] = useState(existingMethod?.holder || "");
  const [note, setNote] = useState(existingMethod?.note || "");

  // TWINT fields
  const [phone, setPhone] = useState(existingMethod?.phone || "");
  const [twintHandle, setTwintHandle] = useState(existingMethod?.twintHandle || "");

  // PayPal fields
  const [email, setEmail] = useState(existingMethod?.email || "");
  const [username, setUsername] = useState(existingMethod?.username || "");

  // Crypto fields
  const [network, setNetwork] = useState<"polkadot" | "assethub">(
    existingMethod?.network || "polkadot"
  );
  const [address, setAddress] = useState(existingMethod?.address || "");
  const [label, setLabel] = useState(existingMethod?.label || "");

  const isValid = () => {
    switch (kind) {
      case "bank":
        return iban.trim().length >= 15; // Minimal IBAN validation
      case "twint":
        return phone.trim().length > 0 || twintHandle.trim().length > 0;
      case "paypal":
        return email.trim().length > 0 || username.trim().length > 0;
      case "crypto":
        return address.trim().length >= 40; // Minimal SS58 validation
      default:
        return false;
    }
  };

  const handleSave = () => {
    const method: Omit<PaymentMethod, "id"> = {
      kind,
      ...(kind === "bank" && { iban, holder, note }),
      ...(kind === "twint" && { phone, twintHandle }),
      ...(kind === "paypal" && { email, username }),
      ...(kind === "crypto" && { network, address, label }),
    };
    onSave(method, setAsPreferred);
  };

  // Reset fields when kind changes
  useEffect(() => {
    if (!existingMethod) {
      setIban("");
      setHolder("");
      setNote("");
      setPhone("");
      setTwintHandle("");
      setEmail("");
      setUsername("");
      setAddress("");
      setLabel("");
    }
  }, [kind, existingMethod]);

  return (
    <BottomSheet onClose={onClose}>
      <div className="p-4 space-y-4">
        <div>
          <h3 className="text-foreground mb-4">
            {existingMethod ? "Edit payment method" : "Add payment method"}
          </h3>

          <SelectField
            label="Method"
            value={kind}
            onChange={(value) => setKind(value as PaymentMethod["kind"])}
            options={[
              { value: "bank", label: "Bank (IBAN)" },
              { value: "twint", label: "TWINT" },
              { value: "paypal", label: "PayPal" },
              { value: "crypto", label: "Crypto wallet" },
            ]}
          />
        </div>

        {kind === "bank" && (
          <>
            <InputField
              label="Account holder"
              value={holder}
              onChange={setHolder}
              placeholder="Optional"
            />
            <div>
              <InputField
                label="IBAN"
                value={iban}
                onChange={setIban}
                placeholder="CH93 0000 0000 0000 0000 0"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Starts with country code (e.g., CH…), 15–34 chars.
              </p>
            </div>
            <InputField
              label="Reference note"
              value={note}
              onChange={setNote}
              placeholder="Optional reference"
            />
          </>
        )}

        {kind === "twint" && (
          <>
            <div>
              <InputField
                label="Phone number"
                value={phone}
                onChange={setPhone}
                placeholder="+41 79 123 45 67"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Swiss number (+41…) or leave empty if using handle.
              </p>
            </div>
            <InputField
              label="TWINT handle"
              value={twintHandle}
              onChange={setTwintHandle}
              placeholder="@username (optional)"
            />
          </>
        )}

        {kind === "paypal" && (
          <>
            <div>
              <InputField
                label="Email"
                value={email}
                onChange={setEmail}
                placeholder="you@example.com"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Email or @username.
              </p>
            </div>
            <InputField
              label="Username"
              value={username}
              onChange={setUsername}
              placeholder="@username (optional)"
            />
          </>
        )}

        {kind === "crypto" && (
          <>
            <SelectField
              label="Network"
              value={network}
              onChange={(value) => setNetwork(value as "polkadot" | "assethub")}
              options={[
                { value: "polkadot", label: "Polkadot" },
                { value: "assethub", label: "Asset Hub" },
              ]}
            />
            <div>
              <InputField
                label="Address"
                value={address}
                onChange={setAddress}
                placeholder="SS58 address"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Paste a valid SS58 address for the selected network.
              </p>
            </div>
            <InputField
              label="Label"
              value={label}
              onChange={setLabel}
              placeholder="My wallet (optional)"
            />
          </>
        )}

        {!existingMethod && (
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="preferred"
              checked={setAsPreferred}
              onCheckedChange={(checked) => setSetAsPreferred(checked === true)}
            />
            <Label
              htmlFor="preferred"
              className="text-sm text-foreground cursor-pointer"
            >
              Make this my preferred method
            </Label>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <SecondaryButton onClick={onClose}>Cancel</SecondaryButton>
          <PrimaryButton onClick={handleSave} disabled={!isValid()}>
            Save
          </PrimaryButton>
        </div>

        <p className="text-xs text-muted-foreground text-center pt-2">
          Double-check details before saving. On-chain payments are final.
        </p>
      </div>
    </BottomSheet>
  );
}
