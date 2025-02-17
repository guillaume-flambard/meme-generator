import ffmpeg from "fluent-ffmpeg";
import path from "path";

export const convertImageToVideo = async (imagePath: string): Promise<string> => {
    const videoPath = imagePath.replace(".png", ".mp4");

    return new Promise((resolve, reject) => {
        ffmpeg()
            .input(imagePath)
            .loop(5) // 5 seconds
            .inputOptions(["-framerate 1"]) // 1 frame per second
            .output(videoPath)
            .outputOptions(["-c:v libx264", "-t 5", "-pix_fmt yuv420p"])
            .on("end", () => {
                console.log(`✅ Video created: ${videoPath}`);
                resolve(videoPath);
            })
            .on("error", (err) => {
                console.error("❌ FFmpeg error:", err);
                reject(err);
            })
            .run();
    });
};