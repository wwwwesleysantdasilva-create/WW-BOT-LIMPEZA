const { Client, GatewayIntentBits, PermissionsBitField } = require('discord.js');
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

// Função principal de limpeza com filtros
async function realizarLimpeza(canal, limite = 100) {
    try {
        // Busca as mensagens no canal
        const mensagens = await canal.messages.fetch({ limit: limite });
        
        // FILTRO: Mantém mensagens fixadas e ignora o que tiver mais de 14 dias
        const paraApagar = mensagens.filter(m => !m.pinned && (Date.now() - m.createdTimestamp < 1209600000));

        if (paraApagar.size === 0) return 0;

        const deletadas = await canal.bulkDelete(paraApagar, true);
        return deletadas.size;
    } catch (err) {
        console.error("Erro ao limpar mensagens:", err);
        return 0;
    }
}

client.once('ready', () => {
    console.log(`✅ Bot ${client.user.tag} está online!`);

    // LIMPEZA AUTOMÁTICA (A cada 24 horas)
    setInterval(async () => {
        const canal = await client.channels.fetch(CANAL_ID);
        if (canal) {
            const qtd = await realizarLimpeza(canal, 100);
            console.log(`[Auto-Faxina] ${qtd} mensagens removidas.`);
        }
    }, 86400000); // 24h em milissegundos
});

client.on('messageCreate', async (message) => {
    // Comando manual: !limpar [quantidade]
    if (message.content.startsWith('!limpar')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply('Você não tem permissão para gerenciar mensagens!');
        }

        const args = message.content.split(' ');
        const quantidade = parseInt(args[1]) || 100;

        await message.delete(); // Apaga o comando do usuário
        const qtd = await realizarLimpeza(message.channel, Math.min(quantidade, 100));
        
        const resposta = await message.channel.send(`🧹 Faxina concluída! Removi ${qtd} mensagens (mensagens fixadas foram poupadas).`);
        
        // Apaga o aviso do bot após 5 segundos
        setTimeout(() => resposta.delete().catch(() => null), 5000);
    }
});

client.login(TOKEN);
