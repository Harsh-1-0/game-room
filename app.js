import express from "express";
import { Server } from "socket.io";
import { createServer } from "http";
import multer from "multer";
import xlsx from "xlsx";
import pkg from "pg";
const { Pool } = pkg;
import cors from "cors";
import dotenv from "dotenv";

dotenv.config(); // Load environment variables

const port = 5500;
const app = express();
const server = createServer(app);

// Database connection (CockroachDB)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
  },
});

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "https://webrtc-khaki-nu.vercel.app"],
    credentials: true,
  })
);
app.use(express.json());

// Multer setup for file uploads
const upload = multer({ dest: "uploads/" });

app.get("/", (req, res) => {
  res.status(200).send("Zinda Hai Server");
});

// Excel Upload Endpoint
app.post("/upload-excel", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Read the uploaded Excel file
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0]; // Get the first sheet
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: "Invalid or empty Excel file" });
    }
    const emails = data.map((row) => row.Emails);
    if (emails.length === 0) {
      return res.status(400).json({ error: "No emails found in the file" });
    }

    console.log("Emails:", emails);
    const cleanedEmails = emails.map((email) => email.trim());
    console.log("Cleaned Emails:", cleanedEmails);
    const query = `INSERT INTO user_slots (email) VALUES ${cleanedEmails
      .map((email) => `('${email}')`)
      .join(",")} ON CONFLICT (email) DO NOTHING`;

    await pool.query(query);

    res.json({ message: "Emails uploaded successfully", emails });
  } catch (error) {
    console.error("Error uploading emails:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.post("/gameroom", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Read the uploaded Excel file
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0]; // Get the first sheet
    const sheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(sheet);

    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: "Invalid or empty Excel file" });
    }

    const emailNumberMap = data.map((row) => ({
      email: row.Email.trim(),
      number: row.Number,
    }));

    if (emailNumberMap.length === 0) {
      return res
        .status(400)
        .json({ error: "No valid emails found in the file" });
    }

    const emailList = emailNumberMap.map(({ email }) => `'${email}'`).join(",");

    // Fetch IDs from USER_SLOTS based on emails
    const query = `SELECT ID,EMAIL FROM USERS WHERE EMAIL IN (${emailList})`;
    const { rows } = await pool.query(query);

    // Map the IDs with numbers
    const idNumberMap = rows.map((row) => {
      const matchedEntry = emailNumberMap.find(
        (entry) => entry.email === row.email
      );
      return {
        id: row.id,
        number: matchedEntry ? matchedEntry.number : null,
      };
    });

    const query1 = `INSERT INTO gameroom (ID,NUMBER) VALUES ${idNumberMap
      .map((val) => `('${val.id}',${val.number})`)
      .join(",")}`;

    await pool.query(query1);
    res.json({ message: "Emails uploaded successfully", idNumberMap });
  } catch (error) {
    console.error("Error uploading emails:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "https://webrtc-khaki-nu.vercel.app"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Start server
server.listen(port, () => {
  console.log("Server is running on port", port);
});
