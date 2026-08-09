const axios = require('axios');
const dotenv = require('dotenv');
const path = require('path');

for (const envPath of [path.resolve(__dirname, '..', '.env'), path.resolve(__dirname, '..', '..', '.env')]) {
  dotenv.config({ path: envPath });
}

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;

async function getCurrentWeather(city) {
  if (!OPENWEATHER_API_KEY) throw new Error('OpenWeather API key not configured');
  const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&units=metric&appid=${OPENWEATHER_API_KEY}`;
  try {
    const resp = await axios.get(url, { timeout: 10000 });
    const data = resp.data;
    const out = {
      city: `${data.name}, ${data.sys && data.sys.country ? data.sys.country : ''}`.trim(),
      temperature: data.main && data.main.temp,
      feels_like: data.main && data.main.feels_like,
      humidity: data.main && data.main.humidity,
      condition: data.weather && data.weather[0] && data.weather[0].main,
      windSpeed: data.wind && data.wind.speed,
      raw: data
    };
    return out;
  } catch (err) {
    if (err.response && err.response.data) {
      const message = err.response.data.message || 'Unexpected OpenWeather error';
      if (err.response.status === 401) {
        throw new Error('OpenWeather API key invalid or not configured');
      }
      throw new Error(`OpenWeather API error: ${message}`);
    }
    throw new Error(`OpenWeather request failed: ${err.message}`);
  }
}

module.exports = { getCurrentWeather };
