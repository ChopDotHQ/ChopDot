# Post-Mortem: The Smart Scan Text-Paste Trap

**Date:** June 26, 2026
**Context:** Building the V1 of the "Smart Scan" feature for ChopDot.

## The Mistake
The user requested an MVP to parse messy receipts and chat logs using AI. The AI agent, acting in an engineering-first capacity, built a React modal containing a large text box. The user was expected to manually copy text from a chat log or OCR tool, paste it into the ChopDot text box, and click "Parse".

The user immediately flagged this after implementation: *"Why would people copy and paste that into the chat, people don't do that."*

## The Root Cause
1. **Skipping the Product Gate:** The AI failed to proactively run the mandatory `chopdot-product-judgment` skill before writing code. 
2. **Treating Directives as Overrides:** Because the user said "Make it happen" and "Test it live", the AI abandoned its product management responsibilities and operated purely as a junior engineer executing an order.
3. **Engineering Bias:** Building a text-box that sends a string to a backend API is technically simple. The AI took the path of least technical resistance, ignoring the UX friction it created.

## The Lesson (The Friction Test)
Real users organizing a group dinner do not copy and paste text. They use native device capabilities: they take photos of physical receipts, or they share screenshots of digital receipts. 

As stated in the ChopDot product spine:
> "Receipt capture means photo/link/import first. Manual item entry is only an optional correction path. If manual item entry is the normal path, the feature fails."

The text-paste MVP forced the user into a high-friction workflow (app switching, text selection, copy-pasting), violating the core directive to reduce friction and increase trust.

## The Fix
Moving forward, "Smart Scan" (and any similar capture feature) must start with an image upload or camera capture interaction. The image is then passed to a multimodal LLM (e.g., `gpt-4o`) to extract the structured data without any manual typing from the user.

## Institutional Rule
**Never build a UI feature that shifts the burden of work onto the user's manual actions when a native device capability (like a camera or share sheet) exists.** Always run the product gate to catch these UX failures *before* implementation.
