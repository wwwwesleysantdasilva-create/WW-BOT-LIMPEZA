const { Client, GatewayIntentBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Compartilha o ID do canal com os outros arquivos de eventos
client.canalLimpezaId = process.env.CANAL_ID;

// Handler de Eventos: Puxa o código de dentro da pasta 'events'
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

// Desligamento Gracioso (Essencial para Containers v2 no Railway)
const desligamentoGracioso = (sinal) => {
    console.log(`\n🛑 Sinal de ${sinal} recebido. Desligando o bot de forma limpa...`);
    client.destroy();
    process.exit(0);
};

process.on('SIGTERM', () => desligamentoGracioso('SIGTERM'));
process.on('SIGINT', () => desligamentoGracioso('SIGINT'));

client.login(process.env.DISCORD_TOKEN || process.env.TOKEN);
