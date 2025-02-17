"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateMeme = void 0;
const canvas_1 = require("canvas");
const fs_1 = require("fs");
const path_1 = __importDefault(require("path"));
const generateMeme = (topText, bottomText) => __awaiter(void 0, void 0, void 0, function* () {
    const width = 500;
    const height = 500;
    const canvas = (0, canvas_1.createCanvas)(width, height);
    const ctx = canvas.getContext("2d");
    // Charger une image de fond (exemple : un fond blanc)
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);
    // Ajouter du texte
    ctx.font = "30px Impact";
    ctx.fillStyle = "black";
    ctx.textAlign = "center";
    ctx.fillText(topText, width / 2, 50);
    ctx.fillText(bottomText, width / 2, height - 50);
    // Sauvegarde de l'image générée
    const outputPath = path_1.default.join(__dirname, "../public/meme.png");
    (0, fs_1.writeFileSync)(outputPath, canvas.toBuffer("image/png"));
    return "meme.png";
});
exports.generateMeme = generateMeme;
