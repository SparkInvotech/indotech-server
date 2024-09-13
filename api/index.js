import express from "express";
import cors from "cors";
import { configDotenv } from "dotenv";
import { cert, initializeApp } from "firebase-admin/app";
import { getDatabase } from "firebase-admin/database";
configDotenv();

const PORT = process.env.PORT || 3000;

const app = express();

app.use(cors());
app.use(express.json());

// Initialize firebase admin app
initializeApp({
  credential: cert({
    projectId: process.env.PROJECT_ID,
    clientEmail: process.env.CLIENT_EMAIL,
    privateKey: process.env.RSA.replace(/\\n/g, "\n"),
  }),
  databaseURL: process.env.RTDB_URL,
});

// Get RTDB DB
const db = getDatabase().ref("indo_logs");

/** Utility function to return timestamp in IST with `YYYY:MM:DD HH:MM:SS` format */
function getTimestampString() {
  const date = new Date();

  // IST offset is +5:30 from UTC
  const ISTOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  const offsetDate = new Date(date.getTime() + ISTOffset);

  // Extract the year, month, day, hours, minutes, and seconds in IST
  const year = offsetDate.getUTCFullYear();
  const month = String(offsetDate.getUTCMonth() + 1).padStart(2, "0"); // Add leading zero for single-digit months
  const day = String(offsetDate.getUTCDate()).padStart(2, "0"); // Add leading zero for single-digit days
  const hours = String(offsetDate.getUTCHours()).padStart(2, "0");
  const minutes = String(offsetDate.getUTCMinutes()).padStart(2, "0");
  const seconds = String(offsetDate.getUTCSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

async function sendRawLogToRTDB(log) {
  const ts = getTimestampString();
  try {
    await db.child(ts).set({
      machine: 1,
      ...log,
    });
    console.log(
      `Saved data ${ts} to RTDB @${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
    );
  } catch (error) {
    console.error(
      `Save ${ts} to RTDB failed @${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
    );
    console.dir(error, { depth: 6 });
  }
}

app.get("/", async (req, res) => {
  try {
    // const data = await db.get()
    const dbData = {
      "2024-08-24 11:11:11": {
        airFilterVacuumPressure: 29.8,
        currentSensor: 10,
        dischargePressureSensor: 12.5,
        drainValvePressureOutlet: 0.5,
        machine: 1,
        oilPressureInlet: 30.2,
        oilPressureOutlet: 28.9,
        oilTemperatureSensor: 150,
        voltageSensor: 120,
      },
      "2024-08-24 12:30:38": {
        airFilterVacuumPressure: 700,
        currentSensor: 56,
        dischargePressureSensor: 577,
        drainValvePressureOutlet: 693,
        machine: 1,
        oilPressureInlet: 15005,
        oilPressureOutlet: 5090,
        oilTemperatureSensor: 53,
        voltageSensor: 156,
      },
      "2024-08-24 12:30:52": {
        airFilterVacuumPressure: 181,
        currentSensor: 32,
        dischargePressureSensor: 522,
        drainValvePressureOutlet: 478,
        machine: 1,
        oilPressureInlet: 5834,
        oilPressureOutlet: 6100,
        oilTemperatureSensor: 134,
        voltageSensor: 207,
      },
      "2024-08-24 12:30:54": {
        airFilterVacuumPressure: 1483,
        currentSensor: 24,
        dischargePressureSensor: 680,
        drainValvePressureOutlet: 1538,
        machine: 1,
        oilPressureInlet: 9196,
        oilPressureOutlet: 13852,
        oilTemperatureSensor: 87,
        voltageSensor: 429,
      },
    };
    const OTM = 115;
    const lastStamp = data[Object.keys(data).at(-1)];
    const data = {
        timeseries: dbData,
        airFilterCondition: lastStamp.airFilterVacuumPressure <= 0.8? "GOOD": "BAD",
        oilFilterCondition: lastStamp.oilPressureInlet - lastStamp.oilPressureOutlet >= 0.6? "BAD": "GOOD",
        oilTemperatureCondition: lastStamp.oilTemperatureSensor >= OTM? "HIGH": "NORMAL",
    }
    res.json(data);
    console.log(
      `Sent data to client @${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
    );
  } catch (error) {
    console.log("🚀 ~ app.get ~ error:", error);
    res.status(500).json({ error: "Server error in fetching data" });
  }
});

app.post("/", async (req, res) => {
  try {
    const data = req.body;
    sendRawLogToRTDB(data);
    res.json({
      message: `Stored data in RTDB @${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}`,
    });
  } catch (error) {
    console.log("🚀 ~ app.post ~ error:", error);
    res.status(500).json({ error: "Server error in saving data" });
  }
});

app.listen(PORT, () => console.info(`Server started on port ${PORT}!`));

export default app;