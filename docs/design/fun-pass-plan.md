# Fun pass — plan

Agreed 2026-10-05. Make Pact feel alive without making it noisy.

## Rules

- **Crew colour is identity, green is action.** A pact's colour marks what belongs to that
  crew (hero, ring, card accents, feed). Green stays the colour of "do it / done" and is never
  a crew colour.
- **Celebrations are short:** the motion lands within 400ms and is faded out by 700ms.
- **Reduce Motion is respected everywhere:** springs and timings carry `ReduceMotion.System`
  (`apps/mobile/lib/motion.ts`); loops get a calm fallback of their own.
- Every new user-visible moment registers its events first (the `events` skill).

## Steps

0. **Clean up** the leftover dev tooling. Done.
1. **Tactile:** deeper press squash, cards lift to the finger, rings spring as they fill, ✓
   marks Pop in, Reduce Motion respected.
2. **Crew identity:** a colour and an emoji per pact, a picker on create, the migration, and
   the colour on the hero, ring, cards and feed. Green stays action.
3. **Living streak flame.**
4. **Avatars**, with a pulsing "not yet" ring.
5. **Playful empty states and copy.**
6. **Celebrations:** an emoji burst, and milestones at 3, 7 and 14 days.
7. **Signature check-in:** the polaroid flies onto the crew wall.

One commit per step; typecheck and tests green before each.
