/* eslint-disable */
import {BINARY_ENCODING, IWebhookFunctions} from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	NodeOperationError,
} from 'n8n-workflow';

// @ts-ignore
import basicAuth from 'basic-auth';

import fs from 'fs';

import formidable from 'formidable';

import isbot from 'isbot';

import Ajv from 'ajv';

import addFormats from 'ajv-formats';

import {applicationDefault, initializeApp} from 'firebase-admin/app';

import {getAuth} from 'firebase-admin/auth';

const ajv = new Ajv({allErrors: true});
addFormats(ajv);

// tslint:disable-next-line:no-any
function responseError(status: number, message: any) {
	const returnDataTrue: INodeExecutionData[] = [];
	const returnDataFalse: INodeExecutionData[] = [];
	returnDataFalse.push({json: {status, data: message}});
	// @ts-ignore
	return {workflowData: [returnDataTrue, returnDataFalse]};
}

function ajvValidateInput(schema: object, data: object) {
	let validate, valid;
	try {
		validate = ajv.compile(schema);
	} catch (e) {
		console.log(e.message);
		const email = process.env.EMAIL_ADMINISTRATION;
		let message = `A problem with the schema definition has occurred. Please inform the website administration.`;
		if (!!email) {
			message += ` E-Mail: ${email}`;
		}

		return {
			status: 500,
			data: message,
		};
	}
	valid = validate(data);

	if (!valid) {
		return {
			status: 400,
			data: validate.errors,
		};
	}

	return {
		status: 200,
		data,
	};

}

function validateSchema(schema: string, type: string, data: object) {
	try {
		// @ts-ignore
		schema = JSON.parse(schema);
	} catch (error) {
		return {
			status: 500,
			data: `Error while parsing the ${type} schema. Error message: ${error.message}`,
		};
	}

	// @ts-ignore
	const result = ajvValidateInput(schema, data);

	if (result.status !== 200) {
		return {
			status: result.status,
			data: result.data,
		};
	}

	return true;
}

