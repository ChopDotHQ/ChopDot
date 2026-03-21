export type DeliveryMode = "share" | "clipboard" | "none";

type DeliverTextArgs = {
  title?: string;
  text: string;
};

export const deliverText = async ({
  title,
  text,
}: DeliverTextArgs): Promise<DeliveryMode> => {
  const nav = typeof navigator !== "undefined" ? navigator : null;
  if (!nav) return "none";

  if (typeof nav.share === "function") {
    try {
      await nav.share({ title, text });
      return "share";
    } catch (error) {
      // Share sheet closed/cancelled: make it explicit to caller.
      if (
        error instanceof DOMException &&
        (error.name === "AbortError" || error.name === "NotAllowedError")
      ) {
        throw new Error("Share cancelled. You can try again or use copy fallback.");
      }
      // Continue to clipboard fallback for other runtime errors.
    }
  }

  if (nav.clipboard?.writeText) {
    try {
      await nav.clipboard.writeText(text);
      return "clipboard";
    } catch {
      // Fall through to no-delivery fallback.
    }
  }

  return "none";
};

