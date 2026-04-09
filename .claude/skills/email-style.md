# Email Style Guide — Von Solutions Outbound

## Voice
The email must feel like Jacob researched this business personally. Not generic. Not robotic.

## Claude Prompt Injection Pattern

Before generating the email, build a `missingTools` array from the audit result, then inject:

```
This business is missing: [AI receptionist, Meta ads, online booking].
Write a cold email referencing exactly what they're missing and how Von Solutions fixes it.
```

## Rules (enforce in system prompt to Claude)

- Max 120 words
- Include subject line
- Reference the lead's vertical and city specifically
- Call out 2–3 specific missing tools by name
- CTA: soft ask for a 15-minute call
- Sign off: Jacob, Von Solutions
- No buzzwords
- No "I hope this email finds you well"
- No filler or fluff
