import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js"
import { z } from "zod"
import express from "express"
import https from "https"
import fs from "fs"
import axios from "axios"
import path from "path"

const apiKeys = JSON.parse(fs.readFileSync(path.resolve("api-keys.json"), "utf-8"))

const server = new McpServer({
  name: "MCP Js Server",
  version: "1.0.0",
})

/*
server.tool(
    "add", 
    "Add two numbers", 
    { a: z.string(), b: z.string() }, 
    async ({ a, b }) => ({
        content: [{ type: "text", text: sum(a, b) }],
    })
)

function sum(astr, bstr) {
    const sumValue = String(parseInt(astr) + parseInt(bstr));
    console.log("add(" + astr + ", " + bstr + ") -> " + sumValue);
    return "sum of " + astr + " and " + bstr +" is " + sumValue;
}

server.tool("getApiKey", "Get the API key", {}, async ({}) => ({
  content: [{ type: "text", text: "api-key-test-1234" }],
}))
*/

server.tool(
    "getCurrentWeatherByCity",
    "Get Current Weather of city", 
    { city: z.string().describe("city name(English)") }, 
    async ({ city }) => ({
        content: [{ type: "text", text: await getCurrentWeatherByCity(city) }],
    })
)

async function getCurrentWeatherByCity(city) {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric`;
    try {
        const response = await axios.get(url);
        const data = response.data;
        const result = {
            name: data.name,
            temperature: `${data.main.temp}°C`,
            humidity: `${data.main.humidity}%`,
            wind: `${data.wind.speed}m/s`,
            rain_precipitation: `${data?.rain?.["1h"] ?? 0}mm/h`,
            snow_precipitation: `${data?.snow?.["1h"] ?? 0}mm/h`,
            description: data.weather[0].description
        }
        const result_string = JSON.stringify(result);
        console.log(result_string);
        return result_string;
    } catch (error) {
        if (error.response) {
            console.error(`에러: ${error.response.data.message}`);
        } else {
            console.error(`에러: ${error.message}`);
        }
        return `can not access weather info about ${city}`
    }
}

server.tool(
    "getWeatherHourlyByCity",
    "Get Weather forecast for 5 days with data every 3 hours of city", 
    { city: z.string().describe("city name(English)") }, 
    async ({ city }) => ({
        content: [{ type: "text", text: await getWeatherHourlyByCity(city) }],
    })
)

async function getWeatherHourlyByCity(city) {
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(city)}&appid=${apiKeys.weatherApiKey}&units=metric`;
    try {
        const response = await axios.get(url);
        const data = response.data;

        const result = data.list.map(item => ({
            datetime: item.dt_text,
            temperature: `${item.main.temp}°C`,
            humidity: `${item.main.humidity}%`,
            wind: `${item.wind.speed}m/s`,
            rain_precipitation: `${item?.rain?.["1h"] ?? 0}mm/h`,
            snow_precipitation: `${item?.snow?.["1h"] ?? 0}mm/h`,
            description: item.weather[0].description
        }));

        const result_string = JSON.stringify(result);
        console.log(result_string);
        return result_string;
    } catch (error) {
        if (error.response) {
            console.error(`에러: ${error.response.data.message}`);
        } else {
            console.error(`에러: ${error.message}`);
        }
        return `can not access weather info about ${city}`
    }
}


// Network
const app = express();
const transports = {};

app.get("/sse", async (req, res) => {
  console.log("handleMcpConnect req/res");
  //console.log(req);
  //console.log(res);
  const transport = new SSEServerTransport('/messages', res);
  transports[transport.sessionId] = transport;
  res.on("close", () => {
    delete transports[transport.sessionId];
  });
  await server.connect(transport);
});

app.post("/messages", async (req, res) => {
  console.log("handleMcpConnect req/res");
  //console.log(req);
  //console.log(res);
  const sessionId = req.query.sessionId;
  const transport = transports[sessionId];
  if (transport) {
    await transport.handlePostMessage(req, res);
  } else {
    res.status(400).send('No transport found for sessionId');
  }
});

console.log("Execute Server");

let httpsOptions = {
    key: fs.readFileSync("secure/privkey.pem"),
    cert: fs.readFileSync("secure/cert.pem"),
    ca: fs.readFileSync("secure/fullchain.pem")
};

https.createServer(httpsOptions, app).listen(8000, function() {
    console.log("Server On");
});