export class WebhookExtended implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Webhook Extended',
		icon: 'file:WebhookExtended.svg',
		name: 'webhook-extended',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when a webhook is called',
		eventTriggerDescription: 'Waiting for you to call the Test URL',
		activationMessage: 'You can now make calls to your production webhook URL.',
		defaults: {
			name: 'Webhook Extended',
		},
		triggerPanel: {
			header: '',
			executionsHelp: {
				inactive:
					'Webhooks have two modes: test and production. <br /> <br /> <b>Use test mode while you build your workflow</b>. Click the \'listen\' button, then make a request to the test URL. The executions will show up in the editor.<br /> <br /> <b>Use production mode to run your workflow automatically</b>. <a data-key="activate">Activate</a> the workflow, then make requests to the production URL. These executions will show up in the executions list, but not in the editor.',
				active:
					'Webhooks have two modes: test and production. <br /> <br /> <b>Use test mode while you build your workflow</b>. Click the \'listen\' button, then make a request to the test URL. The executions will show up in the editor.<br /> <br /> <b>Use production mode to run your workflow automatically</b>. Since the workflow is activated, you can make requests to the production URL. These executions will show up in the <a data-key="executions">executions list</a>, but not in the editor.',
			},
			activationHint:
				'Once you’ve finished building your workflow, run it without having to click this button by using the production webhook URL.',
		},
		// eslint-disable-next-line n8n-nodes-base/node-class-description-inputs-wrong-regular-node
		inputs: [],
		outputs: ['main', 'main'],
		outputNames: ['success', 'error'],
		credentials: [
			{
				name: 'httpBasicAuth',
				required: true,
				displayOptions: {
					show: {
						authentication: ['basicAuth'],
					},
				},
			},
			{
				name: 'httpHeaderAuth',
				required: true,
				displayOptions: {
					show: {
						authentication: ['headerAuth'],
					},
				},
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: '={{$parameter["httpMethod"]}}',
				isFullPath: true,
				responseCode: '={{$parameter["responseCode"]}}',
				responseMode: '={{$parameter["responseMode"]}}',
				responseData:
					'={{$parameter["responseData"] || ($parameter.options.noResponseBody ? "noData" : undefined) }}',
				responseBinaryPropertyName: '={{$parameter["responseBinaryPropertyName"]}}',
				responseContentType: '={{$parameter["options"]["responseContentType"]}}',
				responsePropertyName: '={{$parameter["options"]["responsePropertyName"]}}',
				responseHeaders: '={{$parameter["options"]["responseHeaders"]}}',
				path: '={{$parameter["path"]}}',
			},
		],
		properties: [
			{
				displayName: 'Authentication',
				name: 'authentication',
				type: 'options',
				options: [
					{
						name: 'Basic Auth',
						value: 'basicAuth',
					},
					{
						name: 'Header Auth',
						value: 'headerAuth',
					},
					{
						name: 'Google Firebase Auth',
						value: 'googleFirebaseAuth',
					},
					{
						name: 'None',
						value: 'none',
					},
				],
				default: 'googleFirebaseAuth',
				description: 'The way to authenticate',
			},
			{
				displayName:
					'Make sure that the environment variable \'<b>GOOGLE_APPLICATION_CREDENTIALS</b>\' is set and points to a valid file. <a href="https://firebase.google.com/docs/admin/setup" target="_blank">Google Docs</a>',
				name: 'googleFirebaseAuthNotice',
				type: 'notice',
				displayOptions: {
					show: {
						authentication: ['googleFirebaseAuth'],
					},
				},
				default: '',
			},
			{
				displayName: 'HTTP Method',
				name: 'httpMethod',
				type: 'options',
				options: [
					{
						name: 'DELETE',
						value: 'DELETE',
					},
					{
						name: 'GET',
						value: 'GET',
					},
					{
						name: 'HEAD',
						value: 'HEAD',
					},
					{
						name: 'PATCH',
						value: 'PATCH',
					},
					{
						name: 'POST',
						value: 'POST',
					},
					{
						name: 'PUT',
						value: 'PUT',
					},
				],
				default: 'GET',
				description: 'The HTTP method to listen to',
			},
			{
				displayName: 'Path',
				name: 'path',
				type: 'string',
				default: '/v1/application/path',
				placeholder: '/v1/application/path',
				required: true,
				description: 'The path to listen to',
			},
			{
				displayName: 'Respond',
				name: 'responseMode',
				type: 'options',
				options: [
					{
						name: 'Immediately',
						value: 'onReceived',
						description: 'As soon as this node executes',
					},
					{
						name: 'When Last Node Finishes',
						value: 'lastNode',
						description: 'Returns data of the last-executed node',
					},
					{
						name: 'Using \'Respond to Webhook\' Node',
						value: 'responseNode',
						description: 'Response defined in that node',
					},
				],
				default: 'responseNode',
				description: 'When and how to respond to the webhook',
			},
			{
				displayName:
					'Insert a \'Respond to Webhook\' node to control when and how you respond. <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.respondtowebhook/" target="_blank">More details</a>',
				name: 'webhookNotice',
				type: 'notice',
				displayOptions: {
					show: {
						responseMode: ['responseNode'],
					},
				},
				default: '',
			},
			{
				displayName: 'Response Code',
				name: 'responseCode',
				type: 'number',
				displayOptions: {
					hide: {
						responseMode: ['responseNode'],
					},
				},
				typeOptions: {
					minValue: 100,
					maxValue: 599,
				},
				default: 200,
				description: 'The HTTP Response code to return',
			},
			{
				displayName: 'Response Data',
				name: 'responseData',
				type: 'options',
				displayOptions: {
					show: {
						responseMode: ['lastNode'],
					},
				},
				options: [
					{
						name: 'All Entries',
						value: 'allEntries',
						description: 'Returns all the entries of the last node. Always returns an array.',
					},
					{
						name: 'First Entry JSON',
						value: 'firstEntryJson',
						description:
							'Returns the JSON data of the first entry of the last node. Always returns a JSON object.',
					},
					{
						name: 'First Entry Binary',
						value: 'firstEntryBinary',
						description:
							'Returns the binary data of the first entry of the last node. Always returns a binary file.',
					},
					{
						name: 'No Response Body',
						value: 'noData',
						description: 'Returns without a body',
					},
				],
				default: 'firstEntryJson',
				description:
					'What data should be returned. If it should return all items as an array or only the first item as object.',
			},
			{
				displayName: 'Property Name',
				name: 'responseBinaryPropertyName',
				type: 'string',
				required: true,
				default: 'data',
				displayOptions: {
					show: {
						responseData: ['firstEntryBinary'],
					},
				},
				description: 'Name of the binary property to return',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'JSON Schema: query',
						name: 'jsonSchemaQuery',
						type: 'json',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						default: '',
						description: 'A JSON Schema. <b>Keys require quotes</b>. <a href="https://ajv.js.org/json-schema.html">Docs</a>',
					},
					{
						displayName: 'JSON Schema: body',
						name: 'jsonSchemaBody',
						type: 'json',
						typeOptions: {
							alwaysOpenEditWindow: true,
						},
						default: '',
						description: 'A JSON Schema. <b>Keys require quotes</b>. <a href="https://ajv.js.org/json-schema.html">Docs</a>',
					},
					{
						displayName: 'Binary Data',
						name: 'binaryData',
						type: 'boolean',
						displayOptions: {
							show: {
								'/httpMethod': ['PATCH', 'PUT', 'POST'],
							},
						},
						default: false,
						description: 'Whether the webhook will receive binary data',
					},
					{
						displayName: 'Binary Property',
						name: 'binaryPropertyName',
						type: 'string',
						default: 'data',
						required: true,
						displayOptions: {
							show: {
								binaryData: [true],
							},
						},
						description:
							'Name of the binary property to write the data of the received file to. If the data gets received via "Form-Data Multipart" it will be the prefix and a number starting with 0 will be attached to it.',
					},
					{
						displayName: 'Ignore Bots',
						name: 'ignoreBots',
						type: 'boolean',
						default: false,
						description:
							'Whether to ignore requests from bots like link previewers and web crawlers',
					},
					{
						displayName: 'No Response Body',
						name: 'noResponseBody',
						type: 'boolean',
						default: false,
						description: 'Whether to send any body in the response',
						displayOptions: {
							hide: {
								rawBody: [true],
							},
							show: {
								'/responseMode': ['onReceived'],
							},
						},
					},
					{
						displayName: 'Raw Body',
						name: 'rawBody',
						type: 'boolean',
						displayOptions: {
							hide: {
								binaryData: [true],
								noResponseBody: [true],
							},
						},
						default: false,
						// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
						description: 'Raw body (binary)',
					},
					{
						displayName: 'Response Data',
						name: 'responseData',
						type: 'string',
						displayOptions: {
							show: {
								'/responseMode': ['onReceived'],
							},
							hide: {
								noResponseBody: [true],
							},
						},
						default: '',
						placeholder: 'success',
						description: 'Custom response data to send',
					},
					{
						displayName: 'Response Content-Type',
						name: 'responseContentType',
						type: 'string',
						displayOptions: {
							show: {
								'/responseData': ['firstEntryJson'],
								'/responseMode': ['lastNode'],
							},
						},
						default: '',
						placeholder: 'application/xml',
						// eslint-disable-next-line n8n-nodes-base/node-param-description-miscased-json
						description:
							'Set a custom content-type to return if another one as the "application/json" should be returned',
					},
					{
						displayName: 'Response Headers',
						name: 'responseHeaders',
						placeholder: 'Add Response Header',
						description: 'Add headers to the webhook response',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'entries',
								displayName: 'Entries',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
										description: 'Name of the header',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Value of the header',
									},
								],
							},
						],
					},
					{
						displayName: 'Property Name',
						name: 'responsePropertyName',
						type: 'string',
						displayOptions: {
							show: {
								'/responseData': ['firstEntryJson'],
								'/responseMode': ['lastNode'],
							},
						},
						default: 'data',
						description: 'Name of the property to return the data of instead of the whole JSON',
					},
				],
			},
		],
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const authentication = this.getNodeParameter('authentication') as string;
		const options = this.getNodeParameter('options', {}) as IDataObject;
		const req = this.getRequestObject();
		const headers = this.getHeaderData();
		const params = this.getParamsData();
		let query = this.getQueryData();
		// @ts-ignore
		query = Object.keys(query).reduce((prev, key) => {
			try {
				// @ts-ignore
				prev[key] = JSON.parse(query[key]);
			} catch (e) {
				// @ts-ignore
				prev[key] = query[key];
			}
			return prev;
		}, {});
		const body = this.getBodyData();
		let user = {}; // Für Google Auth;
		const httpMethod = this.getNodeParameter('httpMethod');

		const ignoreBots = options.ignoreBots as boolean;
		if (ignoreBots && isbot((headers as IDataObject)['user-agent'] as string)) {
			// @ts-ignore
			return responseError(403, 'Bot requests are not permitted');
		}

		if (authentication === 'basicAuth') {
			// Basic authorization is needed to call webhook
			let httpBasicAuth: ICredentialDataDecryptedObject | undefined;
			try {
				httpBasicAuth = await this.getCredentials('httpBasicAuth');
			} catch (error) {
				// @ts-ignore
				return responseError(500, error.message);
			}

			if (httpBasicAuth === undefined || !httpBasicAuth.user || !httpBasicAuth.password) {
				// Data is not defined on node so can not authenticate
				// @ts-ignore
				return responseError(500, 'No authentication data defined on node!');
			}

			const basicAuthData = basicAuth(req);

			if (basicAuthData === undefined) {
				// Authorization data is missing
				// @ts-ignore
				return responseError(401, 'Authorization data is missing');
			}

			if (
				basicAuthData.name !== httpBasicAuth!.user ||
				basicAuthData.pass !== httpBasicAuth!.password
			) {
				// Provided authentication data is wrong
				// @ts-ignore
				return responseError(403, 'Provided authentication data is wrong');
			}
		} else if (authentication === 'headerAuth') {
			// Special header with value is needed to call webhook
			let httpHeaderAuth: ICredentialDataDecryptedObject | undefined;
			try {
				httpHeaderAuth = await this.getCredentials('httpHeaderAuth');
			} catch (error) {
				// @ts-ignore
				return responseError(500, error.message);
			}

			if (httpHeaderAuth === undefined || !httpHeaderAuth.name || !httpHeaderAuth.value) {
				// Data is not defined on node so can not authenticate
				// @ts-ignore
				return responseError(500, 'No authentication data defined on node!');
			}
			const headerName = (httpHeaderAuth.name as string).toLowerCase();
			const headerValue = httpHeaderAuth.value as string;

			if (
				!headers.hasOwnProperty(headerName) ||
				(headers as IDataObject)[headerName] !== headerValue
			) {
				// Provided authentication data is wrong
				// @ts-ignore
				return responseError(403, 'Provided authentication data is wrong');
			}
		} else if (authentication === 'googleFirebaseAuth') {
			// @ts-ignore
			const auth = headers['authorization'];
			if (!auth) {
				// @ts-ignore
				return responseError(401, `Header 'Authorization' is required!`);
			}

			// Init Firebase once
			const firebaseConfig = {credential: applicationDefault()};
			try {
				initializeApp(firebaseConfig);
			} catch (e) {
				if (e.code !== 'app/duplicate-app') {
					// @ts-ignore
					return responseError(500, e.message);
				}
			}

			// Verify ID Token and get user info
			try {
				const {getAuth} = require('firebase-admin/auth');
				const idToken = auth.replace('Bearer ', '');
				user = await getAuth().verifyIdToken(idToken);
			} catch (e) {
				// @ts-ignore
				return responseError(500, e.message);
			}
		}

		if (options.jsonSchemaQuery) {
			//@ts-ignore
			const vResult = validateSchema(options.jsonSchemaQuery, 'query', query);
			if (vResult !== true) {
				//@ts-ignore
				return responseError(vResult.status, vResult.data);
			}
		}

		if (options.jsonSchemaBody) {
			//@ts-ignore
			const vResult = validateSchema(options.jsonSchemaBody, 'body', body);
			if (vResult !== true) {
				//@ts-ignore
				return responseError(vResult.status, vResult.data);
			}
		}


		// @ts-ignore
		const mimeType = headers['content-type'] || 'application/json';
		if (mimeType.includes('multipart/form-data')) {
			// @ts-ignore
			const form = new formidable.IncomingForm({multiples: true});

			return new Promise((resolve, reject) => {
				form.parse(req, async (err, data, files) => {
					const returnItem: INodeExecutionData = {
						binary: {},
						json: {
							headers,
							params,
							query,
							body: data,
							user,
						},
					};

					let count = 0;
					for (const xfile of Object.keys(files)) {
						const processFiles: formidable.File[] = [];
						let multiFile = false;
						if (Array.isArray(files[xfile])) {
							processFiles.push(...(files[xfile] as formidable.File[]));
							multiFile = true;
						} else {
							processFiles.push(files[xfile] as formidable.File);
						}

						let fileCount = 0;
						for (const file of processFiles) {
							let binaryPropertyName = xfile;
							if (binaryPropertyName.endsWith('[]')) {
								binaryPropertyName = binaryPropertyName.slice(0, -2);
							}
							if (multiFile === true) {
								binaryPropertyName += fileCount++;
							}
							if (options.binaryPropertyName) {
								binaryPropertyName = `${options.binaryPropertyName}${count}`;
							}

							const fileJson = file.toJSON() as unknown as IDataObject;
							// @ts-ignore
							const fileContent = await fs.promises.readFile(file.path);

							returnItem.binary![binaryPropertyName] = await this.helpers.prepareBinaryData(
								Buffer.from(fileContent),
								fileJson.name as string,
								fileJson.type as string,
							);

							count += 1;
						}
					}
					resolve({
						workflowData: [[returnItem]],
					});
				});
			});
		}

		if (options.binaryData === true) {
			return new Promise((resolve, reject) => {
				const binaryPropertyName = options.binaryPropertyName || 'data';
				const data: Buffer[] = [];

				req.on('data', (chunk) => {
					data.push(chunk);
				});

				req.on('end', async () => {
					const returnItem: INodeExecutionData = {
						binary: {},
						json: {
							httpMethod,
							headers,
							params,
							query,
							body,
							user,
						},
					};

					returnItem.binary![binaryPropertyName as string] = await this.helpers.prepareBinaryData(
						Buffer.concat(data),
					);

					return resolve({
						workflowData: [[returnItem]],
					});
				});

				req.on('error', (error) => {
					throw new NodeOperationError(this.getNode(), error);
				});
			});
		}

		const response: INodeExecutionData = {
			json: {
				httpMethod,
				headers,
				params,
				query,
				body,
				user,
			},
		};

		if (options.rawBody) {
			response.binary = {
				data: {
					// @ts-ignore
					data: req.rawBody.toString(BINARY_ENCODING),
					mimeType,
				},
			};
		}

		let webhookResponse: string | undefined;
		if (options.responseData) {
			webhookResponse = options.responseData as string;
		}

		return {
			webhookResponse,
			workflowData: [[response], []],
		};
	}
}
