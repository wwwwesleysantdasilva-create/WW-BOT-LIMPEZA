const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        if (message.author.bot) return;

        const client = message.client;

        // =========================================================================
        // COMANDO DO PAINEL ADMINISTRATIVO
        // =========================================================================
        if (message.content === '!painel') {
            if (!message.member.permissions.has('Administrator')) {
                return message.reply('❌ Você não tem permissão para usar este comando.')
                    .then(msg => setTimeout(() => msg.delete(), 5000));
            }

            const embedPainel = new EmbedBuilder()
                .setTitle('⚙️ Painel de Controle Administrativo')
                .setDescription('Gerencie as funções do bot em tempo real de forma otimizada.')
                .setColor('#2b2d31')
                .addFields(
                    { name: '🧹 Canal de Limpeza Ativo:', value: client.canalLimpezaId ? `<#${client.canalLimpezaId}>` : '*Nenhum configurado*' }
                )
                .setFooter({ text: 'Compatível com Containers v2 e Event Handler.' })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('btn_enviar_msg')
                    .setLabel('📩 Enviar Mensagem')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('btn_config_limpeza')
                    .setLabel('🔧 Alterar Canal de Limpeza')
                    .setStyle(ButtonStyle.Secondary)
            );

            await message.channel.send({ embeds: [embedPainel], components: [row] });
            
            try { await message.delete(); } catch (err) {}
            return;
        }

        // =========================================================================
        // MONITORAMENTO E LIMPEZA DE CHAT
        // =========================================================================
        if (client.canalLimpezaId && message.channel.id === client.canalLimpezaId) {
            if (message.pinned) return;

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
