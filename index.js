const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const TOKEN = process.env.DISCORD_TOKEN;
const CANAL_ID = process.env.CANAL_ID;

client.once('ready', () => {
    console.log(`✅ Bot de limpeza instantânea ativo como ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
    // 1. Verifica se a mensagem foi enviada no canal específico
    if (message.channel.id === CANAL_ID) {
        
        // 2. Opcional: Não apaga mensagens fixadas
        if (message.pinned) return;

        // 3. Opcional: Se quiser dar 2 segundos para a pessoa ler a própria mensagem antes de apagar
        // Se quiser que seja INSTANTÂNEO, basta remover o setTimeout
        setTimeout(async () => {
            try {
                await message.delete();
                console.log(`Mensagem de ${message.author.tag} removida.`);
            } catch (err) {
                console.error("Erro ao apagar mensagem individual:", err);
            }
        }, 1000); // 1000ms = 1 segundo
    }
});

client.login(TOKEN);
