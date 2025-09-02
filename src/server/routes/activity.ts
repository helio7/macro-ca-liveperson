'use strict';
import { Request, Response } from "express";
import { VerifyErrors, verify } from 'jsonwebtoken';

interface ExecuteLog {
    body: any;
    headers: any;
    trailers: any;
    method: any;
    url: any;
    params: any;
    query: any;
    route: any;
    cookies: any;
    ip: any;
    path: any;
    host: any;
    fresh: any;
    stale: any;
    protocol: any;
    secure: any;
    originalUrl: any;
}
const logExecuteData: ExecuteLog[] = [];
const logData = (req: Request) => {
    logExecuteData.push({
        body: req.body,
        headers: req.headers,
        trailers: req.trailers,
        method: req.method,
        url: req.url,
        params: req.params,
        query: req.query,
        route: req.route,
        cookies: req.cookies,
        ip: req.ip,
        path: req.path,
        host: req.host,
        fresh: req.fresh,
        stale: req.stale,
        protocol: req.protocol,
        secure: req.secure,
        originalUrl: req.originalUrl
    });
}

import axios from 'axios';

interface InputParamenter {
    phoneNumber?: string;
}
interface DecodedBody {
    inArguments?: InputParamenter[];
}

const {
    env: {
        SALESFORCE_JWT_SECRET,
        SENTINEL_SERVICE_DOMAIN,
        CLIENT_ID,
        CLIENT_SECRET,
        ACCOUNT_ID,
        PROACTIVE_MESSAGGING_API_DOMAIN,
        CAMPAIGN_NAME,
        TEMPLATE_ID,
        OUTBOUND_NUMBER,
    },
} = process;

const execute = async function (req: Request, res: Response) {
    const { body } = req;

    console.log('POST /execute request received.');

    if (!body) {
        console.error(new Error('invalid jwtdata'));
        return res.status(401).end();
    }
    if (!SALESFORCE_JWT_SECRET) {
        console.error(new Error('jwtSecret not provided'));
        return res.status(401).end();
    }

    verify(
        body.toString('utf8'),
        SALESFORCE_JWT_SECRET,
        { algorithms: ['HS256'], complete: false },
        async (err: VerifyErrors | null, _decoded?: any) => {
            if (err) {
                console.log('POST /execute request error when decoding.', err);
                console.error(err);
                return res.status(401).end();
            }
            console.log('POST /execute request decoded.', JSON.stringify(_decoded));
            res.setHeader('Content-Type', 'application/json');
            res.status(200);

            if (_decoded && 'inArguments' in _decoded) {
                const decoded: DecodedBody = { ..._decoded };

                if (decoded.inArguments && decoded.inArguments.length > 0) {
                    let phoneNumber: string | null = null;
                    for (const argument of decoded.inArguments) {
                        if (argument.phoneNumber) phoneNumber = argument.phoneNumber;
                    }
                    if (!phoneNumber) return res.status(400).send('Input parameter is missing.');

                    const params = new URLSearchParams();
                    params.append('client_id', CLIENT_ID!);
                    params.append('client_secret', CLIENT_SECRET!);

                    const authenticationResponse: { data: { access_token: string } } | null = await axios.post(
                        `https://${SENTINEL_SERVICE_DOMAIN}/sentinel/api/account/${ACCOUNT_ID}/app/token?v=1.0&grant_type=client_credentials`,
                        params,
                    )
                        .catch((err) => {
                            if (err.response) {
                                const { data, status } = err.response;
                                specialConsoleLog(phoneNumber!, 'AUTHENTICATION_REQUEST_FAILED', { data, status });
                            }
                            console.log('Error when calling the authentication API.');
                            return null;
                        });
                    if (!authenticationResponse) return res.send({ success: false });

                    const { data: { access_token } } = authenticationResponse!;

                    const result: {
                        success: boolean,
                        satisfied: boolean,
                    } = await axios.post(`https://${PROACTIVE_MESSAGGING_API_DOMAIN}/api/v2/account/${ACCOUNT_ID}/campaign`, {
                        headers: {
                            Authorization: `Bearer ${access_token}`,
                            'Content-Type': 'application/json',
                        },
                        data: {
                            campaignName: CAMPAIGN_NAME,
                            skill: 'WhatsApp',
                            templateId: TEMPLATE_ID,
                            outboundNumber: OUTBOUND_NUMBER,
                            consent: true,
                            consumers: [
                                {
                                    consumerContent: {
                                        wa: phoneNumber,
                                    },
                                    variables: {
                                        '1': 'confirmacion_compra',
                                        '2': 'numero_pedido',
                                    },
                                },
                            ],
                        },
                    })
                        .then((response) => {
                            const { data } = response;
                            if (
                                data &&
                                data.meta &&
                                data.meta.httpStatus === '200 - OK' &&
                                data.result &&
                                data.result.FECHA_INSATISFACCION
                            ) {
                                return { success: true, satisfied: false };
                            } else {
                                return { success: true, satisfied: true };
                            }
                        })
                        .catch((err) => {
                            if (
                                err.response &&
                                err.response.data &&
                                err.response.data.meta &&
                                err.response.data.meta.httpStatus === '404 - Not Found'
                            ) {
                                return { success: true, satisfied: true };
                            } else {
                                specialConsoleLog(customerId!, 'DATA_REQUEST_FAILED', err.response);
                                return { success: false, satisfied: false };
                            }
                        });
                    
                    return res.send(result);
                } else {
                    console.error('inArguments invalid.');
                    return res.status(400).end();
                }
            }
        },
    );
};

const edit = (req: any, res: any) => {
    logData(req);
    res.send(200, 'Edit');
};

const save = (req: any, res: any) => {
    logData(req);
    res.send(200, 'Save');
};

const publish = (req: any, res: any) => {
    logData(req);
    res.send(200, 'Publish');
};

const validate = (req: any, res: any) => {
    logData(req);
    res.send(200, 'Validate');
};

const stop = (req: any, res: any) => {
    logData(req);
    res.send(200, 'Stop');
};

function millisToMinutesAndSeconds(millis: number): string {
    const minutes = Math.floor(millis / 60000);
    const seconds = ((millis % 60000) / 1000).toFixed(0);
    return Number(seconds) == 60 ? minutes + 1 + 'm' : minutes + 'm ' + (Number(seconds) < 10 ? '0' : '') + seconds + 's';
}

function specialConsoleLog (
    customerId: string,
    eventName: string,
    data: any,
): void {
    const now = new Date();
    const todayDate = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    const currentTime = `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;

    const jsonifiedData = JSON.stringify(data);

    console.log(`${todayDate}|${currentTime}|${customerId}|${eventName}|${jsonifiedData}`);
}

export default {
    logExecuteData,
    execute,
    edit,
    save,
    publish,
    validate,
    stop,
};
