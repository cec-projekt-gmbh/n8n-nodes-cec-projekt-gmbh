import {IExecuteFunctions} from 'n8n-core';
import {
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

function convertFilterToSql(filter: string) {
	filter = stringFunctionToSql('startsWith', filter);
	filter = stringFunctionToSql('endsWith', filter);
	filter = stringFunctionToSql('contains', filter);

	filter = filter.replace(/ eq /g, ' = ');
	filter = filter.replace(/ ne /g, ' != ');
	filter = filter.replace(/ gt /g, ' > ');
	filter = filter.replace(/ ge /g, ' >= ');
	filter = filter.replace(/ lt /g, ' < ');
	filter = filter.replace(/ le /g, ' <= ');
	filter = filter.replace(/ and /g, ' AND ');
	filter = filter.replace(/ or /g, ' OR ');
	filter = filter.replace(/ not /g, ' NOT ');

	return filter;
}

function stringFunctionToSql(functionName: string, filter: string) {
	/*
	Dieses JavaScript Regular Expression (RegEx) ist ein Muster, das verwendet wird, um eine bestimmte Zeichenfolge in einem Text zu suchen und zu extrahieren. Hier ist eine Erklärung der einzelnen Teile des RegEx-Musters:
	  new RegExp(): Dies ist ein Konstruktor, der ein neues RegEx-Objekt erstellt.
	  ${functionName}: Dies ist eine Template-Literal-Zeichenfolge, die den Namen einer JavaScript-Funktion enthält, die als Parameter in der RegEx-Funktion verwendet wird. Der Wert von functionName wird in die RegEx-Zeichenfolge eingefügt.
	  \\(: Dies sucht nach einer geöffneten runden Klammer. Der Backslash wird verwendet, um das Sonderzeichen "(" zu escapen.
	  ([^,]*): Dies sucht nach einer beliebigen Zeichenfolge, die nicht mit einem Komma beginnt. Die Klammern definieren eine Gruppierung, die später extrahiert werden kann.
	  ,\\s*': Dies sucht nach einem Komma, gefolgt von einem beliebigen Leerzeichen und einem einfachen Anführungszeichen.
	  ([^']*): Dies sucht nach einer beliebigen Zeichenfolge, die nicht mit einem einfachen Anführungszeichen endet. Die Klammern definieren eine weitere Gruppierung, die später extrahiert werden kann.
	  \\): Dies sucht nach einer schließenden runden Klammer. Der Backslash wird verwendet, um das Sonderzeichen ")" zu escapen.
	  g: Dies ist ein Modifikator, der angibt, dass die Suche global durchgeführt werden soll.
	Zusammen sucht der RegEx nach einer bestimmten Zeichenfolge, die einem Muster entspricht, das wie folgt aussieht: functionName(parameter1, 'parameter2'). Der erste Parameter kann beliebige Zeichen enthalten, solange er nicht mit einem Komma beginnt. Der zweite Parameter muss von einfachen Anführungszeichen umgeben sein und beliebige Zeichen enthalten, die nicht mit einem einfachen Anführungszeichen enden.
	 */
	const regex = new RegExp(`${functionName}\\(([^,]*),\\s*'([^']*)'\\)`, 'g');
	let match = regex.exec(filter);
	let loop = 0;
	while (match != null && loop < 100) {
		const column = match[1];
		const value = match[2];
		let sql = '';
		if (functionName === 'startsWith') {
			sql = `${column} LIKE '${value}%'`;
		} else if (functionName === 'endsWith') {
			sql = `${column} LIKE '%${value}'`;
		} else if (functionName === 'contains') {
			sql = `${column} LIKE '%${value}%'`;
		}
		filter = filter.replace(match[0], sql);
		match = regex.exec(filter);
		loop++;
	}

	if(match != null) {
		// eslint-disable-next-line n8n-nodes-base/node-execute-block-wrong-error-thrown
		throw new Error('Too many loops');
	}

	return filter;
}

export class ODataQueryOptions implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'OData Query Options to SQL',
		icon: 'file:ODataQueryOptions.png',
		name: 'odata-query-options-to-sql',
		group: ['transform'],
		version: 1,
		description: 'Converts the input of $select and $filter into SQL statements.',
		defaults: {
			name: 'OData Query Options to SQL',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'The interpretation is <b>unsafe</b>. The resulting SQL statement should only be executed with a database user who has <b>read-only</b> privileges.',
				name: 'database',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Table',
				name: 'tableName',
				type: 'string',
				default: '',
				description: 'Table name',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				displayName: '$select',
				name: '$select',
				type: 'string',
				default: '',
				description: 'String from $select-query',
			},
			{
				// eslint-disable-next-line n8n-nodes-base/node-param-display-name-miscased
				displayName: '$filter',
				name: '$filter',
				type: 'string',
				default: '',
				description: 'String from $filter-query',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const tableName = this.getNodeParameter('tableName', 0) as string;
		const $select = this.getNodeParameter('$select', 0) as string;
		const $filter = this.getNodeParameter('$filter', 0) as string;
		let columns = '*';
		let filter = '1=1';

		if ($select.length > 0) {
			columns = $select.split(',').map(col => col.trim()).filter(col => col.length > 0).join(', ');
		}

		if ($filter.length > 0) {
			filter = convertFilterToSql($filter);
		}

		const sqlStmt = `SELECT ${columns} FROM ${tableName} WHERE ${filter}`;

		const output = [{json: {sqlStmt}}];

		return [output];
	}
}










