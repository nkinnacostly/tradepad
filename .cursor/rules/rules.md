# TRADEPAD — CURSOR RULES

# These rules are the law. Follow them on every file, every component, every line.

# No exceptions unless explicitly overridden in the prompt.

---

## 1. PROJECT IDENTITY

- App name: Tradepad
- Purpose: Business management app for Nigerian artisans — tailors and laundry operators
- Platform: iOS and Android via React Native + Expo SDK 55
- Language: TypeScript (strict mode — no `any`, no implicit types)
- Navigation: expo-router (file-based routing)
- Backend: Supabase (auth + database + storage)
- Forms: react-hook-form + zod
- Payments: Flutterwave

---

## 2. FOLDER STRUCTURE — NEVER DEVIATE

```
tradepad/
├── app/
│   ├── index.tsx                  # Root redirect only — no UI logic
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   └── (app)/
│       ├── _layout.tsx            # Tab navigator
│       ├── dashboard/
│       │   └── index.tsx
│       ├── clients/
│       │   ├── index.tsx
│       │   ├── [id].tsx
│       │   └── new.tsx
│       ├── jobs/
│       │   ├── index.tsx
│       │   ├── [id].tsx
│       │   └── new.tsx
│       └── settings/
│           └── index.tsx
├── components/
│   ├── ui/                        # Reusable primitives only
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   ├── Card.tsx
│   │   ├── Badge.tsx
│   │   ├── EmptyState.tsx
│   │   └── ScreenWrapper.tsx
│   └── [feature]/                 # Feature-specific components
│       └── [ComponentName].tsx
├── hooks/
│   ├── useAuth.ts
│   ├── useClients.ts
│   ├── useJobs.ts
│   └── useMeasurements.ts
├── stores/
│   └── authStore.ts               # Zustand store for auth state
├── lib/
│   └── supabase.ts                # Supabase client — already created
├── types/
│   └── index.ts                   # All TypeScript types — already created
├── constants/
│   └── index.ts                   # Colors, spacing, fonts, etc.
└── utils/
    └── index.ts                   # Pure helper functions
```

**Rules:**

- `app/` contains only route files and layouts — no business logic
- `components/ui/` contains only reusable primitives with zero business logic
- Feature components go in `components/[feature]/`
- All Supabase calls go in `hooks/` — never directly in screen files
- Never create files outside this structure without explicit instruction

---

## 3. TYPESCRIPT — STRICT RULES

- `strict: true` is assumed — never use `any`
- Every function must have explicit return types
- Every prop must have an explicit interface or type
- All async functions must handle errors with try/catch
- Never use `!` non-null assertion unless you can prove the value exists
- Use `type` for object shapes, `interface` for component props
- Import all shared types from `types/index.ts` — never redefine them inline
- Use `const` by default, `let` only when reassignment is necessary
- Never use `var`

```typescript
// WRONG
const fetchClients = async () => {
  const data = await supabase.from("clients").select("*");
  return data;
};

// CORRECT
const fetchClients = async (): Promise<Client[]> => {
  try {
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
  } catch (error) {
    console.error("fetchClients error:", error);
    throw error;
  }
};
```

---

## 4. COMPONENT RULES

- One component per file — always
- File name matches component name exactly (PascalCase)
- Every component must be a named export — no default exports in components/
- Screen files (in app/) use default exports — expo-router requires this
- No inline styles on any component — all styles via StyleSheet.create()
- Props interface defined at the top of the file, above the component
- No business logic inside UI components — they receive data via props only
- Loading and error states must be handled in every component that fetches data
- Every list must handle the empty state with the EmptyState component

```typescript
// WRONG — inline styles, no types, anonymous export
export default ({ name }) => (
  <View style={{ padding: 16 }}>
    <Text>{name}</Text>
  </View>
)

// CORRECT
interface ClientCardProps {
  client: Client
  onPress: (id: string) => void
}

export const ClientCard = ({ client, onPress }: ClientCardProps): JSX.Element => {
  return (
    <Pressable onPress={() => onPress(client.id)} style={styles.container}>
      <Text style={styles.name}>{client.full_name}</Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
})
```

