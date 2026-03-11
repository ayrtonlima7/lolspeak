import {exec} from "child_process";
import {promisify} from "util";

const execAsync = promisify(exec);

export class SpeakerService {
    private isSpeaking: boolean = false;
    private queue: string[] = [];

    async speak(text: string): Promise<void> {
        // Limpar o texto de quebras de linha e caracteres problemáticos para o PowerShell
        const cleanText = text.replace(/[\r\n]+/g, " ").replace(/'/g, "''").trim();

        if (cleanText.length > 0) {
            this.queue.push(cleanText);
            if (!this.isSpeaking) {
                await this.processQueue();
            }
        }
    }

    private async processQueue(): Promise<void> {
        if (this.queue.length === 0) {
            this.isSpeaking = false;
            return;
        }

        this.isSpeaking = true;
        const text = this.queue.shift();

        if (text) {
            try {
                // Usando PowerShell com comando escapado corretamente
                const command = `powershell -Command "Add-Type -AssemblyName System.Speech; $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer; $speak.Speak('${text}')"`;
                await execAsync(command);

                // Intervalo entre frases
                await new Promise(resolve => setTimeout(resolve, 800));
            } catch (error) {
                console.error("Error speaking:", error);
            }
        }

        await this.processQueue();
    }
}
