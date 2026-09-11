const ICON_EMOJI: Record<string, string> = {
  "clear-day": "☀️",
  "clear-night": "🌙",
  cloudy: "☁️",
  foggy: "🌫️",
  "partly-cloudy-day": "⛅",
  "partly-cloudy-night": "☁️",
  "possibly-rainy-day": "🌦️",
  "possibly-rainy-night": "🌧️",
  "possibly-sleet-day": "🌨️",
  "possibly-sleet-night": "🌨️",
  "possibly-snow-day": "🌨️",
  "possibly-snow-night": "🌨️",
  "possibly-thunderstorm-day": "⛈️",
  "possibly-thunderstorm-night": "⛈️",
  rainy: "🌧️",
  sleet: "🌨️",
  snow: "❄️",
  thunderstorm: "⛈️",
  windy: "💨",
};

export function weatherEmoji(icon: string): string {
  return ICON_EMOJI[icon] ?? "🌡️";
}