---

## 5. DESIGN SYSTEM — NON-NEGOTIABLE

All colors, spacing and typography must come from `constants/index.ts`.
Never hardcode a color, font size or spacing value anywhere else.

### Color Palette

```typescript
export const COLORS = {
  // Backgrounds
  background: "#080D1A", // Deep dark navy — main background
  surface: "#111827", // Slightly lighter — cards, inputs
  surfaceAlt: "#1C2333", // Elevated surfaces

  // Brand
  primary: "#F5A623", // Warm amber — primary actions, accents
  primaryDark: "#C47F0A", // Darker amber — pressed states

  // Text
  textPrimary: "#FFFFFF", // Headings, primary content
  textSecondary: "#9CA3AF", // Labels, secondary content
  textMuted: "#4B5563", // Placeholder text, disabled

  // Status
  success: "#10B981", // Paid, delivered, ready
  warning: "#FBBF24", // In progress, partial payment
  error: "#EF4444", // Errors, overdue
  info: "#3B82F6", // Informational

  // Borders
  border: "#1F2937", // Subtle borders
  borderFocus: "#F5A623", // Focused input border

  // Job status colors
  statusReceived: "#3B82F6",
  statusInProgress: "#FBBF24",
  statusReady: "#10B981",
  statusDelivered: "#6B7280",
};
```

### Spacing Scale

```typescript
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};
```

### Typography Scale

```typescript
export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  display: 36,
};

export const FONT_WEIGHT = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
  extrabold: "800" as const,
};
```

### Border Radius

```typescript
export const RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};
```

---

## 6. UI RULES — VISUAL STANDARDS

