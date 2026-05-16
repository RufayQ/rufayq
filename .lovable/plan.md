## Fix: gold hairline crossing the Home button

The hairline gold accent at the top of `BottomNav` runs full-width and passes through the raised Home circle (Home button has `marginTop: -22`, so it dips below the nav's top edge).

**Change** — in `src/components/BottomNav.tsx`, update the hairline's `background` gradient to include a transparent gap in the center (~38–62%) so the line fades out before reaching the Home circle and re-emerges on the other side. No layout shifts, no other components touched.

```ts
background:
  "linear-gradient(90deg, transparent 0%, rgba(197,150,90,0.45) 22%, rgba(197,150,90,0.45) 38%, transparent 48%, transparent 52%, rgba(197,150,90,0.45) 62%, rgba(197,150,90,0.45) 78%, transparent 100%)",
```

That's the entire fix.
