import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createCanvas, loadImage, registerFont, CanvasRenderingContext2D } from "canvas";
import OpenAI from "openai";
import axios from "axios";
import fs from "fs";
import path from "path";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY as string });

// 📌 Define paths for fonts and images
const fontDir = path.join(__dirname, "fonts");
const memeDir = path.join(__dirname, "memes"); // Directory to store multiple memes

const fontPath = path.join(fontDir, "impact.ttf");
const memePath = path.join(memeDir, `meme-${Date.now()}.png`);
const tempImagePath = path.join(memeDir, "temp-meme.png");

// 📌 Register Impact font if available
if (fs.existsSync(fontPath)) {
    registerFont(fontPath, { family: "Impact" });
} else {
    console.error("❌ Impact font not found:", fontPath);
}

// 📌 Function to clean generated text
const cleanText = (text: string): string => text.replace(/^"|"$/g, "").trim();

// 📌 Adjust font size dynamically
const adjustFontSize = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxFontSize: number): number => {
    let fontSize = maxFontSize;
    do {
        ctx.font = `bold ${fontSize}px Impact`;
        if (ctx.measureText(text).width <= maxWidth) break;
        fontSize -= 2;
    } while (fontSize > 30);
    return fontSize;
};

// 📌 Wrap text to fit inside the image
const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split(" ");
    let lines: string[] = [];
    let line = "";

    for (let word of words) {
        const testLine = line + word + " ";
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line.length > 0) {
            lines.push(line);
            line = word + " ";
        } else {
            line = testLine;
        }
    }
    lines.push(line.trim());
    return lines;
};

// 🚀 API Route to generate a meme
// 🚀 API Route to generate a meme
app.get("/api/generate-meme", async (req: Request, res: Response): Promise<void> => {
    try {
        console.log("📌 Meme generation request received!");

        // Get the requested language (default: English)
        const lang = (req.query.lang as string || "en").toLowerCase();
        console.log(`🌍 Generating meme in language: ${lang}`);

        // Determine the correct language setting
        const languageMap: Record<string, string> = {
            en: "English",
            fr: "French",
            es: "Spanish",
            de: "German",
            th: "Thai",
            jp: "Japanese",
            cn: "Chinese",
            it: "Italian",
            nl: "Dutch",
            pl: "Polish",
            pt: "Portuguese",
            ro: "Romanian",
            ru: "Russian",
            tr: "Turkish",
            ar: "Arabic",
            vi: "Vietnamese",
            id: "Indonesian",
            ms: "Malay",
            hi: "Hindi",
            bn: "Bengali",
            ta: "Tamil",
            te: "Telugu"
        };

        const selectedLanguage = languageMap[lang] || "English";

        // 📝 Step 1: Generate meme text using OpenAI
        const textResponse = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { role: "system", content: `You are a funny meme generator. Generate a short, catchy, viral meme text in ${selectedLanguage}. Ensure the response is fully in ${selectedLanguage}.` },
                { role: "user", content: `Generate a funny one-liner for a meme in ${selectedLanguage}. The text must be fully in ${selectedLanguage}.` }
            ],
            max_tokens: 50
        });

        let memeText: string = cleanText(textResponse.choices[0]?.message?.content || "When you realize it's Monday...");
        console.log("🔹 Final Text:", memeText);

        // 🖼 Step 2: Generate an image using DALL·E without embedded text
        const imageResponse = await openai.images.generate({
            model: "dall-e-3",
            prompt: `A high-quality humorous image, without text, to match the theme: "${memeText}". The image must not contain any text.`,
            size: "1024x1024",
            n: 1
        });

        const imageUrl: string = imageResponse.data[0]?.url;
        if (!imageUrl) throw new Error("Failed to generate AI image");

        console.log("🖼️ Generated Image:", imageUrl);

        // 📥 Step 3: Download the image
        const imageResponseBuffer = await axios.get(imageUrl, { responseType: "arraybuffer" });
        fs.writeFileSync(tempImagePath, imageResponseBuffer.data);

        // ✍️ Step 4: Add text on the image
        const canvas = createCanvas(1024, 1024);
        const ctx = canvas.getContext("2d");
        const image = await loadImage(tempImagePath);
        ctx.drawImage(image, 0, 0, 1024, 1024);

        // 📌 Configure text settings
        ctx.fillStyle = "white";
        ctx.strokeStyle = "black";
        ctx.lineWidth = 8;
        ctx.textAlign = "center";

        // 📌 Adjust font size dynamically and wrap text
        const maxFontSize = 80;
        const fontSize: number = adjustFontSize(ctx, memeText, 900, maxFontSize);
        ctx.font = `bold ${fontSize}px Impact`;
        const wrappedText: string[] = wrapText(ctx, memeText.toUpperCase(), 900);

        // 📌 Place the text on the image
        let yPosition = 80;
        const lineSpacing = fontSize + 10;
        wrappedText.forEach((line, index) => {
            ctx.strokeText(line, 512, yPosition + index * lineSpacing);
            ctx.fillText(line, 512, yPosition + index * lineSpacing);
        });

        // 📤 Step 5: Save and send the image
        const memeFileName = `meme-${Date.now()}.png`;
        const memeFilePath = path.join(memeDir, memeFileName);
        fs.writeFileSync(memeFilePath, canvas.toBuffer("image/png"));

        // ✅ Return the download link instead of sending the file directly
        res.json({ message: "Meme successfully generated!", downloadUrl: `http://localhost:3000/download-meme?filename=${memeFileName}` });

    } catch (error) {
        console.error("❌ Meme generation error:", error);
        res.status(500).json({ error: "Failed to generate meme." });
    }
});

// 📥 Route to download the image
app.get("/download-meme", (req: Request, res: Response) => {
    if (!fs.existsSync(memePath)) {
        res.status(404).json({ error: "File not found" });
        return;
    }
    const memeFileName = `meme-${Date.now()}.png`;
    const memeFilePath = path.join(memeDir, memeFileName);
    res.download(memeFilePath, memeFileName, (err) => {
        if (err) {
            console.error("❌ Error during download:", err);
        } else {
            console.log(`✅ Meme ${memeFileName} successfully downloaded!`);
        }
    });
});

// 🚀 Start the server
const PORT: number = parseInt(process.env.PORT || "3000", 10);
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});