import DarkModeIcon from "@mui/icons-material/DarkMode";
import LightModeIcon from "@mui/icons-material/LightMode";
import SettingsBrightnessIcon from "@mui/icons-material/SettingsBrightness";
import { useTheme } from "../utils/useTheme";

const CYCLE = ["light", "dark", "system"];

export default function DarkModeToggle() {
  const { theme, setTheme } = useTheme();

  const handleClick = () => {
    const idx = CYCLE.indexOf(theme);
    setTheme(CYCLE[(idx + 1) % CYCLE.length]);
  };

  const icon =
    theme === "dark" ? <DarkModeIcon sx={{ fontSize: 20 }} /> :
    theme === "light" ? <LightModeIcon sx={{ fontSize: 20 }} /> :
    <SettingsBrightnessIcon sx={{ fontSize: 20 }} />;

  const label =
    theme === "dark" ? "Dark — click for System" :
    theme === "system" ? "System — click for Light" :
    "Light — click for Dark";

  return (
    <button
      onClick={handleClick}
      className="rounded-xl p-2 text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700"
      title={label}
    >
      {icon}
    </button>
  );
}
