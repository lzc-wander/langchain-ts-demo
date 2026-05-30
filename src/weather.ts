import { tool } from "langchain";
import { z } from "zod";

interface OpenWeatherResponse {
  weather: { id: number; description: string }[];
  main: { temp: number; feels_like: number; temp_min: number; temp_max: number; humidity: number };
  wind: { speed: number; deg: number };
  name: string;
}

async function fetchRealWeather({ city }: { city: string }): Promise<string> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    return `${city}：未配置 OpenWeatherMap API Key，请在 .env 中设置 OPENWEATHER_API_KEY`;
  }

  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=zh_cn`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (response.status === 404) {
      return `未找到城市“${city}”的天气数据，请检查城市名称是否正确`;
    }
    if (response.status === 429) {
      return `请求过于频繁，请稍后重试`;
    }
    if (!response.ok) {
      return `${city}：天气数据获取失败（状态码 ${response.status}）`;
    }

    const data: OpenWeatherResponse = await response.json();

    const condition = data.weather[0]?.description ?? "未知";
    const temp = Math.round(data.main.temp);
    const feelsLike = Math.round(data.main.feels_like);
    const high = Math.round(data.main.temp_max);
    const low = Math.round(data.main.temp_min);
    const humidity = data.main.humidity;

    const windSpeed = data.wind.speed;
    const windLevel = getWindLevel(windSpeed);
    const windDir = getWindDirection(data.wind.deg);

    const advice = getAdvice(data.weather[0]?.id);

    console.log(data);

    return `${city}今日天气：${condition}，当前温度 ${temp}°C（体感 ${feelsLike}°C），湿度 ${humidity}%，${windDir}风 ${windLevel}，最高 ${high}°C / 最低 ${low}°C。${advice}`;
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return `${city}：请求超时，无法获取天气数据`;
    }
    return `${city}：获取天气数据时发生网络错误，请检查网络连接`;
  } finally {
    clearTimeout(timeout);
  }
}

function getWindDirection(deg: number): string {
  const dirs = ["北", "东北", "东", "东南", "南", "西南", "西", "西北"];
  return dirs[Math.round(deg / 45) % 8];
}

function getWindLevel(speed: number): string {
  if (speed < 0.3) return "无风";
  if (speed < 1.6) return "1级（软风）";
  if (speed < 3.4) return "2级（轻风）";
  if (speed < 5.5) return "3级（微风）";
  if (speed < 8.0) return "4级（和风）";
  if (speed < 10.8) return "5级（清风）";
  if (speed < 13.9) return "6级（强风）";
  return "7级以上（大风）";
}

function getAdvice(weatherId: number | undefined): string {
  if (!weatherId) return "";
  if (weatherId >= 200 && weatherId < 300) return "雷雨天气，请注意安全⚡";
  if (weatherId >= 300 && weatherId < 400) return "有小雨，建议带伞☂️";
  if (weatherId >= 500 && weatherId < 510) return "有中雨，建议带伞☂️";
  if (weatherId >= 510 && weatherId < 600) return "有雨雪天气，注意保暖❄️";
  if (weatherId >= 600 && weatherId < 700) return "有降雪，注意防滑❄️";
  if (weatherId >= 700 && weatherId < 800) return "有雾，出行请注意安全🌫️";
  if (weatherId === 800) return "天气晴朗，适宜出行🌤️";
  if (weatherId >= 801 && weatherId < 900) return "天气不错，适宜出行⛅";
  return "";
}

export const getWeather = tool(fetchRealWeather, {
  name: "get_weather",
  description: "查询指定城市的当前天气",
  schema: z.object({
    city: z.string().describe("要查询天气的城市名称"),
  }),
});
