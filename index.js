require('dotenv').config();

const request = require("request");
const stringify = require('csv-stringify');
const fs = require('fs');
const path = require('path');

const moment = require('moment');
const auth = require('./auth');

const {EmployeeExport} = require('./models/Employee');

const apiBaseUrl = process.env.API_ENDPOINT;

let initialAccessToken;

async function main() {
    initialAccessToken = await auth.requestAnAccessToken();

    /* Entrar com a lista de status a serem buscados */
    let statusList = [
        // 240,
        // 400,
        500
    ];

    console.log('buscando dados na Acesso RH..');

    let aPositions = [];
    for (let i = 0; i < statusList.length; i++) {
        const statusItem = statusList[i];
        const sUrl = `${apiBaseUrl}/v1/positions?status=${statusItem}`

        let offSet = 0;

        while (true) {
            let positionQueryResult;
            try {
                positionQueryResult = await getPositions(sUrl, await getAccessToken(), offSet);
            } catch (e) {
                console.log(`Falha ao buscar posições.`);
                console.log(e);
                console.log(`Tentando novamente em 2s...`);
                await new Promise(r => setTimeout(r, 2000));
                positionQueryResult = await getPositions(sUrl, await getAccessToken(), offSet);
            }

            if (positionQueryResult.count > (positionQueryResult.offset + positionQueryResult.limit)) {
                aPositions = aPositions.concat(positionQueryResult.positions);
                offSet += positionQueryResult.limit;
            } else {
                aPositions = aPositions.concat(positionQueryResult.positions);
                console.log(`foram buscadas  ${aPositions.length} posições de ${positionQueryResult.count}`)
                break;
            }

            console.log(`foram buscadas ${aPositions.length} posições de ${positionQueryResult.count}`)
        }
    }

    let aOutput = [];

    console.log(`foram encontradas ${aPositions.length} posições`);

    for (let i = 0; i < aPositions.length; i++) {
        const position = aPositions[i];

        let positionDetail;

        try {
            positionDetail = await getPositionDetail(position.id, await getAccessToken());
        } catch (e) {
            console.log(`Falha ao buscar detalhes da posição ${position.id}.`);
            console.log(e);
            console.log(`Tentando novamente em 2s...`);
            await new Promise(r => setTimeout(r, 2000));

            try {
                positionDetail = await getPositionDetail(position.id, await getAccessToken());
            } catch (e) {
                if (e === 'internal error') {
                    console.error(`Erro ao buscar CPF da posição ${position.id}. Processo irá continuar sem essa informação`);
                    continue;
                }
            }
        }

        let oExport = new EmployeeExport();
        oExport.name = position.profile.name;
        oExport.email = position.profile.email
        oExport.phone = position.profile.mobile;
        oExport.hireDate = moment(position.admission_date).format('DD/MM/YYYY');

        if (Array.isArray(positionDetail.persons)) {
            const oPerson = positionDetail.persons.find(person => {
                return person.personType === 'candidate';
            });

            const oCpfDocument = oPerson.documents.find(document => {
                return document.slug === 'cpf';
            });

            if (oCpfDocument) {
                oExport.cpf = oCpfDocument.data.numero;
            }
        }

        aOutput.push(oExport);
        console.log(`processando registro ${i + 1}...`);
    }

    let columns = {
        name: 'name',
        email: 'email',
        phone: 'phone',
        hireDate: 'hireDate',
        cpf: 'cpf'
    };

    console.log('gerando arquivo..');

    stringify(aOutput, {
        header: true,
        columns: columns,
        delimiter: ';'
    }, (err, output) => {
        if (err) throw err;
        fs.writeFile(`./output/${new Date().getTime()}.csv`, output, (err) => {
            if (err) throw err;
            console.log('Arquivo CSV gerado com sucesso');
        });
    });
}

async function getPositions(sUrl, accessToken, page) {
    return new Promise((resolve, reject) => {
        const options = {
            uri: `${sUrl}&skip=${page}`,
            encoding: null,
            headers: {'Authorization': `${accessToken.token_type} ${accessToken.access_token}`}
        };

        request(options, function (error, response, body) {
            if (error || response.statusCode !== 200) {
                console.error('Erro ao buscar posições')
                reject(JSON.parse(response.body));
            } else {
                response = JSON.parse(body);
                resolve(response);
            }
        });
    });
}

async function getPositionDetail(positionId, accessToken) {
    return new Promise((resolve, reject) => {
        const localFileCopyPath = `temp/${positionId}.json`;

        if (_fileAlreadyDownloaded(localFileCopyPath)) {
            console.log('Cache local utilizado!');
            resolve(_getLocalCopy(localFileCopyPath));
        } else {
            console.log('Sem cache, buscando na API');
            const options = {
                uri: `${apiBaseUrl}/v1/positions/${positionId}?includes=persons`,
                encoding: null,
                headers: {'Authorization': `${accessToken.token_type} ${accessToken.access_token}`}
            };

            request(options, function (error, response, body) {
                if (error || response.statusCode !== 200) {
                    console.error('Erro ao buscar detalhe de posição ' + positionId)
                    reject(JSON.parse(response.body));
                } else {
                    response = JSON.parse(body);
                    _saveLocalCopy(response, localFileCopyPath);
                    resolve(response);
                }
            });
        }
    });
}

async function getAccessToken() {
    const currentTimestamp = Math.floor(Date.now() / 1000);

    if (currentTimestamp > initialAccessToken.expires_at) {
        initialAccessToken = await auth.requestAnAccessToken();
    }

    return initialAccessToken;
}

function _fileAlreadyDownloaded(filePath) {
    return fs.existsSync(filePath);
}

function _ensureDirectoryExistence(filePath) {
    const dirname = path.dirname(filePath);
    if (fs.existsSync(dirname)) {
        return true;
    }
    _ensureDirectoryExistence(dirname);
    fs.mkdirSync(dirname);
}

function _saveLocalCopy(oData, dest) {
    _ensureDirectoryExistence(dest);
    let data = JSON.stringify(oData);

    fs.writeFileSync(dest, data);
}

function _getLocalCopy(sPath) {
    let rawData = fs.readFileSync(sPath);
    return JSON.parse(rawData);
}

main().catch((error) => console.error(error));