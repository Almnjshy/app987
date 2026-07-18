import { useGameStore } from '@/store/gameStore'
import TitleScreen from '@/screens/TitleScreen'
import MainMenu from '@/screens/MainMenu'
import LevelSelect from '@/screens/LevelSelect'
import GameScreen from '@/screens/GameScreen'
import MatchEndScreen from '@/screens/MatchEndScreen'
import SettingsScreen from '@/screens/SettingsScreen'
import StatisticsScreen from '@/screens/StatisticsScreen'

export default function Home() {
  const currentScreen = useGameStore((state) => state.currentScreen)

  switch (currentScreen) {
    case 'title':
      return <TitleScreen />
    case 'menu':
      return <MainMenu />
    case 'levelSelect':
      return <LevelSelect />
    case 'playing':
      return <GameScreen />
    case 'matchEnd':
      return <MatchEndScreen />
    case 'settings':
      return <SettingsScreen />
    case 'statistics':
      return <StatisticsScreen />
    default:
      return <TitleScreen />
  }
}
