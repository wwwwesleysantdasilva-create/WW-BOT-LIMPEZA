module.exports = {
    name: 'clientReady',
    once: true,
    execute(client) {
        console.log(`✅ Bot de limpeza ativo como ${client.user.tag} (Estrutura Modular + Container V2)`);
    },
};
