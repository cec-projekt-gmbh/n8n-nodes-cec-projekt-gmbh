# n8n-nodes-cec-projekt-gmbh

This is a collection of n8n-base-nodes extensions.

[n8n](https://n8n.io/) is a [fair-code licensed](https://docs.n8n.io/reference/license/) workflow automation platform.

- [Installation](#installation)
- Extensions
  - [Webhook](#webhook-extended)
  - [Execute Workflow](#execute-workflow-extended)
- [Resources](#resources)
- [Version History](#version-history)

## Installation

Follow the [installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n community
nodes documentation.

You need n8n min v0.199.0.

The CORE code of the Server.js and the WebhookServer.js must be overwritten so that additional headers can also be set
via OPTIONS.

```js
//n8n/dist/src
// ./Server.js
// ./WebhookServer.js
// for CORS preflight request
replace(`res.header('Access-Control-Allow-Origin', 'http://localhost:8080');`, `res.header('Access-Control-Allow-Origin', '*');`)
replace(`res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, sessionid')`, `res.header('Access-Control-Allow-Headers', '*');`)
```

## Webhook extended

Note the installation instructions!

The following has been added to the Webhook-node:

### Environment variables

- **GOOGLE_APPLICATION_CREDENTIALS**:
  Required for authentication via Firebase.
  See [Google Firebase documentation](https://firebase.google.com/docs/admin/setup)
- **EMAIL_ADMINISTRATION**:
  Required for user input validation.

### Attribute

- **httpMethod**:
  Returns the selected method. This facilitates manual HTTP logging.
- **user**:
  Returns the Firebase authentication object.

### Options

- **JSON Schema: query/body**: Validate query/body on corresponding schema.
  [ajv schemas](https://ajv.js.org/json-schema.html#json-data-type)

### Branches
- Add success/error branch
- All errors must/can be handled manually

### Usage

#### Google Firebase authentication

If the authentication is successful, the node passes the **user** attribute.

#### JSON Schema: query/body

A valid JSON string/[ajv schemas](https://ajv.js.org/json-schema.html#json-data-type) must be passed.
Note: javascript objects are used in the documentation, not JSON objects. Note double quotes for the keys.

Template:

```json
{
  "type": "object",
  "properties": {
    "type": {
      "type": "string"
    }
  },
  "additionalProperties": false
}
```

If an error occurs with the schema definition the following error is thrown:

```A problem with the schema definition has occurred. Please inform the website administration.```

The error message can be extended with an e-mail address using the environment variable **EMAIL_ADMINISTRATION**.

If the user input does not match the schema, the ajv error object is output to the user:

```json
{
  "status": 400,
  "message": "ajv error-object"
}
```

Validation is performed over the entire schema. ``{allErrors: true}``

## Execute Workflow extended

The following has been added to the ExecutionWorkflow-node:

### Set keys

Handling corresponds to the Set-Node.

### True/False return

In the workflow to be executed, the attribute **__middleware** can be passed.
According to its value (true/false) the output branch is true/false.
The attribute is truncated. If it is not set, the branch is 'false'.

## Resources

* [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## Version history

See [CHANGELOG](https://github.com/cec-projekt-gmbh/n8n-nodes-cec-projekt-gmbh/blob/master/CHANGELOG.md).



