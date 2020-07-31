require('dotenv').config();

const request = require("request");
const stringify = require('csv-stringify');
const fs = require('fs');

const moment = require('moment');
const auth = require('./auth');

const {EmployeeExport} = require('./models/Employee');

const apiBaseUrl = process.env.API_ENDPOINT;

async function main() {
    /* Entrar com a lista de status a serem buscados */

    let statusList = [
        240,
        400,
        500
    ];

    let accessToken = await auth.requestAnAccessToken();

    console.log('buscando dados na acessoRH..');

    let aPositions = [];
    for (let i = 0; i < statusList.length; i++) {
        const statusItem = statusList[i];
        const sUrl = `${apiBaseUrl}/v1/positions?status=${statusItem}`

        let offSet = 0;

        while (true) {
            let positionQueryResult = await getPositions(sUrl, accessToken, offSet);
            if (positionQueryResult.count > (positionQueryResult.offset + positionQueryResult.limit)) {
                aPositions = aPositions.concat(positionQueryResult.positions);
                offSet += positionQueryResult.limit;
            } else {
                aPositions = aPositions.concat(positionQueryResult.positions);
                break;
            }
        }
    }

    let aOutput = [];

    console.log(`foram encontradas ${aPositions.length} posições`);

    for (let i = 0; i < aPositions.length; i++) {
        const position = aPositions[i];

        const positionDetail = await getPositionDetail(position.id, accessToken);

        let oExport = new EmployeeExport();
        oExport.name = position.profile.name;
        oExport.email = position.profile.email
        oExport.phone = position.profile.mobile;
        oExport.hireDate = moment(position.admission_date).format('DD/MM/YYYY');

        const oPerson = positionDetail.persons.find(person => {
            return person.personType === 'candidate';
        });

        const oCpfDocument = oPerson.documents.find(document => {
            return document.slug === 'cpf';
        });

        if (oCpfDocument) {
            oExport.cpf = oCpfDocument.data.numero;
        }

        aOutput.push(oExport);
        console.log(`processando registro ${i}...`);
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
                reject(error);
            } else {
                response = JSON.parse(body);
                resolve(response);
            }
        });
    });
}

async function getPositionDetail(positionId, accessToken) {
    return new Promise((resolve, reject) => {
        const options = {
            uri: `${apiBaseUrl}/v1/positions/${positionId}?includes=persons`,
            encoding: null,
            headers: {'Authorization': `${accessToken.token_type} ${accessToken.access_token}`}
        };

        request(options, function (error, response, body) {
            if (error || response.statusCode !== 200) {
                reject(error);
            } else {
                response = JSON.parse(body);
                resolve(response);
            }
        });
    });
}

main().catch((error) => console.error(error));