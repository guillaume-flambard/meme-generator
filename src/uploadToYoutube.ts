
import { google } from "googleapis";
import fs from "fs";

export const uploadToYoutube = async (videoPath: string) => {
    console.log("📤 Uploading to YouTube...");

    const auth = new google.auth.OAuth2(
        process.env.YT_CLIENT_ID,
        process.env.YT_CLIENT_SECRET,
        process.env.YT_REDIRECT_URI
    );
    auth.setCredentials({ refresh_token: process.env.YT_REFRESH_TOKEN });

    const youtube = google.youtube({ version: "v3", auth });

    const video = await youtube.videos.insert({
        part: ["snippet", "status"],
        requestBody: {
            snippet: { title: "🔥 AI-Generated Meme!", description: "This meme was created using AI!" },
            status: { privacyStatus: "public" },
        },
        media: { body: fs.createReadStream(videoPath) },
    });

    console.log("✅ Uploaded to YouTube:", video.data);
};