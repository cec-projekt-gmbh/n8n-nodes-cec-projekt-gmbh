import {readFile as fsReadFile} from 'fs/promises';

import {IExecuteFunctions} from 'n8n-core';
import {
	IDataObject,
	IExecuteWorkflowInfo,
	INodeExecutionData,
	INodeParameters,
	INodeType,
	INodeTypeDescription,
	IWorkflowBase,
	NodeOperationError,
} from 'n8n-workflow';

// @ts-ignore
import { set } from 'lodash';

export class ExecuteWorkflowExtended implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Execute Workflow Extended',
		name: 'execute-workflow-extended',
		icon: 'fa:sign-in-alt',
		group: ['transform'],
		version: 1,
		subtitle: '={{"Workflow: " + $parameter["workflowId"]}}',
		description: 'Execute another workflow',
		defaults: {
			name: 'Execute Workflow Extended',
			color: '#ff6d5a',
		},
		inputs: ['main'],
		// eslint-disable-next-line n8n-nodes-base/node-class-description-outputs-wrong
		outputs: ['main', 'main'],
		outputNames: ['true', 'false'],
		properties: [
			{
				displayName: 'Source',
				name: 'source',
				type: 'options',
				options: [
					{
						name: 'Database',
						value: 'database',
						description: 'Load the workflow from the database by ID',
					},
					{
						name: 'Local File',
						value: 'localFile',
						description: 'Load the workflow from a locally saved file',
					},
					{
						name: 'Parameter',
						value: 'parameter',
						description: 'Load the workflow from a parameter',
					},
					{
						name: 'URL',
						value: 'url',
						description: 'Load the workflow from an URL',
					},
				],
				default: 'database',
				description: 'Where to get the workflow to execute from',
			},

			// ----------------------------------
			//         source:database
			// ----------------------------------
			{
				displayName: 'Workflow ID',
				name: 'workflowId',
				type: 'string',
				displayOptions: {
					show: {
						source: ['database'],
					},
				},
				default: '',
				required: true,
				description: 'The workflow to execute',
			},

			// ----------------------------------
			//         source:localFile
			// ----------------------------------
			{
				displayName: 'Workflow Path',
				name: 'workflowPath',
				type: 'string',
				displayOptions: {
					show: {
						source: ['localFile'],
					},
				},
				default: '',
				placeholder: '/data/workflow.json',
				required: true,
				description: 'The path to local JSON workflow file to execute',
			},

			// ----------------------------------
			//         source:parameter
			// ----------------------------------
			{
				displayName: 'Workflow JSON',
				name: 'workflowJson',
				type: 'string',
				typeOptions: {
					alwaysOpenEditWindow: true,
					editor: 'json',
					rows: 10,
				},
				displayOptions: {
					show: {
						source: ['parameter'],
					},
				},
				default: '\n\n\n',
				required: true,
				description: 'The workflow JSON code to execute',
			},

			// ----------------------------------
			//         source:url
			// ----------------------------------
			{
				displayName: 'Workflow URL',
				name: 'workflowUrl',
				type: 'string',
				displayOptions: {
					show: {
						source: ['url'],
					},
				},
				default: '',
				placeholder: 'https://example.com/workflow.json',
				required: true,
				description: 'The URL from which to load the workflow from',
			},
			{
				displayName:
					'Any data you pass into this node will be output by the start node of the workflow to be executed. <a href="https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.executeworkflow/" target="_blank">More info</a>',
				name: 'executeWorkflowNotice',
				type: 'notice',
				default: '',
			},

			// ----------------------------------
			//         Set input
			// ----------------------------------
			{
				displayName: 'Keep Only Set',
				name: 'keepOnlySet',
				type: 'boolean',
				default: false,
				description:
					'Whether only the values set on this node should be kept and all others removed',
			},
			{
				displayName: 'Dot Notation',
				name: 'dotNotation',
				type: 'boolean',
				default: true,
				// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
				description:
					'<p>By default, dot-notation is used in property names. This means that "a.b" will set the property "b" underneath "a" so { "a": { "b": value} }.<p></p>If that is not intended this can be deactivated, it will then set { "a.b": value } instead.</p>.',
			},
			{
				displayName: 'Values to Set',
				name: 'values',
				placeholder: 'Add Value',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
					sortable: true,
				},
				description: 'The value to set',
				default: {},
				options: [
					{
						name: 'boolean',
						displayName: 'Boolean',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: 'propertyName',
								description:
									'Name of the property to write data to. Supports dot-notation. Example: "data.person[0].name"',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'boolean',
								default: false,
								// eslint-disable-next-line n8n-nodes-base/node-param-description-boolean-without-whether
								description: 'The boolean value to write in the property',
							},
						],
					},
					{
						name: 'number',
						displayName: 'Number',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: 'propertyName',
								description:
									'Name of the property to write data to. Supports dot-notation. Example: "data.person[0].name"',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'number',
								default: 0,
								description: 'The number value to write in the property',
							},
						],
					},
					{
						name: 'string',
						displayName: 'String',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: 'propertyName',
								description:
									'Name of the property to write data to. Supports dot-notation. Example: "data.person[0].name"',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'string',
								default: '',
								description: 'The string value to write in the property',
							},
						],
					},
					{
						name: 'json',
						displayName: 'JSON',
						values: [
							{
								displayName: 'Name',
								name: 'name',
								type: 'string',
								default: 'propertyName',
								description:
									'Name of the property to write data to. Supports dot-notation. Example: "data.person[0].name"',
							},
							{
								displayName: 'Value',
								name: 'value',
								type: 'json',
								default: '',
								description: 'The json value to write in the property',
							},
						],
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const source = this.getNodeParameter('source', 0) as string;

		const workflowInfo: IExecuteWorkflowInfo = {};

		try {
			if (source === 'database') {
				// Read workflow from database
				workflowInfo.id = this.getNodeParameter('workflowId', 0) as string;
			} else if (source === 'localFile') {
				// Read workflow from filesystem
				const workflowPath = this.getNodeParameter('workflowPath', 0) as string;

				let workflowJson;
				try {
					workflowJson = (await fsReadFile(workflowPath, {encoding: 'utf8'})) as string;
				} catch (error) {
					if (error.code === 'ENOENT') {
						throw new NodeOperationError(
							this.getNode(),
							`The file "${workflowPath}" could not be found.`,
						);
					}

					throw error;
				}

				workflowInfo.code = JSON.parse(workflowJson) as IWorkflowBase;
			} else if (source === 'parameter') {
				// Read workflow from parameter
				const workflowJson = this.getNodeParameter('workflowJson', 0) as string;
				workflowInfo.code = JSON.parse(workflowJson) as IWorkflowBase;
			} else if (source === 'url') {
				// Read workflow from url
				const workflowUrl = this.getNodeParameter('workflowUrl', 0) as string;

				const requestOptions = {
					headers: {
						accept: 'application/json,text/*;q=0.99',
					},
					method: 'GET',
					uri: workflowUrl,
					json: true,
					gzip: true,
				};

				const response = await this.helpers.request(requestOptions);
				workflowInfo.code = response;
			}

			// ----------------------------------
			//         Set items for Workflow
			// ----------------------------------

			const items = this.getInputData();
			const dataToBeTransmitted: INodeExecutionData[] = [];

			let item: INodeExecutionData;
			let keepOnlySet: boolean;
			for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
				keepOnlySet = this.getNodeParameter('keepOnlySet', itemIndex, false) as boolean;
				item = items[itemIndex];
				const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;

				const newItem: INodeExecutionData = {
					json: {},
					pairedItem: item.pairedItem,
				};

				if (keepOnlySet !== true) {
					if (item.binary !== undefined) {
						// Create a shallow copy of the binary data so that the old
						// data references which do not get changed still stay behind
						// but the incoming data does not get changed.
						newItem.binary = {};
						Object.assign(newItem.binary, item.binary);
					}

					newItem.json = JSON.parse(JSON.stringify(item.json));
				}

				// Add boolean values
				(this.getNodeParameter('values.boolean', itemIndex, []) as INodeParameters[]).forEach(
					(setItem) => {
						if (options.dotNotation === false) {
							newItem.json[setItem.name as string] = !!setItem.value;
						} else {
							set(newItem.json, setItem.name as string, !!setItem.value);
						}
					},
				);

				// Add number values
				(this.getNodeParameter('values.number', itemIndex, []) as INodeParameters[]).forEach(
					(setItem) => {
						if (options.dotNotation === false) {
							newItem.json[setItem.name as string] = setItem.value;
						} else {
							set(newItem.json, setItem.name as string, setItem.value);
						}
					},
				);

				// Add string values
				(this.getNodeParameter('values.string', itemIndex, []) as INodeParameters[]).forEach(
					(setItem) => {
						if (options.dotNotation === false) {
							newItem.json[setItem.name as string] = setItem.value;
						} else {
							set(newItem.json, setItem.name as string, setItem.value);
						}
					},
				);

				// Add json values
				(this.getNodeParameter('values.json', itemIndex, []) as INodeParameters[]).forEach(
					(setItem) => {
						if (options.dotNotation === false) {
							// @ts-ignore
							newItem.json[setItem.name as string] = JSON.parse(setItem.value);
						} else {
							// @ts-ignore
							set(newItem.json, setItem.name as string, JSON.parse(setItem.value));
						}
					},
				);

				dataToBeTransmitted.push(newItem);
			}


			// Execute Workflow
			const receivedData = (await this.executeWorkflow(workflowInfo, dataToBeTransmitted))[0];
			const returnDataTrue: INodeExecutionData[] = [];
			const returnDataFalse: INodeExecutionData[] = [];
			receivedData.forEach((row: { json: { __middleware: boolean; }; }) => {
				let isTrue = false;
				if(row.json.hasOwnProperty('__middleware')) {
					isTrue = row.json.__middleware === true;
					// @ts-ignore
					delete row.json.__middleware;
				}

				if(isTrue) {
					returnDataTrue.push(row);
				} else {
					returnDataFalse.push(row);
				}
			});
			return [returnDataTrue, returnDataFalse];
		} catch (error) {
			if (this.continueOnFail()) {
				return this.prepareOutputData([{json: {error: error.message}}]);
			}

			throw error;
		}
	}
}
