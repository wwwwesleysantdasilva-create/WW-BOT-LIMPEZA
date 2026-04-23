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

client.once('ready', () => {
    console.log(`✅ Bot ${client.user.tag} está online!`);

    // Limpeza automática a cada 24 horas (86400000 milissegundos)
    setInterval(async () => {
        const canal = await client.channels.fetch(CANAL_ID);
        if (canal) {
            try {
                const deleted = await canal.bulkDelete(100, true);
                console.log(`Faxina automática: ${deleted.size} mensagens removidas.`);
            } catch (err) {
                console.error("Erro na limpeza automática:", err);
            }
        }
    }, 86400000); 
});

// Comando manual: !limpar
client.on('messageCreate', async (message) => {
    if (message.content.startsWith('!limpar')) {
        if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
            return message.reply('Você não tem permissão para isso!');
        }

        const args = message.content.split(' ');
        const quantidade = parseInt(args[1]) || 100;

        try {
            await message.delete(); // Deleta a mensagem do comando
            const deleted = await message.channel.bulkDelete(Math.min(quantidade, 100), true);
            const msg = await message.channel.send(`🧹 Removi ${deleted.size} mensagens!`);
            
            // Apaga a confirmação após 5 segundos
            setTimeout(() => msg.delete(), 5000);
        } catch (err) {
            message.channel.send("Erro ao tentar limpar: Mensagens com mais de 14 dias não podem ser removidas em massa.");
        }
    }
});

client.login(TOKEN);
