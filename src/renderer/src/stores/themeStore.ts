import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

export type Theme = 'light' | 'dark'

interface ThemeState {
  theme: Theme
}

interface ThemeActions {
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const initialState: ThemeState = {
  theme: 'light'
}

export const useThemeStore = create<ThemeState & ThemeActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        setTheme: (theme: Theme) => {
          set({ theme }, false, 'setTheme')
          document.documentElement.setAttribute('data-theme', theme)
        },
        
        toggleTheme: () => {
          const currentTheme = get().theme
          const newTheme = currentTheme === 'light' ? 'dark' : 'light'
          get().setTheme(newTheme)
        }
      }),
      {
        name: 'theme-store',
        onRehydrateStorage: () => (state) => {
          if (state?.theme) {
            document.documentElement.setAttribute('data-theme', state.theme)
          }
        }
      }
    ),
    {
      name: 'theme-store'
    }
  )
)