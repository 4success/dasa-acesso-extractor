const fs = require('fs')
const path = require('path')
const jwt = require('jsonwebtoken')
const request = require('request')

// settings
const basePath = process.env.AUTH_BASE_PATH;

// entry point
let options = {
    serviceAccount: process.env.SERVICE_ACCOUNT,
    tenant: process.env.TENANT_ID
};


function createServiceAccountToken({tenant, serviceAccount, account = ''}) {
    // Reads the service account private key
    let privateKey = fs.readFileSync(path.resolve(`${process.env.PRIVATE_KEY_PEM_FILE}`));

    // Prepare the request
    let payload = {
        iss: `${serviceAccount}@${tenant}.iam.acesso.io`,
        aud: basePath,
        scope: '*',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000)
    };
    // Service account is requesting an access token for another user?
    if (account) {
        payload.sub = account;
    }

    // Create JWS
    return jwt.sign(payload, privateKey, {algorithm: 'RS256'});
}

async function requestAnAccessToken(serviceToken) {
    return new Promise((resolve, reject) => {
        // Prepare the request
        let options = {
            method: 'POST',
            url: `${basePath}/oauth2/token`,
            headers: {'content-type': 'application/x-www-form-urlencoded'},
            form: {
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: serviceToken
            }
        }

        // Ask identity and authorization server for an access token
        request(options, (error, response, body) => {
            if (error) {
                reject(new Error(error));
            }

            body = JSON.parse(body);

            if (body.error) {
                reject(new Error(`${body.error}: ${body.error_description}`));
            }
            resolve(body);
        })
    })
}

module.exports.requestAnAccessToken = async function () {
    console.log('autenticando na AcessoRH...')
    let token = await requestAnAccessToken(createServiceAccountToken(options));
    console.log('sucesso! access token: ', token.access_token);

    token.created_at = Math.floor(Date.now() / 1000);
    token.expires_at = token.created_at + token.expires_in;
    return token;
}