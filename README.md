# Download de dados da AcessoRH

Script que extraí os anexos de todos os colaboradores cadastrados na plataforma AcessoRH.

Versão testada: NodeJS v12.18.2

## Instruções para instalação / execução
* Copiar o arquivo `.env.example` para o arquivo `.env`
* Preencher as variáveis de ambiente no arquivo `.env` (utilizar tabela abaixo para referência)
* Executar `npm install` - para instalar as dependências
* Executar `npm run import` - para executar o script de importação

O log de execução e o progresso poderá ser verificado no console.

### Variáveis de ambiente

Variável              | Comentário
--------------------- | -----------------------------------
AUTH_BASE_PATH        | URL base de autenticação
SERVICE_ACCOUNT       | Conta de serviço AcessoRH
TENANT_ID             | Tenant AcessoRH
API_ENDPOINT          | Endpoint da API AcessoRH (exemplo: `https://api.acessorh.com.br`)
PRIVATE_KEY_PEM_FILE  | Caminho do arquivo da chave privada AcessoRH

### Usando Docker
Foi disponibilizado um arquivo Dockerfile com o ambiente já pré-configurado, caso você não tenha o node ou trabalhe com uma versão diferente da testada. Para utilizar, use os seguintes comandos:
* `docker build -t node-js-12.18-alpine .`  
* `docker run -it --rm  -v $(pwd):/home/node --name download-documentos-xerpa node-js-12.18-alpine`

Após esse comando, será inicado uma sessão dentro do container, onde você pode executar os comandos:
* `npm install` 
* `npm run import`.