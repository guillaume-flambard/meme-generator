import express, { Request, Response } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createCanvas, loadImage, registerFont, CanvasRenderingContext2D } from "canvas";
import OpenAI from "openai";
import axios from "axios";
import fs from "fs";
import path from "path";
import GIFEncoder from "gifencoder";
import { languagesMap } from "./helpers/languagesMap";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY as string });

const fontDir = path.join(__dirname, "fonts");
const memeDir = path.join(__dirname, "memes");
if (!fs.existsSync(memeDir)) fs.mkdirSync(memeDir);

const fontPath = path.join(fontDir, "impact.ttf");
if (fs.existsSync(fontPath)) {
    registerFont(fontPath, { family: "Impact" });
} else {
    console.error("❌ Impact font not found:", fontPath);
}

const removeQuotes = (text: string): string => text.replace(/^"|"$/g, "").trim();

// 📌 Function to wrap text inside an image
const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split(" ");
    let lines: string[] = [];
    let currentLine = "";

    for (let word of words) {
        const testLine = currentLine + word + " ";
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine.length > 0) {
            lines.push(currentLine);
            currentLine = word + " ";
        } else {
            currentLine = testLine;
        }
    }

    lines.push(currentLine.trim());
    return lines;
};

// 📌 Function to generate an animated meme GIF
const generateAnimatedMeme = async (
    imagePath: string, text: string, outputGifPath: string, animationSpeed: number,
    textColor: string, frameCount: number, textPosition: string, fontSize: number
) => {
    const encoder = new GIFEncoder(1024, 1024);
    const gifStream = fs.createWriteStream(outputGifPath);
    encoder.createReadStream().pipe(gifStream);
    encoder.start();
    encoder.setRepeat(0);
    encoder.setDelay(animationSpeed);
    encoder.setQuality(10);

    const canvas = createCanvas(1024, 1024);
    const ctx = canvas.getContext("2d");
    const image = await loadImage(imagePath);
    ctx.drawImage(image, 0, 0, 1024, 1024);

    ctx.font = `bold ${fontSize}px Impact`;
    ctx.fillStyle = textColor;
    ctx.strokeStyle = "black";
    ctx.lineWidth = 6;
    ctx.textAlign = "center";

    const wrappedText = wrapText(ctx, text.toUpperCase(), 900);
    let yPosition = textPosition === "top" ? 80 : textPosition === "center" ? 512 : 920;
    const lineSpacing = fontSize + 10;
    yPosition -= (wrappedText.length - 1) * (lineSpacing / 2);

    // Animation: Fading text
    for (let i = 0; i < frameCount; i++) {
        ctx.globalAlpha = Math.abs(Math.sin((i / frameCount) * Math.PI));
        wrappedText.forEach((line, index) => {
            ctx.strokeText(line, 512, yPosition + index * lineSpacing);
            ctx.fillText(line, 512, yPosition + index * lineSpacing);
        });
        encoder.addFrame(ctx as any);
    }

    encoder.finish();
};

// 🚀 API Route to generate a meme
app.get("/api/generate-meme", async (req: Request, res: Response): Promise<void> => {
    try {
        console.log("📌 Meme generation request received!");

        // Récupération des paramètres
        const lang = (req.query.lang as string || "en").toLowerCase();
        const langName = languagesMap[lang as keyof typeof languagesMap];
        const category = req.query.category as string || "random";
        const textPosition = req.query.textPosition as string || "bottom";
        const fontSize = parseInt(req.query.fontSize as string) || 60;
        const textColor = req.query.textColor as string || "white";
        const animationSpeed = parseInt(req.query.animationSpeed as string) || 200;
        const imageStyle = req.query.imageStyle as string || "random";
        const frameCount = parseInt(req.query.frameCount as string) || 40;

        console.log(`🌍 Language: ${langName}, 📜 Category: ${category}, 🎨 Style: ${imageStyle}`);

        // 🔥 Génération du texte du mème
        const textResponse = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { role: "system", content: `You are a meme generator. Create a funny, short, viral meme text in ${langName}, about ${category}.` },
                { role: "user", content: `Generate a funny one-liner for a meme in ${langName}.` }
            ],
            max_tokens: 50
        });

        let memeText = removeQuotes(textResponse.choices[0]?.message?.content || "When you realize it's Monday...");
        console.log("🔹 Final Text:", memeText);

        // 🖼 Génération de l'image avec DALL·E
        // 🛠️ Correction du prompt de DALL·E pour forcer l'absence de texte

        const imageResponse = await openai.images.generate({
            model: "dall-e-3",
            prompt: `A ${imageStyle} high-quality humorous image, focusing on ${category}. 
             **Do NOT include any text, captions, speech bubbles, watermarks, or overlays.** 
             The image should only visually represent the idea and should not have any form of writing.`,
            size: "1024x1024",
            n: 1
        });

        const imageUrl = imageResponse.data[0]?.url;
        if (!imageUrl) throw new Error("Failed to generate AI image");

        console.log("🖼️ Generated Image:", imageUrl);

        const tempImagePath = path.join(memeDir, `temp-meme-${Date.now()}.png`);
        const imageResponseBuffer = await axios.get(imageUrl, { responseType: "arraybuffer" });
        fs.writeFileSync(tempImagePath, imageResponseBuffer.data);

        // ✍️ Draw text on static image (PNG)
        const canvas = createCanvas(1024, 1024);
        const ctx = canvas.getContext("2d");
        const image = await loadImage(tempImagePath);
        ctx.drawImage(image, 0, 0, 1024, 1024);

        ctx.font = `bold ${fontSize}px Impact`;
        ctx.fillStyle = textColor;
        ctx.strokeStyle = "black";
        ctx.lineWidth = 6;
        ctx.textAlign = "center";

        const wrappedText = wrapText(ctx, memeText.toUpperCase(), 900);
        let yPosition = textPosition === "top" ? 80 : textPosition === "center" ? 512 : 920;
        const lineSpacing = fontSize + 10;
        yPosition -= (wrappedText.length - 1) * (lineSpacing / 2);

        wrappedText.forEach((line, index) => {
            ctx.strokeText(line, 512, yPosition + index * lineSpacing);
            ctx.fillText(line, 512, yPosition + index * lineSpacing);
        });

        const pngFilePath = path.join(memeDir, `meme-${Date.now()}.png`);
        fs.writeFileSync(pngFilePath, canvas.toBuffer("image/png"));

        // 🏆 Génération du GIF animé
        const gifFileName = `meme-${Date.now()}.gif`;
        const gifFilePath = path.join(memeDir, gifFileName);
        await generateAnimatedMeme(tempImagePath, memeText, gifFilePath, animationSpeed, textColor, frameCount, textPosition, fontSize);

        res.json({
            message: "Meme successfully generated!",
            staticImage: `http://localhost:3000/memes/${path.basename(pngFilePath)}`,
            animatedGif: `http://localhost:3000/memes/${gifFileName}`
        });

    } catch (error) {
        console.error("❌ Meme generation error:", error);
        res.status(500).json({ error: "Failed to generate meme." });
    }
});

// 🚀 Start the server
const PORT: number = parseInt(process.env.PORT || "3000", 10);
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});