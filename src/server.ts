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

// 📌 Définition des chemins de police et des images
const fontDir = path.join(__dirname, "fonts");
const fontPath = path.join(fontDir, "impact.ttf");
const memePath = path.join(__dirname, "meme-final.png");
const tempImagePath = path.join(__dirname, "temp-meme.png");

// 📌 Vérification de la police Impact
if (fs.existsSync(fontPath)) {
    registerFont(fontPath, { family: "Impact" });
} else {
    console.error("❌ Police Impact introuvable :", fontPath);
}

// 📌 Nettoyage du texte généré
const cleanText = (text: string): string => text.replace(/^"|"$/g, "").trim();

// 📌 Ajuste dynamiquement la taille de la police
const adjustFontSize = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxFontSize: number): number => {
    let fontSize = maxFontSize;
    do {
        ctx.font = `bold ${fontSize}px Impact`;
        if (ctx.measureText(text).width <= maxWidth) break;
        fontSize -= 2;
    } while (fontSize > 20);
    return fontSize;
};

// 📌 Découpe un texte trop long en plusieurs lignes
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

// 🚀 Route API pour générer un mème
app.get("/api/generate-meme", async (req: Request, res: Response): Promise<void> => {
    try {
        console.log("📌 Requête reçue pour générer un mème !");

        // 📝 Étape 1 : Génération du texte du mème avec OpenAI
        const textResponse = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                { role: "system", content: "Tu es un générateur de mèmes humoristiques percutants." },
                { role: "user", content: "Génère une punchline drôle pour un mème viral." }
            ],
            max_tokens: 50
        });

        let memeText: string = cleanText(textResponse.choices[0]?.message?.content || "Quand tu réalises que c'est lundi...");
        console.log("🔹 Texte final :", memeText);

        // 🖼 Étape 2 : Génération d'une image avec DALL·E sans texte ancré
        const imageResponse = await openai.images.generate({
            model: "dall-e-3",
            prompt: `Une image humoristique en haute qualité, sans texte, pour correspondre à ce contexte : "${memeText}". L'image ne doit contenir aucun texte.`,
            size: "1024x1024",
            n: 1
        });

        const imageUrl: string = imageResponse.data[0]?.url;
        if (!imageUrl) throw new Error("Échec de la génération de l'image IA");

        console.log("🖼️ Image générée :", imageUrl);

        // 📥 Étape 3 : Téléchargement de l'image
        const imageResponseBuffer = await axios.get(imageUrl, { responseType: "arraybuffer" });
        fs.writeFileSync(tempImagePath, imageResponseBuffer.data);

        // ✍️ Étape 4 : Ajout du texte sur l'image
        const canvas = createCanvas(1024, 1024);
        const ctx = canvas.getContext("2d");
        const image = await loadImage(tempImagePath);
        ctx.drawImage(image, 0, 0, 1024, 1024);

        // 📌 Configuration du texte
        ctx.fillStyle = "white";
        ctx.strokeStyle = "black";
        ctx.lineWidth = 6;
        ctx.textAlign = "center";

        // 📌 Ajustement dynamique de la police et découpage du texte
        const fontSize: number = adjustFontSize(ctx, memeText, 900, 80);
        ctx.font = `bold ${fontSize}px Impact`;
        const wrappedText: string[] = wrapText(ctx, memeText.toUpperCase(), 900);

        // 📌 Placement du texte sur l'image
        let yPosition = 80;
        for (const line of wrappedText) {
            ctx.strokeText(line, 512, yPosition);
            ctx.fillText(line, 512, yPosition);
            yPosition += 60;
        }

        // 📤 Étape 5 : Enregistrement et envoi de l'image
        fs.writeFileSync(memePath, canvas.toBuffer("image/png"));

        console.log("✅ Mème généré et sauvegardé :", memePath);

        // ✅ Vérification du fichier avant envoi
        if (!fs.existsSync(memePath)) {
            console.error("❌ Fichier introuvable :", memePath);
            res.status(500).json({ error: "Le fichier n'a pas pu être généré." });
            return;
        }

        // ✅ Envoi du lien de téléchargement plutôt que `sendFile`
        res.json({ message: "Mème généré avec succès !", downloadUrl: `http://localhost:3000/download-meme` });

    } catch (error) {
        console.error("❌ Erreur génération mème:", error);
        res.status(500).json({ error: "Échec de la génération du mème." });
    }
});

// 📥 Route pour télécharger l'image
app.get("/download-meme", (req: Request, res: Response) => {
    if (!fs.existsSync(memePath)) {
        res.status(404).json({ error: "Fichier non trouvé" });
        return;
    }

    res.download(memePath, "meme.png", (err) => {
        if (err) {
            console.error("❌ Erreur lors du téléchargement :", err);
        } else {
            console.log("✅ Mème téléchargé !");
            fs.unlinkSync(memePath); // Suppression après téléchargement
        }
    });
});

// 🚀 Démarrage du serveur
const PORT: number = parseInt(process.env.PORT || "3000", 10);
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});