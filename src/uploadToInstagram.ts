import axios from "axios";
import fs from "fs";
import FormData from "form-data";

export const uploadToInstagram = async (videoPath: string) => {
    console.log("📤 Uploading to Instagram...");

    const formData = new FormData();
    formData.append("video", fs.createReadStream(videoPath));

    const response = await axios.post(
        `https://graph.facebook.com/v15.0/${process.env.INSTAGRAM_USER_ID}/media`,
        formData,
        {
            headers: {
                ...formData.getHeaders(),
                Authorization: `Bearer ${process.env.INSTAGRAM_ACCESS_TOKEN}`,
            },
        }
    );

    console.log("✅ Uploaded to Instagram:", response.data);
};