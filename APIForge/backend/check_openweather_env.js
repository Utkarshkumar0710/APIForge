require("dotenv").config();
if (process.env.OPENWEATHER_API_KEY) {
  console.log("OPENWEATHER_API_KEY=SET");
  console.log(process.env.OPENWEATHER_API_KEY.length);
} else {
  console.log("OPENWEATHER_API_KEY=UNSET");
}
