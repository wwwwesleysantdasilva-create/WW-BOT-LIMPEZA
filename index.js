const { 
    Client, 
    GatewayIntentBits, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle 
} = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

const TOKEN = process.env.DISCORD_TOKEN;

// Variável em memória (Atenção: containers v2 resetam isso ao reiniciar!)
let canalLimpezaId = process.env.CANAL_ID;

client.once('ready', () => {
    console.log(`✅ Bot de limpeza ativo como ${client.user.tag} (Ambiente: Container v2)`);
});

// =========================================================================
// MONITORAMENTO E COMANDOS
// =========================================================================
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // 1. COMANDO DO PAINEL ADMINISTRATIVO
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
                { name: '🧹 Canal de Limpeza Ativo:', value: canalLimpezaId ? `<#${canalLimpezaId}>` : '*Nenhum configurado*' }
            )
            .setFooter({ text: 'Compatível com Containers v2.' })
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

    // 2. LIMPEZA DE CHAT IMEDIATA
    if (canalLimpezaId && message.channel.id === canalLimpezaId) {
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
});

// =========================================================================
// INTERAÇÕES (BOTÕES E FORMULÁRIOS)
// =========================================================================
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton() || interaction.isModalSubmit()) {
        if (!interaction.member.permissions.has('Administrator')) {
            return interaction.reply({ content: '❌ Apenas administradores podem interagir com este painel.', ephemeral: true });
        }
    }

    if (interaction.isButton()) {
        if (interaction.customId === 'btn_enviar_msg') {
            const modal = new ModalBuilder()
                .setCustomId('modal_enviar_msg')
                .setTitle('Enviar Mensagem Personalizada');

            const canalInput = new TextInputBuilder()
                .setCustomId('msg_canal_id')
                .setLabel('ID do Canal de Destino')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Cole aqui o ID do canal')
                .setRequired(true);

            const tituloInput = new TextInputBuilder()
                .setCustomId('msg_titulo')
                .setLabel('Título do Embed')
                .setStyle(TextInputStyle.Short)
                .setPlaceholder('Ex: Novidades na Loja!')
                .setRequired(true);

            const textoInput = new TextInputBuilder()
                .setCustomId('msg_texto')
                .setLabel('Conteúdo da Mensagem')
                .setStyle(TextInputStyle.Paragraph)
                .setPlaceholder('Digite aqui o corpo do texto...')
                .setRequired(true);

            modal.addComponents(
                new ActionRowBuilder().addComponents(canalInput),
                new ActionRowBuilder().addComponents(tituloInput),
                new ActionRowBuilder().addComponents(textoInput)
            );

            await interaction.showModal(modal);
        }

        if (interaction.customId === 'btn_config_limpeza') {
            const modal = new ModalBuilder()
                .setCustomId('modal_config_limpeza')
                .setTitle('Configurar Canal de Limpeza');

            const canalInput = new TextInputBuilder()
                .setCustomId('novo_canal_id')
                .setLabel('Novo ID do Canal de Limpeza')
                .setStyle(TextInputStyle.Short)
                .setValue(canalLimpezaId || '')
                .setRequired(true);

            modal.addComponents(new ActionRowBuilder().addComponents(canalInput));
            await interaction.showModal(modal);
        }
    }

    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'modal_enviar_msg') {
            const canalId = interaction.fields.getTextInputValue('msg_canal_id');
            const titulo = interaction.fields.getTextInputValue('msg_titulo');
            const texto = interaction.fields.getTextInputValue('msg_texto');

            try {
                const canalTarget = await client.channels.fetch(canalId);
                if (!canalTarget || !canalTarget.isTextBased()) {
                    return interaction.reply({ content: '❌ Canal de texto inválido.', ephemeral: true });
                }

                const embedEnvio = new EmbedBuilder()
                    .setTitle(titulo)
                    .setDescription(texto)
                    .setColor('#00ff7f')
                    .setTimestamp();

                await canalTarget.send({ embeds: [embedEnvio] });
                await interaction.reply({ content: `✅ Mensagem enviada para <#${canalId}>!`, ephemeral: true });
            
            } catch (error) {
                await interaction.reply({ content: '❌ Falha ao enviar. Verifique as permissões.', ephemeral: true });
            }
        }

        if (interaction.customId === 'modal_config_limpeza') {
            const novoId = interaction.fields.getTextInputValue('novo_canal_id');
            canalLimpezaId = novoId; 
            
            await interaction.reply({ content: `✅ Configuração atualizada! Monitorando <#${novoId}>. \n⚠️ *Nota: Se o container reiniciar, voltará ao ID padrão do .env.*`, ephemeral: true });
        }
    }
});

// =========================================================================
// GERENCIAMENTO DO PROCESSO (ESSENCIAL PARA CONTAINERS V2)
// =========================================================================
const desligamentoGracioso = (sinal) => {
    console.log(`\n🛑 Sinal de ${sinal} recebido. Desligando o bot de forma limpa...`);
    client.destroy(); // Desconecta o bot do Discord de forma correta
    process.exit(0);
};

process.on('SIGTERM', () => desligamentoGracioso('SIGTERM'));
process.on('SIGINT', () => desligamentoGracioso('SIGINT'));

client.login(TOKEN);