- Background of every screen: `COLORS.background` (#080D1A)
- Cards and surfaces: `COLORS.surface` (#111827)
- Primary CTA button: `COLORS.primary` background, `COLORS.background` text, bold
- All buttons must show a loading spinner and be disabled while submitting
- All inputs must show focus state with `COLORS.borderFocus` border
- Input placeholder text: `COLORS.textMuted`
- Input text: `COLORS.textPrimary`
- Input background: `COLORS.surface`
- Border radius on inputs and buttons: `RADIUS.lg` (16px)
- Every screen must use `SafeAreaView` with `COLORS.background` background
- Every screen with inputs must use `KeyboardAvoidingView`
  - iOS: behavior="padding"
  - Android: behavior="height"
- Every scrollable screen must use `ScrollView` with `showsVerticalScrollIndicator={false}`
- Pressable components must have `activeOpacity={0.8}` or use the `Pressable` style callback
- Minimum touch target size: 44x44px — never smaller
- No shadows on Android unless explicitly needed — use borders instead

---

## 7. FORMS — REACT HOOK FORM + ZOD

- Every form uses `useForm` from react-hook-form
- Every form has a zod schema defined above the component
- Use `zodResolver` from `@hookform/resolvers/zod`
- Never manage form state with `useState` — always react-hook-form
- Error messages render inline directly below the relevant input
- Error text color: `COLORS.error`
- Error font size: `FONT_SIZE.sm`
- Input refs must be chained so keyboard `next` button moves focus correctly
- The last input's `returnKeyType` must be `'done'` and trigger form submit

```typescript
// Standard form pattern
const schema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type FormData = z.infer<typeof schema>;

const {
  control,
  handleSubmit,
  formState: { errors, isSubmitting },
} = useForm<FormData>({
  resolver: zodResolver(schema),
});
```

---

## 8. SUPABASE RULES

- The Supabase client lives only in `lib/supabase.ts` — never reinstantiate it
- All Supabase queries live in hooks — never in screen or component files
- Every query must destructure both `data` and `error`
- Always check for error before using data
- Never use `.select('*')` in production — always specify columns
- Always add `.order('created_at', { ascending: false })` to list queries
- Auth state changes must be listened to via `supabase.auth.onAuthStateChange`
- Never store the user's password anywhere in app state
- Row Level Security is enabled — never try to bypass it
- After any write operation (insert/update/delete), invalidate and refetch
  the relevant query — never mutate local state directly

```typescript
// WRONG
const { data } = await supabase.from("clients").select("*");

// CORRECT
const { data, error } = await supabase
  .from("clients")
  .select("id, full_name, phone, notes, created_at")
  .eq("owner_id", user.id)
  .order("created_at", { ascending: false });

if (error) throw error;
```

---

## 9. NAVIGATION RULES

- expo-router handles all navigation — never use React Navigation directly
- Use `router.push()` for forward navigation
- Use `router.replace()` for auth redirects (so back button doesn't go to login)
- Use `router.back()` for going back
- Never hardcode route strings — define them as constants if used in multiple places
- Protected routes live in `app/(app)/` — always check auth before rendering
- Auth routes live in `app/(auth)/` — redirect to app if already logged in
- The root `app/index.tsx` only checks session and redirects — no UI beyond
  a loading indicator

---

## 10. STATE MANAGEMENT RULES

- Local UI state (modals, toggles, loading): `useState`
- Global auth state: Zustand store in `stores/authStore.ts`
- Server state (clients, jobs, payments): custom hooks in `hooks/`
- Never store sensitive data (tokens, passwords) in Zustand or AsyncStorage directly
  — Supabase handles session persistence via AsyncStorage internally
- Zustand stores must be typed — no untyped stores

---

## 11. ERROR HANDLING RULES

- Every async operation must be wrapped in try/catch
- User-facing errors must be human-readable — never show raw Supabase errors
- Log technical errors to console.error in development
- Never swallow errors silently
- Show errors inline in forms, not in alerts
- Network errors must show a user-friendly message with a retry option
- Auth errors must map to specific messages:
  - `Invalid login credentials` → "Incorrect email or password"
  - `User already registered` → "An account with this email already exists"
  - `Email not confirmed` → "Please verify your email first"

---

## 12. PERFORMANCE RULES

- Every list must use `FlatList` — never `ScrollView` + `map()` for lists
- FlatList must always have `keyExtractor` returning the item's UUID
- Images must use `resizeMode="cover"` and fixed dimensions
- Avoid anonymous functions in JSX where possible — extract to named handlers
- Never use `useEffect` to sync state that can be derived — compute it inline
- Memoize expensive computations with `useMemo`
- Memoize callbacks passed to child components with `useCallback`
- Never fetch data inside a component — always delegate to hooks

---

## 13. SECURITY RULES (from security audit doc)

- Never hardcode API keys, URLs or secrets — always use environment variables
- Environment variables in Expo must be prefixed with `EXPO_PUBLIC_`
- Never log sensitive user data (email, phone, payment info) to console
- Never expose raw database errors to the user
- All user input must be validated with zod before hitting Supabase
- Never construct dynamic queries with string concatenation
- Never disable RLS or write queries that bypass it
- Payment references and amounts must be verified server-side —
  never trust client-side payment confirmation alone
- After every feature is built, run the master security review prompt

---

## 14. CODE STYLE RULES

- No commented-out code in committed files
- No TODO comments — either do it now or create a task
- No console.log in production code — use console.error only for caught errors
- Imports must be ordered: React → React Native → Expo → Third party → Internal
- Destructure props at the function signature level
- Named exports only for components — default exports only for screen files
- No files longer than 300 lines — split into smaller components if exceeded
- Every file must have a single clear responsibility

---

## 15. WHAT CURSOR MUST NEVER DO

- Never install a new package without being explicitly asked
- Never use a UI library (no NativeBase, no React Native Paper, no Tamagui)
- Never use StyleSheet outside of the file where styles are used
- Never create a new color that isn't in COLORS constant
- Never hardcode Nigerian Naira symbol — use `₦` unicode character
- Never generate placeholder/lorem ipsum content — use realistic Nigerian names
  and business names in examples (e.g. "Amaka's Fashion", "Bello Laundry")
- Never skip error handling
- Never skip loading states
- Never skip TypeScript types
- Never skip KeyboardAvoidingView on forms
- Never use percentage-based widths unless explicitly required
- Never place business logic in UI components
- Never use `expo-font` to load fonts mid-build — stick to system fonts
  unless fonts are set up from the start
