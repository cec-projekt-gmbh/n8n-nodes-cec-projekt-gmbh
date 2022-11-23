# Changelog

## v1.3.0

Release date: 2022-11-23

[Webhook Extended]
The node tries to convert the single incoming query values into a JSON object.
This allows a more accurate query validation.
Query values that cannot be converted remain strings.

The default path was changed to '/v1/application/path'

## v1.2.1

Release date: 2022-10-27

Fix: Webhook Extended always returned both branches.

## v1.2.0

Release date: 2022-10-27

The Webhook Extended node has been extended with success/error branch.
All errors must/can be handled manually.

## v1.1.0

Release date: 2022-10-26

In n8n v0.199.0 the bug with Execute Workflow Extension was fixed.
The additional node was deleted.

## v1.0.0

Release date: 2022-10-26

First release. No changes 😉