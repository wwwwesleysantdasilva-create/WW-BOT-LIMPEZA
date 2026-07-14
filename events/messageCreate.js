module.exports = {
    name: 'messageCreate',
    async execute(message) {
        // Ignora mensagens de bots para evitar loops
        if (message.author.bot) return;

        const client = message.client;

        // =========================================================================
        // MONITORAMENTO E LIMPEZA DE CHAT (IMEDIATA)
        // =========================================================================
        if (client.canalLimpezaId && message.channel.id === client.canalLimpezaId) {
            if (message.pinned) return; // Ignora mensagens fixadas

            setTimeout(async () => {
                try {
                    await message.delete();
                    console.log(`[Container LOG] Mensagem de ${message.author.tag} removida.`);
                } catch (err) {
                    console.error("Erro ao apagar mensagem individual:", err);
                }
            }, 1000);
        }
    },
};
