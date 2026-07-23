# Agente local — Infra Monitoramento

Programa que roda no computador da portaria para ligar o equipamento Intelbras
(acessível só pela rede local) ao sistema de cadastro facial, que fica hospedado
na nuvem.

## Instalação (computador da portaria)

1. Copie estes dois arquivos para uma pasta no computador da portaria (ex: `C:\Infra\`):
   - `agente-infra.exe`
   - `agent-config.json` (copie de `agent-config.example.json` e preencha)

2. Edite o `agent-config.json`:
   ```json
   {
     "apiUrl": "https://facial.inframonitoramentos.com.br",
     "agentToken": "TOKEN_GERADO_NO_PAINEL_ADMIN_PARA_ESTE_CONDOMINIO",
     "pollIntervalMs": 15000
   }
   ```
   O token é gerado no `/admin` do sistema, na seção "Agente local" do condomínio.

3. Dê dois cliques no `agente-infra.exe` para testar — deve abrir uma janela preta
   (console) mostrando `Agente iniciado. Consultando ...`. Deixe alguns segundos
   e feche.

   > **Se o Windows bloquear a execução** ("Windows protegeu o computador" ou
   > política de segurança corporativa): o executável não tem assinatura digital,
   > e alguns computadores com políticas mais rígidas podem recusar. Nesse caso,
   > clique em "Mais informações" → "Executar assim mesmo" (se disponível), ou
   > peça para o time de TI liberar o arquivo especificamente.

4. Para o agente iniciar sozinho sempre que o computador ligar:
   - Aperte `Win + R`, digite `shell:startup` e Enter (abre a pasta de Inicialização)
   - Copie um atalho do `agente-infra.exe` para dentro dessa pasta

## Verificando se está funcionando

- O agente escreve um arquivo `agent.log` na mesma pasta, com uma linha por
  cadastro processado (ou erro), com data/hora — é o primeiro lugar para checar
  se algo não estiver funcionando.
- Se o cadastro de um morador ficar "travado" (o celular dele mostra "processando"
  por muito tempo), confira se o `agente-infra.exe` está mesmo rodando
  (Gerenciador de Tarefas → aba Detalhes → `agente-infra.exe`).

## Gerando o executável novamente (só para quem desenvolve o sistema)

Se o código do agente (`agent.js`) mudar, é preciso gerar um novo `.exe`:

```bash
node agent/build.js
```

Isso cria `agent/agente-infra.exe` do zero. Distribua esse arquivo novo para
os computadores das portarias que usam o modo agente.
