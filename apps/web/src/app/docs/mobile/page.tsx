import React from 'react';

export default function MobileAppDocPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-700 via-purple-700 to-indigo-900 text-white">
        <div className="max-w-5xl mx-auto px-6 py-16">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-4xl">📱</span>
            <span className="text-sm font-semibold uppercase tracking-widest text-indigo-200">
              BMS Hostel
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3 leading-tight">
            Mobile App — Architecture &amp; Setup Guide
          </h1>
          <p className="text-indigo-200 text-lg max-w-2xl">
            Expo SDK 54 · React Native 0.81.5 · Android (Hermes + New Architecture)
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {['Expo Router v6','Zustand','TanStack Query','Axios','Reanimated 4','New Architecture'].map(tag => (
              <span key={tag} className="bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs font-semibold text-white">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* TOC + Content */}
      <div className="max-w-5xl mx-auto px-6 py-10 space-y-16">

        {/* Table of Contents */}
        <Section id="toc" title="Table of Contents" icon="📋">
          <ol className="list-decimal list-inside space-y-1 text-indigo-700 font-medium text-sm columns-2">
            {[
              ['#env','Environment Snapshot'],
              ['#arch','Architecture Overview'],
              ['#routing','File-Based Routing'],
              ['#auth','Authentication Flow'],
              ['#api','API Layer'],
              ['#state','State Management'],
              ['#ui','UI &amp; Theming'],
              ['#android','Android Build Stack'],
              ['#issues','Known Issues &amp; Fixes'],
              ['#setup','Step-by-Step Setup'],
              ['#checklist','Environment Checklist'],
              ['#quickref','Quick Reference Commands'],
            ].map(([href, label]) => (
              <li key={href}>
                <a href={href} className="hover:underline" dangerouslySetInnerHTML={{ __html: label }} />
              </li>
            ))}
          </ol>
        </Section>

        {/* 1. Environment Snapshot */}
        <Section id="env" title="Environment Snapshot" icon="🖥️">
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-indigo-50">
                <tr>
                  {['Tool / Variable','Value','Notes'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-indigo-800 border-b border-indigo-100">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  ['Node.js', 'v22.15.0', 'Required ≥ 18'],
                  ['npm / pnpm', 'pnpm 10.x', 'Workspace monorepo'],
                  ['Expo CLI', '54.0.23', 'npx expo (local)'],
                  ['Expo SDK', '~54.0.33', 'app.config.ts'],
                  ['React Native', '0.81.5', 'via Expo SDK 54'],
                  ['expo-router', '~6.0.23', 'File-based routing'],
                  ['System Java', '25.0.2', '⚠️ Too new for Gradle'],
                  ['JAVA_HOME', 'C:\\Program Files\\Android\\Android Studio\\jbr', 'Java 21 — required'],
                  ['ANDROID_HOME', 'C:\\Users\\manju\\AppData\\Local\\Android\\Sdk', 'Android SDK path'],
                  ['Gradle Wrapper', '8.14.3', 'android/gradle/wrapper/…properties'],
                  ['AGP', '8.x', 'android/build.gradle'],
                  ['JS Engine', 'Hermes', 'New Architecture enabled'],
                ].map(([tool, val, note]) => (
                  <tr key={tool} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-800">{tool}</td>
                    <td className="px-4 py-3 font-mono text-xs text-indigo-700">{val}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* 2. Architecture Overview */}
        <Section id="arch" title="Architecture Overview" icon="🏗️">
          <p className="text-gray-600 mb-5">The mobile app lives at <Code>apps/mobile/</Code> inside a pnpm monorepo. It is a pure React Native app compiled to Android via Expo's managed workflow (bare-ish — custom Android directory exists).</p>
          <CodeBlock>{`apps/mobile/
├── app/                    # expo-router file-based routes
│   ├── _layout.tsx         # Root layout — auth gate + providers
│   ├── (auth)/             # Public screens (login, register)
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (student)/          # Protected student screens
│   │   ├── _layout.tsx     # Tab navigator
│   │   ├── home.tsx
│   │   ├── complaints.tsx
│   │   └── profile.tsx
│   └── (admin)/            # Protected admin screens (role-gated)
├── src/
│   ├── api/
│   │   └── client.ts       # Axios instance + interceptors
│   ├── constants/
│   │   ├── api.ts          # BASE_URL + endpoint paths
│   │   └── roles.ts        # Role enum
│   ├── store/
│   │   └── auth.store.ts   # Zustand auth store (JWT + user)
│   ├── hooks/              # TanStack Query hooks
│   ├── components/
│   │   └── ui/             # Button, Input, Card, …
│   └── theme/
│       └── ThemeProvider.tsx
├── android/                # Bare Android project (Gradle 8.14.3)
├── app.config.ts           # Expo config (dynamic)
├── metro.config.js
└── babel.config.js`}</CodeBlock>

          <h3 className="text-lg font-semibold text-gray-800 mt-8 mb-3">High-Level Component Diagram</h3>
          <CodeBlock>{`┌─────────────────────────────────────────────────────────┐
│                    Expo (Metro Bundler)                  │
│  ┌─────────────┐   ┌──────────────┐  ┌───────────────┐  │
│  │  expo-router │──▶│  _layout.tsx │──▶│ Auth Gate     │  │
│  │  (file-based)│   │  (Root)      │  │ (Zustand)     │  │
│  └─────────────┘   └──────────────┘  └───────┬───────┘  │
│                                              │           │
│        ┌─────────────────┬─────────────┐    │           │
│        ▼                 ▼             ▼    │           │
│   (auth) group     (student) group  (admin) group       │
│   login / register  home/complaints  admin screens      │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │              State Layer                         │   │
│  │  Zustand auth.store  ←→  TanStack Query         │   │
│  │  (JWT, user, role)        (server cache)        │   │
│  └───────────────────────┬──────────────────────────┘  │
│                          │ Axios                        │
│                          ▼                              │
│              ┌─────────────────────┐                   │
│              │  NestJS REST API    │                   │
│              │  apps/api  :3000    │                   │
│              └─────────────────────┘                   │
└─────────────────────────────────────────────────────────┘`}</CodeBlock>
        </Section>

        {/* 3. File-Based Routing */}
        <Section id="routing" title="File-Based Routing" icon="🗺️">
          <p className="text-gray-600 mb-4">expo-router v6 maps the file tree under <Code>app/</Code> to navigation routes. Route groups (folders wrapped in parentheses) share a layout but don't add to the URL path.</p>
          <div className="grid md:grid-cols-2 gap-4">
            <InfoCard color="blue" title="Public routes — (auth)">
              <ul className="text-sm space-y-1 mt-2 text-gray-700">
                <li><Code>/login</Code> — StudentLoginScreen</li>
                <li><Code>/register</Code> — RegisterScreen</li>
              </ul>
            </InfoCard>
            <InfoCard color="purple" title="Student routes — (student)">
              <ul className="text-sm space-y-1 mt-2 text-gray-700">
                <li><Code>/home</Code> — Dashboard</li>
                <li><Code>/complaints</Code> — Complaints list + create</li>
                <li><Code>/profile</Code> — Profile screen</li>
              </ul>
            </InfoCard>
            <InfoCard color="green" title="Admin routes — (admin)">
              <ul className="text-sm space-y-1 mt-2 text-gray-700">
                <li>Admin-only screens gated by <Code>ROLES.ADMIN</Code></li>
                <li>Redirects non-admins to <Code>/home</Code></li>
              </ul>
            </InfoCard>
            <InfoCard color="yellow" title="Root layout logic">
              <ul className="text-sm space-y-1 mt-2 text-gray-700">
                <li>Reads <Code>auth.isAuthenticated</Code> + <Code>auth.role</Code></li>
                <li>Redirects to <Code>/login</Code> if not authenticated</li>
                <li>Splits into student / admin tab navigators</li>
              </ul>
            </InfoCard>
          </div>
        </Section>

        {/* 4. Auth Flow */}
        <Section id="auth" title="Authentication Flow" icon="🔐">
          <p className="text-gray-600 mb-5">JWT tokens are stored with <Code>expo-secure-store</Code> (native encrypted storage). A Axios request interceptor attaches the access token, and a response interceptor handles 401s with a mutex-protected token refresh.</p>
          <CodeBlock>{`// Simplified auth flow

1. User submits login form
   └─▶ POST /auth/login  { email, password }
       └─▶ { accessToken, refreshToken, user }
           ├─ accessToken  → SecureStore.setItemAsync('access_token', …)
           ├─ refreshToken → SecureStore.setItemAsync('refresh_token', …)
           └─ user/role    → Zustand auth.store

2. Every API request
   └─▶ Axios request interceptor
       └─▶ reads SecureStore('access_token')
           └─▶ Authorization: Bearer <token>

3. On 401 response (token expired)
   └─▶ Axios response interceptor
       └─▶ acquire mutex (prevents parallel refresh races)
           └─▶ POST /auth/refresh  { refreshToken }
               ├─ success → store new tokens, retry original request
               └─ failure → logout (clear store + SecureStore)`}</CodeBlock>
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
            <strong>⚠ Known issue:</strong> If the device clock is skewed the refresh can loop. Ensure the API server's <Code>JWT_EXPIRES_IN</Code> accounts for reasonable clock drift.
          </div>
        </Section>

        {/* 5. API Layer */}
        <Section id="api" title="API Layer" icon="🔌">
          <p className="text-gray-600 mb-4">All HTTP traffic goes through a single Axios instance defined in <Code>src/api/client.ts</Code>. The base URL is read from <Code>src/constants/api.ts</Code> which in turn reads from Expo's app config / <Code>.env</Code>.</p>
          <CodeBlock>{`// src/constants/api.ts  (simplified)
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.0.2.2:3000';

export const ENDPOINTS = {
  AUTH: {
    LOGIN:   '/auth/login',
    REFRESH: '/auth/refresh',
    LOGOUT:  '/auth/logout',
  },
  COMPLAINTS: {
    LIST:   '/complaints',
    CREATE: '/complaints',
    UPDATE: (id: string) => \`/complaints/\${id}\`,
  },
  PROFILE: '/users/me',
  // …
};`}</CodeBlock>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
            <strong>📝 Note:</strong> <Code>10.0.2.2</Code> is the Android Emulator's loopback address that maps to the host machine's <Code>localhost</Code>. For a physical device use the host machine's LAN IP.
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mt-8 mb-3">TanStack Query hooks pattern</h3>
          <CodeBlock>{`// src/hooks/useComplaints.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';

export function useComplaints() {
  return useQuery({
    queryKey: ['complaints'],
    queryFn: () => apiClient.get(ENDPOINTS.COMPLAINTS.LIST).then(r => r.data),
  });
}

export function useCreateComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => apiClient.post(ENDPOINTS.COMPLAINTS.CREATE, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['complaints'] }),
  });
}`}</CodeBlock>
        </Section>

        {/* 6. State Management */}
        <Section id="state" title="State Management" icon="🗄️">
          <p className="text-gray-600 mb-4">Two complementary layers handle state:</p>
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <InfoCard color="purple" title="Zustand — auth.store.ts">
              <ul className="text-sm space-y-1 mt-2 text-gray-700">
                <li>Stores <Code>user</Code>, <Code>role</Code>, <Code>isAuthenticated</Code></li>
                <li>Persists to <Code>expo-secure-store</Code> via custom storage adapter</li>
                <li>Exposes <Code>login()</Code>, <Code>logout()</Code>, <Code>hydrate()</Code></li>
                <li>Hydrated on app startup in root <Code>_layout.tsx</Code></li>
              </ul>
            </InfoCard>
            <InfoCard color="blue" title="TanStack Query — server state">
              <ul className="text-sm space-y-1 mt-2 text-gray-700">
                <li>Caches API responses (complaints, profile, …)</li>
                <li>Auto refetch on focus / network reconnect</li>
                <li>Mutations invalidate relevant query keys</li>
                <li><Code>QueryClientProvider</Code> wraps root layout</li>
              </ul>
            </InfoCard>
          </div>
          <CodeBlock>{`// Root _layout.tsx startup hydration (simplified)
useEffect(() => {
  authStore.hydrate();   // reads SecureStore → sets user/role
}, []);

// Then expo-router's redirect logic:
if (!isAuthenticated) return <Redirect href="/login" />;
if (role === ROLES.ADMIN) return <AdminTabNavigator />;
return <StudentTabNavigator />;`}</CodeBlock>
        </Section>

        {/* 7. UI & Theming */}
        <Section id="ui" title="UI &amp; Theming" icon="🎨">
          <p className="text-gray-600 mb-4">Pure React Native — no WebView. Custom component library under <Code>src/components/ui/</Code>.</p>
          <div className="grid md:grid-cols-3 gap-3 mb-6">
            {[
              ['Button', 'Variants: primary / secondary / outline / ghost. Uses Reanimated 4 press animation.'],
              ['Input', 'Controlled text input with label, error message, and secure-text toggle.'],
              ['Card', 'Elevated surface with optional header and shadow styles.'],
              ['Badge', 'Status pill — maps complaint/registration status to color.'],
              ['ThemeProvider', 'Context with light/dark color tokens; reads system color scheme.'],
              ['Reanimated', 'v4.1.6 — Fabric-compatible, used for press feedback and list animations.'],
            ].map(([name, desc]) => (
              <div key={name} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="font-semibold text-indigo-700 text-sm mb-1">{name}</div>
                <div className="text-xs text-gray-500">{desc}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* 8. Android Build Stack */}
        <Section id="android" title="Android Build Stack" icon="🤖">
          <div className="overflow-x-auto rounded-xl border border-gray-200 mb-6">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {['Layer','Value'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-gray-700 border-b border-gray-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  ['Gradle Wrapper','8.14.3'],
                  ['Android Gradle Plugin','8.x (classpath in android/build.gradle)'],
                  ['compileSdk / targetSdk','35 / 35 (Android 15)'],
                  ['minSdk','24 (Android 7.0)'],
                  ['JS Engine','Hermes (hermesEnabled = true)'],
                  ['New Architecture','Enabled (newArchEnabled = true in gradle.properties)'],
                  ['Fabric','Enabled (part of New Architecture)'],
                  ['TurboModules','Enabled (part of New Architecture)'],
                  ['Build tools','Android Studio Ladybug+'],
                  ['Required JDK','Java 21 via JAVA_HOME (Android Studio JBR)'],
                ].map(([layer, val]) => (
                  <tr key={layer} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-semibold text-gray-800">{layer}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-700">{val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">gradle.properties (key flags)</h3>
          <CodeBlock>{`org.gradle.jvmargs=-Xmx4096m
android.useAndroidX=true
android.enableJetifier=true
hermesEnabled=true
newArchEnabled=true
# Expo autolinking
EXPO_AUTOLINKING_ROOT=../../`}</CodeBlock>
        </Section>

        {/* 9. Known Issues & Fixes */}
        <Section id="issues" title="Known Issues &amp; Fixes" icon="🐛">
          <div className="space-y-5">
            {issues.map(({ id, title, severity, desc, fix }) => (
              <div key={id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className={`px-5 py-3 flex items-center gap-3 border-b border-gray-100 ${severityBg(severity)}`}>
                  <span className="font-bold text-gray-700 text-xs"># {id}</span>
                  <span className="font-semibold text-gray-900 text-sm flex-1">{title}</span>
                  <SeverityBadge level={severity} />
                </div>
                <div className="px-5 py-3">
                  <p className="text-sm text-gray-600 mb-3">{desc}</p>
                  <CodeBlock>{fix}</CodeBlock>
                </div>
              </div>
            ))}
          </div>
        </Section>

        {/* 10. Step-by-Step Setup */}
        <Section id="setup" title="Step-by-Step Setup" icon="🚀">
          {steps.map(({ n, title, cmds, note }) => (
            <div key={n} className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <span className="w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">{n}</span>
                <h3 className="text-base font-semibold text-gray-800">{title}</h3>
              </div>
              <CodeBlock>{cmds}</CodeBlock>
              {note && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-800">
                  {note}
                </div>
              )}
            </div>
          ))}
        </Section>

        {/* 11. Environment Checklist */}
        <Section id="checklist" title="Environment Checklist" icon="✅">
          <div className="grid md:grid-cols-2 gap-3">
            {checklist.map(({ ok, label }) => (
              <div key={label} className={`flex items-start gap-3 rounded-xl border p-4 text-sm ${ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                <span className="text-lg leading-none">{ok ? '✅' : '❌'}</span>
                <span className={ok ? 'text-green-800' : 'text-red-800'}>{label}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* 12. Quick Reference */}
        <Section id="quickref" title="Quick Reference Commands" icon="⚡">
          <div className="grid md:grid-cols-2 gap-5">
            {quickRef.map(({ title, cmds }) => (
              <div key={title} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 font-semibold text-xs text-gray-600 uppercase tracking-wider">{title}</div>
                <div className="p-4">
                  <CodeBlock>{cmds}</CodeBlock>
                </div>
              </div>
            ))}
          </div>
        </Section>

      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 bg-white mt-10">
        <div className="max-w-5xl mx-auto px-6 py-8 text-center text-sm text-gray-400">
          BMS Hostel · Mobile App Docs · Generated April 2026
        </div>
      </div>
    </div>
  );
}

// ─── Reusable components ────────────────────────────────────────────────────

function Section({ id, title, icon, children }: { id: string; title: string; icon: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-6">
      <div className="flex items-center gap-3 mb-5">
        <span className="text-2xl">{icon}</span>
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-gray-900 text-green-300 rounded-xl p-5 text-xs font-mono overflow-x-auto leading-relaxed whitespace-pre">
      {children}
    </pre>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return <code className="bg-gray-100 text-indigo-700 rounded px-1.5 py-0.5 text-xs font-mono">{children}</code>;
}

function InfoCard({ color, title, children }: { color: string; title: string; children: React.ReactNode }) {
  const borders: Record<string, string> = {
    blue: 'border-blue-200 bg-blue-50',
    purple: 'border-purple-200 bg-purple-50',
    green: 'border-green-200 bg-green-50',
    yellow: 'border-yellow-200 bg-yellow-50',
  };
  const headings: Record<string, string> = {
    blue: 'text-blue-800', purple: 'text-purple-800', green: 'text-green-800', yellow: 'text-yellow-800',
  };
  return (
    <div className={`rounded-xl border p-4 ${borders[color] ?? 'border-gray-200 bg-gray-50'}`}>
      <div className={`font-semibold text-sm ${headings[color] ?? 'text-gray-800'}`}>{title}</div>
      {children}
    </div>
  );
}

function SeverityBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-blue-100 text-blue-700 border-blue-200',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${styles[level] ?? 'bg-gray-100 text-gray-700'}`}>
      {level.toUpperCase()}
    </span>
  );
}

function severityBg(level: string) {
  const m: Record<string, string> = {
    critical: 'bg-red-50', high: 'bg-orange-50', medium: 'bg-yellow-50', low: 'bg-blue-50',
  };
  return m[level] ?? 'bg-gray-50';
}

// ─── Data ───────────────────────────────────────────────────────────────────

const issues = [
  {
    id: 1,
    title: 'System Java 25 breaks Gradle 8.14.3',
    severity: 'critical',
    desc: 'Gradle 8.14.3 requires Java 17–21. The system Java (25.0.2) is incompatible and will throw "Unsupported class file major version" errors.',
    fix: `# Set JAVA_HOME to Android Studio JBR (Java 21) before every build
$env:JAVA_HOME = "C:\\Program Files\\Android\\Android Studio\\jbr"
# Verify
& "$env:JAVA_HOME\\bin\\java.exe" -version   # should print 21.x`,
  },
  {
    id: 2,
    title: 'Emulator API URL vs physical device',
    severity: 'high',
    desc: 'Android Emulator uses 10.0.2.2 to reach the host. Physical devices need the host LAN IP. Using localhost or 127.0.0.1 will silently fail.',
    fix: `# .env (emulator)
EXPO_PUBLIC_API_URL=http://10.0.2.2:3000

# .env (physical device — find your LAN IP)
ipconfig | findstr "IPv4"
EXPO_PUBLIC_API_URL=http://192.168.x.x:3000`,
  },
  {
    id: 3,
    title: 'Reanimated 4 / New Architecture mismatch',
    severity: 'high',
    desc: 'react-native-reanimated v4 requires New Architecture (Fabric). If newArchEnabled=false in gradle.properties the app will crash on startup.',
    fix: `# android/gradle.properties — must be true
newArchEnabled=true`,
  },
  {
    id: 4,
    title: 'Metro bundler cache stale after dependency change',
    severity: 'medium',
    desc: 'After installing or upgrading native packages Metro may serve stale JS bundles causing confusing import errors.',
    fix: `cd apps/mobile
npx expo start --clear`,
  },
  {
    id: 5,
    title: 'expo-secure-store not available in Expo Go',
    severity: 'medium',
    desc: 'expo-secure-store is a native module and is NOT available inside the Expo Go sandbox. Development must use a custom dev client or direct Android build.',
    fix: `# Build a custom dev client
npx expo run:android

# Or use development build
npx expo prebuild
cd android && .\\gradlew assembleDebug`,
  },
  {
    id: 6,
    title: 'Token refresh race condition',
    severity: 'medium',
    desc: 'Without a mutex, parallel requests on a 401 can each trigger a refresh, invalidating each other\'s tokens.',
    fix: `// src/api/client.ts — mutex already implemented via 'async-mutex'
// Ensure the package is installed:
pnpm add async-mutex --filter @bms/mobile`,
  },
  {
    id: 7,
    title: 'Zustand store not hydrated before first render',
    severity: 'medium',
    desc: 'If hydrate() is async and the root layout renders before it resolves, the app briefly shows the login screen even for authenticated users.',
    fix: `// apps/mobile/app/_layout.tsx
const [hydrated, setHydrated] = useState(false);
useEffect(() => {
  authStore.hydrate().then(() => setHydrated(true));
}, []);
if (!hydrated) return <SplashScreen />;`,
  },
  {
    id: 8,
    title: 'Missing EXPO_PUBLIC_API_URL in production build',
    severity: 'high',
    desc: 'Expo bakes EXPO_PUBLIC_* vars at build time. If the .env is missing at build time the app will hardcode the fallback (10.0.2.2:3000).',
    fix: `# Before release build, ensure .env exists with production URL:
EXPO_PUBLIC_API_URL=https://api.yourdomain.com
# Then build:
npx expo build:android   # or eas build`,
  },
  {
    id: 9,
    title: 'Gradle daemon memory — build hangs on low-RAM machines',
    severity: 'low',
    desc: 'Default Gradle JVM args may be insufficient on machines with < 8 GB RAM causing slow or hung builds.',
    fix: `# android/gradle.properties
org.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=512m
org.gradle.daemon=true
org.gradle.parallel=true
org.gradle.caching=true`,
  },
  {
    id: 10,
    title: 'expo-haptics missing on Android < 8.0',
    severity: 'low',
    desc: 'Haptic feedback silently no-ops on Android devices below API 26. Not a crash, but UX is degraded.',
    fix: `// Wrap haptics calls gracefully — expo-haptics already handles this
// No code change needed. minSdk is 24 so a subset of devices will be silent.`,
  },
];

const steps = [
  {
    n: 1,
    title: 'Set JAVA_HOME to Android Studio JBR',
    cmds: `$env:JAVA_HOME = "C:\\Program Files\\Android\\Android Studio\\jbr"
$env:Path = "$env:JAVA_HOME\\bin;" + $env:Path
java -version   # must show 21.x`,
    note: 'Add this to your PowerShell profile ($PROFILE) so it persists across sessions.',
  },
  {
    n: 2,
    title: 'Install dependencies',
    cmds: `cd d:\\Apps\\hostel\\BMS_hostel
pnpm install`,
    note: undefined,
  },
  {
    n: 3,
    title: 'Create the mobile .env file',
    cmds: `cd apps/mobile
copy .env.example .env
# Edit .env — set EXPO_PUBLIC_API_URL
# Emulator:  http://10.0.2.2:3000
# Physical:  http://<LAN-IP>:3000`,
    note: undefined,
  },
  {
    n: 4,
    title: 'Start the API server',
    cmds: `cd apps/api
pnpm dev
# API running at http://localhost:3000`,
    note: undefined,
  },
  {
    n: 5,
    title: 'Run on Android Emulator (Metro + app)',
    cmds: `cd apps/mobile
npx expo run:android
# Opens Metro bundler and installs the APK on the connected emulator/device`,
    note: 'First run compiles the full native project (~3–10 min). Subsequent runs use the Gradle cache.',
  },
  {
    n: 6,
    title: 'Start Metro only (if APK already installed)',
    cmds: `cd apps/mobile
npx expo start --android`,
    note: undefined,
  },
  {
    n: 7,
    title: 'Clean build (when native changes are made)',
    cmds: `cd apps/mobile/android
.\\gradlew clean
cd ..
npx expo run:android`,
    note: undefined,
  },
  {
    n: 8,
    title: 'Build release APK',
    cmds: `cd apps/mobile/android
.\\gradlew assembleRelease
# Output: android/app/build/outputs/apk/release/app-release.apk`,
    note: 'Ensure EXPO_PUBLIC_API_URL in .env points to your production API before building.',
  },
];

const checklist = [
  { ok: true, label: 'Node.js ≥ 18 installed (v22.15.0 detected)' },
  { ok: true, label: 'pnpm installed (workspace monorepo)' },
  { ok: true, label: 'JAVA_HOME → Android Studio JBR (Java 21)' },
  { ok: false, label: 'System Java 25.0.2 — do NOT use for Gradle builds' },
  { ok: true, label: 'ANDROID_HOME set to Android SDK' },
  { ok: true, label: 'Expo CLI 54.0.23 available via npx expo' },
  { ok: true, label: 'Android emulator or physical device connected' },
  { ok: true, label: 'apps/mobile/.env created with correct API URL' },
  { ok: true, label: 'newArchEnabled=true in android/gradle.properties' },
  { ok: true, label: 'hermesEnabled=true in android/gradle.properties' },
  { ok: false, label: 'Expo Go NOT supported — use custom dev client' },
];

const quickRef = [
  {
    title: 'Start dev build on emulator',
    cmds: `$env:JAVA_HOME="C:\\Program Files\\Android\\Android Studio\\jbr"
cd apps/mobile
npx expo run:android`,
  },
  {
    title: 'Metro only (fast reload)',
    cmds: `cd apps/mobile
npx expo start --android --clear`,
  },
  {
    title: 'Clean native build',
    cmds: `cd apps/mobile/android
.\\gradlew clean
cd ..
npx expo run:android`,
  },
  {
    title: 'Release APK',
    cmds: `cd apps/mobile/android
.\\gradlew assembleRelease`,
  },
  {
    title: 'View Android logs',
    cmds: `adb logcat -s ReactNative ReactNativeJS`,
  },
  {
    title: 'List connected devices',
    cmds: `adb devices`,
  },
];
