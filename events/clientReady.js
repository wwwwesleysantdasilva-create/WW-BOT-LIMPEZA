module.exports = {
    name: 'clientReady',
    once: true,
    async execute(client) {
        console.log(`✅ Bot de limpeza ativo como ${client.user.tag} (Estrutura Modular + Container V2)`);

        // Registra o comando /painel automaticamente no Discord
        try {
            await client.application?.commands.set([
                {
                    name: 'painel',
                    description: '⚙️ Abre o painel de controle administrativo do bot.',
                }
            ]);
            console.log('🚀 Comando /painel registrado com sucesso globalmente!');
        } catch (error) {
            console.error('❌ Erro ao registrar comando Slash:', error);
        }
    },
};

