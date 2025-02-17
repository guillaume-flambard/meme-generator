import { uploadToYoutube } from "./uploadToYoutube";
import { uploadToInstagram } from "./uploadToInstagram";
import { uploadToTikTok } from "./uploadToTikTok";
import { convertImageToVideo } from "./convertImageToVideo";

export const uploadToSocialMedia = async (imagePath: string) => {
    console.log("📤 Converting Image to Video...");
    const videoPath = await convertImageToVideo(imagePath);

    await uploadToYoutube(videoPath);
    await uploadToInstagram(videoPath);
    await uploadToTikTok(videoPath);
};