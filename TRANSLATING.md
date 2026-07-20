# Help Translate TaskLock

We welcome community translations to make TaskLock accessible to more people! 

## How to Contribute a New Language

TaskLock uses a simple key-value localization system. All translations live in `src/lib/i18n.ts`.

To add a new language, follow these steps:

1. **Fork the Repository**
   Fork this repo to your own GitHub account and clone it to your computer.

2. **Add Your Language**
   Open `src/lib/i18n.ts` and add your language to the `Locale` type and the `translations` object.
   For example, if you are adding Spanish (`es`), you would do:
   ```typescript
   export type Locale = 'en' | 'tr' | 'es';

   export const translations = {
     en: { ... },
     tr: { ... },
     es: {
       // Copy all the keys from 'en' and translate their values here
       tasks: 'Tareas',
       dailies: 'Diarios',
       // ...
     }
   };
   ```

3. **Update Settings UI**
   Open `src/components/SettingsView.tsx` and add a button for your language inside the "Localization" section.
   ```tsx
   <button 
     onClick={() => store.setLocale('es')}
     className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${store.locale === 'es' ? 'bg-indigo-500 text-white' : 'text-white/40 hover:text-white'}`}
   >
     ES
   </button>
   ```

4. **Test Your Changes**
   Run the app locally with `npm run dev`. Go to the Settings tab, select your new language, and ensure the UI updates correctly. Note that we are progressively adding `t()` calls to all components, so some screens may not be fully localized yet.

5. **Submit a Pull Request**
   Commit your changes and submit a Pull Request to the main repository. Please tag your PR with `translation` so we can review it quickly!

## Best Practices
- Keep translations concise. Mobile UI has limited space.
- Preserve variables if there are any (e.g. if a string is "Tasks: {count}", keep `{count}` exact).
- Test on both iOS and Web to ensure UI doesn't break with longer words.

Thank you for contributing!
