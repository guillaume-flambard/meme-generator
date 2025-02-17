import axios from "axios";
import FormData from "form-data";
import fs from "fs";

export const uploadToTikTok = async (videoPath: string) => {
    console.log("📤 Uploading to TikTok...");

    const formData = new FormData();
    formData.append("video", fs.createReadStream(videoPath));

    const response = await axios.post(
        "https://open.tiktokapis.com/v2/video/upload/",
        formData,
        {
            headers: {
                ...formData.getHeaders(),
                Authorization: `Bearer ${process.env.TIKTOK_ACCESS_TOKEN}`,
            },
        }
    );

    console.log("✅ Uploaded to TikTok:", response.data);
};